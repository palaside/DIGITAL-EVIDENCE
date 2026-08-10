import { useState } from "react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import projectLogo from "../../imports/digital_evidence_logo_full.png";
import { Cpu, BadgeInfo } from "lucide-react";

interface PreviewColumnProps {
  activeMode: "chat" | "slip";
  isGenerated: boolean;
  uploadedFiles: { name: string; url: string }[];
  paginatedPages?: { canvasDataUrl: string; pageNumber: number }[];
  ocrData?: any;
}

export function PreviewColumn({
  activeMode,
  isGenerated,
  uploadedFiles,
  paginatedPages = [],
  ocrData,
}: PreviewColumnProps) {
  const [zoomLevel, setZoomLevel] = useState<100 | 150>(100);
  const pageScaleClass = zoomLevel === 150 ? "max-w-[920px]" : "max-w-[760px]";
  const slipScaleClass = zoomLevel === 150 ? "max-w-[440px]" : "max-w-[360px]";
  const modeLabel = activeMode === "chat" ? "Chat preview" : "Slip preview";
  const modeHint = activeMode === "chat" ? "Generate pages" : "Run OCR";
  const previewSummary = isGenerated
    ? activeMode === "chat"
      ? `${paginatedPages.length} page${paginatedPages.length === 1 ? "" : "s"} ready`
      : `${uploadedFiles.length} slip${uploadedFiles.length === 1 ? "" : "s"} ready`
    : activeMode === "chat"
      ? "A4 evidence pages appear here"
      : "Slip review appears here";
  const previewNote = isGenerated
    ? activeMode === "chat"
      ? "Review each page before export."
      : "Check the source image against the extracted result."
    : activeMode === "chat"
      ? "Upload screenshots, then generate clean A4 pages."
      : "Upload slip images, then run OCR to inspect the result.";
  const generatedHash = Array.isArray(ocrData)
    ? ocrData[0]?.forensics_analysis?.integrity_hash
    : ocrData?.forensics_analysis?.integrity_hash;
  const slipSummary = Array.isArray(ocrData)
    ? ocrData.find((entry) => entry?.bank_slip_verification || entry?.extracted_transaction_metadata || entry?.error)
    : ocrData;
  const slipBankBrand =
    slipSummary?.bank_slip_verification?.matched_bank_brand ??
    slipSummary?.extracted_transaction_metadata?.bank_name ??
    "Unknown";
  const slipBrandConfidence =
    slipSummary?.bank_slip_verification?.brand_matching_confidence ??
    "Unknown";

  return (
    <div className="glass-panel relative flex h-full flex-col overflow-hidden rounded-2xl">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/35 px-6 py-4 dark:border-slate-700/70">
        <div className="space-y-2">
          <div className="inline-flex items-center rounded-full border border-[#c8d8eb] bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#12335f] shadow-sm dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200">
            {modeLabel}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[#112f59] dark:text-slate-100">
              {previewSummary}
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {previewNote}
            </p>
          </div>
        </div>
        {isGenerated ? (
          <div className="flex shrink-0 rounded-xl bg-white/55 p-0.5 text-xs font-medium shadow-sm dark:bg-slate-900/55">
            <button
              onClick={() => setZoomLevel(100)}
              className={`rounded-lg px-3 py-1.5 transition-colors ${
                zoomLevel === 100
                  ? "bg-white text-gray-900 shadow-sm dark:bg-slate-700 dark:text-white"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
              }`}
            >
              100%
            </button>
            <button
              onClick={() => setZoomLevel(150)}
              className={`rounded-lg px-3 py-1.5 transition-colors ${
                zoomLevel === 150
                  ? "bg-white text-gray-900 shadow-sm dark:bg-slate-700 dark:text-white"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
              }`}
            >
              150%
            </button>
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-6">
        <div
          className={`relative flex w-full flex-1 flex-col items-center overflow-auto rounded-[30px] border px-4 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] transition-all duration-300 ${
            isGenerated
              ? "min-h-[890px] border-[#c9d8e8] bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.95),_rgba(226,236,247,0.9)_38%,_rgba(213,225,239,0.92)_100%)] dark:border-slate-700 dark:bg-[radial-gradient(circle_at_top,_rgba(20,31,50,0.96),_rgba(12,22,37,0.96)_38%,_rgba(8,16,29,0.98)_100%)]"
              : "min-h-[520px] border-white/35 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.72),_rgba(232,239,248,0.56)_44%,_rgba(219,229,240,0.52)_100%)] dark:border-slate-700/70 dark:bg-[radial-gradient(circle_at_top,_rgba(20,31,50,0.72),_rgba(10,18,32,0.78)_45%,_rgba(2,6,23,0.9)_100%)]"
          }`}
        >
          <div className="mb-5 flex w-full max-w-[920px] items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                Preview canvas
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {activeMode === "chat"
                  ? isGenerated
                    ? "Each sheet shows the paginated export exactly as it will be reviewed."
                    : "Your generated A4 evidence pages will appear here."
                  : isGenerated
                    ? "Compare each uploaded slip with the OCR-ready review surface."
                    : "Your slip image review surface will appear here."}
              </p>
            </div>
            <div className="hidden rounded-2xl border border-white/55 bg-white/70 px-4 py-2 text-right shadow-sm dark:border-slate-700/70 dark:bg-slate-900/55 sm:block">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Next
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                {modeHint}
              </p>
            </div>
          </div>

          {isGenerated ? (
            <div className={`w-full ${pageScaleClass}`}>
              <div className="rounded-[34px] border border-white/70 bg-white/90 p-5 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.45)] dark:border-slate-700/70 dark:bg-slate-950/88">
                <div className="border-b border-slate-200 pb-4 dark:border-slate-800">
                  <div className="mb-2 flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-[#eef2f7] shadow-sm">
                        <img
                          src={projectLogo}
                          className="h-full w-full scale-[1.24] object-cover object-top"
                          alt="Emblem"
                        />
                      </div>
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-[0.24em] text-blue-900 dark:text-blue-100">
                          Digital Evidence Records
                        </h4>
                        <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                          {activeMode === "chat" ? "Chat evidence export" : "Slip OCR review"}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-1 text-right text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                      <p>
                        CASE <span className="ml-1 font-bold text-blue-950 dark:text-slate-100">DE-2026-0528</span>
                      </p>
                      <p>
                        DATE <span className="ml-1 font-bold text-slate-700 dark:text-slate-200">28 MAY 2026</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-[11px] dark:border-slate-800 dark:bg-slate-900/65 md:grid-cols-3">
                  <div>
                    <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                      Module
                    </span>
                    <span className="mt-1 block font-semibold text-blue-900 dark:text-blue-100">
                      {activeMode === "chat" ? "LINE Chat Paginator" : "Thai Slip OCR Scanner"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                      Files
                    </span>
                    <span className="mt-1 block font-semibold text-slate-800 dark:text-slate-100">
                      {uploadedFiles.length} image{uploadedFiles.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="truncate">
                    <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                      Hash
                    </span>
                    <span className="mt-1 block truncate font-mono text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                      {generatedHash ? `SHA256: ${generatedHash.slice(7, 18)}...` : "SHA256: pending"}
                    </span>
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  {activeMode === "chat" ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-3 py-2 text-[11px] font-medium text-blue-900 dark:border-blue-900/70 dark:bg-blue-950/30 dark:text-blue-100">
                        <BadgeInfo className="h-4 w-4 shrink-0 text-blue-700 dark:text-blue-300" />
                        <span>Pages are arranged to avoid splitting chat bubbles across sheets.</span>
                      </div>
                      {paginatedPages.length > 0 ? (
                        <div className="space-y-5">
                          {paginatedPages.map((page) => (
                            <div
                              key={page.pageNumber}
                              className="rounded-[26px] border border-slate-200 bg-slate-50/80 p-3 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.7)] dark:border-slate-800 dark:bg-slate-900/55"
                            >
                              <div className="mb-3 flex items-center justify-between gap-3 border-b border-slate-200 pb-2 dark:border-slate-800">
                                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-900 dark:text-blue-100">
                                  Page {page.pageNumber}
                                </span>
                                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                  Generated preview
                                </span>
                              </div>
                              <img
                                src={page.canvasDataUrl}
                                className="h-auto w-full rounded-[18px] border border-slate-200 bg-white object-contain object-bottom shadow-sm dark:border-slate-800"
                                alt={`A4 Page ${page.pageNumber}`}
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                          No generated pages yet.
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex flex-col gap-2 rounded-2xl border border-amber-100 bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-100">
                        <div className="flex items-center gap-2">
                          <Cpu className="h-4 w-4 shrink-0 animate-pulse text-amber-700 dark:text-amber-300" />
                          <span>
                            Detected bank brand: {slipBankBrand} ({slipBrandConfidence})
                          </span>
                        </div>
                        <p className="pl-6 text-[10px] text-amber-800/80 dark:text-amber-100/75">
                          Review the original slip against the OCR-extracted details before export.
                        </p>
                      </div>
                      <div className="space-y-5">
                        {uploadedFiles.map((file, idx) => (
                          <div
                            key={idx}
                            className="rounded-[26px] border border-slate-200 bg-slate-50/80 p-3 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.7)] dark:border-slate-800 dark:bg-slate-900/55"
                          >
                            <div className="mb-3 flex items-center justify-between gap-3 border-b border-slate-200 pb-2 dark:border-slate-800">
                              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-200">
                                Slip {idx + 1}
                              </span>
                              <span className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                                {file.name}
                              </span>
                            </div>
                            <div className={`${slipScaleClass} mx-auto overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-sm dark:border-slate-800`}>
                              <img src={file.url} className="h-auto w-full object-contain" alt="Bank Slip Receipt" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full w-full items-center justify-center py-4">
              <div className="w-full max-w-[760px]">
                <div className="rounded-[36px] border border-white/70 bg-white/88 p-6 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.45)] dark:border-slate-700/70 dark:bg-slate-950/88">
                  <div className="mx-auto max-w-[560px] rounded-[28px] border border-dashed border-slate-300 bg-[linear-gradient(180deg,rgba(247,250,252,0.96),rgba(235,242,249,0.96))] px-8 py-14 text-center dark:border-slate-700 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.9),rgba(2,6,23,0.96))]">
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[22px] border border-slate-200 bg-[#eef2f7] shadow-sm dark:border-slate-700">
                      <ImageWithFallback
                        src={projectLogo}
                        alt="Digital Evidence Preview"
                        className="h-full w-full scale-[1.18] object-cover object-top"
                      />
                    </div>
                    <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                      {modeLabel}
                    </p>
                    <h4 className="mt-3 text-2xl font-semibold text-slate-950 dark:text-slate-100">
                      Nothing generated yet
                    </h4>
                    <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-300">
                      {activeMode === "chat"
                        ? "Upload chat screenshots, then generate clean A4 evidence pages here."
                        : "Upload slip images, then run OCR to review the source image here."}
                    </p>
                    <div className="mt-8 grid gap-3 text-left sm:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200 bg-white/85 p-4 dark:border-slate-800 dark:bg-slate-900/70">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                          Now
                        </p>
                        <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
                          Add source files and choose the processing mode.
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white/85 p-4 dark:border-slate-800 dark:bg-slate-900/70">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                          Next
                        </p>
                        <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
                          {activeMode === "chat"
                            ? "Generate pages to review the export-ready document."
                            : "Run OCR to compare the slip image with extracted fields."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
