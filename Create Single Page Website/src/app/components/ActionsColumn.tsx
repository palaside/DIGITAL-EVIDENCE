import { Save, FileText, Send, Table, FileArchive } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";

interface ActionsColumnProps {
  activeMode: "chat" | "slip";
  isGenerated: boolean;
  onSave: () => void;
  onDetail: () => void;
  onSend: () => void;
}

export function ActionsColumn({
  activeMode,
  isGenerated,
  onSave,
  onDetail,
  onSend,
}: ActionsColumnProps) {
  return (
    <div className="space-y-6 h-full flex flex-col justify-between">
      {/* Save PDF */}
      <Card className="glass-panel glass-panel-hover border-none rounded-2xl shadow-lg relative overflow-hidden">
        <CardHeader className="pb-3 px-6 pt-5">
          <CardTitle className="text-lg font-bold text-blue-950 dark:text-blue-200">Save PDF</CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-5">
          <Button
            className="w-full h-11 font-bold text-white bg-gradient-to-tr from-[#030213] to-blue-900 dark:from-blue-700 dark:to-blue-500 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md shadow-blue-500/15 cursor-pointer rounded-xl disabled:opacity-40 disabled:pointer-events-none"
            onClick={onSave}
            disabled={!isGenerated}
          >
            <Save className="w-4 h-4 mr-2" />
            Save PDF Evidence
          </Button>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-2.5 text-center font-semibold uppercase tracking-wider">
            Export secure A4 PDF for court
          </p>
        </CardContent>
      </Card>

      {/* Details Grid & Table */}
      <Card className="glass-panel glass-panel-hover border-none rounded-2xl shadow-lg relative overflow-hidden flex-1">
        <CardHeader className="pb-3 px-6 pt-5">
          <CardTitle className="text-lg font-bold text-blue-950 dark:text-blue-200">
            {activeMode === "chat" ? "Paginator Details" : "Slip OCR Details"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3.5 px-6 pb-6">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between py-2 border-b border-white/20 dark:border-white/5">
              <span className="text-gray-500 dark:text-gray-400 font-semibold">Evidence Type:</span>
              <span className="font-bold text-blue-950 dark:text-blue-100">
                {activeMode === "chat" ? "LINE Chat Logs" : "Bank Slip Receipts"}
              </span>
            </div>
            
            {activeMode === "chat" ? (
              <>
                <div className="flex justify-between py-2 border-b border-white/20 dark:border-white/5">
                  <span className="text-gray-500 dark:text-gray-400 font-semibold">Page Break:</span>
                  <span className="font-bold text-blue-950 dark:text-blue-100">Object-Aware</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/20 dark:border-white/5">
                  <span className="text-gray-500 dark:text-gray-400 font-semibold">Branding Header:</span>
                  <span className="font-bold text-green-600 dark:text-green-400">THSarabunNew</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between py-2 border-b border-white/20 dark:border-white/5">
                  <span className="text-gray-500 dark:text-gray-400 font-semibold">OCR Engines:</span>
                  <span className="font-bold text-blue-950 dark:text-blue-100">Easy + Paddle</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/20 dark:border-white/5">
                  <span className="text-gray-500 dark:text-gray-400 font-semibold">Logo Detection:</span>
                  <span className="font-bold text-green-600 dark:text-green-400">YOLOv8 Active</span>
                </div>
              </>
            )}
            
            <div className="flex justify-between py-2 border-b border-white/20 dark:border-white/5">
              <span className="text-gray-500 dark:text-gray-400 font-semibold">Legal Hash:</span>
              <span className="font-mono text-xs font-bold text-blue-900 dark:text-blue-400">SHA-256</span>
            </div>
          </div>

          {activeMode === "slip" && (
            <Button
              variant="outline"
              className="w-full h-11 cursor-pointer font-bold tracking-wide backdrop-blur-sm bg-white/30 border-white/40 text-blue-950 hover:bg-white/60 dark:bg-white/5 dark:border-white/10 dark:text-blue-100 dark:hover:bg-white/10 rounded-xl transition-all duration-300 shadow-sm mt-4 disabled:opacity-40 disabled:pointer-events-none"
              onClick={onDetail}
              disabled={!isGenerated}
            >
              <Table className="w-4 h-4 mr-2" />
              View Slip OCR Table
            </Button>
          )}

          {activeMode === "chat" && (
            <div className="text-[10.5px] text-gray-500 dark:text-gray-400 italic bg-white/15 dark:bg-white/2 p-3 rounded-xl border border-white/5 text-center mt-4">
              Chat pagination calculates 23 content types to prevent cutting message bubbles.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Send Project WinRAR */}
      <Card className="glass-panel glass-panel-hover border-none rounded-2xl shadow-lg relative overflow-hidden">
        <CardHeader className="pb-3 px-6 pt-5">
          <CardTitle className="text-lg font-bold text-blue-950 dark:text-blue-200">Send Project</CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-5">
          <Button
            className="w-full h-11 font-bold text-white bg-gradient-to-tr from-[#030213] to-blue-900 dark:from-blue-700 dark:to-blue-500 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md shadow-blue-500/15 cursor-pointer rounded-xl"
            onClick={onSend}
          >
            <FileArchive className="w-4 h-4 mr-2" />
            Send WinRAR Archive
          </Button>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-2.5 text-center font-semibold uppercase tracking-wider">
            Package SFX RAR with 3% Recovery
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
