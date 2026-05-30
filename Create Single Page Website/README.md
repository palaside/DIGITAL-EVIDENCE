
# Digital Evidence SPA

This folder is the primary Single Page Application (SPA) for the Digital Evidence MVP.

Electron work is intentionally deferred until the SPA flow is stable.

## Current Scope

The SPA covers the browser UI for:

- uploading LINE chat or bank slip images
- generating a preview
- running browser-side OCR fallback when the local OCR API is unavailable
- displaying extracted slip data as structured JSON

## Commands

Run these commands from this folder:

```bash
npm run dev
npm run typecheck
npm run build
npm run verify
```

`npm run verify` is the default gate before treating SPA changes as ready.

## Local Services

Slip OCR can call a local backend at `http://localhost:5000/api/ocr`.
If that backend is offline, the SPA falls back to browser OCR through Tesseract.js.

## Deferred

Do not treat the root Electron package as the production entrypoint yet. The next stable milestone is SPA first, then Electron wrapper after the SPA behavior is verified.
