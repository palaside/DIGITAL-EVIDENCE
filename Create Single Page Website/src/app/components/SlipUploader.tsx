"use client";
import { useState, useCallback } from "react";
import { Plus, Trash2, Send, Loader2, CheckCircle2, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";

// ─── Types ──────────────────────────────────────────────
interface SlipPayload {
  id: string;
  text: string;
}

interface SlipResult {
  index: number;
  ok: boolean;
  data?: {
    bank_code: string;
    bank_name: string;
    sender_name: string;
    receiver_name: string;
    amount: number;
    currency: string;
    date: string;
    time: string;
    ref_id: string;
    confidence: number;
  };
  error?: string;
}

interface BatchResponse {
  batch: boolean;
  count: number;
  results: SlipResult[];
}

// ─── Single result card ──────────────────────────────────
function ResultCard({ result, index }: { result: SlipResult; index: number }) {
  const [open, setOpen] = useState(true);

  if (!result.ok) {
    return (
      <div className="rounded-xl border border-red-500/40 bg-red-950/30 p-4">
        <div className="flex items-center gap-2 text-red-400 font-semibold">
          <AlertCircle className="w-4 h-4" />
          สลิปที่ {index + 1} — เกิดข้อผิดพลาด
        </div>
        <p className="mt-1 text-sm text-red-300">{result.error}</p>
      </div>
    );
  }

  const d = result.data!;
  const confPct = Math.round(d.confidence * 100);
  const confColor = confPct >= 80 ? "text-emerald-400" : confPct >= 50 ? "text-yellow-400" : "text-red-400";

  const rows = [
    { label: "ธนาคาร",      value: `${d.bank_name} (${d.bank_code})` },
    { label: "ผู้โอน",      value: d.sender_name },
    { label: "ผู้รับ",      value: d.receiver_name },
    { label: "จำนวนเงิน",   value: `${d.amount.toLocaleString()} ${d.currency}` },
    { label: "วันที่",       value: d.date },
    { label: "เวลา",         value: d.time },
    { label: "เลขอ้างอิง",  value: d.ref_id },
  ];

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur overflow-hidden">
      {/* header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition"
      >
        <span className="flex items-center gap-2 font-semibold text-white">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          สลิปที่ {index + 1} — {d.bank_name}
        </span>
        <span className="flex items-center gap-3">
          <span className={`text-sm font-bold ${confColor}`}>ความเชื่อมั่น {confPct}%</span>
          {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </span>
      </button>

      {/* body */}
      {open && (
        <table className="w-full text-sm">
          <tbody>
            {rows.map(r => (
              <tr key={r.label} className="border-t border-white/5">
                <td className="px-4 py-2 text-gray-400 w-32">{r.label}</td>
                <td className={`px-4 py-2 font-medium ${r.value === "Unknown" ? "text-gray-500 italic" : "text-white"}`}>
                  {r.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────
export function SlipUploader() {
  const [slips, setSlips] = useState<SlipPayload[]>([{ id: crypto.randomUUID(), text: "" }]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SlipResult[] | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // add a new empty slip input
  const addSlip = () =>
    setSlips(prev => [...prev, { id: crypto.randomUUID(), text: "" }]);

  // remove slip at index
  const removeSlip = (id: string) =>
    setSlips(prev => prev.filter(s => s.id !== id));

  // update text of a slip
  const updateText = (id: string, text: string) =>
    setSlips(prev => prev.map(s => s.id === id ? { ...s, text } : s));

  // send to API
  const handleSubmit = useCallback(async () => {
    const filled = slips.filter(s => s.text.trim());
    if (!filled.length) return;

    setLoading(true);
    setGlobalError(null);
    setResults(null);

    try {
      // single slip → /api/slip/parse, multiple → /api/slip/parse-batch
      if (filled.length === 1) {
        const res = await fetch("http://localhost:4000/api/slip/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: filled[0].text }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setResults([{ index: 0, ok: true, data }]);
      } else {
        const res = await fetch("http://localhost:4000/api/slip/parse-batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slips: filled.map(s => ({ text: s.text })) }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: BatchResponse = await res.json();
        setResults(data.results);
      }
    } catch (e: any) {
      setGlobalError(e.message || "ไม่สามารถเชื่อมต่อกับ server ได้");
    } finally {
      setLoading(false);
    }
  }, [slips]);

  const filledCount = slips.filter(s => s.text.trim()).length;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* ── Title ── */}
      <div>
        <h2 className="text-2xl font-bold text-white">🏦 วิเคราะห์สลิปธนาคาร</h2>
        <p className="text-gray-400 text-sm mt-1">
          วาง OCR text ของสลิปด้านล่าง (รองรับหลายสลิปพร้อมกัน)
        </p>
      </div>

      {/* ── Slip inputs ── */}
      <div className="space-y-3">
        {slips.map((slip, i) => (
          <div key={slip.id} className="relative group">
            <div className="absolute -left-6 top-3 text-xs text-gray-500 select-none">#{i + 1}</div>
            <textarea
              className="w-full h-28 px-4 py-3 rounded-xl bg-white/5 border border-white/10
                         text-white placeholder-gray-500 text-sm resize-none
                         focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30
                         transition"
              placeholder={`วาง OCR text สลิปที่ ${i + 1} ที่นี่…`}
              value={slip.text}
              onChange={e => updateText(slip.id, e.target.value)}
            />
            {slips.length > 1 && (
              <button
                onClick={() => removeSlip(slip.id)}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition
                           p-1 rounded-lg hover:bg-red-500/20 text-red-400"
                title="ลบสลิปนี้"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* ── Actions ── */}
      <div className="flex gap-3">
        <button
          onClick={addSlip}
          disabled={slips.length >= 50}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-white/10
                     text-gray-300 hover:bg-white/5 text-sm transition disabled:opacity-40"
        >
          <Plus className="w-4 h-4" />
          เพิ่มสลิป {slips.length >= 50 && "(ครบ 50 แล้ว)"}
        </button>

        <button
          onClick={handleSubmit}
          disabled={loading || filledCount === 0}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl
                     bg-gradient-to-r from-indigo-600 to-purple-600
                     hover:from-indigo-500 hover:to-purple-500
                     text-white font-semibold text-sm transition
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> กำลังประมวลผล…</>
            : <><Send className="w-4 h-4" /> วิเคราะห์ {filledCount} สลิป</>}
        </button>
      </div>

      {/* ── Global error ── */}
      {globalError && (
        <div className="rounded-xl border border-red-500/40 bg-red-950/30 px-4 py-3 text-red-300 text-sm flex gap-2 items-center">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {globalError}
        </div>
      )}

      {/* ── Results ── */}
      {results && (
        <div className="space-y-3">
          <p className="text-gray-400 text-xs uppercase tracking-widest">
            ผลลัพธ์ ({results.length} สลิป)
          </p>
          {results.map((r, i) => (
            <ResultCard key={i} result={r} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
