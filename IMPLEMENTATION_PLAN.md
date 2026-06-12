# Canonical Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stabilize the canonical MVP architecture: SPA in `Create Single Page Website`, local Flask backend in `thai_ocr_project`, and local SQLite runtime DB.

**Architecture:** Keep the browser SPA as the only user interface and the Flask backend as the only local service boundary. Do not expand or repair Electron, Docker/Celery/Postgres, StartUp, or root static prototype paths in this implementation stream.

**Tech Stack:** React/Vite/TypeScript, Flask/Python, SQLAlchemy, SQLite runtime DB, Google Cloud Vision OCR, Playwright for browser acceptance, Python `unittest` for backend API tests.

---

## Scope

This plan implements only the canonical architecture locked in `ARCHITECTURE_LOCK.md`, `RUNTIME_DECISION.md`, and `RELEASE_STRATEGY.md`.

In scope:

- SPA package under `Create Single Page Website`.
- Local backend under `thai_ocr_project`.
- Backend tests under `tests`.
- Canonical runtime docs and environment templates.
- SQLite as local runtime data, not a release asset.

Out of scope:

- Electron.
- Docker/Celery/Postgres.
- StartUp launcher.
- Root static prototype.
- Package installation.
- Build execution during planning.

## Implementation Order

### Task 1: Add Evidence Integrity Contract Before Changing Logic

**Purpose:** Lock the expected hash behavior first so placeholder forensic metadata cannot pass silently.

**Files:**

- Modify: `tests/test_slip_batch_api.py`
- Create: `tests/test_package_project_api.py`
- Modify later: `thai_ocr_project/app.py`
- Modify later: `thai_ocr_project/database/db_manager.py`
- Modify later: `thai_ocr_project/database/models.py`

**Steps:**

- [ ] Add backend OCR test asserting each uploaded file returns a real SHA-256 derived from uploaded bytes.
- [ ] Add backend OCR test asserting `forensics_analysis.integrity_hash` is not the known placeholder value.
- [ ] Add package endpoint test for ZIP contents and download filename.
- [ ] Add package endpoint test for ZIP-with-password rejection.
- [ ] Add package endpoint test for missing RAR dependency returning a controlled JSON error.
- [ ] Run only backend unit tests for the changed API surface.
- [ ] Implement backend hash computation and DB/audit persistence only after the failing tests exist.

**Risk:** High. This changes forensic credibility and may expose assumptions in UI and tests.

**Rollback:** Revert only the backend hash/model/test changes from this task. Do not revert unrelated dirty worktree files.

### Task 2: Compute And Persist Real Source-File Hashes

**Purpose:** Replace hardcoded forensic hash values with computed values from uploaded bytes.

**Files:**

- Modify: `thai_ocr_project/app.py`
- Modify: `thai_ocr_project/database/models.py`
- Modify: `thai_ocr_project/database/db_manager.py`
- Modify: `tests/test_slip_batch_api.py`

**Required behavior:**

- Compute SHA-256 from the saved upload file before OCR preprocessing mutates or reads it.
- Return the hash as `SHA256:<hex>` in `forensics_analysis.integrity_hash`.
- Store `source_file_name`, `source_file_hash`, `transaction_id`, and `transaction_time` in SQLite records.
- Preserve batch ordering and existing `batch_summary` shape.
- Keep temp upload cleanup behavior.

**Risk:** High. Hash must be computed from original bytes, not a preprocessed derivative.

**Rollback:** Restore the previous backend API behavior and DB model only if the new tests are reverted in the same rollback.

### Task 3: Move Runtime DB To Explicit Local Runtime Configuration

**Purpose:** Stop treating tracked `thai_ocr_project/digital_evidence.db` as canonical source.

**Files:**

- Modify: `thai_ocr_project/app.py`
- Modify: `thai_ocr_project/database/db_manager.py`
- Modify: `.env.example`
- Modify: `.gitignore`
- Later index-only action: `thai_ocr_project/digital_evidence.db`

**Required behavior:**

