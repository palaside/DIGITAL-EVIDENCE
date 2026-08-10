import { useRef } from "react";
import { Upload, X, FileText, LoaderCircle } from "lucide-react";
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
  statusText?: string;
}

export function UploadColumn({
  activeMode,
  uploadedFiles,
  setUploadedFiles,
  isGenerating,
  progress,
  isGenerated,
  onGenerate,
  statusText,
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

  const hasUploads = uploadedFiles.length > 0;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const openFilePicker = () => fileInputRef.current?.click();

  return (
    <div className="flex h-full flex-col justify-between space-y-4 rounded-3xl border border-cyan-500/20 bg-[#0b1329]/80 p-5 backdrop-blur-md">
      {/* Upper Container */}
      <div className="space-y-5">
        {/* Header */}
        <div>
          <h2 className="text-lg font-bold text-white tracking-wide">นำเข้าหลักฐาน</h2>
          <p className="text-xs text-slate-400 mt-0.5">ลากไฟล์ภาพหรือเลือกจากเครื่อง</p>
        </div>

        {/* Dropzone Container */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            accept="image/*"
            onChange={handleFileUpload}
            disabled={isGenerating}
          />
          <button
            type="button"
            onClick={openFilePicker}
            disabled={isGenerating}
            className="group flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-cyan-500/40 bg-cyan-950/20 p-6 transition-all hover:border-cyan-400 hover:bg-cyan-950/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 group-hover:scale-110 transition-transform">
              <Upload className="w-5 h-5" />
            </div>
            <div className="text-center space-y-1">
              <span className="text-sm font-bold uppercase tracking-wider text-cyan-400 group-hover:text-cyan-300">
                ↑ UPLOAD
              </span>
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">
                PNG • JPG • WEBP • PDF
              </p>
            </div>
          </button>
        </div>

        {/* File List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold uppercase tracking-wider text-slate-300">FILE LIST</span>
            <span className="rounded-md border border-cyan-500/30 bg-cyan-950/60 px-2 py-0.5 text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
              {uploadedFiles.length} FILES
            </span>
          </div>

          <ScrollArea className="h-[210px] rounded-xl border border-cyan-500/20 bg-[#0d162d]/60 p-2">
            {hasUploads ? (
              <div className="space-y-2">
                {uploadedFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-xl border border-cyan-500/20 bg-cyan-950/30 p-2.5 text-xs text-slate-200 transition-colors hover:border-cyan-500/40"
                  >
                    <span className="flex items-center gap-2 truncate max-w-[80%]">
                      <FileText className="h-4 w-4 shrink-0 text-cyan-400" />
                      <span className="truncate font-mono text-[11px]">{file.name}</span>
                    </span>
                    <button
                      onClick={() => removeFile(idx)}
                      className="rounded p-1 text-slate-400 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-[190px] flex-col items-center justify-center text-center text-xs text-slate-500">
                <p>ยังไม่มีไฟล์ที่เลือก</p>
                <p className="text-[11px] text-slate-600 mt-1">อัปโหลดไฟล์ภาพเพื่อเริ่มประมวลผล</p>
              </div>
            )}
          </ScrollArea>
        </div>
      </div>

      {/* Bottom Action Button PROCESS */}
      <div className="pt-2">
        <Button
          onClick={onGenerate}
          disabled={isGenerating || uploadedFiles.length === 0}
          className="h-12 w-full rounded-xl bg-cyan-500 text-slate-950 font-bold uppercase tracking-widest shadow-[0_0_25px_rgba(0,163,255,0.4)] hover:bg-cyan-400 hover:shadow-[0_0_35px_rgba(0,163,255,0.6)] disabled:opacity-50 transition-all"
        >
          {isGenerating ? (
            <span className="flex items-center gap-2">
              <LoaderCircle className="h-4 w-4 animate-spin text-slate-950" />
              PROCESSING...
            </span>
          ) : (
            "PROCESS"
          )}
        </Button>
      </div>
    </div>
  );
}
