// @flow

import { Stack } from "immutable";
import chalk from "chalk";

import type { Showable } from "./common.js";
import { Type } from "./type.js";

export class Term {
  pos: Showable;

  constructor(pos: Showable) {
    this.pos = pos;
  }

  toString(): string {
    throw new Error("not implemented");
  }
}

export class TmVar extends Term {
  name: string;

  constructor(pos: Showable, name: string) {
    super(pos);
    this.name = name;
  }

  toString(): string {
    return this.name;
  }
}

export class TmAbs extends Term {
  paramName: string;
  paramType: Type;
  body: Term;

  constructor(pos: Showable, paramName: string, paramType: Type, body: Term) {
    super(pos);
    this.paramName = paramName;
    this.paramType = paramType;
    this.body      = body;
  }

  toString(): string {
    return chalk.green("fun") + " " + this.paramName
      + ": " + chalk.bold(this.paramType.toString())
      + ". " + this.body.toString();
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
}

export class TmTyAbs extends Term {
  paramName: string;
  body: Term;

  constructor(pos: Showable, paramName: string, body: Term) {
    super(pos);
    this.paramName = paramName;
    this.body      = body;
  }

  toString(): string {
    return chalk.cyan("fun2") + " " + chalk.bold(this.paramName)
      + ". " + this.body.toString();
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
}

// bindings and context
export class Binding {
  constructor() {
  }
}

export class TyBinding extends Binding {
  name: string;

  constructor(name: string) {
    super();
    this.name = name;
  }
}

export class TmBinding extends Binding {
  name: string;
  type: Type;

  constructor(name: string, type: Type) {
    super();
    this.name = name;
    this.type = type;
  }
}

export class TmBindingWithTerm extends TmBinding {
  term: Term;

  constructor(name: string, type: Type, term: Term) {
    super(name, type);
    this.term = term;
  }
}

export type Context = Stack<Binding>;

export function emptyContext(): Context {
  return new Stack();
}

export function findTyVarIndex(context: Context, name: string): number {
  return context.findIndex(b => b instanceof TyBinding && b.name === name);
}

export function findTmVarIndex(context: Context, name: string): number {
  return context.findIndex(b => b instanceof TmBinding && b.name === name);
}

export function findTyBinding(context: Context, name: string): TyBinding | void {
  const b = context.find(b => b instanceof TyBinding && b.name === name);
  if (b instanceof TyBinding) {
    return b;
  }
  else {
    return undefined;
  }
}

export function findTmBinding(context: Context, name: string): TmBinding | void {
  const b = context.find(b => b instanceof TmBinding && b.name === name);
  if (b instanceof TmBinding) {
    return b;
  }
  else {
    return undefined;
  }
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
