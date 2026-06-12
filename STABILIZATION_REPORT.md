# DIGITAL EVIDENCE - STABILIZATION REPORT

Date: 2026-06-12  
Mode: analysis only. No source code modification, package installation, build execution, or file deletion was performed.

## Scope

Read inputs:

- `PROJECT_STATUS.md`
- `REPOSITORY_ANALYSIS.md`
- `NEXT_ACTION.md`
- `VERIFY_REPORT.md`

Additional read-only evidence:

- `git status --short`
- `git diff --stat`
- package manifests, README files, `.gitignore`, `.env.example`, `docker-compose.yml`
- targeted `rg` searches for routes, tests, mock/placeholder data, packaging, and runtime endpoints

## Executive Assessment

The repo is not blocked by lack of implementation. It is blocked by stabilization proof and release discipline.

Best 3 stabilization priorities:

1. Lock the current working tree scope before more feature work. The repo has source changes, DB changes, generated artifacts, and new docs mixed together.
2. Close the Chat Mode acceptance gate with real browser evidence: preview, PDF export, and Send Project must be verified as one flow.
3. Remove demo-grade forensic metadata before production claims: hardcoded hash, hardcoded case/date, default bank values, mock NotebookLM content, and unproven SFX/WinRAR behavior.

## Current Stabilization State

| Area | Status | Stabilization finding |
|---|---|---|
| SPA primary path | Directionally stable | `Create Single Page Website/README.md` marks SPA as primary and Electron deferred. |
| Chat Mode | Implemented but not closed | Code shares `paginatedPages`/`canvasDataUrl`, but runtime acceptance remains pending. |
| Slip Mode OCR | MVP-ready path | Backend uses Google Vision plus rule-based parser, but external credentials and live provider state remain runtime dependencies. |
| PDF export | Implemented | Needs evidence that PDF materially matches preview for regression samples. |
| Send Project | Implemented | Needs real archive validation for ZIP/RAR, including download filename, archive content, and RAR dependency behavior. |
| Backend routes | Present | Routes exist for `/`, `/health`, `/api/ocr`, `/api/package-project`. |
| Release state | Unstable | Dirty worktree, tracked DB, generated artifacts, and multiple app entrypoints create release ambiguity. |

## Risks Identified

1. Acceptance risk: Chat Mode can look implemented while still failing page overlap, export parity, or archive packaging in the real UI.
2. Evidence integrity risk: forensic hash is hardcoded in backend and local OCR fallback, so output can misrepresent evidence authenticity.
3. Release hygiene risk: source changes, generated files, local DBs, outputs, screenshots, and docs are mixed in one dirty worktree.
4. Runtime dependency risk: Google credentials, backend port 5000, SPA dev server, WinRAR/Rar.exe, and local file paths are not isolated behind a robust config contract.
5. Architecture drift risk: root Electron package, SPA, StartUp runtime, docker-compose/celery stack, and loose root static files all exist with unclear ownership.
6. Documentation drift risk: `.env.example` only shows `BOT_API_KEY` and `PORT=4000`, while the active OCR/backend flow needs different variables and service-account handling.
7. Build/release risk: `npm.cmd run verify` invokes `vite build`, which writes output; release verification is not separated into read-only typecheck vs build artifact generation.
8. Security risk: service-account JSON exists locally. It is ignored now, but any previously tracked credential should be considered exposed.

## Architecture Weaknesses

| Weakness | Evidence | Impact |
|---|---|---|
| Multiple product entrypoints | Root `package.json` says Electron; SPA README says SPA first; `StartUp` has its own Electron processor; root `index.html/script.js/styles.css` also exist. | Contributors can run or release the wrong app. |
| Hardcoded local endpoints | SPA calls `http://localhost:5000/api/ocr`, `http://localhost:5000/api/package-project`, and some components reference `localhost:4000`. | Environment changes break runtime and tests. |
| Backend combines concerns | `thai_ocr_project/app.py` handles CORS, upload, OCR, DB write, batch concurrency, report shape, and packaging. | Hard to test and stabilize independently. |
| Forensic model not formalized | Hash/case/date fields are hardcoded or defaulted, not controlled by an audit schema. | Evidence output can look official before it is technically defensible. |
| Docker stack appears stale or incomplete | `docker-compose.yml` references build context and `tasks.celery_app`, but read-only file search did not find `Dockerfile` or `tasks.py`. | Docker release path is likely non-runnable without missing files. |
| UI claims exceed proven runtime | NotebookLM mock content references trained YOLO, bank API checks, and court compliance. | Creates production/legal credibility risk. |

## Technical Debt Summary

High-priority debt:

- Hardcoded `integrity_hash`, `DE-2026-0528`, `28 MAY 2026`, SCB fallback, and confidence fallback values.
- Dirty tracked SQLite DB: `thai_ocr_project/digital_evidence.db`.
- Mixed package managers/config signals: npm lockfiles plus `pnpm-workspace.yaml`.
- Stale generated folders and artifacts in repo root and StartUp.
- Large `App.tsx` orchestration surface: upload, segmentation, OCR, export, package modal, and state management in one component.

