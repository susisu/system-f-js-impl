// @flow

import {
  generateTyVarName,
  generateTmVarName
} from "./common.js";
import {
  Type,
  TyVar,
  TyArr,
  TyAll
} from "./type.js";
import {
  Term,
  TmVar,
  TmAbs,
  TmApp,
  TmTyAbs,
  TmTyApp,
  TyBinding,
  TmBinding,
  TmBindingWithTerm,
  findTyVarIndex,
  findTmVarIndex,
  getTyBinding,
  getTmBinding
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
  Term              as IxTerm,
  TmVar             as IxTmVar,
  TmAbs             as IxTmAbs,
  TmApp             as IxTmApp,
  TmTyAbs           as IxTmTyAbs,
  TmTyApp           as IxTmTyApp,
  TyBinding         as IxTyBinding,
  TmBinding         as IxTmBinding,
  TmBindingWithTerm as IxTmBindingWithTerm,
  emptyContext      as emptyIxContext
} from "./ixterm.js";
import type {
  Context as IxContext
} from "./ixterm.js";

// conversion from term to indexed term
export function toIndexedType(context: Context, type: Type): IxType {
  if (type instanceof TyVar) {
    const index = findTyVarIndex(context, type.name);
    if (index < 0) {
      throw new ReferenceError(
          `ReferenceError at ${type.pos.toString()}:\n`
        + `  unbound type variable: ${type.name}`
      );
    }
    return new IxTyVar(type.pos, index);
  }
  else if (type instanceof TyArr) {
    return new IxTyArr(
      type.pos,
      toIndexedType(context, type.dom),
      toIndexedType(context, type.codom)
    );
  }
  else if (type instanceof TyAll) {
    return new IxTyAll(
      type.pos,
      toIndexedType(
        context.unshift(new TyBinding(type.paramName)),
        type.body
      )
    );
  }
  else {
    throw new Error("unknown type");
  }
}

export function toIndexedTerm(context: Context, term: Term): IxTerm {
  if (term instanceof TmVar) {
    const index = findTmVarIndex(context, term.name);
    if (index < 0) {
      throw new ReferenceError(
          `ReferenceError at ${term.pos.toString()}:\n`
        + `  unbound variable: ${term.name}`
      );
    }
    return new IxTmVar(term.pos, index);
  }
  else if (term instanceof TmAbs) {
    return new IxTmAbs(
      term.pos,
      toIndexedType(context, term.paramType),
      toIndexedTerm(
        context.unshift(new TmBinding(term.paramName, term.paramType)),
        term.body
      )
    );
  }
  else if (term instanceof TmApp) {
    return new IxTmApp(
      term.pos,
      toIndexedTerm(context, term.func),
      toIndexedTerm(context, term.arg)
    );
  }
  else if (term instanceof TmTyAbs) {
    return new IxTmTyAbs(
      term.pos,
      toIndexedTerm(
        context.unshift(new TyBinding(term.paramName)),
        term.body
      )
    );
  }
  else if (term instanceof TmTyApp) {
    return new IxTmTyApp(
      term.pos,
      toIndexedTerm(context, term.func),
      toIndexedType(context, term.arg)
    );
  }
  else {
    throw new Error("unknown term");
  }
}

export function toIndexedContext(context: Context): IxContext {
  let ixcontext = emptyIxContext();
  let rest = context;
  while (rest.size > 0) {
    const b = rest.first();
    rest    = rest.shift();
    if (b instanceof TyBinding) {
      ixcontext = ixcontext.unshift(new IxTyBinding());
    }
    else if (b instanceof TmBinding) {
      if (b instanceof TmBindingWithTerm) {
        const ixtype = toIndexedType(rest, b.type);
        const ixterm = toIndexedTerm(rest, b.term);
        ixcontext = ixcontext.unshift(new IxTmBindingWithTerm(ixtype, ixterm));
      }
      else {
        const ixtype = toIndexedType(rest, b.type);
        ixcontext = ixcontext.unshift(new IxTmBinding(ixtype));
      }
    }
    else {
      throw new Error("unknown binding");
    }
  }
  return ixcontext.reverse();
}

// conversion from indexed term to ordinary term
function _fromIndexedType(context: Context, id: number, type: IxType): [number, Type] {
  if (type instanceof IxTyVar) {
    return [id, new TyVar(type.pos, getTyBinding(context, type.index).name)];
  }
  else if (type instanceof IxTyArr) {
    const [id1, dom]   = _fromIndexedType(context, id, type.dom);
    const [id2, codom] = _fromIndexedType(context, id1, type.codom);
    return [id2, new TyArr(type.pos, dom, codom)];
  }
  else if (type instanceof IxTyAll) {
    const [id1, paramName] = [id + 1, generateTyVarName(id)];
    const [id2, body]      = _fromIndexedType(
      context.unshift(new TyBinding(paramName)),
      id1,
      type.body
    );
    return [id2, new TyAll(type.pos, paramName, body)];
  }
  else {
    throw new Error("unknown type");
  }
}

function _fromIndexedTerm(
  context: Context, tyid: number, tmid: number, term: IxTerm
): [number, number, Term] {
  if (term instanceof IxTmVar) {
    return [tyid, tmid, new TmVar(term.pos, getTmBinding(context, term.index).name)];
  }
  else if (term instanceof IxTmAbs) {
    const [tyid1, paramType]   = _fromIndexedType(context, tyid, term.paramType);
    const [tmid1, paramName]   = [tmid + 1, generateTmVarName(tmid)];
    const [tyid2, tmid2, body] = _fromIndexedTerm(
      context.unshift(new TmBinding(paramName, paramType)),
      tyid1,
      tmid1,
      term.body
    );
    return [tyid2, tmid2, new TmAbs(term.pos, paramName, paramType, body)];
  }
  else if (term instanceof IxTmApp) {
    const [tyid1, tmid1, func] = _fromIndexedTerm(context, tyid, tmid, term.func);
    const [tyid2, tmid2, arg]  = _fromIndexedTerm(context, tyid1, tmid1, term.arg);
    return [tyid2, tmid2, new TmApp(term.pos, func, arg)];
  }
  else if (term instanceof IxTmTyAbs) {
    const [tyid1, tmid1, paramName] = [tyid + 1, tmid, generateTyVarName(tyid)];
    const [tyid2, tmid2, body]      = _fromIndexedTerm(
      context.unshift(new TyBinding(paramName)),
      tyid1,
      tmid1,
      term.body
    );
    return [tyid2, tmid2, new TmTyAbs(term.pos, paramName, body)];
  }
  else if (term instanceof IxTmTyApp) {
    const [tyid1, tmid1, func] = _fromIndexedTerm(context, tyid, tmid, term.func);
    const [tyid2, arg]         = _fromIndexedType(context, tyid1, term.arg);
    return [tyid2, tmid1, new TmTyApp(term.pos, func, arg)];
  }
  else {
    throw new Error("unknown term");
  }
}

export function fromIndexedType(context: Context, type: IxType): Type {
  return _fromIndexedType(context, 0, type)[1];
}

export function fromIndexedTerm(context: Context, term: IxTerm): Term {
  return _fromIndexedTerm(context, 0, 0, term)[2];
}
