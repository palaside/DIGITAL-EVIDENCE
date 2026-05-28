import { Upload, Play, Trash2, FileText, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
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
      const fileObjects = Array.from(files).map((f) => ({
        name: f.name,
        url: URL.createObjectURL(f),
      }));
      setUploadedFiles((prev) => [...prev, ...fileObjects]);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6 h-full flex flex-col justify-between">
      {/* Upload Box */}
      <Card className="glass-panel glass-panel-hover border-none rounded-2xl shadow-lg relative overflow-hidden">
        <CardHeader className="pb-3 px-6 pt-5">
          <CardTitle className="text-lg font-bold text-blue-950 dark:text-blue-200">
            {activeMode === "chat" ? "Upload Chat Images" : "Upload Bank Slips"}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-5 space-y-4">
          <label className="cursor-pointer block">
            <input
              type="file"
              multiple
              className="hidden"
              accept="image/*"
              onChange={handleFileUpload}
              disabled={isGenerating}
            />
            <div className="backdrop-blur-md bg-white/20 dark:bg-white/5 border-2 border-dashed border-white/50 dark:border-white/10 hover:border-blue-600 dark:hover:border-blue-500 hover:bg-white/30 dark:hover:bg-white/8 transition-all duration-300 p-6 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer shadow-inner">
              <div className="p-2.5 bg-white/50 dark:bg-white/5 rounded-full shadow-sm">
                <Upload className="w-6 h-6 text-blue-900 dark:text-blue-400" />
              </div>
              <p className="text-xs font-bold text-blue-950 dark:text-blue-200 text-center">
                Click to upload multiple images
              </p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">PNG, JPG up to 10MB each</p>
            </div>
          </label>

          {/* Uploaded Files List */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-2 mt-2">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-blue-900 dark:text-blue-400">
                Uploaded Files ({uploadedFiles.length})
              </h4>
              <ScrollArea className="h-[120px] rounded-xl border border-white/20 dark:border-white/5 bg-white/10 dark:bg-white/2 p-2">
                <div className="space-y-1.5">
                  {uploadedFiles.map((file, idx) => (
                    <div 
                      key={idx} 
                      className="flex justify-between items-center bg-white/30 dark:bg-white/5 p-2 rounded-lg text-xs"
                    >
                      <span className="flex items-center gap-1.5 font-medium text-blue-950 dark:text-blue-200 truncate max-w-[80%]">
                        <FileText className="w-3.5 h-3.5 text-blue-900 dark:text-blue-400 shrink-0" />
                        <span className="truncate">{file.name}</span>
                      </span>
                      <button 
                        onClick={() => removeFile(idx)}
                        className="text-red-500 hover:text-red-700 cursor-pointer p-0.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generate Action */}
      <Card className="glass-panel glass-panel-hover border-none rounded-2xl shadow-lg relative overflow-hidden">
        <CardHeader className="pb-3 px-6 pt-5">
          <CardTitle className="text-lg font-bold text-blue-950 dark:text-blue-200">
            {activeMode === "chat" ? "1. LINE Paginator" : "2. Thai Slip OCR"}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-5 space-y-1">
          <p className="text-[11px] text-gray-500 dark:text-gray-400 font-semibold mb-2">
            {activeMode === "chat" 
              ? "Process chat images into a beautifully structured A4 PDF evidence page." 
              : "Scan bank slips to verify transaction legitimacy against official bank APIs."}
          </p>
          <Button
            className="w-full h-11 font-bold text-white bg-gradient-to-tr from-[#030213] to-blue-900 dark:from-blue-700 dark:to-blue-500 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md shadow-blue-500/15 cursor-pointer rounded-xl disabled:opacity-40 disabled:pointer-events-none"
            onClick={onGenerate}
            disabled={isGenerating || uploadedFiles.length === 0}
          >
            <Play className="w-4 h-4 mr-2 fill-current" />
            {isGenerating ? "Processing..." : `Run ${activeMode === "chat" ? "Paginator" : "Slip OCR"}`}
          </Button>
        </CardContent>
      </Card>

      {/* Progress Bar */}
      <Card className="glass-panel glass-panel-hover border-none rounded-2xl shadow-lg relative overflow-hidden flex-1">
        <CardHeader className="pb-3 px-6 pt-5">
          <CardTitle className="text-lg font-bold text-blue-950 dark:text-blue-200">Progress Tracker</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-6 pb-6">
          <Progress value={progress} className="w-full h-3 bg-white/30 dark:bg-white/5 border border-white/20 dark:border-white/5 shadow-inner" />
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex justify-between">
            <span>Status: <span className="font-bold text-blue-900 dark:text-blue-400">{isGenerating ? "Processing Tasks" : isGenerated ? "Ready" : "Idle"}</span></span>
            <span className="font-bold">{progress}%</span>
          </div>
          {isGenerated && (
            <div className="p-3 bg-green-500/10 dark:bg-green-500/10 border border-green-500/20 rounded-xl animate-in zoom-in-95 duration-300">
              <p className="text-[11px] font-bold text-green-700 dark:text-green-400 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 shrink-0 text-green-600 animate-pulse" />
                Evidence successfully processed.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
