# DIGITAL EVIDENCE - NEXT ACTION

Analysis date: 2026-06-12  
Purpose: next concrete steps after read-only repository analysis.

## Best 3 Actions

## 1. Freeze The Worktree Before More Feature Work

Goal: prevent unrelated source, DB, generated, and report changes from being mixed.

Do:

- Review the current dirty files with `git status --short`.
- Separate active source work from generated artifacts.
- Decide whether `thai_ocr_project/digital_evidence.db` should remain tracked.
- Keep `.env`, Google credential JSON, screenshots, archives, `tmp-tests`, and `outputs` out of feature commits.

Acceptance:

- The active task scope is written down.
- No generated/local artifacts are committed with source changes.
- Credential files remain untracked.

## 2. Close Chat Mode Preview -> Export -> Send Project

Goal: prove the real user workflow, not only the code path.

Recommended verification order:

```text
cd "D:\Project\หลักฐานดิจิทัล  DIGITAL EVIDENCE\Create Single Page Website"
npm.cmd run verify
```

Then run the SPA and backend, upload known LINE chat sample files, and verify:

- Generated preview pages have no duplicated visible content.
- Adjacent pages do not overlap.
- Page count and page order match `paginatedPages`.
- `Save Evidence` creates a usable `LINE_Chat_Paginator_Evidence.pdf`.
- PDF content materially matches the preview.
- `Send to System` creates a real ZIP/RAR archive through `/api/package-project`.

Acceptance:

- Chat Mode is only done when preview, export, and package flow all pass in the real UI.

## 3. Replace Placeholder Forensic Metadata With Real Audit Values

Goal: make evidence output credible beyond demo level.

Do:

- Compute SHA-256 from uploaded source bytes in the backend.
- Return the real hash in `forensics_analysis.integrity_hash`.
- Store hash/audit metadata consistently in the database or audit JSON.
- Remove UI fallback values that look like real forensic evidence when data is missing.
- Add regression tests for hash presence, OCR batch summary, and package response behavior.

Acceptance:

- Every uploaded source file has a real hash.
- UI never shows fake evidence metadata as if it were verified.
- Tests cover OCR response shape and audit metadata.

## /GOAL

Next goal: close Chat Mode as a real evidence workflow while keeping Slip Mode stable and avoiding Electron expansion.

## /SCHEDULE

1. Worktree hygiene decision.
2. SPA verify plus browser-based Chat Mode proof.
3. Backend audit metadata hardening.

## /Grill-me

- Which exact chat sample files are the official regression set?
- Should archive password support require RAR only, or should ZIP password support be removed from UI choices entirely?
- Should the local SQLite DB be test data, runtime data, or a tracked seed database?
