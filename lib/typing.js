// @flow

import {
  Type
} from "./type.js";
import {
  Term
} from "./term.js";
import type {
  Context
} from "./term.js";
import {
  Type  as IxType,
  TyVar as IxTyVar,
  TyArr as IxTyArr,
  TyAll as IxTyAll
} from "./ixtype.js";
import {
  Term         as IxTerm,
  TmVar        as IxTmVar,
  TmAbs        as IxTmAbs,
  TmApp        as IxTmApp,
  TmTyAbs      as IxTmTyAbs,
  TmTyApp      as IxTmTyApp,
  TyBinding    as IxTyBinding,
  TmBinding    as IxTmBinding,
  getTmBinding as getIxTmBinding
} from "./ixterm.js";
import type {
  Context as IxContext
} from "./ixterm.js";
import {
  toIndexedTerm,
  toIndexedContext,
  fromIndexedType
} from "./transform.js";

export function deduceIxType(context: IxContext, term: IxTerm): IxType {
  if (term instanceof IxTmVar) {
    return getIxTmBinding(context, term.index).type.shift(0, term.index + 1);
  }
  else if (term instanceof IxTmAbs) {
    const bodyType = deduceIxType(
      context.unshift(new IxTmBinding(term.paramType)),
      term.body
    );
    return new IxTyArr(term.pos, term.paramType, bodyType.shift(1, -1));
  }
  else if (term instanceof IxTmApp) {
    const funcType = deduceIxType(context, term.func);
    const argType  = deduceIxType(context, term.arg);
    if (!(funcType instanceof IxTyArr)) {
      const domStr = argType instanceof IxTyVar
         ? argType.toString()
         : "(" + argType.toString() + ")";
      throw new Error(
          `TypeError at ${term.func.pos.toString()}:\n`
        + `  expected: ${domStr} -> ?\n`
        + `  actual  : ${funcType.toString()}`
      );
    }
    if (!funcType.dom.equals(argType)) {
      throw new Error(
        `TypeError at ${term.arg.pos.toString()}:\n`
      + `  expected: ${funcType.dom.toString()}\n`
      + `  actual  : ${argType.toString()}`
      );
    }
    return funcType.codom;
  }
  else if (term instanceof IxTmTyAbs) {
    const bodyType = deduceIxType(
      context.unshift(new IxTyBinding()),
      term.body
    );
    return new IxTyAll(term.pos, bodyType);
  }
  else if (term instanceof IxTmTyApp) {
    const funcType = deduceIxType(context, term.func);
    if (!(funcType instanceof IxTyAll)) {
      throw new Error(
          `TypeError at ${term.func.pos.toString()}:\n`
        + "  expected: forall. ?\n"
        + `  actual  : ${funcType.toString()}`
      );
    }
    return funcType.body.subst(0, term.arg.shift(0, 1)).shift(1, -1);
  }
  else {
    throw new Error("unknown term");
  }
}

export function deduceType(context: Context, term: Term): Type {
  const ixterm    = toIndexedTerm(context, term);
  const ixcontext = toIndexedContext(context);
  const ixtype    = deduceIxType(ixcontext, ixterm);
  return fromIndexedType(context, ixtype);
}
