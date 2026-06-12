# DIGITAL EVIDENCE - RISK REGISTER

Date: 2026-06-12  
Mode: analysis only. No source code changes.

Risk scale:

- Severity: Critical, High, Medium, Low
- Likelihood: High, Medium, Low
- Status: Open until an acceptance gate proves otherwise

## Risk Register

| ID | Risk | Severity | Likelihood | Evidence | Mitigation | Owner Area | Status |
|---|---|---:|---:|---|---|---|---|
| R-001 | Chat Mode marked complete without real preview/export/package proof | Critical | High | Docs state Chat Mode is not closed; code exists but runtime flow not accepted. | Browser acceptance test with official fixtures, PDF download, archive download, page parity checks. | SPA | Open |
| R-002 | Hardcoded forensic hash misrepresents evidence integrity | Critical | High | `integrity_hash` hardcoded in `thai_ocr_project/app.py`, `thai_ocr_project/main.py`, and `localOcr.ts`. | Compute SHA-256 from uploaded bytes, store and return actual hash, add tests. | Backend / Evidence model | Open |
| R-003 | Dirty worktree mixes unrelated source, DB, generated files, and docs | High | High | `git status --short` shows many modified source files plus untracked artifacts and docs. | Freeze scope, split commits, remove generated/local artifacts from source changes. | Repo hygiene | Open |
| R-004 | Tracked SQLite DB can leak local/runtime data or churn commits | High | High | `git ls-files` lists `thai_ocr_project/digital_evidence.db`; `.gitignore` ignores `*.db` but tracked DB remains. | Decide seed-vs-runtime DB policy; remove from tracking if runtime-only. | Backend / Repo hygiene | Open |
| R-005 | Local Google service-account JSON exists and previous exposure cannot be ruled out | High | Medium | JSON is ignored and untracked now, but file exists locally and prior docs mention credential cleanup. | Rotate key if ever tracked, document secret handling, add pre-commit guard. | Security | Open |
| R-006 | Runtime depends on external Google credentials and provider availability | High | Medium | OCR backend and CLI use Google Vision; CLI checks `GOOGLE_APPLICATION_CREDENTIALS`. | Add config validation, health diagnostics, offline mock tests, provider failure handling. | OCR backend | Open |
| R-007 | RAR packaging fails on machines without WinRAR/Rar.exe | High | Medium | Backend resolves `Rar.exe`; raises if not found. | Test missing-RAR path, document requirement, provide ZIP-only fallback or disable RAR UI when unavailable. | Packaging | Open |
| R-008 | ZIP/RAR archive content may not match expected evidence package | High | Medium | Package endpoint exists; runtime archive content acceptance not proven in docs. | Add tests verifying source files, artifacts, PDF, metadata, filename, and content types. | Packaging | Open |
| R-009 | Root Electron package conflicts with SPA-first release direction | Medium | High | Root `package.json` says Electron; SPA README says Electron deferred. | Add root README and release decision record; disable/deprecate wrong entrypoint if needed. | Architecture | Open |
| R-010 | Docker/Celery release path appears incomplete or stale | Medium | High | `docker-compose.yml` references build and `tasks.celery_app`; file search found no `Dockerfile` or `tasks.py`. | Repair Docker path or mark as deprecated/non-release. | DevOps | Open |
| R-011 | Hardcoded endpoints block portability | Medium | High | SPA references `localhost:5000` and components reference `localhost:4000`; test script references `5174`. | Centralize config, document ports, use env variables. | Frontend / Config | Open |
| R-012 | UI contains mock/provenance claims that exceed verified capabilities | High | Medium | NotebookLM mock content references trained YOLO, bank API verification, court compliance. | Label as mock, remove claims, or implement/prove capabilities. | UX / Evidence claims | Open |
| R-013 | Official case metadata is hardcoded | High | Medium | `DE-2026-0528`, `28 MAY 2026`, and default case number appear in UI/model. | Generate case metadata from user/project state and audit schema. | Evidence model | Open |
| R-014 | README and current Slip Mode behavior drift | Medium | Medium | README mentions browser OCR fallback; current UI throws backend/local fallback failure. | Update docs or restore documented fallback; add behavior test. | Documentation / SPA | Open |
| R-015 | Missing root runbook slows handoff and increases wrong-command risk | Medium | High | No root `README.md`; docs are spread across status files and subfolders. | Create `RUNBOOK.md` and root `README.md`. | Documentation | Open |
| R-016 | Build verification not separated from artifact generation | Medium | Medium | `verify` runs typecheck and `vite build`; build may write `dist`. | Add explicit read-only check and release-build command policy. | Build/release | Open |
| R-017 | StartUp runtime overlaps with SPA Chat Mode without ownership boundary | Medium | Medium | `StartUp` has separate Electron processor, outputs, audit logs, and manifest. | Document StartUp status: active, experimental, or deprecated. | Architecture | Open |
| R-018 | Broad CORS wildcard may be unsafe outside local-only mode | Medium | Medium | Backend sets `Access-Control-Allow-Origin: *`. | Restrict origins in non-local mode and document security posture. | Backend security | Open |
| R-019 | Batch OCR concurrency can overload local machine/provider | Medium | Medium | `MAX_BATCH_FILES=500`, default concurrency 8, Google Vision external calls. | Add rate limits, retry/backoff, provider quota docs, lower safe defaults. | Backend / OCR | Open |
| R-020 | Frontend test coverage is mostly manual/debug, not formal CI | High | High | `tmp-tests` scripts exist; no tracked SPA test suite under `src`. | Add tracked Playwright/Vitest tests for core workflows. | QA | Open |
| R-021 | Generated artifacts and media assets can bloat repo/release | Medium | High | Root contains screenshots, PSD, WAV, output folders, temp tests. | Artifact policy and cleanup; keep samples in controlled fixtures folder only. | Repo hygiene | Open |
| R-022 | `.env.example` is incomplete for active backend | Medium | High | It only contains `BOT_API_KEY` and `PORT=4000`. | Add complete env template for OCR/backend/frontend config. | Documentation / Config | Open |
| R-023 | Root and SPA package dependencies are split across multiple package-locks | Medium | Medium | Root, SPA, StartUp, and generated project have separate lockfiles. | Define dependency ownership and release package boundary. | Build/release | Open |
| R-024 | Official evidence PDF visual fidelity is unproven | High | Medium | PDF export exists; parity with preview remains an acceptance item. | Pixel/screenshot PDF render comparison for official fixtures. | SPA / PDF export | Open |

## Highest Immediate Risks

1. R-001: Chat Mode completion without proof.
2. R-002: Hardcoded forensic integrity values.
3. R-003/R-004: dirty worktree plus tracked runtime DB.
4. R-007/R-008: unproven archive packaging behavior.
5. R-010: stale/incomplete Docker release path.

## Risk Burn-Down Order

1. Scope and commit hygiene: R-003, R-004, R-021.
2. Acceptance proof: R-001, R-024, R-008.
3. Evidence credibility: R-002, R-012, R-013.
4. Release clarity: R-009, R-010, R-016, R-023.
5. Config/docs: R-011, R-014, R-015, R-022.
