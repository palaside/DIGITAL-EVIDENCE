# Fix Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task after user approval. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Phase 1 acceptance tests pass for the canonical runtime only.

**Architecture:** Keep the SPA in `Create Single Page Website` and Flask backend in `thai_ocr_project` as the only active runtime. Do not touch Electron, Docker/Celery/Postgres, StartUp, or the root static prototype.

**Tech Stack:** Flask/Python, React/Vite/TypeScript, Playwright, pytest running unittest-style backend tests.

---

## Approval Gate

No production source code may be edited until this plan is approved.

## Exact Production Source Files Requested For Approval

### 1. `thai_ocr_project/app.py`

Why this file is required:

- `tests/test_slip_batch_api.py` now requires `/api/ocr` to return a real `SHA256:<hex>` hash derived from each uploaded source file.
- The current route builds `forensics_analysis.integrity_hash` from a hardcoded placeholder string.
- The new acceptance test also expects the save payload passed to `EvidenceDatabaseManager.save_record()` to include:
  - `source_file_name`
  - `source_file_hash`
- `tests/test_package_project_api.py` now requires `/api/package-project` to return a controlled JSON error when RAR packaging is requested but `Rar.exe` is unavailable.
- The current RAR path resolution can raise `FileNotFoundError` without being converted into the JSON error contract.

Expected changes in this file after approval:

- Add `hashlib` import.
- Add a small helper to compute SHA-256 from the saved upload file before preprocessing.
- In `_process_saved_slip()`, compute `source_file_hash` before `preprocess_image(file_path)`.
- Pass `source_file_name` and `source_file_hash` into `db_manager.save_record(...)`.
- Return `source_file_hash` in `forensics_analysis.integrity_hash`.
- Catch `FileNotFoundError` in the RAR branch of `package_project()` and return `jsonify({"error": str(error)})`, status `500`.
- Preserve existing `/health`, `/api/ocr`, `/api/package-project`, batch ordering, temp-file cleanup, ZIP behavior, and CORS behavior.

Risk:

- High for forensic correctness. The hash must be computed from the original uploaded bytes before preprocessing.

Rollback:

- Revert only `thai_ocr_project/app.py`.

## Production Source Files Not Requested For Initial Approval

These are not required to make the current backend acceptance tests pass:

- `thai_ocr_project/database/models.py`
- `thai_ocr_project/database/db_manager.py`

Reason:

- Phase 1 tests patch `EvidenceDatabaseManager.save_record()` and assert the payload sent by `app.py`.
- No current acceptance test opens the real SQLite DB and verifies persisted columns.
- If a later acceptance test requires real DB persistence, request separate approval before editing these files.

These are not requested before running frontend targeted tests:

- `Create Single Page Website/src/app/App.tsx`
- `Create Single Page Website/src/app/utils/pagination.ts`
- `Create Single Page Website/src/app/utils/pdfExport.ts`
- `Create Single Page Website/src/app/components/PreviewColumn.tsx`
- `Create Single Page Website/src/app/utils/localOcr.ts`

Reason:

- The current Playwright specs may pass against the existing SPA flow.
- If targeted frontend tests fail and the failure proves a production defect rather than a test timing/fixture issue, stop and request new approval with exact file paths.

## Tests To Run After Approval

### Backend Test 1

Command:

```powershell
python -m pytest tests/test_slip_batch_api.py
```

Expected:

- `test_post_ocr_returns_batch_summary_and_writes_once_per_slip` passes.
- `test_post_ocr_acceptance_requires_real_source_hash_per_uploaded_file` passes.
- No live Google Vision call is made because OCR and parser are patched by the test.

Writes:

- Temporary upload files under backend temp handling may be created and cleaned by production code.

### Backend Test 2

Command:

```powershell
python -m pytest tests/test_package_project_api.py
```

Expected:

- ZIP content test passes.
- ZIP password rejection test passes.
- Unsupported format test passes.
- Missing RAR dependency returns controlled JSON error and passes.

Writes:

- Temporary archive/staging directories may be created and cleaned by production code.

### Frontend Targeted Test 1

Command:

```powershell
cd "Create Single Page Website"
npm.cmd run test:e2e -- chat-workflow.spec.ts
```

