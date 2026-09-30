# bystander-intervention: working rules

Vanilla ES modules, no bundler, no build step.

## Comments
A comment earns its place by giving a reader something the code can't. First try to say it in code: rename, extract, name the constant, assert or test it. Keep a comment only for a reason, contract or constraint a reader couldn't deduce from the code beside it: present tense, a sentence or two. Interface comments state the contract, not the mechanism. A date, PR number, name, spec ID or "fixed/changed/was" narrates history: rewrite around the constraint. History lives in git log; rationale a future reader needs lives in the code. Delete, don't rewrite, a comment that restates a name, initialiser or type (however phrased, "contract" included), contrasts with a rejected alternative ("X, not Y"), or justifies dead code: delete the dead code with it. A rewrite carries no version, spec ID, agent, session or tool name, and drops any claim you can't check against the code. Leave a comment that already passes alone.

## Before you push
- `node verify.mjs` and `node verify-axe.mjs` pass (they need `jsdom` and `axe-core` installed locally).
- If you only edited comments, the code with comments stripped is identical before and after.

## Leave alone
`?v=` cache-bust tokens on imports are functional.

## Code
- Name length scales with scope: short in a 2-3 line scope, explicit for module-level names.
- Extract a block when a name can carry its intent. Stop when the extract only delegates.
- One change at a time: no refactor inside a feature commit.
