# DIGITAL EVIDENCE - TECHNICAL DEBT

Date: 2026-06-12  
Mode: analysis only. No source code changes.

## Debt Summary

The debt is concentrated in four categories:

1. Evidence credibility debt: hardcoded forensic values and UI claims.
2. Architecture boundary debt: several entrypoints and runtime paths coexist without a canonical release boundary.
3. Test/verification debt: critical user workflows are not covered by formal tests.
4. Repo hygiene debt: runtime/generated files and source changes are mixed.

## Technical Debt Backlog

| ID | Debt | Priority | Evidence | Recommended resolution |
|---|---|---:|---|---|
| TD-001 | Hardcoded `integrity_hash` | P0 | Backend and local OCR fallback return the same SHA-256-like string. | Compute source-file SHA-256 and persist it in DB/audit output. |
| TD-002 | Hardcoded case/date metadata | P0 | UI shows `DE-2026-0528` and `28 MAY 2026`; DB model has default case number. | Case metadata must come from project/case state. |
| TD-003 | Default bank/confidence values in UI | P0 | Preview falls back to `SCB` and `95.4%`. | Show unknown/review-required instead of fake verified values. |
| TD-004 | NotebookLM mock service presented near evidence UI | P0 | `MOCK_REPORT_CONTENT`, `MOCK_DATA_TABLE`, `MOCK_FLASHCARDS`, `MOCK_MIND_MAP`. | Label as mock, move to demo namespace, or replace with real source-backed data. |
| TD-005 | Large `App.tsx` orchestration component | P1 | App handles upload, mode state, pagination, OCR, export, packaging modal, and downloads. | Split into workflow services/hooks with explicit contracts. |
| TD-006 | Backend app mixes OCR, DB, CORS, batch, and packaging concerns | P1 | `thai_ocr_project/app.py` owns all major backend routes and helpers. | Extract service layers: OCR processing, audit, package builder, config. |
| TD-007 | Hardcoded API endpoints | P1 | SPA fetches `localhost:5000`; other components reference `localhost:4000`. | Use config module/env variables and one API client. |
| TD-008 | Incomplete env template | P1 | `.env.example` only has `BOT_API_KEY` and `PORT=4000`. | Document all required env vars and local credential setup. |
| TD-009 | Dirty tracked SQLite DB | P1 | `thai_ocr_project/digital_evidence.db` is tracked and modified. | Decide seed DB vs runtime DB; move runtime DB out of tracking. |
| TD-010 | Generated/test artifacts mixed with source tree | P1 | `tmp-tests`, `outputs`, screenshots, PSD, WAV, StartUp outputs. | Create fixtures/artifacts policy and cleanup process. |
| TD-011 | Incomplete release/run docs | P1 | No root README/runbook; status docs are not enough for release. | Add root README, RUNBOOK, RELEASE_CHECKLIST. |
| TD-012 | Docker compose drift | P1 | Compose references Celery tasks and build context without discovered Dockerfile/tasks module. | Repair or deprecate Docker flow. |
| TD-013 | Multiple app/runtime entrypoints | P1 | SPA, root Electron package, StartUp runtime, root static files. | Architecture decision record identifying active/deferred/deprecated paths. |
| TD-014 | Build command produces artifacts during verify | P2 | `verify = typecheck && build`. | Add separate `check` for read-only CI and `release:build` for artifact generation. |
| TD-015 | Frontend formal tests missing | P1 | No `*.test.*` / `*.spec.*` found under SPA `src`; tests mostly manual/debug. | Add tracked Playwright/Vitest tests for Chat/Slip/Export/Send. |
| TD-016 | Official regression fixture set missing | P1 | `tmp-tests` has ad hoc scripts and generated analysis outputs. | Promote selected samples to `fixtures/` with expected outputs. |
| TD-017 | Archive behavior not contract-tested | P1 | ZIP/RAR endpoint exists; package acceptance is not closed. | Tests for content manifest, password handling, missing RAR, and download headers. |
| TD-018 | OCR provider failure behavior not fully specified | P2 | Google credentials/provider state are external dependencies. | Add health diagnostics and failure-mode contract. |
| TD-019 | CORS wildcard | P2 | Backend sets `Access-Control-Allow-Origin: *`. | Restrict origin outside local dev. |
| TD-020 | Batch defaults can be heavy | P2 | `MAX_BATCH_FILES=500`, default concurrency 8. | Document limits and tune defaults to safe local/provider quotas. |
| TD-021 | README/docs drift on local OCR fallback | P2 | README says browser fallback; App currently reports backend/local fallback failed. | Align docs and implementation. |
| TD-022 | Old Playwright script is environment-specific | P2 | `test_ui.js` targets `localhost:5174` and writes screenshots to a personal path. | Replace with portable test config/output path. |
| TD-023 | Mixed package manager signals | P2 | npm lockfiles plus `pnpm-workspace.yaml`. | Choose one package manager per active project. |
| TD-024 | Root static files may confuse entrypoint | P3 | Root `index.html`, `script.js`, `styles.css` exist beside SPA. | Mark as legacy or move under archive/examples. |

## Missing Tests

Priority test gaps:

1. `Chat Mode acceptance`: upload official chat files, generate pages, assert no validation errors, export PDF, send package.
2. `Preview/PDF parity`: render PDF pages and compare to `PageSegment.canvasDataUrl` outputs.
3. `Cross-file overlap`: deterministic fixtures for overlap trim and no duplicate adjacent content.
4. `Package project`: ZIP content, RAR dependency missing, RAR password, download filename, artifacts list.
5. `Evidence hash`: uploaded file hash equals returned/stored hash.
6. `Config`: app respects configured backend URL and port.
7. `Docs/runbook smoke`: documented commands map to actual package scripts and backend routes.
8. `Release cleanliness`: fail release if tracked DB/generated artifacts/credentials are present.

## Missing Documentation

Required docs:

- `README.md`: canonical root entrypoint and project status.
- `RUNBOOK.md`: local start/stop/health-check commands.
- `ENVIRONMENT.md`: env vars, Google credentials, ports, local-only mode.
- `API_CONTRACT.md`: `/api/ocr` and `/api/package-project`.
- `EVIDENCE_AUDIT_SPEC.md`: hash, case, timestamp, review status, evidence package manifest.
- `TEST_FIXTURES.md`: official regression files and expected outputs.
- `RELEASE_CHECKLIST.md`: clean worktree, tests, build, artifacts, secrets.
- `ARCHITECTURE_DECISION.md`: SPA-first, Electron deferred, StartUp/Docker status.

## Build / Release Debt

| Debt | Impact | Stabilization gate |
|---|---|---|
| `verify` creates build artifacts | Cannot run as purely read-only gate. | Add/read-only `check` command or require explicit build approval. |
| Root Electron package not aligned to SPA-first docs | Wrong release target possible. | Root release path documented and enforced. |
| Docker compose incomplete/stale | Failed container release possible. | Docker smoke test or documented deprecation. |
| Multiple lockfiles | Dependency drift across app roots. | Define active package boundary. |
| Local artifacts in repo root | Accidental release bloat. | Artifact cleanup and ignore policy. |

## Cleanup Order

1. P0 evidence credibility debt: TD-001 to TD-004.
2. P1 workflow proof debt: TD-015 to TD-017.
3. P1 repo/release hygiene: TD-009 to TD-013.
4. P2 config/docs cleanup: TD-018 to TD-023.
5. P3 legacy surface cleanup: TD-024.
