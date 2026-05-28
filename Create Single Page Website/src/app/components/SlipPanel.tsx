import { FileText, Calendar, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Separator } from "./ui/separator";

export function SlipPanel() {
  return (
    <Card className="glass-panel relative border-none shadow-2xl rounded-2xl h-[400px] overflow-hidden">
      <CardHeader className="border-b border-white/20 dark:border-white/5 pb-4 px-6 pt-5">
        <CardTitle className="flex items-center gap-2 text-blue-950 dark:text-blue-200 font-bold">
          <FileText className="w-5 h-5 text-blue-900 dark:text-blue-400" />
          Evidence Information Slip
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 p-6 h-[calc(100%-70px)] overflow-y-auto">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 backdrop-blur-md bg-white/30 dark:bg-white/5 p-3 rounded-xl border border-white/20 dark:border-white/5 shadow-sm">
            <Calendar className="w-5 h-5 text-blue-900 dark:text-blue-400" />
            <div>
              <span className="block text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Date Created</span>
              <span className="text-sm font-semibold text-blue-950 dark:text-blue-100">May 28, 2026</span>
            </div>
          </div>
          <div className="flex items-center gap-3 backdrop-blur-md bg-white/30 dark:bg-white/5 p-3 rounded-xl border border-white/20 dark:border-white/5 shadow-sm">
            <User className="w-5 h-5 text-blue-900 dark:text-blue-400" />
            <div>
              <span className="block text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Officer</span>
              <span className="text-sm font-semibold text-blue-950 dark:text-blue-100">Not assigned</span>
            </div>
          </div>
        </div>

        <Separator className="bg-white/30 dark:bg-white/5" />

        <div className="space-y-3">
          <h4 className="font-bold text-xs uppercase tracking-widest text-blue-900 dark:text-blue-400">Case Metadata</h4>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="p-3 bg-white/20 dark:bg-white/5 rounded-xl border border-white/10 text-center">
              <span className="block text-[10px] text-gray-500 dark:text-gray-400">Case ID</span>
              <span className="font-bold text-blue-950 dark:text-blue-100">-</span>
            </div>
            <div className="p-3 bg-white/20 dark:bg-white/5 rounded-xl border border-white/10 text-center">
              <span className="block text-[10px] text-gray-500 dark:text-gray-400">Status</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">Pending</span>
            </div>
            <div className="p-3 bg-white/20 dark:bg-white/5 rounded-xl border border-white/10 text-center">
              <span className="block text-[10px] text-gray-500 dark:text-gray-400">Priority</span>
              <span className="font-bold text-blue-950 dark:text-blue-100">Normal</span>
            </div>
          </div>
        </div>

        <Separator className="bg-white/30 dark:bg-white/5" />

        <div className="space-y-2">
          <h4 className="font-bold text-xs uppercase tracking-widest text-blue-900 dark:text-blue-400">Official Notes</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 italic bg-white/10 dark:bg-white/2 p-3 rounded-xl border border-white/5">
            No secure notes added yet.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