Medium-priority debt:

- `Create Single Page Website/README.md` still mentions browser-side OCR fallback, while current UI error says backend/local fallback failed.
- `.env.example` does not document `GOOGLE_APPLICATION_CREDENTIALS`, `DIGITAL_EVIDENCE_OCR_LOCALONLY`, `DIGITAL_EVIDENCE_OCR_DEBUG`, `SLIP_BATCH_MAX_CONCURRENCY`, or backend port expectations.
- `test_ui.js` targets `localhost:5174` and external screenshot destination paths, not the documented `5173` flow.
- `docker-compose.yml` contains a separate Postgres/Redis/Celery architecture not aligned with current SQLite/Flask local backend docs.

## Missing Tests

Critical missing tests:

1. Chat Mode browser acceptance test proving preview page count, PDF download, and archive download from the current UI.
2. Chat pagination regression fixture set with official sample filenames and expected page boundaries.
3. Export parity test comparing preview `PageSegment.canvasDataUrl` pages to PDF-rendered pages.
4. Packaging tests for `/api/package-project` covering ZIP content, RAR missing dependency, RAR password mode, filename sanitization, and artifacts inclusion.
5. Real hash test proving backend computes SHA-256 from uploaded bytes and returns/stores the same value.
6. Config tests ensuring backend URL and port come from environment/config rather than scattered literals.
7. Release smoke test for the exact documented start commands.

Existing tests cover useful pieces:

- Slip parser edge cases
- Lawyer CLI dedup/report logic
- Batch OCR API response shape with mocks
- StartUp layout fit test
- Some manual/debug scripts in `tmp-tests`

But the core SPA Chat Mode workflow is still not covered by a formal tracked test suite.

## Missing Documentation

Required stabilization docs:

1. Root `README.md`: canonical entrypoint, what is active, what is deprecated/deferred.
2. `RUNBOOK.md`: exact commands to start SPA/backend, expected ports, credentials, health checks.
3. `ENVIRONMENT.md`: every env var, examples, and secret handling/rotation guidance.
4. `API_CONTRACT.md`: `/api/ocr` and `/api/package-project` request/response schema.
5. `EVIDENCE_AUDIT_SPEC.md`: hash rules, case number rules, timestamp rules, review status semantics.
6. `TEST_FIXTURES.md`: official chat/slip samples, expected outputs, expected page counts.
7. `RELEASE_CHECKLIST.md`: clean-worktree gate, typecheck/build/test gates, artifact policy, credential policy.
8. `ARCHITECTURE_DECISION.md`: SPA-first, Electron deferred, StartUp status, Docker status.

## Build / Release Risks

| Risk | Evidence | Required stabilization |
|---|---|---|
| Build writes output | `verify` is `npm run typecheck && npm run build`; `dist` exists locally. | Separate read-only checks from artifact-producing release builds. |
| Wrong app can be released | Root package says Electron; SPA is documented as primary. | Document one canonical release path. |
| Docker release path likely stale | Compose references missing Celery task module/Dockerfile by current file search. | Either repair Docker path or mark it deprecated. |
| Runtime ports are hardcoded | SPA and components reference ports 5000/4000; test script references 5174. | Centralize config and document port matrix. |
| Generated artifacts are mixed in repo | `outputs`, `tmp-tests`, screenshots, PSD, WAV, DB files present. | Define artifact policy and cleanup/ignore strategy. |
| Credentials local state affects release | `.env` and service-account JSON exist locally. | Use env docs, secret rotation, and pre-commit checks. |

## Stabilization Plan

1. Freeze scope:
   - Decide which dirty files belong to active Chat Mode work.
   - Keep DB/generated/local files out of source commits.
   - Record current release entrypoint as SPA only.

2. Prove core workflow:
   - Run approved build/test gates.
   - Run browser acceptance for Chat preview, PDF export, and package download.
   - Capture deterministic evidence and expected outputs.

3. Harden forensic output:
   - Replace hardcoded hash/case/date/default values.
   - Define audit schema and tests.
   - Remove or clearly label mock NotebookLM/provenance claims.

4. Release cleanup:
   - Align `.env.example`, README, API contract, and release checklist.
   - Resolve Docker/StartUp/root Electron status.
   - Require clean-worktree gate before release.

## /GOAL

Stabilize the repo from MVP/demo into a defensible SPA-first evidence workflow.

## /SCHEDULE

1. Scope freeze and artifact hygiene.
2. Chat Mode acceptance proof.
3. Forensic metadata hardening.

## /Grill-me

- Which entrypoint is allowed to be released first: SPA only, StartUp, or Electron wrapper?
- Which sample chat/slip files are the official regression fixtures?
- Should Docker and root Electron be fixed now or explicitly marked deferred?