Expected:

- Vite dev server starts through Playwright config.
- Deterministic chat fixtures upload.
- Preview pages render with sequential page labels.
- Save Evidence emits `LINE_Chat_Paginator_Evidence.pdf`.

Writes:

- Playwright may create traces/screenshots/download artifacts on failure.

### Frontend Targeted Test 2

Command:

```powershell
cd "Create Single Page Website"
npm.cmd run test:e2e -- package-workflow.spec.ts
```

Expected:

- Package workflow posts to `/api/package-project`.
- Multipart payload contains `archive_format`, `mode`, `source_files`, and `artifacts`.
- Download filename follows backend response header.

Writes:

- Playwright may create traces/screenshots/download artifacts on failure.

## Implementation Steps After Approval

### Task 1: Backend Hash Contract

**Files:**

- Modify: `thai_ocr_project/app.py`
- Test: `tests/test_slip_batch_api.py`

- [ ] Add `import hashlib`.
- [ ] Add helper:

```python
def _sha256_file(file_path: str) -> str:
    hasher = hashlib.sha256()
    with open(file_path, "rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            hasher.update(chunk)
    return f"SHA256:{hasher.hexdigest()}"
```

- [ ] In `_process_saved_slip()`, call `_sha256_file(file_path)` immediately after `start_time = time.time()` and before `preprocess_image(file_path)`.
- [ ] Add `"source_file_name": filename` and `"source_file_hash": source_file_hash` to the `db_manager.save_record(...)` payload.
- [ ] Replace the hardcoded `forensics_analysis.integrity_hash` with `source_file_hash`.
- [ ] Run:

```powershell
python -m pytest tests/test_slip_batch_api.py
```

Expected:

- Backend OCR acceptance tests pass.

### Task 2: Backend RAR Error Contract

**Files:**

- Modify: `thai_ocr_project/app.py`
- Test: `tests/test_package_project_api.py`

- [ ] In the RAR branch of `package_project()`, wrap `_resolve_rar_path()` with `try/except FileNotFoundError`.
- [ ] On `FileNotFoundError`, return:

```python
return jsonify({"error": str(error)}), 500
```

- [ ] Do not change ZIP behavior.
- [ ] Run:

```powershell
python -m pytest tests/test_package_project_api.py
```

Expected:

- Backend package acceptance tests pass.

### Task 3: Frontend Acceptance Check

**Files:**

- No production source file approved initially.
- Tests only:
  - `Create Single Page Website/tests/e2e/chat-workflow.spec.ts`
  - `Create Single Page Website/tests/e2e/package-workflow.spec.ts`

- [ ] Run:

```powershell
cd "Create Single Page Website"
npm.cmd run test:e2e -- chat-workflow.spec.ts
```

- [ ] Run:

```powershell
cd "Create Single Page Website"
npm.cmd run test:e2e -- package-workflow.spec.ts
```

Expected:

- Both targeted frontend acceptance tests pass without production source edits.

If either frontend test fails:

- Determine whether the failure is a test timing/fixture issue or a production SPA defect.
- If test expectation is proven wrong, request approval before editing that test.
- If production SPA source must change, stop and request approval for exact source paths before editing.

## Commands Not Allowed In This Phase

Do not run:

```powershell
npm.cmd install
npm.cmd run build
npm.cmd run verify
npm.cmd start
docker compose up
docker-compose up
StartUp\Start.bat
StartUp\chat-evidence-processor\Start_Evidence.bat
```

## Success Criteria

- `python -m pytest tests/test_slip_batch_api.py` passes.
- `python -m pytest tests/test_package_project_api.py` passes.
- `npm.cmd run test:e2e -- chat-workflow.spec.ts` passes, or any failure is reported with evidence and no unapproved source edits.
- `npm.cmd run test:e2e -- package-workflow.spec.ts` passes, or any failure is reported with evidence and no unapproved source edits.
- Only approved production source files are modified.
- No package installation, build, file deletion, file move, file rename, Electron, Docker/Celery/Postgres, StartUp, or root static prototype work occurs.

## Approval Request

Approve modifying this production source file:

- `thai_ocr_project/app.py`

No other production source files are requested at this time.
