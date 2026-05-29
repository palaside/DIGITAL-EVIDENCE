import { useState, useEffect } from "react";
import { DollarSign, ArrowRightLeft, Loader2 } from "lucide-react";

export function ExchangeRateBadge() {
  const [rateData, setRateData] = useState<{ period: string; rate: string } | null>(null);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    const fetchRate = async () => {
      try {
        // Fetch the rate from our proxy
        // Since we want the latest rate, we can just use the current date or let the proxy use its default
        // The proxy uses today's date, but on weekends/holidays it might return empty.
        // For robustness, we might want to ask for a date range, but let's try the default first.
        const date = new Date().toISOString().split('T')[0];
        
        // Let's ask for the past 5 days to ensure we get the latest working day's rate
        const fiveDaysAgo = new Date();
        fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
        const startDate = fiveDaysAgo.toISOString().split('T')[0];
        
        const response = await fetch(`http://localhost:4000/api/bot/interbank-rate?start_period=${startDate}&end_period=${date}`);
        const data = await response.json();
        
        const details = data?.result?.data?.data_detail;
        if (details && details.length > 0) {
          // Find the most recent non-empty rate
          const validRates = details.filter((d: any) => d.rate && d.period);
          if (validRates.length > 0) {
            // The last one is the most recent
            const latest = validRates[validRates.length - 1];
            setRateData({
              period: latest.period,
              // Format to 2 decimal places if possible
              rate: parseFloat(latest.rate).toFixed(2)
            });
            setStatus("success");
            return;
          }
        }
        throw new Error("No rate data found");
      } catch (err) {
        console.error("Failed to fetch exchange rate:", err);
        setStatus("error");
      }
    };

    fetchRate();
  }, []);

  if (status === "loading") {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-full shadow-sm text-[10px] font-bold text-gray-500">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span>THB/USD</span>
      </div>
    );
  }

  if (status === "error") {
    return null; // Hide on error to keep UI clean, or could show an error state
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 dark:from-emerald-950/30 dark:to-teal-900/30 dark:border-emerald-800/30 rounded-full shadow-sm text-[11px] font-bold transition-all hover:scale-105 cursor-default group relative">
      <div className="flex items-center text-emerald-600 dark:text-emerald-400">
        <DollarSign className="w-3.5 h-3.5" />
        <span>USD</span>
        <ArrowRightLeft className="w-3 h-3 mx-1 text-emerald-300 dark:text-emerald-600" />
        <span>THB</span>
      </div>
      <span className="text-emerald-700 dark:text-emerald-300 font-black tracking-wide">
        {rateData?.rate} ฿
      </span>
      
      {/* Tooltip */}
      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
        BOT Interbank Rate ({rateData?.period})
      </div>
    </div>
  );
}
