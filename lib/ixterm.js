// @flow

import chalk from "chalk";

import { Stack } from "immutable";

import type { Showable } from "./common.js";
import { Type } from "./ixtype.js";

export class Term {
  pos: Showable;

  constructor(pos: Showable) {
    this.pos = pos;
  }

  toString(): string {
    throw new Error("not implemented");
  }

  shift(c: number, d: number): Term {
    throw new Error("not implemented");
  }

  subst(index: number, term: Term): Term {
    throw new Error("not implemented");
  }

  substType(index: number, type: Type): Term {
    throw new Error("not implemented");
  }

  reduce(context: Context): Term {
    throw new Error("not implemented");
  }
}

export class TmVar extends Term {
  index: number;

  constructor(pos: Showable, index: number) {
    super(pos);
    this.index = index;
  }

  toString(): string {
    return this.index.toString();
  }

  shift(c: number, d: number): Term {
    return this.index >= c
      ? new TmVar(this.pos, this.index + d)
      : this;
  }

  subst(index: number, term: Term): Term {
    return this.index === index
      ? term
      : this;
  }

  substType(index: number, type: Type): Term {
    return this;
  }

  reduce(context: Context): Term {
    const b = getTmBinding(context, this.index);
    if (b instanceof TmBindingWithTerm) {
      return b.term.shift(0, this.index + 1).reduce(context);
    }
    else {
      return this;
    }
  }
}

export class TmAbs extends Term {
  paramType: Type;
  body: Term;

  constructor(pos: Showable, paramType: Type, body: Term) {
    super(pos);
    this.paramType = paramType;
    this.body      = body;
  }

  toString(): string {
    return chalk.green("fun")
      + ": " + chalk.bold(this.paramType.toString())
      + ". " + this.body.toString();
  }

  shift(c: number, d: number): Term {
    return new TmAbs(
      this.pos,
      this.paramType.shift(c, d),
      this.body.shift(c + 1, d)
    );
  }

  subst(index: number, term: Term): Term {
    return new TmAbs(
      this.pos,
      this.paramType,
      this.body.subst(index + 1, term.shift(0, 1))
    );
  }

  substType(index: number, type: Type): Term {
    return new TmAbs(
      this.pos,
      this.paramType.subst(index, type),
      this.body.substType(index + 1, type.shift(0, 1))
    );
  }

  reduce(context: Context): Term {
    return new TmAbs(
      this.pos,
      this.paramType,
      this.body.reduce(context.unshift(new TmBinding(this.paramType)))
    );
  }
}

export class TmApp extends Term {
  func: Term;
  arg: Term;

  constructor(pos: Showable, func: Term, arg: Term) {
    super(pos);
    this.func = func;
    this.arg  = arg;
  }

  toString(): string {
    const funcStr
      = this.func instanceof TmVar || this.func instanceof TmApp || this.func instanceof TmTyApp
      ? this.func.toString()
      : "(" + this.func.toString() + ")";
    const argStr = this.arg instanceof TmVar
      ? this.arg.toString()
      : "(" + this.arg.toString() + ")";
    return funcStr + " " + argStr;
  }

  shift(c: number, d: number): Term {
    return new TmApp(
      this.pos,
      this.func.shift(c, d),
      this.arg.shift(c, d)
    );
  }

  subst(index: number, term: Term): Term {
    return new TmApp(
      this.pos,
      this.func.subst(index, term),
      this.arg.subst(index, term)
    );
  }

  substType(index: number, type: Type): Term {
    return new TmApp(
      this.pos,
      this.func.substType(index, type),
      this.arg.substType(index, type)
    );
  }

  reduce(context: Context): Term {
    const func = this.func.reduce(context);
    const arg  = this.arg.reduce(context);
    if (func instanceof TmAbs) {
      return func.body.subst(0, arg.shift(0, 1))
        .shift(1, -1)
        .reduce(context);
    }
    else {
      return new TmApp(this.pos, func, arg);
    }
  }
}

export class TmTyAbs extends Term {
  body: Term;

  constructor(pos: Showable, body: Term) {
    super(pos);
    this.body = body;
  }

  toString(): string {
    return chalk.cyan("fun2") + ". " + this.body.toString();
  }

  shift(c: number, d: number): Term {
    return new TmTyAbs(
      this.pos,
      this.body.shift(c + 1, d)
    );
  }

  subst(index: number, term: Term): Term {
    return new TmTyAbs(
      this.pos,
      this.body.subst(index + 1, term.shift(0, 1))
    );
  }

  substType(index: number, type: Type): Term {
    return new TmTyAbs(
      this.pos,
      this.body.substType(index + 1, type.shift(0, 1))
    );
  }

  reduce(context: Context): Term {
    return new TmTyAbs(
      this.pos,
      this.body.reduce(context.unshift(new TyBinding()))
    );
  }
}

export class TmTyApp extends Term {
  func: Term;
  arg: Type;

  constructor(pos: Showable, func: Term, arg: Type) {
    super(pos);
    this.func = func;
    this.arg  = arg;
  }

  toString(): string {
    const funcStr
      = this.func instanceof TmVar || this.func instanceof TmApp || this.func instanceof TmTyApp
      ? this.func.toString()
      : "(" + this.func.toString() + ")";
    return funcStr + " [" + chalk.bold(this.arg.toString()) + "]";
  }

  shift(c: number, d: number): Term {
    return new TmTyApp(
      this.pos,
      this.func.shift(c, d),
      this.arg.shift(c, d)
    );
  }

  subst(index: number, term: Term): Term {
    return new TmTyApp(
      this.pos,
      this.func.subst(index, term),
      this.arg
    );
  }

  substType(index: number, type: Type): Term {
    return new TmTyApp(
      this.pos,
      this.func.substType(index, type),
      this.arg.subst(index, type)
    );
  }

  reduce(context: Context): Term {
    const func = this.func.reduce(context);
    if (func instanceof TmTyAbs) {
      return func.body.substType(0, this.arg.shift(0, 1))
        .shift(1, -1)
        .reduce(context);
    }
    else {
      return new TmTyApp(this.pos, func, this.arg);
    }
  }
}

// bindings and context
export class Binding {
  constructor() {
  }
}

export class TyBinding extends Binding {
  constructor() {
    super();
  }
}

export class TmBinding extends Binding {
  type: Type;

  constructor(type: Type) {
    super();
    this.type = type;
  }
}

export class TmBindingWithTerm extends TmBinding {
  term: Term;

  constructor(type: Type, term: Term) {
    super(type);
    this.term = term;
  }
}

export type Context = Stack<Binding>;

export function emptyContext(): Context {
  return new Stack();
}

export function getTyBinding(context: Context, index: number): TyBinding {
  const b = context.get(index);
  if (b === undefined) {
    throw new RangeError("index out of range: " + index.toString());
  }
  if (b instanceof TyBinding) {
    return b;
  }
  else if (b instanceof TmBinding) {
    throw new Error("inconsistent binding: " + index.toString());
  }
  else {
    throw new Error("unknown binding");
  }
}

export function getTmBinding(context: Context, index: number): TmBinding {
  const b = context.get(index);
  if (b === undefined) {
    throw new RangeError("index out of range: " + index.toString());
  }
  if (b instanceof TyBinding) {
    throw new Error("inconsistent binding: " + index.toString());
  }
  else if (b instanceof TmBinding) {
    return b;
  }
  else {
    throw new Error("unknown binding");
  }
}
