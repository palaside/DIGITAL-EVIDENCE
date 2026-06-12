# Architecture Lock

Date: 2026-06-12
Phase: ARCHITECTURE LOCK
Status: Locked for MVP stabilization

This document is the single authoritative architecture decision for the current project phase. It supersedes conflicting older notes about Electron, Docker, StartUp launchers, root static files, or alternate runtime paths unless a later architecture-lock document explicitly replaces it.

## Evidence Base

Primary documents read:

- `PROJECT_STATUS.md`
- `REPOSITORY_ANALYSIS.md`
- `VERIFY_REPORT.md`
- `STABILIZATION_REPORT.md`
- `RISK_REGISTER.md`
- `TECHNICAL_DEBT.md`

Supporting repo evidence inspected:

- `Create Single Page Website/README.md`
- `Create Single Page Website/package.json`
- `package.json`
- `thai_ocr_project/app.py`
- `thai_ocr_project/run_backend.py`
- `git status --short`

No build, package installation, source-code edit, file deletion, file move, or file rename was performed for this architecture lock.

## Locked Decisions

| Area | Canonical decision | Non-canonical / deferred |
| --- | --- | --- |
| Runtime | Browser SPA plus local Flask OCR/package backend | Root Electron runtime, `StartUp`, Docker/Celery, root static prototype |
| Entry point | SPA `Create Single Page Website/src/main.tsx` to `src/app/App.tsx`; backend `thai_ocr_project/run_backend.py` | Root `package.json` `electron .`, direct root `index.html`, ad hoc scripts |
| Build path | `Create Single Page Website` npm/Vite path | Root Electron build path, Docker image build, pnpm workspace path |
| Release path | Approved SPA static build plus local backend runbook/artifacts | Electron installer, Docker deployment, StartUp one-click package |
| Data storage | Local runtime files only: browser-selected evidence, backend temp uploads, generated output packages/reports, local env/credentials | Source-tracked runtime outputs, screenshots, databases, credentials, generated packages |
| Database | Local SQLite runtime database for MVP OCR/audit records | Tracked SQLite DB as release asset, Postgres/Docker database path |
| Startup flow | Start Flask backend on `127.0.0.1:5000`, verify `/health`, then start Vite SPA | Root `npm start`, Docker Compose, StartUp launcher |

## Canonical Runtime

The canonical runtime is:

1. Frontend: browser-based SPA in `Create Single Page Website`.
2. Backend: local Flask service in `thai_ocr_project`.
3. Backend host: `127.0.0.1`.
4. Backend port: `5000`.
5. OCR path: Google Cloud Vision through backend OCR engine, then rule-based slip parsing.
6. Packaging path: backend `/api/package-project` for local ZIP/RAR packaging.

This is a local-first MVP runtime. The browser app owns the user workflow. The Flask backend owns privileged local operations: OCR, package creation, and local persistence.

## Canonical Entry Point

Frontend entry point:

- Package root: `Create Single Page Website`
- Application entry: `src/main.tsx`
- Main app composition: `src/app/App.tsx`

Backend entry point:

- Startup command target: `thai_ocr_project/run_backend.py`
- Service implementation: `thai_ocr_project/app.py`
- Health endpoint: `http://127.0.0.1:5000/health`
- OCR endpoint: `http://127.0.0.1:5000/api/ocr`
- Package endpoint: `http://127.0.0.1:5000/api/package-project`

Root `package.json` is not the canonical entry point. It currently points to an Electron runtime and conflicts with the SPA-first architecture stated in the SPA README and stabilization documents.

## Canonical Build Path

Canonical frontend build root:

```powershell
cd "Create Single Page Website"
```

Canonical read-only verification:

```powershell
npm.cmd run typecheck
```

Canonical release build command, only after explicit approval because it writes `dist`:

```powershell
npm.cmd run verify
```

`npm.cmd run verify` resolves to typecheck plus Vite build in the SPA package. The SPA package has `package-lock.json`, so npm is the locked package manager for this phase.

The Flask backend has no canonical build artifact in this phase. It is validated by startup, health check, and endpoint behavior after approval to run the service.

## Canonical Release Path

The canonical release path for the current phase is:

1. Freeze source and documentation scope.
2. Confirm no credentials, generated outputs, local databases, package archives, or temporary test files are included as release source.
3. Run approved frontend verification from `Create Single Page Website`.
4. Run approved backend startup and health check.
5. Run approved user-flow acceptance for upload, OCR, preview, export/package, and report generation.
6. Ship SPA static artifact plus backend runbook/runtime package.

This is an MVP/local release path, not a production web deployment path.

Production release is blocked until at least these items are resolved:

- Hardcoded or placeholder forensic metadata is replaced by real computed metadata.
- Evidence/package acceptance tests prove the exported artifacts match user expectations.
- Runtime data and generated artifacts are excluded from source and release commits.
- Environment variable documentation covers the active OCR backend.
- A single packaging/distribution format is selected and tested.

## Canonical Data Storage

Canonical storage responsibilities:

- User-selected evidence files: selected in the browser workflow and submitted only when needed.
- Backend upload staging: temporary files under backend-controlled temp storage, deleted after processing where implemented.
- Generated reports/packages: local runtime artifacts, not source assets.
- Credentials and OCR config: local `.env` and local Google service-account JSON, ignored from source.
- Audit/OCR records: local SQLite database during MVP.

No generated image, audio, archive, database, output folder, or temporary test folder is canonical source code.

## Canonical Database

The canonical MVP database engine is SQLite through the backend database manager.

Current evidence shows the backend uses:

```text
sqlite:///digital_evidence.db
```

Architecture rule:

- SQLite is allowed as a local MVP runtime database.
- The database file itself is runtime data, not a release artifact.
- A tracked SQLite database is not canonical source and must not define production state.
- Postgres, Redis, and Celery are not canonical until the Docker/backend architecture is separately revived and locked.

## Canonical Startup Flow

Developer/local startup:

1. Start backend:

```powershell
python thai_ocr_project\run_backend.py
```

2. Confirm backend health:

```powershell
Invoke-WebRequest http://127.0.0.1:5000/health
```

3. Start frontend:

```powershell
cd "Create Single Page Website"
npm.cmd run dev
```

4. Open the Vite URL shown by the dev server.
5. Use the SPA as the only canonical user interface.

Release-preview startup after an approved build:

```powershell
cd "Create Single Page Website"
npm.cmd run preview
```

## Explicitly Deferred Paths

These paths are not removed, but they are not allowed to define architecture for the current phase:

- Root Electron app and root `package.json` runtime.
- `StartUp` launcher/runtime.
- Docker Compose, Celery, Redis, and Postgres stack.
- Root static `index.html`, `script.js`, and `styles.css` prototype.
- NotebookLM/mock evidence sources as production data.
- RAR password packaging as the only release format, because it depends on local WinRAR availability.

## Architecture Rule

All future implementation, verification, documentation, and release work should use this rule:

```text
SPA first. Local Flask backend second. Electron, Docker, and launcher paths are deferred until separately locked.
```
