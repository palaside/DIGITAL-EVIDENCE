import { Moon, Sun, Loader2 } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "./ui/button";
import projectLogo from "../../imports/digital_evidence_logo_full.png";

type Props = {
  activeMode: "chat" | "slip" | "notebooklm" | "newfeature";
  uploadedFilesCount: number;
  isGenerating: boolean;
  isGenerated: boolean;
  progress: number;
  statusText: string;
  onOpenNewFeature?: () => void;
};

export function Header({
  activeMode,
  uploadedFilesCount,
  isGenerating,
  isGenerated,
  progress,
  statusText,
  onOpenNewFeature,
}: Props) {
  const { theme, setTheme } = useTheme();
  const modeLabel =
    activeMode === "chat"
      ? "Chat workflow"
      : activeMode === "slip"
        ? "Slip workflow"
        : activeMode === "notebooklm"
          ? "NotebookLM"
          : "New feature";

  const statusLabel = isGenerating
    ? `${statusText || "Generating"}${progress > 0 ? ` ${progress}%` : ""}`
    : isGenerated
      ? "Output ready"
      : uploadedFilesCount > 0
        ? `${uploadedFilesCount} file${uploadedFilesCount === 1 ? "" : "s"} staged`
        : "Waiting for files";

  return (
    <header className="sticky top-0 z-50 w-full px-4 py-3 transition-all duration-300 md:px-6">
      <div className="glass-toolbar mx-auto flex w-full max-w-[1600px] items-center justify-between gap-3 rounded-2xl px-4 py-3 md:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/40 bg-[#eef2f7] shadow-[0_14px_28px_-20px_rgba(12,30,54,0.6)]">
            <img
              src={projectLogo}
              alt="Digital Evidence Shield"
              className="h-full w-full scale-[1.22] object-cover object-top"
            />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              Digital Evidence
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="truncate text-base font-semibold tracking-[0.06em] text-[#112f59] dark:text-slate-100 md:text-lg">
                Evidence Dashboard
              </h1>
              <span className="hidden text-xs text-slate-500 dark:text-slate-400 md:inline">
                {modeLabel}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded-full border border-slate-200/70 bg-white/70 px-3 py-1.5 text-[11px] font-medium text-slate-600 shadow-sm dark:border-slate-700/80 dark:bg-slate-900/55 dark:text-slate-300 lg:flex">
            {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin text-[#2d5e9a]" /> : null}
            <span>{statusLabel}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onOpenNewFeature?.()} className="hidden md:inline-flex">
            New Feature
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="relative h-10 w-10 rounded-full border border-white/40 bg-white/70 text-slate-600 shadow-sm hover:bg-white dark:border-slate-700/80 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
