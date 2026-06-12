import React from "react";
import { Save, FileText, Send, Rows3, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "./ui/button";

interface ActionsColumnProps {
  activeMode: "chat" | "slip";
  isGenerated: boolean;
  hasUploads?: boolean;
  onSave: () => void;
  onDetail: () => void;
  onSend: () => void;
  ocrData?: any;
  batchSummary?: {
    total_files?: number;
    processed_files?: number;
    success_count?: number;
    failure_count?: number;
    max_concurrency?: number;
  } | null;
}

export function ActionsColumn({
  activeMode,
  isGenerated,
  hasUploads = false,
  onSave,
  onDetail,
  onSend,
  ocrData,
  batchSummary,
}: ActionsColumnProps) {
  return (
    <div className="space-y-6 h-full flex flex-col justify-start">
      {/* Save PDF */}
      <div className="glass-panel glass-panel-hover overflow-hidden rounded-2xl">
        <div className="border-b border-white/35 px-6 py-4 dark:border-slate-700/70">
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#112f59] dark:text-slate-100">Export</h3>
        </div>
        <div className="p-6">
          <Button
            className="h-11 w-full rounded-xl border border-[#2d5e9a]/30 bg-[#12335f] text-white shadow-[0_18px_30px_-24px_rgba(18,51,95,0.9)] transition-all hover:bg-[#153d73] dark:bg-[#1f4679] dark:hover:bg-[#275692]"
            onClick={onSave}
            disabled={!isGenerated}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Evidence
          </Button>
          <p className="mt-2 text-center text-[11px] text-slate-400 dark:text-slate-500">
            Export the current evidence package as PDF
          </p>
        </div>
      </div>

      {/* Details Grid & Table */}
      <div className="glass-panel overflow-hidden rounded-2xl flex-1">
        <div className="border-b border-white/35 px-6 py-4 dark:border-slate-700/70">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#112f59] dark:text-slate-100">
              Inspector
            </h3>
            {batchSummary && activeMode === "slip" && (
              <div className="rounded-full border border-white/40 bg-white/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:border-slate-700/70 dark:bg-slate-900/50 dark:text-slate-300">
                batch
              </div>
            )}
          </div>
        </div>
        <div className="p-6 space-y-4 text-xs">
          <div className="space-y-2.5 rounded-2xl border border-white/35 bg-white/50 p-4 dark:border-slate-700/70 dark:bg-slate-900/35">
            <div className="flex justify-between">
              <span className="text-slate-500">Mode</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{activeMode === "chat" ? "Chat Mode" : "Slip Mode"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Generated</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{isGenerated ? "Ready" : "Pending"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Engine</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {activeMode === "slip" ? (Array.isArray(ocrData) ? ocrData[0]?.extraction_engine?.ocr_provider ?? "google_cloud_vision" : ocrData?.extraction_engine?.ocr_provider ?? "google_cloud_vision") : "object-aware"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Parser</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {activeMode === "slip" ? (Array.isArray(ocrData) ? ocrData[0]?.extraction_engine?.parser ?? "rule_based" : ocrData?.extraction_engine?.parser ?? "rule_based") : "-"}
              </span>
            </div>
          </div>

          {batchSummary && activeMode === "slip" && (
            <div className="rounded-2xl border border-white/35 bg-white/50 p-4 dark:border-slate-700/70 dark:bg-slate-900/35">
              <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300">
                <Rows3 className="h-3.5 w-3.5 text-[#2d5e9a]" />
                Batch summary
              </div>
              <div className="space-y-2 text-[12px] text-slate-600 dark:text-slate-300">
                <div className="flex justify-between"><span>Total files</span><span className="font-semibold">{batchSummary.total_files ?? 0}</span></div>
                <div className="flex justify-between"><span>Processed</span><span className="font-semibold">{batchSummary.processed_files ?? 0}</span></div>
                <div className="flex justify-between"><span>Success</span><span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5" />{batchSummary.success_count ?? 0}</span></div>
                <div className="flex justify-between"><span>Failure</span><span className="inline-flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-400"><AlertTriangle className="h-3.5 w-3.5" />{batchSummary.failure_count ?? 0}</span></div>
                <div className="flex justify-between"><span>Concurrency</span><span className="font-semibold">{batchSummary.max_concurrency ?? "-"}</span></div>
              </div>
            </div>
          )}

          <Button
            variant="outline"
            className="mt-4 h-10 w-full rounded-xl border-white/40 bg-white/65 text-xs font-medium text-slate-700 shadow-none transition-colors hover:bg-white dark:border-slate-700/80 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-900"
            onClick={onDetail}
            disabled={!isGenerated && activeMode === "slip"}
          >
            <FileText className="w-3.5 h-3.5 mr-2" />
            View Full Details
          </Button>
        </div>
      </div>

      {/* Send Project WinRAR */}
      <div className="glass-panel glass-panel-hover overflow-hidden rounded-2xl">
        <div className="border-b border-white/35 px-6 py-4 dark:border-slate-700/70">
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#112f59] dark:text-slate-100">Send Project</h3>
        </div>
        <div className="p-6">
          <Button
            className="h-11 w-full rounded-xl border border-[#2d5e9a]/30 bg-[#12335f] text-white shadow-[0_18px_30px_-24px_rgba(18,51,95,0.9)] transition-all hover:bg-[#153d73] dark:bg-[#1f4679] dark:hover:bg-[#275692]"
            onClick={onSend}
            disabled={!hasUploads}
          >
            <Send className="w-4 h-4 mr-2" />
            Send to System
          </Button>
          <p className="mt-2 text-center text-[11px] text-slate-400 dark:text-slate-500">
            Package the working set for downstream handling
          </p>
        </div>
      </div>
    </div>
  );
}
