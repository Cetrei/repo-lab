# Conventions

## Architecture

1. Every constant that drives a calculation lives in `data/*.yaml` with its source. Engines in `libs/repo_core` contain formulas only. A contribution to the numbers is a data edit.
2. `repo_core` is the single source of domain logic. It is never rewritten in TypeScript.
3. Seams are `Protocol` or `ABC` types: `Catalog`, `Handler`, and the web `Transport`. The browser uses a Pyodide transport, local development can use an HTTP transport against `apps/api`. Both answer with the same envelope: `{ok: true, data}` or `{ok: false, error: {code, message}}`.
4. The contract is zod in `packages/contract`. It is validated against golden JSON fixtures produced by Python (`scripts/gen_fixtures.py`), so both languages are tested on the same cases. A test fails when the fixtures are out of date.
5. Unknown is not guessed. A value no source states stays empty and the UI says so.

## Python

Python 3.12 or newer, typed, `ruff` and `mypy --strict` clean. Tests use `unittest`. Errors the domain raises on purpose derive from `DomainError` and carry a stable `code`.

## Web

React and TypeScript, plain CSS driven by semantic tokens in `styles/tokens.css`. Rules taken from the Design System Blueprint PDF: no hex values outside the token file, a 4px spacing scale, a fixed type scale, every component documents default, hover, active, focus and disabled, motion between 100 and 400 ms with ease out to enter and ease in to leave, touch targets of at least 44px, one icon library (lucide), prefers-reduced-motion respected. Its palette and typeface are not used: the look comes from the R.E.P.O. game UI.

## Git

Conventional Commits, checked by commitlint. Work lands in small commits on `master`. Nothing is pushed without the owner's confirmation.
