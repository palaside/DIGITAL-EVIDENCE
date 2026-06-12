# Runtime Decision

Date: 2026-06-12
Decision status: Accepted

## Decision

Use a browser Single Page Application in `Create Single Page Website` with a local Flask backend in `thai_ocr_project` as the canonical runtime.

The runtime is local-first:

- Frontend: Vite/React SPA.
- Backend: Flask service bound to `127.0.0.1:5000`.
- OCR: backend-mediated OCR through the configured OCR engine.
- Parsing: rule-based slip parser.
- Persistence: local SQLite runtime database.
- Packaging: backend local packaging endpoint.

## Why This Runtime Is Canonical

The SPA README states the SPA is the primary application and Electron is intentionally deferred. The SPA `package.json` contains the active Vite scripts, including `dev`, `typecheck`, `build`, and `verify`. The backend exposes the active service endpoints used by the SPA workflow.

The stabilization documents also identify multiple conflicting runtimes. Locking the SPA plus Flask backend removes ambiguity and gives verification a single target.

## Runtime Boundary

The frontend is responsible for:

- User interface.
- Evidence intake workflow.
- Preview and report flow.
- Calling the local backend for OCR and package operations.

The backend is responsible for:

- OCR endpoint: `/api/ocr`.
- Package endpoint: `/api/package-project`.
- Health endpoint: `/health`.
- Temporary upload handling.
- Local database writes for OCR/audit records.
- Local filesystem package creation.

## Accepted Commands

Read-only frontend check:

```powershell
cd "Create Single Page Website"
npm.cmd run typecheck
```

Approved build verification only:

```powershell
cd "Create Single Page Website"
npm.cmd run verify
```

Backend startup:

```powershell
python thai_ocr_project\run_backend.py
```

Backend health check:

```powershell
Invoke-WebRequest http://127.0.0.1:5000/health
```

## Rejected As Canonical Runtime

Root Electron runtime:

- Rejected for this phase.
- Reason: root `package.json` points to `electron .`, while current project documentation says SPA-first and Electron deferred.

Docker/Celery/Postgres runtime:

- Rejected for this phase.
- Reason: compose-level architecture is incomplete/stale relative to the active SPA/backend path.

StartUp launcher:

- Rejected for this phase.
- Reason: it is a distribution/runtime experiment, not the verified application architecture.

Root static prototype:

- Rejected for this phase.
- Reason: active app logic lives in the SPA package, not root static files.

## Runtime Invariants

- The SPA package is the frontend authority.
- The Flask backend is the local service authority.
- Backend access must remain local-only unless a later security review approves remote exposure.
- Generated outputs, databases, temporary uploads, screenshots, and package artifacts are runtime data, not source.
- Electron and Docker cannot be used as release blockers or release proof until separately revived and locked.

## Open Runtime Gaps

- Hardcoded or placeholder forensic metadata must be replaced by computed values.
- OCR environment requirements must be fully documented.
- The tracked SQLite database must be treated as non-canonical runtime data.
- Package/export acceptance must be verified against real user workflows.
- Endpoint URLs should be configurable before production release.
