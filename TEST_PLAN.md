# Canonical Architecture Test Plan

Date: 2026-06-12
Scope: SPA in `Create Single Page Website`, local Flask backend in `thai_ocr_project`, SQLite local runtime DB
Mode: plan only. No tests or builds were executed in this phase.

## Test Policy

Safe during read-only/analysis phases:

- `git status --short`
- `Get-Content -Raw <file>`
- `rg ...`
- `npm.cmd run typecheck` from `Create Single Page Website` if dependencies already exist

Approval required:

- `npm.cmd run verify` because it runs `vite build` and writes `dist`
- `npm.cmd run build` because it writes `dist`
- Playwright browser tests because they can write screenshots, traces, and reports
- Backend live server tests because they can write SQLite/runtime files
- Any cleanup of DB/output/temp artifacts

Never run without explicit approval:

- package installation
- Docker Compose
- Electron/root `npm start`
- StartUp launcher
- file delete/move/rename commands

## Command Plan

### 1. Baseline Worktree Check

Command:

```powershell
git status --short
```

Expected:

- Shows current dirty worktree.
- Used to separate new implementation changes from pre-existing work.

Writes files:

- No.

### 2. Frontend Typecheck

Command:

```powershell
cd "Create Single Page Website"
npm.cmd run typecheck
```

Expected:

- TypeScript exits with code `0`.
- No `dist` generation.

Writes files:

- No expected source/build output.

### 3. Backend Unit Tests

Command:

```powershell
python -m unittest tests.test_slip_batch_api tests.test_package_project_api
```

Expected:

- OCR batch contract tests pass.
- Package endpoint tests pass.
- Tests mock OCR/provider behavior and avoid live Google calls.

Writes files:

- May create temp files through Flask upload/package tests.
- Must use temporary directories and clean them.

### 4. Existing Slip Parser/CLI Regression Tests

Command:

```powershell
python -m unittest tests.test_slip_parser_ttb_party_mapping tests.test_slip_lawyer_cli
```

Expected:

- Existing slip parsing and CLI audit behavior remain stable.

Writes files:

- Uses Python temporary directories in existing tests.

### 5. Backend Health Check After Approved Live Startup

Start command:

```powershell
python thai_ocr_project\run_backend.py
```

Health command:

```powershell
Invoke-WebRequest http://127.0.0.1:5000/health
```

Expected:

- HTTP `200`.
- JSON includes `status: ok` and `ocr_endpoint: /api/ocr`.

Writes files:

- Startup may create SQLite runtime DB or temp upload directory.

Approval:

- Required if the phase forbids live runtime execution.

### 6. Backend OCR Contract With Mocked Provider

Command:

```powershell
python -m unittest tests.test_slip_batch_api
```

Expected assertions:

- `combined_results` exists.
- `batch_summary.total_files` matches uploads.
- `success_count` and `failure_count` are correct.
- `forensics_analysis.integrity_hash` equals `SHA256:` plus the SHA-256 of uploaded bytes.
- Placeholder hash `SHA256:7e8b23a9d98f7e2a87c102a1b5c68f9a2e31d4e8b09f1a23b4c5d6e7f8a901bc` never appears.

Writes files:

- Temporary upload files only; tests must clean them.

### 7. Package Endpoint Contract

Command:

```powershell
python -m unittest tests.test_package_project_api
```

Expected assertions:

- ZIP request returns status `200`.
- ZIP download filename matches requested archive name.
- ZIP archive contains each submitted source/artifact exactly once.
- ZIP with password returns status `400` and a clear JSON error.
- RAR with missing `Rar.exe` returns controlled error, not a traceback.
- Unsupported format returns status `400`.

Writes files:

- Temporary archive files only; tests must clean them.

### 8. Frontend E2E Tests

Command:

```powershell
cd "Create Single Page Website"
npm.cmd run test:e2e
```

Expected assertions:

- SPA opens on `127.0.0.1`.
- Chat fixture upload generates preview pages.
- Page numbers are sequential.
- Adjacent page metadata does not overlap.
- Save PDF action produces `LINE_Chat_Paginator_Evidence.pdf`.
- Send Project action posts source files and artifacts to `/api/package-project`.
- Slip mode displays unknown/review-required states instead of fake verified metadata when fields are absent.