- Add `DIGITAL_EVIDENCE_DB_URL` support.
- Default local runtime DB to a backend-controlled runtime path, not a source-tracked DB file.
- Ensure runtime directory is created by code when needed.
- Keep SQLite as the MVP database engine.
- Do not delete the existing DB file during implementation without explicit approval.

**Risk:** High. DB path changes can hide prior local records or break developer startup.

**Rollback:** Set `DIGITAL_EVIDENCE_DB_URL=sqlite:///digital_evidence.db` locally to restore old runtime location, then revert code changes if needed.

### Task 4: Centralize SPA API Configuration

**Purpose:** Remove hardcoded backend endpoint strings from active SPA workflow code.

**Files:**

- Create: `Create Single Page Website/src/app/config/api.ts`
- Create: `Create Single Page Website/src/app/services/evidenceApi.ts`
- Modify: `Create Single Page Website/src/app/App.tsx`
- Modify: `Create Single Page Website/src/vite-env.d.ts`
- Modify: `Create Single Page Website/package.json`
- Modify: `.env.example`

**Required behavior:**

- Default API base URL to `http://127.0.0.1:5000`.
- Allow override through `VITE_DIGITAL_EVIDENCE_API_BASE_URL`.
- Route `/api/ocr` and `/api/package-project` calls through one API service.
- Preserve existing FormData payload field names: `image`, `source_files`, `artifacts`, `archive_name`, `archive_format`, `password`, `mode`.
- Do not modify `ExchangeRateBadge.tsx` or `SlipUploader.tsx` in this canonical pass unless those components are confirmed active in the canonical workflow.

**Risk:** Medium. Endpoint centralization can break uploads if FormData or response handling changes.

**Rollback:** Revert `App.tsx` to direct fetch calls and remove the new config/service files.

### Task 5: Remove Fake Evidence Claims From Active Preview

**Purpose:** Prevent the UI from presenting unknown or mock values as verified evidence.

**Files:**

- Modify: `Create Single Page Website/src/app/components/PreviewColumn.tsx`
- Modify: `Create Single Page Website/src/app/utils/localOcr.ts`
- Create: `Create Single Page Website/src/app/utils/evidenceMetadata.ts`
- Modify: `Create Single Page Website/src/app/App.tsx`

**Required behavior:**

- Remove fallback display of `SHA256: 7e8b23a9d...`.
- Remove fallback display of case `DE-2026-0528`.
- Remove fallback display of date `28 MAY 2026`.
- Remove fallback display of bank `SCB` and confidence `95.4%`.
- Show `UNKNOWN`, `REVIEW REQUIRED`, or blank display state when real data is absent.
- For browser OCR fallback, compute hash from the selected file bytes or mark hash unavailable. Do not return the placeholder hash.

**Risk:** High. This affects legal/evidence credibility and visible UI copy.

**Rollback:** Revert the preview and local OCR metadata files together. Do not restore fake forensic values unless explicitly approved for demo-only mode.

### Task 6: Close Chat Preview, PDF, And Package Workflow

**Purpose:** Turn Chat Mode from code-present into verified workflow.

**Files:**

- Modify: `Create Single Page Website/src/app/App.tsx`
- Modify: `Create Single Page Website/src/app/utils/pagination.ts`
- Modify: `Create Single Page Website/src/app/utils/pdfExport.ts`
- Create: `Create Single Page Website/playwright.config.ts`
- Create: `Create Single Page Website/tests/e2e/chat-workflow.spec.ts`
- Create: `Create Single Page Website/tests/e2e/helpers/fixtures.ts`
- Modify: `Create Single Page Website/package.json`

**Required behavior:**

- Generate deterministic chat fixture images in test code.
- Assert generated preview pages have stable page order.
- Assert adjacent page metadata has no overlap.
- Assert exported PDF is created from the same `paginatedPages` image list.
- Assert package endpoint receives source files and generated artifacts.
- Keep preview and PDF export consuming the same `PageSegment[]` ledger.

**Risk:** High. Browser acceptance may expose visual or timing flakiness.

**Rollback:** Revert Playwright config/tests first if unstable; only revert pagination/export code if tests identify an actual regression.

### Task 7: Harden Package Endpoint Contract

**Purpose:** Make ZIP/RAR behavior predictable in the local release.

