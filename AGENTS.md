# AGENTS

## Purpose
This repo powers Factory. Agents should make safe, incremental changes with clear validation and documentation updates.

## Source of Truth
- Product intent: `docs/product-specs/`
- Architecture and technical decisions: `ARCHITECTURE.md` and `docs/design-docs/`
- Design system guidelines: `DESIGN.md`
- Active execution plans: `docs/exec-plans/active/`
- Software quality measurement:
  - `QUALITY_SCORE.md`
- Product sense and philosophy:
  - `PRODUCT_SENSE.md`
- Reliability and security constraints:
  - `RELIABILITY.md`
  - `SECURITY.md`

## Standard Workflow
1. Read relevant specs/plans before editing code.
2. Keep changes scoped to the task; avoid unrelated edits.
3. Implement with backward compatibility unless a plan explicitly allows breaking changes.
4. Add or update tests for behavior changes.
5. Run validation commands before finalizing.
6. Update docs impacted by the change.

## Development Commands
- Before running docker, make sure postgress connection is forwarded:
  - `cd ~/Kenzap/db-eu; kubectl --kubeconfig=kubeconfig-GJDmHH.yaml -n db-eu port-forward pod/pg-forward 5433:5432`
  - `docker compose up`
- Build project artifacts:
  - `./build.sh`

## Browser Debugging (Chrome DevTools)
- Use Chrome remote debugging for UI/runtime verification.
- Launch Chrome with remote debugging enabled:
  - `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-devtools`
- Ensure the app is running before inspection:
  - `docker compose up`
- Ensure the debugging endpoint is reachable:
  - `http://127.0.0.1:9222/json`
- When requesting browser verification, provide the target app URL and confirm the debugging endpoint is active.

## Validation Checklist
Run these before completion (as applicable):
- `./build.sh` completes successfully (required before production deployment).
- For new/changed API features: verify endpoint behavior with a real request and expected response shape.
- Check `docker compose` logs for runtime errors after exercising the changed flow.
- For UI-facing changes: check browser console for warnings/errors while testing the feature.
- Relevant tests pass for touched behavior.
- Lint/type checks pass if configured.
- No secrets, tokens, or credentials were added.
- Docs were updated for any behavior, API, config, or architecture changes.

## Coding Rules
- Prefer explicit, readable code over clever abstractions.
- Avoid broad refactors unless explicitly requested.
- Preserve public interfaces unless changes are planned and documented.
- Add concise comments only where logic is non-obvious.
- Place reusable backend helpers in `server/_/helpers/` and import them where needed instead of duplicating utility functions.

## Documentation Rules
- Product behavior changes: update `docs/product-specs/`.
- Technical design changes: update `ARCHITECTURE.md` and/or `docs/design-docs/`.
- Execution tracking:
  - Ongoing work in `docs/exec-plans/active/`
  - Move completed plans to `docs/exec-plans/completed/`
  - Track cross-cutting debt in `docs/exec-plans/tech-debt-tracker.md`

## Security Rules
- Never commit secrets, API keys, or credentials.
- Validate and sanitize external input.
- Use least-privilege defaults for config and access.
- Flag risky auth/data-access changes clearly in handoff notes.

## Definition of Done
- Requirements are implemented.
- Validation checklist is completed.
- Relevant docs are updated.
- Known risks/limitations are explicitly noted.
