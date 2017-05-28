// @flow

import chalk from "chalk";

import type { Showable } from "./common.js";

export class Type {
  pos: Showable;

  constructor(pos: Showable) {
    this.pos = pos;
  }

  toString(): string {
    throw new Error("not implemented");
  }

  shift(c: number, d: number): Type {
    throw new Error("not implemented");
  }

  subst(index: number, type: Type): Type {
    throw new Error("not implemented");
  }

  equals(type: Type): boolean {
    throw new Error("not implemented");
  }
}

export class TyVar extends Type {
  index: number;

  constructor(pos: Showable, index: number) {
    super(pos);
    this.index = index;
  }

  toString(): string {
    return this.index.toString();
  }

  shift(c: number, d: number): Type {
    return this.index >= c
      ? new TyVar(this.pos, this.index + d)
      : this;
  }

  subst(index: number, type: Type): Type {
    return this.index === index
      ? type
      : this;
  }

  equals(type: Type): boolean {
    return type instanceof TyVar
      && this.index === type.index;
  }
}

export class TyArr extends Type {
  dom: Type;
  codom: Type;

  constructor(pos: Showable, dom: Type, codom: Type) {
    super(pos);
    this.dom   = dom;
    this.codom = codom;
  }

  toString(): string {
    const domStr = this.dom instanceof TyVar
      ? this.dom.toString()
      : "(" + this.dom.toString() + ")";
    return domStr + " -> " + this.codom.toString();
  }

  shift(c: number, d: number): Type {
    return new TyArr(
      this.pos,
      this.dom.shift(c, d),
      this.codom.shift(c, d)
    );
  }

  subst(index: number, type: Type): Type {
    return new TyArr(
      this.pos,
      this.dom.subst(index, type),
      this.codom.subst(index, type)
    );
  }

  equals(type: Type): boolean {
    return type instanceof TyArr
      && this.dom.equals(type.dom) && this.codom.equals(type.codom);
  }
}

export class TyAll extends Type {
  body: Type;

  constructor(pos: Showable, body: Type) {
    super(pos);
    this.body = body;
  }

  toString(): string {
    return chalk.yellow("forall") + ". " + this.body.toString();
  }

  shift(c: number, d: number): Type {
    return new TyAll(
      this.pos,
      this.body.shift(c + 1, d)
    );
  }

  subst(index: number, type: Type): Type {
    return new TyAll(
      this.pos,
      this.body.subst(index + 1, type.shift(0, 1))
    );
  }

  equals(type: Type): boolean {
    return type instanceof TyAll
      && this.body.equals(type.body);
  }
}