**Files:**

- Modify: `thai_ocr_project/app.py`
- Create: `tests/test_package_project_api.py`
- Modify: `Create Single Page Website/src/app/App.tsx`
- Modify: `Create Single Page Website/src/app/services/evidenceApi.ts`
- Create: `API_CONTRACT.md`

**Required behavior:**

- ZIP without password is the safe default.
- ZIP with password returns a clear validation error.
- RAR is optional and must fail with a clear message if `Rar.exe` is unavailable.
- Download filename must match `archive_name` and selected format.
- Archive must include all submitted source files and artifacts exactly once.

**Risk:** Medium. Packaging behavior depends on local filesystem and optional WinRAR.

**Rollback:** Revert package endpoint and SPA packaging UI changes; keep tests disabled only if the product decision changes.

### Task 8: Add Canonical Run And Release Documentation

**Purpose:** Prevent wrong-command releases and keep handoff aligned with the architecture lock.

**Files:**

- Create: `README.md`
- Create: `RUNBOOK.md`
- Create: `ENVIRONMENT.md`
- Create: `API_CONTRACT.md`
- Create: `EVIDENCE_AUDIT_SPEC.md`
- Create: `TEST_FIXTURES.md`
- Create: `RELEASE_CHECKLIST.md`
- Modify: `Create Single Page Website/README.md`
- Modify: `.env.example`

**Required behavior:**

- Root README points to SPA plus Flask backend only.
- Runbook starts backend first, checks `/health`, then starts SPA.
- Environment doc explains Google credentials and local-only mode.
- API contract documents `/api/ocr` and `/api/package-project`.
- Release checklist blocks generated artifacts, credentials, and runtime DB files.

**Risk:** Medium. Docs can drift if commands are not verified after implementation.

**Rollback:** Revert documentation files only; keep architecture lock docs intact.

### Task 9: Add Safe Test Scripts Without Installing Packages

**Purpose:** Make verification repeatable without requiring package installation in the implementation turn.

**Files:**

- Modify: `Create Single Page Website/package.json`
- Modify: `Create Single Page Website/package-lock.json` only if npm changes it during an approved script update.
- Create: `Create Single Page Website/playwright.config.ts`
- Create: `Create Single Page Website/tests/e2e/chat-workflow.spec.ts`
- Create: `Create Single Page Website/tests/e2e/package-workflow.spec.ts`

**Required behavior:**

- Add `check` script for read-only TypeScript verification.
- Keep existing `verify` behavior documented as build-writing.
- Add `test:e2e` script using the existing Playwright dependency.
- Do not add dependencies unless the user explicitly approves package installation.

**Risk:** Medium. `package-lock.json` may change if npm script edits are done through npm commands instead of manual edit.

**Rollback:** Revert package script additions and Playwright files.

### Task 10: Repo Hygiene After Functional Proof

**Purpose:** Separate source changes from runtime artifacts after tests prove the canonical path.

**Files / paths:**

- Index-only later action: `thai_ocr_project/digital_evidence.db`
- Review only: `outputs/`
- Review only: `tmp-tests/`
- Review only: root screenshots/media files
- Modify: `.gitignore`
- Create: `RELEASE_CHECKLIST.md`

**Required behavior:**

- Do not delete local evidence or generated artifacts without explicit approval.
- Remove runtime DB from tracking only after confirming it is runtime data, not a seed DB.
- Keep fixtures under a controlled test fixture path, not root temp folders.
- Keep generated reports and packages out of release commits.

**Risk:** High. Cleanup can accidentally remove evidence samples or local work if done without approval.

**Rollback:** If index-only DB removal is wrong, re-add the DB to tracking from the working copy. Do not reconstruct deleted files from memory.

## Files That Should Change Later

Primary code files:

- `thai_ocr_project/app.py`
- `thai_ocr_project/database/models.py`
- `thai_ocr_project/database/db_manager.py`
- `Create Single Page Website/src/app/App.tsx`
- `Create Single Page Website/src/app/components/PreviewColumn.tsx`
- `Create Single Page Website/src/app/utils/localOcr.ts`
- `Create Single Page Website/src/app/utils/pagination.ts`
- `Create Single Page Website/src/app/utils/pdfExport.ts`
- `Create Single Page Website/src/vite-env.d.ts`
- `Create Single Page Website/package.json`

