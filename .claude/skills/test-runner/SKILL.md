---
name: test-runner
description: Run tests related to the current work - specific file, directory, or full suite
---

# Test Runner

When invoked, determine which tests to run based on context:

- If working on a specific file, run its matching test: `npx jest --testPathPattern="<filename>" --no-coverage`
- If working on a directory (e.g., core/services), run: `npx jest --testPathPattern="src/__tests__/core/services" --no-coverage`
- If no context, run the full suite: `npx jest --no-coverage`
- Always use `--no-coverage` for speed unless explicitly asked for coverage
- On failure, show the failing test name and relevant assertion diff
