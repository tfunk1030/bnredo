---
name: check
description: Run typecheck and lint in parallel
---

# Quality Check

Run both checks and report results:

1. `npx tsc --noEmit` (typecheck)
2. `npx expo lint` (eslint)

Run both in parallel. Report errors from both. If clean, confirm all clear.
