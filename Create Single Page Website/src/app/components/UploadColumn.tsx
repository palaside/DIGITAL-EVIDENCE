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
      Array.from(files).forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result;
          if (typeof result === "string") {
            setUploadedFiles((prev) => [
              ...prev,
              { name: file.name, url: result }
            ]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6 h-full flex flex-col justify-start">
      {/* Upload Box */}
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">
            {activeMode === "chat" ? "Upload Chat Images" : "Upload Photo"}
          </h3>
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
            <div className="bg-white dark:bg-slate-900 border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-gray-300 transition-all p-8 rounded-lg flex flex-col items-center justify-center gap-3">
              <Upload className="w-8 h-8 text-gray-400" strokeWidth={1.5} />
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 text-center">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">PNG, JPG up to 10MB</p>
            </div>
          </label>

          {/* Uploaded Files List */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-2 mt-4">
              <ScrollArea className="h-[120px] rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-slate-900/50 p-2">
                <div className="space-y-1">
                  {uploadedFiles.map((file, idx) => (
                    <div 
                      key={idx} 
                      className="flex justify-between items-center bg-white dark:bg-slate-800 border border-gray-100 dark:border-gray-700 p-2 rounded-md text-xs"
                    >
                      <span className="flex items-center gap-2 text-gray-700 dark:text-gray-300 truncate max-w-[85%]">
                        <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                        <span className="truncate">{file.name}</span>
                      </span>
                      <button 
                        onClick={() => removeFile(idx)}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
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
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">
            Generate
          </h3>
        </div>
        <div className="p-6">
          <Button
            className="w-full h-10 font-medium text-white bg-[#8DA0CB] hover:bg-[#7A8EB9] dark:bg-[#475C8A] transition-colors rounded-md shadow-none"
            onClick={onGenerate}
            disabled={isGenerating || uploadedFiles.length === 0}
          >
            <Play className="w-4 h-4 mr-2" fill="currentColor" />
            {isGenerating ? "Processing..." : "Start Generation"}
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">Progress</h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gray-400 dark:bg-gray-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 flex flex-col gap-1">
            <span>Status: {isGenerating ? "Processing" : isGenerated ? "Ready" : "Ready"}</span>
            <span>{progress}% Complete</span>
          </div>
        </div>
      </div>
    </div>
  );
}
