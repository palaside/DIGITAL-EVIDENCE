# File Change Plan

Date: 2026-06-12
Scope: canonical SPA + local Flask backend + local SQLite runtime DB
Mode: plan only. No source code modification performed in this phase.

## Change Policy

Allowed implementation surface:

- `Create Single Page Website/**`
- `thai_ocr_project/**`
- `tests/**`
- root documentation and config files that support the canonical runtime

Blocked implementation surface:

- Electron
- Docker/Celery/Postgres
- StartUp launcher
- root static prototype
- generated/runtime artifacts

## Files To Change Later

| File | Action | Reason | Risk | Rollback |
| --- | --- | --- | --- | --- |
| `thai_ocr_project/app.py` | Modify | Compute real SHA-256, use env DB URL, harden package endpoint, preserve `/health`, `/api/ocr`, `/api/package-project` | High | Revert this file and restore old env DB path |
| `thai_ocr_project/database/models.py` | Modify | Add fields for source filename, source hash, transaction ID/time | High | Revert model fields with matching db_manager revert |
| `thai_ocr_project/database/db_manager.py` | Modify | Persist new audit fields and support configured SQLite URL | High | Revert manager and use previous `sqlite:///digital_evidence.db` behavior |
| `tests/test_slip_batch_api.py` | Modify | Assert batch shape, exact source hash, and no placeholder integrity hash | Medium | Revert test changes with backend behavior rollback |
| `tests/test_package_project_api.py` | Create | Contract tests for ZIP, ZIP password rejection, RAR missing dependency, filename/content | Medium | Remove new test file if packaging scope changes |
| `Create Single Page Website/src/app/config/api.ts` | Create | Single source for `VITE_DIGITAL_EVIDENCE_API_BASE_URL` with local default | Medium | Delete file and restore direct URLs |
| `Create Single Page Website/src/app/services/evidenceApi.ts` | Create | Centralized OCR/package API calls with stable FormData contract | Medium | Delete file and restore `fetch` calls in `App.tsx` |
| `Create Single Page Website/src/app/utils/evidenceMetadata.ts` | Create | Normalize case/date/hash/bank display values without fake fallbacks | High | Delete file and inline previous display logic |
| `Create Single Page Website/src/app/App.tsx` | Modify | Use API service, preserve Chat/Slip flows, package with generated artifacts, expose metadata cleanly | High | Revert App changes only; keep unrelated user edits |
| `Create Single Page Website/src/app/components/PreviewColumn.tsx` | Modify | Remove fake case/date/hash/bank/confidence fallbacks from evidence preview | High | Revert preview changes if UI acceptance fails |
| `Create Single Page Website/src/app/utils/localOcr.ts` | Modify | Remove placeholder hash; compute browser file hash or mark hash unavailable | High | Revert local fallback metadata behavior |
| `Create Single Page Website/src/app/utils/pagination.ts` | Modify only if acceptance fails | Keep page ledger deterministic and non-overlapping | Medium | Revert pagination-only changes |
| `Create Single Page Website/src/app/utils/pdfExport.ts` | Modify only if acceptance fails | Ensure PDF uses same Chat page ledger and stable output | Medium | Revert PDF-only changes |
| `Create Single Page Website/src/vite-env.d.ts` | Modify | Add Vite env typing for backend API base URL | Low | Revert env type line |
| `Create Single Page Website/package.json` | Modify | Add safe scripts such as `check` and `test:e2e`; keep `verify` as build-writing | Medium | Revert scripts |
| `Create Single Page Website/package-lock.json` | Modify only if npm script update changes it | Keep lockfile consistent if approved npm command mutates it | Medium | Revert lockfile if only scripts were intended |
| `Create Single Page Website/playwright.config.ts` | Create | Canonical browser acceptance config | Medium | Delete file |
| `Create Single Page Website/tests/e2e/chat-workflow.spec.ts` | Create | Prove Chat preview, no overlap, PDF/package behavior | Medium | Delete file |
| `Create Single Page Website/tests/e2e/package-workflow.spec.ts` | Create | Prove package send behavior from SPA | Medium | Delete file |
| `Create Single Page Website/tests/e2e/helpers/fixtures.ts` | Create | Deterministic browser test fixtures without root temp files | Low | Delete file |
| `.env.example` | Modify | Document active vars: `PORT=5000`, `DIGITAL_EVIDENCE_DB_URL`, `DIGITAL_EVIDENCE_OCR_LOCALONLY`, `GOOGLE_APPLICATION_CREDENTIALS`, `SLIP_BATCH_MAX_CONCURRENCY`, `VITE_DIGITAL_EVIDENCE_API_BASE_URL` | Medium | Revert env template |
| `.gitignore` | Modify | Confirm runtime DB/output/test artifacts stay ignored | Medium | Revert ignore additions |
| `README.md` | Create | Root canonical entrypoint and deferred path warning | Low | Delete file |
| `RUNBOOK.md` | Create | Backend-first startup and health-check commands | Low | Delete file |
| `ENVIRONMENT.md` | Create | Env vars, Google credentials, local-only security posture | Low | Delete file |
| `API_CONTRACT.md` | Create | `/api/ocr` and `/api/package-project` request/response contract | Low | Delete file |
| `EVIDENCE_AUDIT_SPEC.md` | Create | Case/hash/timestamp/review status/package manifest rules | Low | Delete file |
| `TEST_FIXTURES.md` | Create | Official fixture policy and deterministic test data rules | Low | Delete file |
| `RELEASE_CHECKLIST.md` | Create | Clean worktree, tests, build approval, artifacts, secrets | Low | Delete file |
| `Create Single Page Website/README.md` | Modify | Align SPA docs with backend-first local runtime and build-writing verify | Low | Revert README edit |

