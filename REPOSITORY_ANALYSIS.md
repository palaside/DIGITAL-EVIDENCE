# DIGITAL EVIDENCE - REPOSITORY ANALYSIS

Analysis date: 2026-06-12  
Scope: static repository analysis only. No source code edits, no dependency installs, no builds, no tests, no live backend calls.

## Executive Summary

This repository is a local Digital Evidence workstation with three active layers:

1. `Create Single Page Website` is the primary Vite + React + TypeScript SPA.
2. `thai_ocr_project` is the local Flask backend for OCR and project packaging.
3. `bank_slip_reader` is the reusable OCR/parser library used by backend and CLI workflows.

The project is suitable for MVP/demo iteration, but not production-ready yet. The highest-risk gap is not basic implementation; it is acceptance proof: Chat Mode preview, PDF export, and Send Project must be verified end-to-end from the same generated evidence pages.

## Top-Level Structure

| Path | Role | Notes |
|---|---|---|
| `Create Single Page Website` | Primary SPA | Vite/React app. README explicitly says SPA first and Electron deferred. |
| `thai_ocr_project` | Local backend | Flask app with OCR, health routes, package-project endpoint, DB manager, image modules. |
| `bank_slip_reader` | OCR/parser package | Provider abstraction plus rule-based/GPT parser support. |
| `tests` | Python regression tests | Covers slip parser, lawyer CLI, and batch OCR API behavior. |
| `StartUp` | One-click runtime experiment | Separate Electron-style A4 chat evidence processor flow. |
| `tmp-tests`, `outputs`, `output` | Generated/test artifacts | Should not be mixed with feature commits. |
| Root `package.json` | Older/deferred Electron package | Description says Electron app, but SPA README marks Electron as deferred. |

## Frontend Analysis

Primary folder: `Create Single Page Website`

Technology:

- Vite 6
- React/TypeScript
- Tailwind/shadcn-style UI components
- `jsPDF` for PDF output
- `tesseract.js` still present as a dependency, but current Slip Mode path posts to backend and throws if backend OCR fails.

Important scripts:

```text
npm run dev
npm run typecheck
npm run build
npm run verify
```

`npm run verify` is the expected SPA gate because it runs typecheck and build.

### Chat Mode Flow

Observed flow in `App.tsx` and `pagination.ts`:

1. User uploads chat images.
2. Duplicate filenames are rejected.
3. Adjacent source images are checked for visual overlap.
4. The app may trim overlap from the top of later images.
5. Each image is segmented by `segmentChatImage`.
6. Generated `PageSegment[]` is renumbered and stored in `paginatedPages`.
7. Preview reads `page.canvasDataUrl`.
8. PDF export uses `paginatedPages.map(page => page.canvasDataUrl)`.

This is the correct design direction because preview and export can share the same page source. It still needs runtime proof with real samples.

### Slip Mode Flow

Observed flow in `App.tsx`:

1. User uploads slip images.
2. Browser tries QR/EMVCo scan first for the first image.
3. Images are posted to `http://localhost:5000/api/ocr`.
4. Response `combined_results` is normalized.
5. `validateSlipData` adds client-side normalized display fields.
6. Slip rows are passed into preview and PDF summary output.

Risk: the UI still contains fallback/display defaults such as placeholder hash snippets and default bank/brand values when OCR fields are missing.

### Export / Package Flow

- `Save Evidence` calls `exportEvidencePdf`.
- `Send to System` opens package options and posts files/artifacts to `http://localhost:5000/api/package-project`.
- Chat mode adds generated chat page PNGs as artifacts.
- Slip mode adds `slip-ocr-analysis.json`.
- Optional PDF is built in-browser and attached to the backend package request.

This is implemented, but existing status says it is not accepted closed until real user interaction proves it.

## Backend Analysis

Primary file: `thai_ocr_project/app.py`

Runtime:

- Flask backend.
- Default local host/port: `127.0.0.1:5000`.
- `run_backend.py` starts the Flask app without reloader.

Routes:

| Route | Methods | Purpose |
|---|---|---|
| `/` | GET | Health/status JSON. |
| `/health` | GET | Health/status JSON. |
| `/api/ocr` | GET/POST/OPTIONS | GET help/status, POST slip OCR, OPTIONS CORS preflight. |
| `/api/package-project` | POST/OPTIONS | ZIP/RAR packaging endpoint. |

OCR processing:

- Preprocesses uploaded image.
- Detects/matches bank logo.
- Uses `OCREngine(provider="google")`.
- Uses `SlipParser(mode="rule_based")`.
- Writes an evidence record to SQLite.
- Returns `combined_results` and `batch_summary` for batch uploads.

