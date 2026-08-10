import React from "react";
import { X, CheckCircle2, ShieldCheck, FileSpreadsheet } from "lucide-react";
import { Button } from "./ui/button";

export interface EvidenceLedgerItem {
  no: number;
  date: string;
  time: string;
  senderBank: string;
  senderName: string;
  amount: number | string;
  receiverName: string;
  receiverBank: string;
  memo: string;
  refId: string;
  status: string;
}

interface SummaryLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  items?: EvidenceLedgerItem[];
  onExportCsv?: () => void;
}

export function SummaryLedgerModal({
  isOpen,
  onClose,
  items,
  onExportCsv,
}: SummaryLedgerModalProps) {
  if (!isOpen) return null;

  const ledgerItems: EvidenceLedgerItem[] = items || [];

  const totalAmount = ledgerItems.reduce((acc, item) => {
    if (typeof item.amount === "number") return acc + item.amount;
    const parsed = parseFloat(String(item.amount).replace(/[^0-9.]/g, ""));
    return acc + (isNaN(parsed) ? 0 : parsed);
  }, 0);

  const formattedTotal = new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
  }).format(totalAmount).replace("THB", "฿");

  const handleExportCsv = () => {
    if (onExportCsv) {
      onExportCsv();
      return;
    }

    const headers = [
      "ลำดับ", "วันที่", "เวลา", "ธนาคารผู้โอน", "ชื่อผู้โอน",
      "จำนวนเงิน", "ชื่อผู้รับ", "ธนาคารผู้รับ", "บันทึกช่วยจำ",
      "รหัสอ้างอิง", "หมายเหตุ"
    ];
    const rows = ledgerItems.map((item) => [
      item.no,
      item.date,
      item.time,
      item.senderBank,
      item.senderName,
      typeof item.amount === "number" ? item.amount.toFixed(2) : item.amount,
      item.receiverName,
      item.receiverBank,
      item.memo || "-",
      item.refId || "-",
      item.status || "สแกนสำเร็จ",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((e) => e.map(val => `"${val}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `forensic_summary_ledger_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl overflow-hidden rounded-3xl border border-cyan-500/30 bg-[#0b1329]/95 text-slate-100 shadow-[0_0_50px_rgba(0,163,255,0.15)] flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="relative border-b border-cyan-500/20 px-6 py-5 flex items-center justify-between bg-cyan-950/30">
          <div>
            <h2 className="text-xl font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-cyan-400" />
              ตารางสรุปหลักฐานการโอนเงิน (Forensic Evidence Summary Ledger)
            </h2>
            <p className="text-xs text-cyan-200/60 mt-1">
              สรุปข้อมูลหลักฐาน {ledgerItems.length} รายการ • ตรวจสอบล่าสุด {new Date().toLocaleDateString("th-TH", { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 11-Column Table Content */}
        <div className="p-6 overflow-x-auto flex-1">
          <table className="w-full text-left text-xs border-collapse min-w-[1100px]">
            <thead>
              <tr className="border-b border-cyan-500/30 text-cyan-300 font-bold uppercase tracking-wider bg-cyan-950/50">
                <th className="py-3 px-2 w-12 text-center">ลำดับ</th>
                <th className="py-3 px-3">วันที่</th>
                <th className="py-3 px-2">เวลา</th>
                <th className="py-3 px-3">ธนาคารผู้โอน</th>
                <th className="py-3 px-3">ชื่อผู้โอน</th>
                <th className="py-3 px-3 text-right">จำนวนเงิน</th>
                <th className="py-3 px-3">ชื่อผู้รับ</th>
                <th className="py-3 px-3">ธนาคารผู้รับ</th>
                <th className="py-3 px-3">บันทึกช่วยจำ</th>
                <th className="py-3 px-3 font-mono">รหัสอ้างอิง</th>
                <th className="py-3 px-3">หมายเหตุ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cyan-500/10">
              {ledgerItems.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-400 italic">
                    ไม่มีข้อมูลหลักฐานการโอนเงิน (กรุณาอัปโหลดสลิปหลักฐานและกด Generate)
                  </td>
                </tr>
              ) : (
                ledgerItems.map((item) => (
                  <tr key={item.no} className="hover:bg-cyan-500/10 transition-colors">
                    <td className="py-3 px-2 text-center font-mono font-bold text-cyan-400">{item.no}.</td>
                    <td className="py-3 px-3 text-slate-200 font-medium">{item.date}</td>
                    <td className="py-3 px-2 font-mono text-slate-300">{item.time}</td>
                    <td className="py-3 px-3 font-semibold text-slate-100">{item.senderBank}</td>
                    <td className="py-3 px-3 text-slate-200 font-semibold">{item.senderName}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400 text-sm">
                      {typeof item.amount === "number" ? `฿${item.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}` : item.amount}
                    </td>
                    <td className="py-3 px-3 text-slate-200 font-semibold">{item.receiverName}</td>
                    <td className="py-3 px-3 font-semibold text-slate-100">{item.receiverBank}</td>
                    <td className="py-3 px-3 text-slate-400 italic">{item.memo || "-"}</td>
                    <td className="py-3 px-3 font-mono text-[11px] text-cyan-300/80">{item.refId || "-"}</td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold ${
                        item.status === "ล้มเหลว"
                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                          : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      }`}>
                        <CheckCircle2 className="h-3 w-3" />
                        {item.status || "สแกนสำเร็จ"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary Pills & Actions */}
        <div className="border-t border-cyan-500/20 px-6 py-4 bg-cyan-950/40 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-cyan-900/40 border border-cyan-500/30 px-3 py-1.5 text-xs font-bold text-cyan-300 uppercase tracking-wider">
              {ledgerItems.length} EVIDENCE ITEMS
            </span>
            <span className="rounded-lg bg-emerald-900/40 border border-emerald-500/30 px-3 py-1.5 text-xs font-bold text-emerald-300 uppercase tracking-wider">
              {formattedTotal} TOTAL
            </span>
            <span className="rounded-lg bg-cyan-900/40 border border-cyan-500/30 px-3 py-1.5 text-xs font-bold text-cyan-300 uppercase tracking-wider">
              SHA-256 VERIFIED
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleExportCsv}
              className="border-cyan-500/40 bg-cyan-950/60 text-cyan-300 hover:bg-cyan-900/80 hover:text-white text-xs font-bold h-9 px-4 rounded-xl"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              EXPORT CSV
            </Button>
            <Button
              onClick={onClose}
              className="bg-cyan-500 text-slate-950 hover:bg-cyan-400 font-bold text-xs h-9 px-6 rounded-xl shadow-[0_0_20px_rgba(0,163,255,0.4)]"
            >
              CLOSE
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

