import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "./ui/button";

export function Header() {
  const { theme, setTheme } = useTheme();

  return (
    <header className="w-full sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-gray-800 transition-all duration-300 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)]">
      <div className="container mx-auto px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#1E3A8A] text-white rounded font-black flex items-center justify-center text-sm shadow-sm">
            DE
          </div>
          <h1 className="text-xl font-bold tracking-wide text-[#1E3A8A] dark:text-blue-200 uppercase">
            DIGITAL EVIDENCE
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="w-8 h-8 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 transition-all"
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
