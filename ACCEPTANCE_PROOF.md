# Acceptance Proof

Date: 2026-06-12
Phase: FIX PHASE 1 - ACCEPTANCE PROOF ONLY
Scope: canonical runtime only

## Canonical Runtime Under Test

- SPA: `Create Single Page Website`
- Backend: `thai_ocr_project`
- Database: local SQLite runtime DB

Deferred paths are excluded from this proof:

- Electron
- Docker/Celery/Postgres
- StartUp launcher
- Root static prototype

## Proof Artifacts Added

Backend acceptance tests:

- `tests/test_slip_batch_api.py`
- `tests/test_package_project_api.py`

SPA acceptance tests:

- `Create Single Page Website/playwright.config.ts`
- `Create Single Page Website/tests/e2e/helpers/fixtures.ts`
- `Create Single Page Website/tests/e2e/chat-workflow.spec.ts`
- `Create Single Page Website/tests/e2e/package-workflow.spec.ts`

Verification script:

- `Create Single Page Website/package.json` adds `test:e2e`

## Acceptance Criteria

### A1. OCR Batch Contract

Command:

```powershell
python -m unittest tests.test_slip_batch_api
```

Expected proof:

- `/api/ocr` returns `combined_results`.
- `/api/ocr` returns `batch_summary`.
- Batch order follows upload order.
- Each returned `forensics_analysis.integrity_hash` equals the SHA-256 of the uploaded source bytes.
- The placeholder hash is rejected.
- Database save payload includes `source_file_name` and `source_file_hash`.

Current expected status before production fix:

- The real-hash acceptance assertion is expected to fail until production code replaces the placeholder hash.

### A2. Package Endpoint Contract

Command:

```powershell
python -m unittest tests.test_package_project_api
```

Expected proof:

- ZIP archive response returns HTTP `200`.
- ZIP filename matches the requested archive name.
- ZIP includes submitted `source_files` and `artifacts` exactly once.
- ZIP password request returns HTTP `400` with JSON error.
- Unsupported archive format returns HTTP `400` with JSON error.
- Missing RAR dependency returns controlled JSON error.

Current expected status before production fix:

- ZIP and unsupported-format behavior may already pass.
- Missing RAR dependency is expected to fail until the backend catches `FileNotFoundError` and returns JSON.

### A3. Chat Preview And PDF Acceptance

Command:

```powershell
cd "Create Single Page Website"
npm.cmd run test:e2e -- chat-workflow.spec.ts
```

Expected proof:

- SPA opens at `http://127.0.0.1:5173`.
- Chat mode accepts deterministic fixture uploads.
- Preview pages are generated.
- Page labels are sequential.
- Save Evidence emits `LINE_Chat_Paginator_Evidence.pdf`.

Current expected status before production fix:

- This is prepared but not executed in this phase because browser tests can write Playwright traces/screenshots/downloads.

### A4. Send Project Package Acceptance

Command:

```powershell
cd "Create Single Page Website"
npm.cmd run test:e2e -- package-workflow.spec.ts
```

Expected proof:

- Send Project uses the canonical backend endpoint `/api/package-project`.
- Multipart payload includes `archive_format=zip`.
- Multipart payload includes `mode=chat`.
- Multipart payload includes `source_files`.
- Multipart payload includes generated `artifacts`.
- Download filename follows backend `Content-Disposition`.

Current expected status before production fix:

- This is prepared but not executed in this phase because browser tests can write Playwright traces/screenshots/downloads.

## Commands To Run Later

Read-only frontend check:

```powershell
cd "Create Single Page Website"
npm.cmd run typecheck
```

Backend acceptance:

```powershell
python -m unittest tests.test_slip_batch_api tests.test_package_project_api
```

SPA browser acceptance:

```powershell
cd "Create Single Page Website"
npm.cmd run test:e2e
```

Build-writing verification, only after explicit approval:

```powershell
cd "Create Single Page Website"
npm.cmd run verify
```

## Not Proven In This Phase

- Production source was not changed.
- Real source-file hash is not implemented yet.
- Controlled missing-RAR JSON error is not implemented yet.
- SPA API endpoint centralization is not implemented yet.
- Browser acceptance was not executed.
- Build was not executed.
- Package installation was not executed.

## Acceptance Proof Rule

This phase creates the proof boundary first. Production code must not be changed until these acceptance tests are reviewed and used as the contract for the next fix phase.
