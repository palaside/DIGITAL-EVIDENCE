# DIGITAL EVIDENCE - PROJECT STATUS

Analysis date: 2026-06-12  
Mode: read-only repository analysis; source code was not modified.  
Verification status: static inspection only; build, tests, browser flow, OCR live calls, and packaging flow were not executed in this pass.

## Current Goal

Keep the project on the SPA-first path and close the real evidence workflow in this order:

1. Chat Mode pagination, preview, PDF export, and Send Project must be proven from the same generated page source.
2. Slip Mode OCR must keep using Google Cloud Vision plus rule-based parsing unless a provider change is explicitly requested.
3. Electron/root packaging should stay deferred until the SPA and local backend flows are stable.

## Repository State

- Primary app: `Create Single Page Website`
- Primary backend: `thai_ocr_project`
- OCR/parser library: `bank_slip_reader`
- One-click/runtime packaging experiment: `StartUp`
- Root Electron package exists, but current project docs mark it as deferred.
- Current file inventory from `rg --files`: 473 files.

## Current Functional Areas

| Area | Current state | Evidence |
|---|---|---|
| SPA | Primary MVP path | `Create Single Page Website/README.md` says SPA first and Electron deferred. |
| Chat Mode | Implemented but not accepted closed | `App.tsx` uses cross-file overlap detection, `segmentChatImage`, `PageSegment`, and export from `paginatedPages`. Existing status says preview/export/send are not fully proven. |
| Slip Mode | Implemented through local OCR backend | SPA posts images to `http://localhost:5000/api/ocr`; backend uses Google OCR and `SlipParser(mode="rule_based")`. |
| PDF export | Implemented | `pdfExport.ts` builds chat/slip PDFs with `jsPDF`; Chat uses `paginatedPages.map(page.canvasDataUrl)`. |
| Send Project | Implemented but needs runtime proof | SPA posts to `http://localhost:5000/api/package-project`; backend creates ZIP or RAR. |
| Backend health | Implemented | Flask routes include `GET /`, `GET /health`, and `GET/POST/OPTIONS /api/ocr`. |
| Lawyer slip report CLI | Implemented | `thai_ocr_project/slip_lawyer_cli.py` scans images, deduplicates target slips, writes PDF and audit JSON. |

## Worktree Warning

The repository was already dirty before this report update.

- `git diff --stat` showed 16 tracked modified files.
- Source/UI/backend changes were already present in:
  - `Create Single Page Website/src/app/App.tsx`
  - `Create Single Page Website/src/app/components/*`
  - `Create Single Page Website/src/app/utils/pagination.ts`
  - `Create Single Page Website/src/styles/*`
  - `Create Single Page Website/vite.config.js`
  - `bank_slip_reader/slip_parser.py`
  - `thai_ocr_project/app.py`
- Data file already modified: `thai_ocr_project/digital_evidence.db`
- Many generated/local artifacts are untracked, including `tmp-tests`, `outputs`, screenshots, PSD/audio assets, and `StartUp`.

Do not mix report/documentation changes with feature, runtime, generated, database, or credential changes.

## Security / Hygiene

- `.env` exists locally and is ignored by `.gitignore`.
- `gen-lang-client-0183254835-46d10fa2aa44.json` exists locally and is ignored by `.gitignore`.
- `git ls-files --error-unmatch` did not list `.env` or the Google credential JSON during this analysis.
- `thai_ocr_project/digital_evidence.db` is tracked and modified even though `*.db` is ignored; this needs a separate cleanup decision.
- If any credential JSON was ever committed before, treat it as exposed and rotate the service account key.

## Known Open Risks

1. Chat Mode is not closed until preview, PDF export, and Send Project are verified as one real flow.
2. `forensics_analysis.integrity_hash` in backend/UI is currently placeholder-like and should be replaced with a real per-file SHA-256 audit value.
3. Local runtime depends on external state: Google credentials, backend process on port 5000, SPA dev server, and WinRAR/Rar.exe for password-protected RAR output.

## Next Acceptance Gate

Chat Mode can be marked done only when all are true:

- No duplicated or overlapping visible content across adjacent chat pages.
- Page segmentation rules are enforced by `PageSegment` metadata.
- Preview and exported PDF use the same `canvasDataUrl` source pages.
- `Save Evidence` produces a usable PDF from the real UI.
- `Send to System` produces a real ZIP/RAR archive through the backend.
- `npm.cmd run verify` passes inside `Create Single Page Website`.

## /GOAL

Close the SPA evidence workflow without widening scope into Electron or unrelated redesign.

## /SCHEDULE

1. Freeze worktree scope and decide what dirty files belong to the active task.
2. Verify Chat Mode preview/export/send from real browser interaction.
3. Clean production credibility gaps: real hashes, generated artifact policy, DB tracking, and backend regression tests.

## /Grill-me

- What exact sample files prove Chat Mode is correct?
- Are `PreviewColumn` and `pdfExport.ts` visually/materially identical for every page?
- Should `thai_ocr_project/digital_evidence.db` remain tracked, or should it be removed from Git tracking in a separate cleanup?
