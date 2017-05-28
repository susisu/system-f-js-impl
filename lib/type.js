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
}

export class TyVar extends Type {
  name: string;

  constructor(pos: Showable, name: string) {
    super(pos);
    this.name = name;
  }

  toString(): string {
    return this.name;
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
}

export class TyAll extends Type {
  paramName: string;
  body: Type;

  constructor(pos: Showable, paramName: string, body: Type) {
    super(pos);
    this.paramName = paramName;
    this.body      = body;
  }

  toString(): string {
    return chalk.yellow("forall") + " " + this.paramName
      + ". " + this.body.toString();
  }
}
