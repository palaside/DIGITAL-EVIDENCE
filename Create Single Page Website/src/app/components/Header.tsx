import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "./ui/button";
import brandLogo from "../../imports/_______________-_Copy-1.png";

export function Header() {
  const { theme, setTheme } = useTheme();

  return (
    <header className="w-full sticky top-0 z-50 backdrop-blur-md bg-white/60 dark:bg-[#030213]/60 border-b border-white/30 dark:border-white/5 transition-all duration-300 shadow-sm">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 overflow-hidden bg-[#eef2f7] rounded-xl flex items-center justify-center shadow-md shadow-blue-500/5 border border-white/30 dark:border-white/5 transition-all duration-300 hover:scale-105">
            <img 
              src={brandLogo} 
              className="w-full h-full object-cover object-top scale-135 pt-1" 
              alt="Digital Evidence Shield" 
            />
          </div>
          <h1 className="text-2xl font-black tracking-widest bg-gradient-to-r from-blue-950 to-blue-900 dark:from-white dark:to-blue-300 bg-clip-text text-transparent">
            DIGITAL EVIDENCE
          </h1>
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="rounded-full cursor-pointer backdrop-blur-sm bg-white/30 border-white/40 text-blue-950 hover:bg-white/60 dark:bg-white/5 dark:border-white/10 dark:text-blue-100 dark:hover:bg-white/10 transition-all duration-300 shadow-sm"
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </div>
    </header>
  );
}
