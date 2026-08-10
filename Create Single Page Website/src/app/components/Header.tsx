import { Moon, Sun, Loader2, Shield } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "./ui/button";
import projectLogo from "../../imports/digital_evidence_logo_full.png";

type Props = {
  activeMode: "chat" | "slip";
  onModeChange: (mode: "chat" | "slip") => void;
  uploadedFilesCount: number;
  isGenerating: boolean;
  isGenerated: boolean;
  progress: number;
  statusText: string;
};

export function Header({
  activeMode,
  onModeChange,
  uploadedFilesCount,
  isGenerating,
  isGenerated,
  progress,
  statusText,
}: Props) {
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-cyan-500/20 bg-[#090d16]/90 backdrop-blur-md px-4 py-3 md:px-6">
      <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-4">
        {/* Brand Left */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-cyan-500/40 bg-cyan-950/60 p-1 shadow-[0_0_15px_rgba(0,163,255,0.2)]">
            <img
              src={projectLogo}
              alt="Digital Evidence Shield"
              className="h-full w-full object-contain"
            />
          </div>
          <div>
            <h1 className="text-base font-bold uppercase tracking-wider text-white md:text-lg flex items-center gap-2">
              DIGITAL EVIDENCE
            </h1>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-400/80">
              SECURE FORENSIC WORKSPACE
            </p>
          </div>
        </div>

        {/* Center Mode Switcher Pills */}
        <div className="flex items-center rounded-full border border-cyan-500/30 bg-[#0d1527] p-1 shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]">
          <button
            onClick={() => onModeChange("chat")}
            className={`px-6 py-1.5 text-xs font-bold uppercase tracking-widest rounded-full transition-all duration-200 ${
              activeMode === "chat"
                ? "bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(0,163,255,0.5)]"
                : "text-slate-400 hover:text-white"
            }`}
          >
            [ CHAT ]
          </button>
          <button
            onClick={() => onModeChange("slip")}
            className={`px-6 py-1.5 text-xs font-bold uppercase tracking-widest rounded-full transition-all duration-200 ${
              activeMode === "slip"
                ? "bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(0,163,255,0.5)]"
                : "text-slate-400 hover:text-white"
            }`}
          >
            [ SLIP ]
          </button>
        </div>

        {/* Right Status / Theme Toggle */}
        <div className="flex items-center gap-3">
          {isGenerating && (
            <div className="hidden items-center gap-2 rounded-full border border-cyan-500/40 bg-cyan-950/60 px-3.5 py-1 text-xs font-semibold text-cyan-300 md:flex">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />
              <span>{statusText || "PROCESSING"} {progress}%</span>
            </div>
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="h-9 w-9 rounded-full border border-cyan-500/30 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-900/60 hover:text-white"
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

