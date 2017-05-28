An implementation of [System F](https://en.wikipedia.org/wiki/System_F) in JavaScript, for my practicing and learning it and its treatment.

``` shell
git clone https://github.com/susisu/system-f-js-impl.git
cd system-f-js-impl
npm install
npm start
```

## Syntax
```
t ::=              -- term
      x            -- variable
      fun x: T. t  -- abstraction
      t t          -- application
      fun2 X. t    -- type abstraction
      t [T]        -- type application

T ::=
      X            -- type variable
      T -> T       -- arrow type (for abstractions)
      forall X. T  -- universal type (for type abstractions)
```

## Instructions
```
Variable X;       -- assumes type variable X
Axiom x: T;       -- assumes variable x: T
Define x = t;     -- defines x = t
Theorem x: T = t; -- defines x = t and checks its type is T
Reduce t;         -- performs full beta-reduction
Print x;          -- prints term bound to x
Clear;            -- clears the context
```

## Example
```
> Variable False;
False is assumed.
> Axiom ex: forall X. False -> X;
ex: forall X. False -> X is assumed.
> Axiom dne: forall X. ((X -> False) -> False) -> X;
dne: forall X. ((X -> False) -> False) -> X is assumed.
> Theorem peirce: forall A, B. ((A -> B) -> A) -> A
| = fun2 A.
|   fun2 B.
|   dne [((A -> B) -> A) -> A] (
|     fun H: (((A -> B) -> A) -> A) -> False.
|     H (
|       fun H0: (A -> B) -> A.
|       H0 (
|         fun H1: A.
|         ex [B] (
|           H (
|             fun H2: (A -> B) -> A.
|             H1
|           )
|         )
|       )
|     )
|   );
peirce: forall A. forall B. ((A -> B) -> A) -> A is defined.
> Print peirce;
peirce: forall A. forall B. ((A -> B) -> A) -> A
= fun2 A. fun2 B. dne [((A -> B) -> A) -> A] (fun H: (((A -> B) -> A) -> A) -> False. H (fun H0: (A -> B) -> A. H0 (fun H1: A. ex [B] (H (fun H2: (A -> B) -> A. H1)))))
> Clear;
> Print peirce;
Reference Error at (line 1, column 1):
  unbound variable: peirce
> Define s = fun2 A, B, C. fun x: A -> B -> C, y : A -> B, z : A. x z (y z);
s: forall A. forall B. forall C. (A -> B -> C) -> (A -> B) -> A -> C is defined.
> Define k = fun2 A, B. fun x: A, y : B. x;
k: forall A. forall B. A -> B -> A is defined.
> Define i = fun2 A. fun x: A. x;
i: forall A. A -> A is defined.
> Reduce fun2 X. fun x: X. s [X] [X] [X] (k [X] [X]) (i [X]) x;
fun2 A. fun a: A. a
```
