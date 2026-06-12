import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "./ui/button";
import projectLogo from "../../imports/digital_evidence_logo_full.png";

export function Header() {
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/35 bg-transparent px-4 py-4 transition-all duration-300 md:px-6">
      <div className="glass-toolbar mx-auto flex w-full max-w-[1600px] items-center justify-between rounded-2xl px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-white/40 bg-[#eef2f7] shadow-[0_14px_28px_-20px_rgba(12,30,54,0.6)]">
            <img src={projectLogo} alt="Digital Evidence Shield" className="h-full w-full scale-[1.22] object-cover object-top" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
              Evidence Workstation
            </p>
            <h1 className="truncate text-lg font-semibold tracking-[0.08em] text-[#112f59] dark:text-slate-100 md:text-xl">
              DIGITAL EVIDENCE
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden rounded-full border border-slate-200/70 bg-white/60 px-3 py-1 text-[11px] font-medium text-slate-600 shadow-sm dark:border-slate-700/80 dark:bg-slate-900/50 dark:text-slate-300 md:block">
            Chat + Slip Review
          </div>
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