Packaging:

- ZIP packaging uses Python `zipfile`.
- Password ZIP is explicitly unsupported.
- RAR packaging depends on `Rar.exe` and supports password mode.
- Archive output is streamed with `send_file` and temp folders are cleaned.

Key risk: `forensics_analysis.integrity_hash` is a hardcoded placeholder-like SHA-256 string in the backend response. Production evidence handling needs a real hash from the uploaded source bytes.

## OCR / Parser Library

Primary folder: `bank_slip_reader`

Important files:

- `ocr_engine.py`: supports `rule`, `tesseract`, `openai`, and `google`.
- `slip_parser.py`: supports `rule_based` and `ai` modes.
- `models.py`: slip data model.
- `batch_processor.py`: batch processing entry.

Current recommended OCR path in this checkout is Google Cloud Vision extraction plus local rule-based parsing. OpenAI support exists in code, but prior live use was blocked by quota and was superseded by Google Cloud Vision.

## Tests And Verification

Discovered tests:

- `tests/test_slip_parser_ttb_party_mapping.py`
- `tests/test_slip_lawyer_cli.py`
- `tests/test_slip_batch_api.py`
- `bank_slip_reader/test_parser.py`
- `bank_slip_reader/test_ocr_text.py`
- `bank_slip_reader/test_production.py`
- `StartUp/chat-evidence-processor/tests/layout-fit.test.js`
- Multiple manual/debug scripts under `tmp-tests`

Recommended verification commands, not executed in this pass:

```text
cd "D:\Project\หลักฐานดิจิทัล  DIGITAL EVIDENCE\Create Single Page Website"
npm.cmd run verify
```

```text
cd "D:\Project\หลักฐานดิจิทัล  DIGITAL EVIDENCE"
python -m unittest discover -s tests -p "test_*.py"
```

```text
cd "D:\Project\หลักฐานดิจิทัล  DIGITAL EVIDENCE"
python -m unittest bank_slip_reader.test_parser bank_slip_reader.test_ocr_text
```

Backend live proof still requires:

- Google credentials set through `.env` / `GOOGLE_APPLICATION_CREDENTIALS`.
- Backend running on `127.0.0.1:5000`.
- Real POST to `/api/ocr`.
- Real POST to `/api/package-project`.

## Dependency / Runtime Notes

Frontend:

- SPA package has a complete `package-lock.json`.
- `node_modules` exists locally.
- Vite/TypeScript verification should use `npm.cmd` on Windows.

Backend:

- `thai_ocr_project/requirements.txt` includes OpenCV, EasyOCR, Torch, YOLO-related libraries, Flask, and `google-cloud-vision`.
- Google Cloud Vision requires credentials.
- Tesseract path exists in code but is not the main current runtime path.

Root:

- Root `package.json` still describes an Electron app.
- Do not treat root Electron as production entrypoint unless the user explicitly reopens Electron scope.

## Git / Hygiene Analysis

Observed before report creation:

- `git diff --stat` showed 16 tracked modified files with 1981 insertions and 620 deletions plus one binary DB change.
- `.env` is local and ignored.
- `gen-lang-client-0183254835-46d10fa2aa44.json` is local and ignored.
- `git ls-files --error-unmatch` did not list `.env` or the Google credential JSON.
- `thai_ocr_project/digital_evidence.db` is tracked and modified.
- Multiple untracked generated artifacts exist.

Recommended policy:

1. Keep credentials, local DBs, screenshots, archives, and generated test outputs out of feature commits.
2. Decide separately whether `thai_ocr_project/digital_evidence.db` should be removed from Git tracking.
3. Treat any previously tracked credential as exposed and rotate it.

## Production Readiness Assessment

Ready for MVP/demo iteration:

- SPA-first workflow.
- Chat pagination implementation.
- Slip OCR backend route.
- PDF export code path.
- Backend health/help routes.
- ZIP/RAR package endpoint.
- Slip parser regression tests.

Not production-ready:

- Placeholder-like forensic hash.
- Runtime proof for Chat export/send remains pending.
- External dependencies are fragile: Google credentials, backend process, WinRAR for RAR.
- Generated artifacts and modified DB are mixed into the working tree.
- Some UI values still present default/placeholder evidence metadata.
- No fresh verification commands were executed in this read-only pass.

## Best 3 Findings

1. Architecture direction is clear: SPA first, backend local, Electron deferred.
2. Main functional blocker is acceptance proof for Chat preview/export/send, not absence of implementation.
3. Repo hygiene must be cleaned before commit: especially tracked DB changes, generated artifacts, and credential history.
