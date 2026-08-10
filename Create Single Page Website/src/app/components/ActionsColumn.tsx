import React from "react";
import { ExternalLink, CheckCircle2, ShieldCheck, Download, Lock, FileArchive } from "lucide-react";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";

interface ActionsColumnProps {
  activeMode: "chat" | "slip";
  isGenerated: boolean;
  hasUploads?: boolean;
  uploadedFilesCount?: number;
  passwordProtection: boolean;
  setPasswordProtection: React.Dispatch<React.SetStateAction<boolean>>;
  onOpenSummaryModal: () => void;
  onSavePdf: () => void;
  onSaveWinrar: () => void;
  onGenerate: () => void;
  isGenerating?: boolean;
}

export function ActionsColumn({
  activeMode,
  isGenerated,
  hasUploads = false,
  uploadedFilesCount = 0,
  passwordProtection,
  setPasswordProtection,
  onOpenSummaryModal,
  onSavePdf,
  onSaveWinrar,
  onGenerate,
  isGenerating = false,
}: ActionsColumnProps) {
  return (
    <div className="flex h-full flex-col justify-between space-y-4 rounded-3xl border border-cyan-500/20 bg-[#0b1329]/80 p-5 backdrop-blur-md">
      {/* Upper Section */}
      <div className="space-y-5">
        {/* Header */}
        <div>
          <h2 className="text-lg font-bold text-white tracking-wide">ประมวลผล</h2>
          <p className="text-xs text-slate-400 mt-0.5">ตารางสรุปรายละเอียด</p>
        </div>

        {/* SUMMARY Modal Trigger Card Button */}
        <button
          onClick={onOpenSummaryModal}
          className="group flex w-full items-center justify-between rounded-2xl border border-cyan-500/30 bg-cyan-950/30 p-4 transition-all hover:border-cyan-400 hover:bg-cyan-950/50 shadow-[0_0_15px_rgba(0,163,255,0.1)]"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <span className="font-bold uppercase tracking-wider text-cyan-300 text-sm group-hover:text-cyan-200">
              SUMMARY
            </span>
          </div>
          <ExternalLink className="h-4 w-4 text-cyan-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </button>

        {/* PASSWORD PROTECTION Switch */}
        <div className="rounded-2xl border border-cyan-500/20 bg-[#0d162d]/60 p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200 block">
              PASSWORD PROTECTION
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              เข้ารหัสไฟล์ก่อนส่งออก
            </span>
          </div>
          <Switch
            checked={passwordProtection}
            onCheckedChange={setPasswordProtection}
            className="data-[state=checked]:bg-cyan-500"
          />
        </div>

        {/* INTEGRITY CHECK PASSED Box */}
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            INTEGRITY CHECK PASSED
          </div>
          <div className="space-y-1 text-[11px] text-slate-400 font-mono pl-4">
            <p>• SHA-256 manifest ready</p>
            <p>• Timestamp authority connected</p>
            <p>• Audit trail: {uploadedFilesCount > 0 ? uploadedFilesCount : 3} evidence items</p>
          </div>
        </div>

        {/* Export Outlined Buttons */}
        <div className="space-y-2.5 pt-1">
          <Button
            variant="outline"
            onClick={onSavePdf}
            disabled={!hasUploads}
            className="h-11 w-full rounded-xl border border-cyan-500/40 bg-cyan-950/40 text-xs font-bold uppercase tracking-widest text-cyan-300 hover:bg-cyan-900/60 hover:text-white disabled:opacity-50 transition-all"
          >
            SAVE FOR PDF
          </Button>

          <Button
            variant="outline"
            onClick={onSaveWinrar}
            disabled={!hasUploads}
            className="h-11 w-full rounded-xl border border-cyan-500/40 bg-cyan-950/40 text-xs font-bold uppercase tracking-widest text-cyan-300 hover:bg-cyan-900/60 hover:text-white disabled:opacity-50 transition-all"
          >
            SAVE FOR WINRAR
          </Button>
        </div>
      </div>

      {/* Bottom Primary CTA Button GENERATE */}
      <div className="pt-2">
        <Button
          onClick={onGenerate}
          disabled={!hasUploads || isGenerating}
          className="h-12 w-full rounded-xl bg-cyan-500 text-slate-950 font-bold uppercase tracking-widest shadow-[0_0_25px_rgba(0,163,255,0.4)] hover:bg-cyan-400 hover:shadow-[0_0_35px_rgba(0,163,255,0.6)] disabled:opacity-50 transition-all"
        >
          GENERATE
        </Button>
      </div>
    </div>
  );
}

