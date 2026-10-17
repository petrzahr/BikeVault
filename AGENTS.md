# BikeVault

No own database: primary data lives in a file on the user's Google Drive. Only Strava tokens are stored server-side.

## Stack
- Next.js 15 (App Router, `src/app`) + React 19, TypeScript 5.7, npm
- Tailwind CSS 3.4 + PostCSS + Autoprefixer; clsx + tailwind-merge; icons from lucide-react
- Validation: Zod 3
- Hosting: Vercel (no `vercel.json` in repo)
- Server-side token store: Upstash Redis (Vercel KV) via REST - `stravaTokenStore.ts`

## Commands
- Dev: `npm run dev`
- Build / regression check: `npm run build`. Must pass before every commit.
- Tests: `npm test` (custom tsx scripts in `tests/`, no test framework). Must pass before every commit.
- Lint: `next lint` has no ESLint config yet - don't run it or set it up without asking.

## Integrations (plain fetch, no SDKs)
- Strava API: OAuth with server-side callback `src/app/api/strava/callback`, code in `src/lib/strava/`.
- Google Identity Services: client-side sign-in, script loaded in `layout.tsx`.
- Google Drive API v3, scope `drive.file` only: data sync in `driveSync.ts`.
- Keep using plain REST via fetch. Don't add official SDKs (googleapis, strava libs) without approval.

## Architecture Rules
- Server Components by default; add `"use client"` only where interactivity requires it.
- Anything touching Strava client secret or the token store is server-only (route handlers / server code). Never import it into client components.
- Validate all external data with Zod: Strava/Drive API responses, route handler input, data read from the Drive file.
- No database or new storage service without approval.

## Data & Sync Rules (high risk - user data)
- The Drive file is the single source of truth. Any change to its data shape needs a versioned migration and backward compatibility - put it in the plan and wait for approval.
- Never overwrite or delete user data on Drive without a safe merge/conflict strategy.
- Google scope stays `drive.file`. Never add broader Drive scopes.

## Security
- Secrets only in env vars (`.env.local` locally, Vercel Environment Variables in deploys): Strava client secret, KV/Upstash tokens.
- Only `NEXT_PUBLIC_*` vars may reach the client - never prefix secrets with it.
- Never log access/refresh tokens or user data.
- Strava OAuth: always validate the `state` parameter in the callback; handle token refresh and revoked access gracefully.
- New env vars must be added to `.env.example` and to Vercel (Preview + Production).

## Bug Fixing
- Confine edits to the files actually causing the issue.
- Add a test script in `tests/` reproducing the bug when practical and include it in `npm test`.
- Verify with `npm run build` and `npm test` before reporting the bug as fixed.

## Git Workflow
- Work on the `develop` branch.
- After an approved task is implemented and build + tests pass, automatically:
  - Check changed files with `git status`.
  - Stage only the changes belonging to the approved task and create a local commit (Conventional Commits).

## Context Preservation & File Exclusions
To conserve token limits and avoid context rot:
- Don't open or analyze:
  - Build/compiler directories: .next/, dist/, build/, out/
  - Package dependencies: node_modules/
  - Lockfiles: package-lock.json, pnpm-lock.yaml, yarn.lock
  - Large binary/vector assets: *.svg, *.png, *.jpg, *.ico
- If dependency information is needed, refer only to package.json.

## Working Style
- Start from the files named in the prompt or stack trace, and widen the investigation only as needed.
- Don't refactor surrounding code or reformat unrelated lines.
- Keep explanations concise; don't redesign for speculative edge cases.
