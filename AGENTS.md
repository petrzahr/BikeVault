# Agent Instructions & Context Budget Optimization

## Context Preservation & File Exclusions
To conserve token limits and avoid context rot:
- Don't open or analyze:
  - Build/compiler directories: .next/, dist/, build/, out/
  - Package dependencies: node_modules/
  - Lockfiles: package-lock.json, pnpm-lock.yaml, yarn.lock
  - Large binary/vector assets: *.svg, *.png, *.jpg, *.ico
- If dependency information is needed, refer only to package.json.

## Bug Fixing Protocol
1. Targeted Investigation: Start from the files named in the prompt or the stack trace, and widen only as far as the fix needs.
2. Minimal Changes: Do not refactor surrounding code or reformat unrelated lines.
3. Verification: Run project validation (e.g., linter or build step) using single-target execution instead of full test suites unless requested.
4. Explanations: Keep solutions and explanations concise; don't redesign for speculative edge cases.
