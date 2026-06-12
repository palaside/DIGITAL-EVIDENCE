# DIGITAL EVIDENCE - CONTEXT STATUS

## Current Truth

- The last fully verified completed topic was `Slip receiver display runtime verification`
- The current unresolved topic is `Close Chat Mode pagination + export interaction`
- Do not treat Chat Mode as finished just because some preview pages look acceptable

## Source Of Truth For Chat Mode

- Follow these rules in this order:
  - `segment-first`
  - `frame-fit-first`
  - `shrink-first`
  - `bottom-anchor`
- Never split through a visible object
- Left/right whitespace after proportional shrinking is acceptable
- Top whitespace is acceptable only when it is the consequence of keeping the last valid object as close to the bottom edge as possible
- Never create fake empty wallpaper pages
- Never accept duplicated overlap across adjacent pages

## Known Open Regressions

- Adjacent chat pages can still show overlap or repeated content
- Some chat pages still look like the placement decision and the export decision are not locked together
- The system has not yet proven that Chat preview and Chat PDF export are driven by one identical placement truth
- `Export` and `Send Project` have code paths, but they are not yet accepted as closed from real user interaction alone

## Preview Vs Export Caveat

- Chat preview and PDF export must be treated as one flow, not two separate wins
- A page that looks correct in preview does not prove the exported PDF is correct
- A bottom-anchored export path does not prove the preview path is correct

## Export / Send Caveat

- Do not claim success from button wiring alone
- `Export` is only done when the current Chat output becomes a real usable PDF
- `Send Project` is only done when the package flow opens, runs, and returns a real archive in the intended path

## Files To Inspect First

- `Create Single Page Website/src/app/utils/pagination.ts`
- `Create Single Page Website/src/app/utils/pdfExport.ts`
- `Create Single Page Website/src/app/components/PreviewColumn.tsx`
- `Create Single Page Website/src/app/components/ActionsColumn.tsx`
- `Create Single Page Website/src/app/App.tsx`

## Runtime Reference

- SPA host:
  - `http://127.0.0.1:5173/`
  - PID `34912`
- OCR backend:
  - `http://127.0.0.1:5000/`
  - PID `31888`

## Do-Not-Do List

- Do not widen scope into Slip Mode
- Do not declare Chat Mode finished from a handful of screenshots
- Do not commit generated DB, temp artifacts, screenshots, or credential files with feature work
- Do not let preview logic and export logic drift apart silently
- Do not patch visible symptoms before locating the exact layer:
  - segmentation
  - preview placement
  - export placement
  - packaging interaction
