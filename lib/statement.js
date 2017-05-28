// @flow

import chalk from "chalk";

import type {
  Showable
} from "./common.js";
import {
  Type
} from "./type.js";
import {
  Term,
  TyBinding,
  TmBinding,
  TmBindingWithTerm,
  emptyContext,
  findTmBinding
} from "./term.js";
import type {
  Context
} from "./term.js";
import {
  toIndexedType,
  toIndexedTerm,
  toIndexedContext,
  fromIndexedType,
  fromIndexedTerm
} from "./transform.js";
import {
  deduceIxType
} from "./typing.js";

// statement
export class Statement {
  pos: Showable;

  constructor(pos: Showable) {
    this.pos = pos;
  }

  exec(context: Context): Context {
    throw new Error("not implemented");
  }
}

export class Variable extends Statement {
  name: string;

  constructor(pos: Showable, name: string) {
    super(pos);
    this.name = name;
  }

  exec(context: Context): Context {
    process.stdout.write(`${chalk.bold(this.name)} is assumed.\n`);
    return context.unshift(new TyBinding(this.name));
  }
}

export class Axiom extends Statement {
  name: string;
  type: Type;

  constructor(pos: Showable, name: string, type: Type) {
    super(pos);
    this.name = name;
    this.type = type;
  }

  exec(context: Context): Context {
    process.stdout.write(`${this.name}: ${chalk.bold(this.type.toString())} is assumed.\n`);
    return context.unshift(new TmBinding(this.name, this.type));
  }
}

export class Theorem extends Statement {
  name: string;
  type: Type;
  term: Term;

  constructor(pos: Showable, name: string, type: Type, term: Term) {
    super(pos);
    this.name = name;
    this.type = type;
    this.term = term;
  }

  exec(context: Context): Context {
    try {
      const ixexpected = toIndexedType(context, this.type);
      const ixterm     = toIndexedTerm(context, this.term);
      const ixcontext  = toIndexedContext(context);
      const ixactual   = deduceIxType(ixcontext, ixterm);
      if (ixactual.equals(ixexpected)) {
        process.stdout.write(`${this.name}: ${chalk.bold(this.type.toString())} is defined.\n`);
        return context.unshift(new TmBindingWithTerm(this.name, this.type, this.term));
      }
      else {
        const actual = fromIndexedType(context, ixactual);
        process.stdout.write(
            `TypeError at ${this.pos.toString()}:\n`
          + "  defined type does not match\n"
          + `  expected: ${chalk.bold(this.type.toString())}\n`
          + `  actual  : ${chalk.bold(actual.toString())}\n`
        );
        return context;
      }
    }
    catch (err) {
      if (err instanceof Error) {
        process.stdout.write(err.message + "\n");
      }
      else {
        process.stdout.write(String(err) + "\n");
      }
      return context;
    }
  }
}

export class Define extends Statement {
  name: string;
  term: Term;

  constructor(pos: Showable, name: string, term: Term) {
    super(pos);
    this.name = name;
    this.term = term;
  }

  exec(context: Context): Context {
    try {
      const ixterm    = toIndexedTerm(context, this.term);
      const ixcontext = toIndexedContext(context);
      const ixtype    = deduceIxType(ixcontext, ixterm);
      const type      = fromIndexedType(context, ixtype);
      process.stdout.write(`${this.name}: ${chalk.bold(type.toString())} is defined.\n`);
      return context.unshift(new TmBindingWithTerm(this.name, type, this.term));
    }
    catch (err) {
      if (err instanceof Error) {
        process.stdout.write(err.message + "\n");
      }
      else {
        process.stdout.write(String(err) + "\n");
      }
      return context;
    }
  }
}

export class Reduce extends Statement {
  term: Term;

  constructor(pos: Showable, term: Term) {
    super(pos);
    this.term = term;
  }

  exec(context: Context): Context {
    try {
      const ixterm     = toIndexedTerm(context, this.term);
      const ixcontext  = toIndexedContext(context);
      const ixexpected = deduceIxType(ixcontext, ixterm);
      const ixreduced  = ixterm.reduce(ixcontext);
      const ixactual   = deduceIxType(ixcontext, ixreduced);
      if (ixactual.equals(ixexpected)) {
        const reduced = fromIndexedTerm(context, ixreduced);
        process.stdout.write(`${reduced.toString()}\n`);
      }
      else {
        const expected = fromIndexedType(context, ixexpected);
        const actual   = fromIndexedType(context, ixactual);
        process.stdout.write(
            `TypeError at ${this.pos.toString()}:\n`
          + "  something wrong happened while reduction"
          + `  expected: ${chalk.bold(expected.toString())}\n`
          + `  actual  : ${chalk.bold(actual.toString())}\n`
        );
        return context;
      }
    }
    catch (err) {
      if (err instanceof Error) {
        process.stdout.write(err.message + "\n");
      }
      else {
        process.stdout.write(String(err) + "\n");
      }
    }
    return context;
  }
}

export class Print extends Statement {
  name: string;

  constructor(pos: Showable, name: string) {
    super(pos);
    this.name = name;
  }

  exec(context: Context): Context {
    const b = findTmBinding(context, this.name);
    if (b === undefined) {
      process.stdout.write(
          `Reference Error at ${this.pos.toString()}:\n`
        + `  unbound variable: ${this.name}\n`
      );
    }
    else if (b instanceof TmBindingWithTerm) {
      process.stdout.write(
          `${this.name}: ${chalk.bold(b.type.toString())}\n`
        + `= ${b.term.toString()}\n`
      );
    }
    else {
      process.stdout.write(
          `${this.name}: ${chalk.bold(b.type.toString())}\n`
        + "= (assumed)\n"
      );
    }
    return context;
  }
}

export class Clear extends Statement {
  constructor(pos: Showable) {
    super(pos);
  }

  exec(context: Context): Context {
    return emptyContext();
  }
}
