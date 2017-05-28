/* eslint-plugin-disable flowtype */

import {
  TyVar,
  TyArr,
  TyAll
} from "./type.js";
import {
  TmVar,
  TmAbs,
  TmApp,
  TmTyAbs,
  TmTyApp
} from "./term.js";
import {
  Variable,
  Axiom,
  Theorem,
  Define,
  Reduce,
  Print,
  Clear
} from "./statement.js";

import loquat from "loquat";
import loquatToken from "loquat-token";

const lq = loquat();
lq.use(loquatToken);

const tp = lq.makeTokenParser(new lq.LanguageDef({
  commentStart  : "(*",
  commentEnd    : "*)",
  nestedComments: true,
  idStart       : lq.letter,
  idLetter      : lq.alphaNum.or(lq.char("'")),
  opStart       : lq.oneOf("=:.->λΛ∀→"),
  opLetter      : lq.oneOf("=:.->λΛ∀→"),
  reservedIds   : [
    "fun", "fun2", "forall",
    "Variable", "Axiom", "Hypothesis", "Theorem", "Lemma", "Corollary",
    "Define", "Reduce", "Print", "Clear"
  ],
  reservedOps: [
    ":", ".", "->", "λ", "Λ", "∀", "→",
    "="
  ],
  caseSensitive: true
}));

const dot    = tp.reservedOp(".");
const colon  = tp.reservedOp(":");
const forall = tp.reserved("forall").or(tp.reservedOp("∀"));
const arrow  = tp.reservedOp("->").or(tp.reservedOp("→"));
const fun    = tp.reserved("fun").or(tp.reservedOp("λ"));
const funL   = tp.reserved("fun2").or(tp.reservedOp("Λ"));

const type = lq.lazy(() => tyArr);
const tyVar = lq.do(function* () {
  const pos  = yield lq.getPosition;
  const name = yield tp.identifier;
  return new TyVar(pos, name);
});
const tyAll = lq.do(function* () {
  const pos = yield lq.getPosition;
  yield forall;
  const params = yield tp.commaSep1(tp.identifier);
  yield dot;
  const body = yield type;
  return params.reduceRight(
    (b, p) => new TyAll(pos, p, b),
    body
  );
});

const atype = lq.choice([
  tyVar,
  tyAll,
  tp.parens(type)
]);
const tyArr = lq.chainr1(
  atype,
  lq.getPosition.left(arrow)
    .map(pos => (dom, codom) => new TyArr(pos, dom, codom))
);

const term = lq.lazy(() => lq.choice([
  tmApp,
  tmAbs,
  tmTyAbs,
  tp.parens(term)
]));
const tmVar = lq.do(function* () {
  const pos  = yield lq.getPosition;
  const name = yield tp.identifier;
  return new TmVar(pos, name);
});
const param = lq.do(function* () {
  const paramName = yield tp.identifier;
  yield colon;
  const paramType = yield type;
  return { name: paramName, type: paramType };
});
const tmAbs = lq.do(function* () {
  const pos = yield lq.getPosition;
  yield fun;
  const params = yield tp.commaSep1(param);
  yield dot;
  const body = yield term;
  return params.reduceRight(
    (b, p) => new TmAbs(pos, p.name, p.type, b),
    body
  );
});
const tmTyAbs = lq.do(function* () {
  const pos = yield lq.getPosition;
  yield funL;
  const params = yield tp.commaSep1(tp.identifier);
  yield dot;
  const body = yield term;
  return params.reduceRight(
    (b, p) => new TmTyAbs(pos, p, b),
    body
  );
});
const fterm = lq.choice([
  tmVar,
  tp.parens(term)
]);
const aterm = lq.choice([
  fterm.map(t => ({ type: "term", content: t })),
  tp.brackets(type).map(t => ({ type: "type", content: t }))
]);
const tmApp = lq.do(function* () {
  const func = yield fterm;
  const args = yield aterm.many();
  return args.reduce(
    (f, a) => (
      a.type === "term"
        ? new TmApp(a.content.pos, f, a.content)
        : new TmTyApp(a.content.pos, f, a.content)
    ),
    func
  );
});

const stVariableDecl = tp.reserved("Variable");
const stAxiomDecl = lq.choice([
  tp.reserved("Axiom"),
  tp.reserved("Hypothesis")
]);
const stTheoremDecl = lq.choice([
  tp.reserved("Theorem"),
  tp.reserved("Lemma"),
  tp.reserved("Corollary")
]);
const stDefineDecl = tp.reserved("Define");
const stReduceDecl = tp.reserved("Reduce");
const stPrintDecl  = tp.reserved("Print");
const stClearDecl  = tp.reserved("Clear");
const stVariable = lq.do(function* () {
  const pos = yield lq.getPosition;
  yield stVariableDecl;
  const name = yield tp.identifier;
  return new Variable(pos, name);
});
const stAxiom = lq.do(function* () {
  const pos = yield lq.getPosition;
  yield stAxiomDecl;
  const name = yield tp.identifier;
  yield colon;
  const ty = yield type;
  return new Axiom(pos, name, ty);
});
const stTheorem = lq.do(function* () {
  const pos = yield lq.getPosition;
  yield stTheoremDecl;
  const name = yield tp.identifier;
  yield colon;
  const ty = yield type;
  yield tp.reservedOp("=");
  const tm = yield term;
  return new Theorem(pos, name, ty, tm);
});
const stDefine = lq.do(function* () {
  const pos = yield lq.getPosition;
  yield stDefineDecl;
  const name = yield tp.identifier;
  yield tp.reservedOp("=");
  const tm = yield term;
  return new Define(pos, name, tm);
});
const stReduce = lq.do(function* () {
  const pos = yield lq.getPosition;
  yield stReduceDecl;
  const tm = yield term;
  return new Reduce(pos, tm);
});
const stPrint = lq.do(function* () {
  const pos = yield lq.getPosition;
  yield stPrintDecl;
  const name = yield tp.identifier;
  return new Print(pos, name);
});
const stClear = lq.do(function* () {
  const pos = yield lq.getPosition;
  yield stClearDecl;
  return new Clear(pos);
});
const statement = lq.choice([
  stVariable,
  stAxiom,
  stTheorem,
  stDefine,
  stReduce,
  stPrint,
  stClear
]);

const prog = lq.do(function* () {
  yield tp.whiteSpace;
  yield tp.semi.many();
  const stmts = yield statement.sepEndBy(tp.semi);
  yield lq.eof;
  return stmts;
});

export function parse(src) {
  const res = lq.parse(prog, "", src, undefined, { unicode: true, tabWidth: 4 });
  if (res.success) {
    return res.value;
  }
  else {
    throw new SyntaxError("ParseError at " + res.error.toString());
  }
}
