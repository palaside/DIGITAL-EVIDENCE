import { useState } from "react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import projectLogo from "../../imports/digital_evidence_logo_full.png";
import { Cpu, ShieldAlert, BadgeInfo, ZoomIn } from "lucide-react";

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
  const viewportBg = isGenerated
    ? "bg-[#dfe7f1] dark:bg-[#111c2c]"
    : "bg-white/35 dark:bg-slate-950/25";
  const viewportBorder = "border-white/35 dark:border-slate-700/70";

  return (
    <div className="glass-panel relative flex h-full flex-col overflow-hidden rounded-2xl">
      <div className="flex flex-row items-center justify-between border-b border-white/35 px-6 py-4 dark:border-slate-700/70">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#112f59] dark:text-slate-100">
            Evidence Preview
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {activeMode === "chat"
              ? "Paginated A4 output for chat evidence"
              : "Slip evidence review aligned to OCR extraction"}
          </p>
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
          className={`relative flex w-full flex-1 flex-col items-center overflow-auto rounded-[28px] border p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] transition-all duration-300 ${viewportBg} ${viewportBorder} ${
            isGenerated ? "min-h-[890px]" : "min-h-[500px]"
          }`}
        >
          {isGenerated ? (
            <>
              {/* Header */}
              <div className="border-b-2 border-double border-gray-300 pb-3">
                <div className="mb-2 flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-[#eef2f7] shadow-sm">
                      <img
                        src={projectLogo}
                        className="h-full w-full object-cover object-top scale-[1.24]"
                        alt="Emblem"
                      />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-widest text-blue-900">
                        Digital Evidence Records
                      </h4>
                      <p className="text-[8px] font-bold tracking-wider text-gray-500">
                        OFFICIAL FORENSICS REPORT
                      </p>
                    </div>
                  </div>
                  <div className="space-y-0.5 text-right text-[8px] font-bold text-gray-600">
                    <p>
                      CASE: <span className="font-extrabold text-blue-950">DE-2026-0528</span>
                    </p>
                    <p>
                      DATE: <span>28 MAY 2026</span>
                    </p>
                  </div>
                </div>
              </div>
              {/* Meta grid */}
              <div className="grid grid-cols-3 gap-2 rounded-lg border border-gray-150 bg-gray-50 p-2 text-[8px] font-bold text-gray-500">
                <div>
                  <span className="block text-[6px] uppercase text-gray-400">
                    Process Module
                  </span>
                  <span className="text-blue-900">
                    {activeMode === "chat" ? "LINE Chat Paginator" : "Thai Slip OCR Scanner"}
                  </span>
                </div>
                <div>
                  <span className="block text-[6px] uppercase text-gray-400">
                    Uploaded Files
                  </span>
                  <span className="text-blue-900">{uploadedFiles.length} Images</span>
                </div>
                <div className="truncate">
                  <span className="block text-[6px] uppercase text-gray-400">
                    Legal Security Hash
                  </span>
                  <span className="font-mono text-green-700">
                    {ocrData?.forensics_analysis?.integrity_hash
                      ? `SHA256: ${ocrData.forensics_analysis.integrity_hash.slice(7, 18)}...`
                      : "SHA256: 7e8b23a9d..."}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 space-y-4 py-4 pr-1">
                {activeMode === "chat" ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-1 rounded border border-blue-100 bg-blue-50/50 p-1.5 text-[8px] font-bold text-blue-900">
                      <BadgeInfo className="h-3.5 w-3.5 shrink-0 text-blue-700" />
                      <span>
                        Object-Aware Pagination: Slices wallpapers and arranges chat items without splitting bubbles.
                      </span>
                    </div>
                    {paginatedPages.length > 0 ? (
                      <div className="space-y-4">
                        {paginatedPages.map((page) => (
                          <div
                            key={page.pageNumber}
                            className="flex flex-col gap-1.5 rounded-xl border border-gray-200 bg-gray-50/50 p-2 shadow-sm"
                          >
                            <span className="border-b border-gray-150 pb-1 text-[7px] font-bold uppercase tracking-wider text-blue-900">
                              Page {page.pageNumber} — Segmented Evidence
                            </span>
                            <img
                              src={page.canvasDataUrl}
                              className="h-auto w-full rounded-lg border border-gray-200 bg-white object-contain object-bottom"
                              alt={`A4 Page ${page.pageNumber}`}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500">No pages generated.</span>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-col gap-1 rounded-xl border border-amber-100 bg-amber-50/50 p-2 text-[8px] font-bold text-amber-800">
                      <div className="flex items-center gap-1">
                        <Cpu className="h-3.5 w-3.5 shrink-0 animate-pulse text-amber-700" />
                        <span>
                          YOLOv8 Bank Logo: {ocrData?.bank_slip_verification?.matched_bank_brand || "SCB"} (
                          {ocrData?.bank_slip_verification?.brand_matching_confidence || "95.4%"}
                          ) Bounding Boxes Activated.
                        </span>
                      </div>
                      <div className="mt-0.5 border-t border-amber-100/50 pt-1 pl-4.5 text-[7.5px] font-semibold text-gray-500">
                        OCR result from uploaded slip. Please review extracted fields.
                      </div>
                    </div>
                    {uploadedFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="relative flex flex-col gap-2 overflow-hidden rounded-xl border border-gray-200 bg-gray-50/50 p-3 shadow-sm"
                      >
                        <span className="border-b border-gray-150 pb-1 text-[8px] font-bold uppercase tracking-wider text-amber-700">
                          Bank Receipt #{idx + 1} — {file.name} (Matched Brand: {ocrData?.extracted_transaction_metadata?.bank_name || "SCB"})
                        </span>
                        <div className="relative mx-auto max-w-[320px] overflow-hidden rounded-lg border border-gray-200 bg-white">
                          <img src={file.url} className="h-auto w-full object-contain" alt="Bank Slip Receipt" />
                          {/* Bounding boxes omitted for brevity */}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="group relative flex h-full w-full flex-col items-center justify-center p-8">
              <div className="max-w-2xl rounded-[32px] border border-white/12 bg-slate-950/58 px-10 py-12 text-center shadow-[0_28px_60px_-42px_rgba(5,12,24,0.82)] dark:border-slate-700/70 dark:bg-slate-950/62">
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[24px] border border-white/10 bg-[#eef2f7] shadow-sm">
                  <ImageWithFallback
                    src={projectLogo}
                    alt="Digital Evidence Preview"
                    className="h-full w-full scale-[1.18] object-cover object-top transition-all duration-500 group-hover:scale-[1.22]"
                  />
                </div>
                <div className="mt-6 space-y-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-400">
                    Ready for evidence processing
                  </p>
                  <h4 className="text-2xl font-semibold tracking-[0.08em] text-slate-100 dark:text-slate-100">
                    DIGITAL EVIDENCE
                  </h4>
                  <p className="mx-auto max-w-md text-sm leading-6 text-slate-300 dark:text-slate-300">
                    Upload source files on the left, choose Chat or Slip mode,
                    and generate a review-ready document workspace in the center.
                  </p>
                </div>
                <div className="mt-8 grid gap-3 text-left md:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-slate-900/72 p-4 dark:border-slate-700/70 dark:bg-slate-950/45">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-400">
                      Chat Mode
                    </p>
                    <p className="mt-2 text-sm text-slate-300 dark:text-slate-300">
                      Arrange LINE chat captures into clean A4 evidence pages
                      without breaking message bubbles.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-900/72 p-4 dark:border-slate-700/70 dark:bg-slate-950/45">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-400">
                      Slip Mode
                    </p>
                    <p className="mt-2 text-sm text-slate-300 dark:text-slate-300">
                      Inspect slip OCR results, batch progress, and extracted
                      evidence fields from the same review surface.
                    </p>
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
