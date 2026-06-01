import { Upload, Play, Trash2, FileText, Files, LoaderCircle } from "lucide-react";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";

interface UploadColumnProps {
  activeMode: "chat" | "slip";
  uploadedFiles: { name: string; url: string }[];
  setUploadedFiles: React.Dispatch<React.SetStateAction<{ name: string; url: string }[]>>;
  isGenerating: boolean;
  progress: number;
  isGenerated: boolean;
  onGenerate: () => void;
}

export function UploadColumn({
  activeMode,
  uploadedFiles,
  setUploadedFiles,
  isGenerating,
  progress,
  isGenerated,
  onGenerate,
}: UploadColumnProps) {
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const selectedFiles = Array.from(files);
      Promise.all(
        selectedFiles.map(
          (file) =>
            new Promise<{ name: string; url: string }>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                const result = reader.result;
                if (typeof result === "string") {
                  resolve({ name: file.name, url: result });
                  return;
                }
                reject(new Error(`Unable to read ${file.name}`));
              };
              reader.onerror = () => reject(reader.error ?? new Error(`Unable to read ${file.name}`));
              reader.readAsDataURL(file);
            })
        )
      )
        .then((nextFiles) => {
          setUploadedFiles((prev) => [...prev, ...nextFiles]);
        })
        .catch((error) => {
          console.error("Upload error:", error);
        });
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6 h-full flex flex-col justify-start">
      {/* Upload Box */}
      <div className="glass-panel glass-panel-hover overflow-hidden rounded-2xl">
        <div className="border-b border-white/35 px-6 py-4 dark:border-slate-700/70">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#112f59] dark:text-slate-100">
              {activeMode === "chat" ? "Chat Intake" : "Slip Intake"}
            </h3>
            <div className="rounded-full border border-slate-200/80 bg-white/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:border-slate-700/80 dark:bg-slate-900/50 dark:text-slate-300">
              {uploadedFiles.length} file{uploadedFiles.length === 1 ? "" : "s"}
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {activeMode === "chat" ? "Upload Chat Images" : "Upload Photo"}
          </p>
        </div>
        <div className="p-6">
          <label className="cursor-pointer block">
            <input
              type="file"
              multiple
              className="hidden"
              accept="image/*"
              onChange={handleFileUpload}
              disabled={isGenerating}
            />
            <div className="glass-segment border border-dashed border-[#7fb7ef]/50 p-8 rounded-2xl flex flex-col items-center justify-center gap-3 bg-white/40 dark:bg-slate-950/35 hover:border-[#3f82d8]/70 transition-all">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/50 bg-white/70 dark:bg-slate-900/70">
                <Upload className="w-6 h-6 text-[#2d5e9a]" strokeWidth={1.7} />
              </div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300 text-center">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500">PNG, JPG up to 10MB each</p>
            </div>
          </label>

          {/* Uploaded Files List */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-2 mt-4">
              <ScrollArea className="h-[140px] rounded-2xl border border-white/35 bg-white/45 p-2 dark:border-slate-700/70 dark:bg-slate-950/30">
                <div className="space-y-1">
                  {uploadedFiles.map((file, idx) => (
                    <div 
                      key={idx} 
                      className="flex justify-between items-center border border-white/45 bg-white/75 p-2.5 rounded-xl text-xs shadow-sm dark:border-slate-700/70 dark:bg-slate-900/60"
                    >
                      <span className="flex items-center gap-2 text-slate-700 dark:text-slate-200 truncate max-w-[85%]">
                        <FileText className="w-4 h-4 text-[#3f82d8] shrink-0" />
                        <span className="truncate">{file.name}</span>
                      </span>
                      <button 
                        onClick={() => removeFile(idx)}
                        className="text-slate-400 hover:text-red-500 transition-colors p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </div>

      {/* Generate Action */}
      <div className="glass-panel glass-panel-hover overflow-hidden rounded-2xl">
        <div className="border-b border-white/35 px-6 py-4 dark:border-slate-700/70">
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#112f59] dark:text-slate-100">
            Generate
          </h3>
        </div>
        <div className="space-y-3 p-6">
          <Button
            className="h-11 w-full rounded-xl border border-[#2d5e9a]/30 bg-[#12335f] text-white shadow-[0_18px_30px_-24px_rgba(18,51,95,0.9)] transition-all hover:bg-[#153d73] dark:bg-[#1f4679] dark:hover:bg-[#275692]"
            onClick={onGenerate}
            disabled={isGenerating || uploadedFiles.length === 0}
          >
            <Play className="w-4 h-4 mr-2" fill="currentColor" />
            {isGenerating ? "Processing..." : "Start Generation"}
          </Button>
          <div className="rounded-xl border border-white/35 bg-white/50 px-3 py-2 text-xs text-slate-500 dark:border-slate-700/70 dark:bg-slate-900/40 dark:text-slate-400">
            Batch-safe backend currently accepts up to 500 images per request.
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="glass-panel overflow-hidden rounded-2xl">
        <div className="border-b border-white/35 px-6 py-4 dark:border-slate-700/70">
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#112f59] dark:text-slate-100">Progress</h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="w-full h-2 bg-slate-200/80 dark:bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[#7fb7ef] via-[#3f82d8] to-[#12335f] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-start justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex flex-col gap-1">
              <span className="inline-flex items-center gap-1.5">
                {isGenerating ? <LoaderCircle className="h-3.5 w-3.5 animate-spin text-[#2d5e9a]" /> : <Files className="h-3.5 w-3.5 text-[#2d5e9a]" />}
                Status: {isGenerating ? "Processing" : isGenerated ? "Ready" : "Ready"}
              </span>
              <span>{uploadedFiles.length} uploaded item(s)</span>
            </div>
            <span>{progress}% Complete</span>
          </div>
        </div>
      </div>
    </div>
  );
}