## Index-Only Or Approval-Gated Files

| Path | Later action | Approval required | Reason |
| --- | --- | --- | --- |
| `thai_ocr_project/digital_evidence.db` | Remove from tracking if confirmed runtime-only | Yes | It is a tracked SQLite runtime DB despite `*.db` ignore |
| `outputs/**` | Cleanup or archive outside source | Yes | Generated artifacts may be evidence/output data |
| `tmp-tests/**` | Cleanup or promote selected fixtures | Yes | Ad hoc tests/artifacts should not define release |
| root media/artifacts | Cleanup or move to approved fixtures | Yes | Risk of deleting useful local samples |

## Files That Must Not Be Touched

Deferred root/Electron/static files:

- `package.json`
- `package-lock.json`
- `index.html`
- `script.js`
- `styles.css`
- `docker-compose.yml`
- `digital_evidence.db`

Deferred StartUp launcher path:

- `StartUp/**`

Known StartUp files observed and blocked:

- `StartUp/startup.json`
- `StartUp/startup-runtime.js`
- `StartUp/Start.bat`
- `StartUp/README.md`
- `StartUp/project_manifest.json`
- `StartUp/audit_log.json`
- `StartUp/chat-evidence-processor/package.json`
- `StartUp/chat-evidence-processor/package-lock.json`
- `StartUp/chat-evidence-processor/src/main.js`
- `StartUp/chat-evidence-processor/src/renderer.js`
- `StartUp/chat-evidence-processor/src/index.html`
- `StartUp/chat-evidence-processor/src/styles.css`
- `StartUp/chat-evidence-processor/outputs/**`
- `StartUp/GENERATE_PROJECT/**`

Generated/local artifacts:

- `.env`
- `.env.*`
- `gen-lang-client-0183254835-46d10fa2aa44.json`
- `00000.png`
- `Screenshot 2026-06-02 170902.png`
- `Untitled-1.psd`
- `เสียงEvidence.wav`
- `outputs/**`
- `tmp-tests/**`

Non-canonical SPA surfaces for this implementation stream:

- `Create Single Page Website/src/app/components/NotebookLMPanel.tsx`
- `Create Single Page Website/src/app/utils/notebooklmApi.ts`
- `Create Single Page Website/src/app/components/ExchangeRateBadge.tsx`
- `Create Single Page Website/src/app/components/SlipUploader.tsx`

## File Ownership Notes

- `Create Single Page Website/src/app/App.tsx` is the orchestration hotspot. Keep changes narrow and extract API/config helpers instead of adding more inline fetch logic.
- `thai_ocr_project/app.py` is the backend hotspot. Add helpers for hash/config/package behavior before growing route bodies.
- `thai_ocr_project/database/models.py` and `db_manager.py` must change together if new columns are added.
- `Create Single Page Website/package.json` belongs to the SPA package only. Do not edit root `package.json`.
- `thai_ocr_project/digital_evidence.db` is runtime data. Do not edit binary DB content.

## Safe Change Batches

Batch 1:

- `tests/test_slip_batch_api.py`
- `tests/test_package_project_api.py`
- `thai_ocr_project/app.py`
- `thai_ocr_project/database/models.py`
- `thai_ocr_project/database/db_manager.py`

Batch 2:

- `Create Single Page Website/src/app/config/api.ts`
- `Create Single Page Website/src/app/services/evidenceApi.ts`
- `Create Single Page Website/src/app/App.tsx`
- `Create Single Page Website/src/vite-env.d.ts`
- `.env.example`

Batch 3:

- `Create Single Page Website/src/app/utils/evidenceMetadata.ts`
- `Create Single Page Website/src/app/components/PreviewColumn.tsx`
- `Create Single Page Website/src/app/utils/localOcr.ts`

Batch 4:

- `Create Single Page Website/playwright.config.ts`
- `Create Single Page Website/tests/e2e/chat-workflow.spec.ts`
- `Create Single Page Website/tests/e2e/package-workflow.spec.ts`
- `Create Single Page Website/tests/e2e/helpers/fixtures.ts`
- `Create Single Page Website/package.json`

Batch 5:

- `README.md`
- `RUNBOOK.md`
- `ENVIRONMENT.md`
- `API_CONTRACT.md`
- `EVIDENCE_AUDIT_SPEC.md`
- `TEST_FIXTURES.md`
- `RELEASE_CHECKLIST.md`
- `Create Single Page Website/README.md`
- `.gitignore`

## Rollback Rules

- Roll back one batch at a time.
- Use `git diff -- <paths>` before reverting.
- Do not run `git reset --hard`.
- Do not run `git checkout -- .`.
- Do not delete generated/local artifacts unless the user explicitly approves.
- If files contain pre-existing user edits, isolate rollback to the new hunks only.