Writes files:

- Playwright can write reports, traces, screenshots, and browser artifacts.

Approval:

- Required in phases that forbid generated test artifacts.

### 9. Approved Release Build Verification

Command:

```powershell
cd "Create Single Page Website"
npm.cmd run verify
```

Expected:

- Typecheck passes.
- Vite build passes.
- `dist` is generated.

Writes files:

- Yes, `Create Single Page Website/dist`.

Approval:

- Required before running.

### 10. Approved Preview Smoke

Command:

```powershell
cd "Create Single Page Website"
npm.cmd run preview
```

Expected:

- Preview server binds to `127.0.0.1:4173` based on current Vite config.
- Browser smoke confirms built SPA loads.

Writes files:

- No expected source output, but runtime logs may appear.

Approval:

- Required if live server execution is restricted.

## Test Coverage Matrix

| Risk / debt | Test coverage |
| --- | --- |
| R-001 Chat Mode not proven | Playwright `chat-workflow.spec.ts` |
| R-002 hardcoded forensic hash | `tests/test_slip_batch_api.py` exact SHA-256 assertion |
| R-004 tracked runtime DB | Release checklist and DB URL test |
| R-007 missing WinRAR | `tests/test_package_project_api.py` RAR missing dependency test |
| R-008 archive content unproven | `tests/test_package_project_api.py` ZIP content test |
| R-011 hardcoded endpoints | SPA typecheck plus API service tests/E2E |
| R-013 hardcoded case metadata | Preview UI test for unknown/review state |
| R-020 missing frontend coverage | Playwright E2E suite |
| TD-014 verify writes artifacts | Test policy separates `typecheck` from `verify` |

## Required Test Files Later

Backend:

- `tests/test_slip_batch_api.py`
- `tests/test_package_project_api.py`
- `tests/test_slip_parser_ttb_party_mapping.py`
- `tests/test_slip_lawyer_cli.py`

Frontend:

- `Create Single Page Website/playwright.config.ts`
- `Create Single Page Website/tests/e2e/chat-workflow.spec.ts`
- `Create Single Page Website/tests/e2e/package-workflow.spec.ts`
- `Create Single Page Website/tests/e2e/helpers/fixtures.ts`

Supporting code under test:

- `Create Single Page Website/src/app/App.tsx`
- `Create Single Page Website/src/app/services/evidenceApi.ts`
- `Create Single Page Website/src/app/config/api.ts`
- `Create Single Page Website/src/app/utils/evidenceMetadata.ts`
- `Create Single Page Website/src/app/utils/pagination.ts`
- `Create Single Page Website/src/app/utils/pdfExport.ts`
- `thai_ocr_project/app.py`
- `thai_ocr_project/database/models.py`
- `thai_ocr_project/database/db_manager.py`

## Acceptance Gates

Gate 1: Backend contract

- `python -m unittest tests.test_slip_batch_api tests.test_package_project_api` passes.

Gate 2: Frontend read-only check

- `npm.cmd run typecheck` passes from `Create Single Page Website`.

Gate 3: Browser workflow

- `npm.cmd run test:e2e` passes after approved live server/browser execution.

Gate 4: Release build

- `npm.cmd run verify` passes after explicit approval.

Gate 5: Release cleanliness

- `git status --short` is reviewed.
- No credentials, runtime DB, generated output, screenshots, traces, archives, or root temp artifacts are included in release source.

## Rollback Test Plan

After any rollback:

1. Run backend tests for the reverted area.
2. Run `npm.cmd run typecheck` for SPA changes.
3. Recheck `git status --short`.
4. Confirm no deferred path changed.
5. If rollback touches DB config, run backend health check only after approval.

## Commands Not Planned For Canonical Testing

Do not run these for this implementation stream:

```powershell
npm.cmd start
docker compose up
docker-compose up
StartUp\Start.bat
StartUp\chat-evidence-processor\Start_Evidence.bat
```

Reason:

- They belong to deferred architecture paths and are outside the locked canonical runtime.