New canonical SPA files:

- `Create Single Page Website/src/app/config/api.ts`
- `Create Single Page Website/src/app/services/evidenceApi.ts`
- `Create Single Page Website/src/app/utils/evidenceMetadata.ts`
- `Create Single Page Website/playwright.config.ts`
- `Create Single Page Website/tests/e2e/chat-workflow.spec.ts`
- `Create Single Page Website/tests/e2e/package-workflow.spec.ts`
- `Create Single Page Website/tests/e2e/helpers/fixtures.ts`

Backend tests:

- `tests/test_slip_batch_api.py`
- `tests/test_package_project_api.py`

Docs/config:

- `.env.example`
- `.gitignore`
- `README.md`
- `RUNBOOK.md`
- `ENVIRONMENT.md`
- `API_CONTRACT.md`
- `EVIDENCE_AUDIT_SPEC.md`
- `TEST_FIXTURES.md`
- `RELEASE_CHECKLIST.md`
- `Create Single Page Website/README.md`

Index/runtime hygiene:

- `thai_ocr_project/digital_evidence.db` should be removed from source tracking later only after explicit approval and confirmation that it is runtime data.

## Files That Must Not Be Touched In This Implementation Stream

Deferred root/Electron/runtime files:

- `package.json`
- `package-lock.json`
- `index.html`
- `script.js`
- `styles.css`
- `docker-compose.yml`
- `digital_evidence.db`

Deferred StartUp path:

- `StartUp/**`

Generated/local artifacts:

- `outputs/**`
- `tmp-tests/**`
- `00000.png`
- `Screenshot 2026-06-02 170902.png`
- `Untitled-1.psd`
- `เสียงEvidence.wav`
- `gen-lang-client-0183254835-46d10fa2aa44.json`

Non-canonical UI/API files unless separately approved:

- `Create Single Page Website/src/app/components/ExchangeRateBadge.tsx`
- `Create Single Page Website/src/app/components/SlipUploader.tsx`
- `Create Single Page Website/src/app/components/NotebookLMPanel.tsx`
- `Create Single Page Website/src/app/utils/notebooklmApi.ts`

## Risk Summary Per Change Area

| Area | Risk | Mitigation |
| --- | --- | --- |
| Real hash computation | Critical legal/evidence correctness risk | Test with known byte payload and assert exact SHA-256 |
| DB path and model | Local data loss/confusion risk | Use env override and avoid deleting existing DB |
| API config | Upload/package regression risk | Keep payload names unchanged and test both endpoints |
| Preview metadata | Visible behavior change | Use explicit unknown/review-required display states |
| Chat/PDF/package proof | Browser flakiness risk | Use deterministic fixtures and same page ledger |
| Package endpoint | WinRAR dependency risk | ZIP default plus controlled RAR failure tests |
| Repo hygiene | Accidental evidence cleanup risk | Index-only changes first; no file deletion without approval |

## Rollback Plan

Rollback must be task-scoped:

1. Revert only files changed by the failed task.
2. Do not revert unrelated dirty files already present in the worktree.
3. For DB path failures, use `DIGITAL_EVIDENCE_DB_URL` to point back to the old SQLite path before reverting code.
4. For frontend API failures, revert `App.tsx` to direct fetch calls and remove the new API service files.
5. For Playwright instability, revert tests/config first and keep production code if backend/unit tests still pass.
6. For repo hygiene mistakes, do not delete anything; restore index state with explicit user approval.

## Completion Criteria

The canonical implementation stream is complete only when:

- Placeholder forensic hash is gone from backend and browser fallback.
- Preview no longer shows fake case/date/hash/bank/confidence values as verified facts.
- Chat preview, PDF export, and package send are tested.
- `/api/ocr` and `/api/package-project` have backend contract tests.
- `.env.example`, README, runbook, API contract, audit spec, and release checklist match the locked architecture.
- Electron, Docker/Celery/Postgres, StartUp, and root static prototype remain untouched.
