---
name: deploy-firebase
description: Use when deploying Vnext-Football-Hub to Firebase (Hosting + Cloud Functions), or when a Firebase deploy in this repo fails or behaves unexpectedly.
---

# Deploy Vnext-Football-Hub to Firebase

## Overview

This repo (Firebase project `vnext-football-hub`) deploys Hosting + Cloud
Functions via the Firebase CLI. It also has GitHub Actions that
auto-deploy Hosting on push to `main` — see the CI gotcha below before
pushing.

## Prerequisites

- Two files are required but **gitignored** (not in git, not on a fresh
  machine): `.env` and `firebaseConfig.ts`. If missing, recreate them:
  - `firebaseConfig.ts`: run `firebase apps:list` to get the WEB app id,
    then `firebase apps:sdkconfig WEB <appId>` and wrap the JSON in
    `export const firebaseConfig = { ... };`.
  - `.env`: needs `QWEN_API_KEY` (AI analysis — Qwen Cloud/DashScope,
    replaces the old `GEMINI_API_KEY`), optional `QWEN_API_KEY_2`
    (fallback key), `FOOTBALL_DATA_API_KEY`, `THE_ODDS_API_KEY`. The
    latter two only gate a client-side feature flag — the real values
    Cloud Functions use live in Firebase Secret Manager already, set via
    `firebase functions:secrets:set <NAME>`.
- `firebase login` **cannot run inside the Claude Code Bash tool** (no
  TTY → "Cannot run login in non-interactive mode"). Ask the user to
  open a real terminal window and run `firebase login --reauth` there.
  Verify with `firebase projects:list` — the target project must show
  `(current)`.

## Deploy Steps

```bash
npm install
npm run build                      # client → dist/
cd functions && npm install && npm run build && cd ..   # functions → lib/
firebase deploy
```

(`npm run deploy:all` in package.json does the same, minus the root
`npm install`.)

## Common Gotcha: Stale Cloud Functions

If a function was removed from `functions/src/index.ts` in a past
commit but never deployed since, `firebase deploy` aborts:

```
Error: The following functions are found in your project but do not
exist in your local source code: ...
Aborting because deletion cannot proceed in non-interactive mode.
```

This is destructive (deletes a live Cloud Function) — confirm with the
user before running the suggested fix, then redeploy:

```bash
firebase functions:delete <name1> <name2> --region us-central1 --force
firebase deploy
```

## Critical Gotcha: CI Silently Ships a Build Without AI Keys

`.github/workflows/firebase-hosting-merge.yml` redeploys Hosting on
every push to `main` via `npm ci && npm run build`, with **no env vars
passed in** — GitHub Actions has no `.env` file and no `QWEN_API_KEY`
secret configured. That build bakes in an empty AI key, silently
disabling "AI Match Analysis" on the live site and overwriting any
manually-deployed build that had the key.

Before relying on push-to-deploy for Hosting: add `QWEN_API_KEY` (and
`QWEN_API_KEY_2` if used) as a GitHub Actions repository secret, and
pass it to the build step in both workflow files, e.g.:

```yaml
- run: npm ci && npm run build
  env:
    QWEN_API_KEY: ${{ secrets.QWEN_API_KEY }}
```

Until that's wired up, prefer the manual `firebase deploy` steps above
for Hosting, or expect the AI feature to go dark after the next push to
`main`.

## Quick Reference

| Task | Command |
|---|---|
| Check logged-in account / project access | `firebase projects:list` |
| Get Web SDK config (for `firebaseConfig.ts`) | `firebase apps:list` then `firebase apps:sdkconfig WEB <appId>` |
| Full deploy | `firebase deploy` |
| Hosting only | `firebase deploy --only hosting` (or `npm run deploy:hosting`) |
| Functions only | `firebase deploy --only functions` (or `npm run deploy:functions`) |
| List/delete a stray function | `firebase functions:list` / `firebase functions:delete <name> --region us-central1 --force` |
