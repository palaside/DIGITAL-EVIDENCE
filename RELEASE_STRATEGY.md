# Release Strategy

Date: 2026-06-12
Release track: MVP local release
Status: Locked for stabilization, not production-ready

## Release Position

The project should release as a local-first SPA plus Flask backend package.

The release is not an Electron installer, Docker deployment, or StartUp launcher in the current architecture lock.

## Canonical Release Artifact

The canonical MVP release consists of:

- SPA static build from `Create Single Page Website/dist`.
- Local Flask backend from `thai_ocr_project`.
- Runtime instructions for starting backend and serving/previewing frontend.
- Environment documentation for OCR credentials and local configuration.
- Clean artifact policy excluding credentials, runtime databases, generated outputs, temp files, screenshots, and local test artifacts.

## Release Gate

A release candidate must pass these gates:

1. Source scope check:
   - No credentials.
   - No generated package archives.
   - No local runtime database as release source.
   - No unrelated screenshots, audio, PSD, temp outputs, or test debris as release source.

2. Frontend verification:
   - `npm.cmd run typecheck` from `Create Single Page Website`.
   - `npm.cmd run verify` from `Create Single Page Website` only after approval because it writes `dist`.

3. Backend verification:
   - Start `thai_ocr_project/run_backend.py`.
   - Confirm `http://127.0.0.1:5000/health`.
   - Confirm `/api/ocr` behavior with expected credential state.
   - Confirm `/api/package-project` behavior for supported package formats.

4. End-to-end acceptance:
   - Upload workflow.
   - Slip OCR workflow.
   - Chat/preview/report workflow.
   - Export/package workflow.
   - Error states when OCR credentials, WinRAR, or input files are missing.

5. Documentation:
   - Startup flow.
   - Environment variables.
   - OCR credential setup.
   - Data/output retention policy.
   - Known limitations.

## Release Commands

Read-only readiness command:

```powershell
cd "Create Single Page Website"
npm.cmd run typecheck
```

Approved build command:

```powershell
cd "Create Single Page Website"
npm.cmd run verify
```

Approved preview command after build:

```powershell
cd "Create Single Page Website"
npm.cmd run preview
```

Backend startup command:

```powershell
python thai_ocr_project\run_backend.py
```

## Distribution Rule

The first stable distribution should be a documented local runtime package, not an installer.

Minimum package contents:

- Built SPA or instructions to serve the built SPA.
- Backend Python application files.
- Dependency/install instructions or controlled runtime environment.
- `.env.example` aligned with the active backend.
- OCR credential setup guide.
- Output/data retention notes.

## Release Blockers

Production release is blocked by:

- Placeholder or hardcoded forensic metadata.
- Incomplete package/export acceptance testing.
- Incomplete OCR credential documentation.
- Runtime outputs and local database currently visible in repo state.
- Multiple competing runtime paths that could confuse operators.
- Optional WinRAR dependency for password-protected RAR packaging.
- Lack of explicit data retention and evidence integrity policy.

## Deferred Release Paths

Electron installer:

- Deferred until the SPA plus backend flow is stable and there is a locked Electron architecture.

Docker deployment:

- Deferred until Dockerfile, Celery/task modules, database migrations, environment files, and service health checks are aligned.

StartUp launcher:

- Deferred until it is proven to wrap the canonical SPA/backend runtime without introducing a second architecture.

Postgres/Redis/Celery release:

- Deferred until the backend has a migration plan, deployment plan, and verification gate.

## Release Decision

Release only the architecture that can be explained and verified end to end:

```text
Local SPA frontend + local Flask backend + local SQLite runtime data.
```

Anything outside that path is experimental or deferred until separately locked.
