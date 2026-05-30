import React from "react";
import { Save, FileText, Send, Table, FileArchive } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";

interface ActionsColumnProps {
  activeMode: "chat" | "slip";
  isGenerated: boolean;
  onSave: () => void;
  onDetail: () => void;
  onSend: () => void;
  ocrData?: any;
}

export function ActionsColumn({
  activeMode,
  isGenerated,
  onSave,
  onDetail,
  onSend,
  ocrData,
}: ActionsColumnProps) {
  return (
    <div className="space-y-6 h-full flex flex-col justify-start">
      {/* Save PDF */}
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">Save</h3>
        </div>
        <div className="p-6">
          <Button
            className="w-full h-10 font-medium text-white bg-[#1E3A8A] hover:bg-blue-900 transition-colors rounded-md shadow-none"
            onClick={onSave}
            disabled={!isGenerated}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Evidence
          </Button>
          <p className="text-[11px] text-gray-400 mt-2 text-center">
            Save to local storage
          </p>
        </div>
      </div>

      {/* Details Grid & Table */}
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden flex-1">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">
            Detail
          </h3>
        </div>
        <div className="p-6 space-y-4 text-xs">
          <div className="space-y-2.5">
            <div className="flex justify-between">
              <span className="text-gray-500">Type:</span>
              <span className="font-bold text-gray-900 dark:text-gray-100">Image</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Format:</span>
              <span className="font-bold text-gray-900 dark:text-gray-100">PNG</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Size:</span>
              <span className="font-bold text-gray-900 dark:text-gray-100">-</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Created:</span>
              <span className="font-bold text-gray-900 dark:text-gray-100">May 28, 2026</span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full h-9 mt-4 text-xs font-medium border-gray-200 hover:bg-gray-50 text-gray-700 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-slate-700 rounded-md shadow-none transition-colors"
            onClick={onDetail}
            disabled={!isGenerated && activeMode === "slip"}
          >
            <FileText className="w-3.5 h-3.5 mr-2" />
            View Full Details
          </Button>
        </div>
      </div>

      {/* Send Project WinRAR */}
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">Send Project</h3>
        </div>
        <div className="p-6">
          <Button
            className="w-full h-10 font-medium text-white bg-[#1E3A8A] hover:bg-blue-900 transition-colors rounded-md shadow-none"
            onClick={onSend}
          >
            <Send className="w-4 h-4 mr-2" />
            Send to System
          </Button>
          <p className="text-[11px] text-gray-400 mt-2 text-center">
            Submit for processing
          </p>
        </div>
      </div>
    </div>
  );
}
