import React, { useState, useEffect } from "react";
import { ShieldCheck, ShieldAlert, ShieldQuestion } from "lucide-react";

export function LicenseStatus() {
  // Mocked state: "checking" | "active" | "expired" | "error"
  const [status, setStatus] = useState<"checking" | "active" | "expired" | "error">("checking");
  const [licenseData, setLicenseData] = useState<any>(null);

  useEffect(() => {
    // Simulate API fetch delay
    const timer = setTimeout(async () => {
      try {
        // In real usage, replace this fetch with actual call:
        // const response = await fetch("http://localhost:4000/api/bot/license", { ... });

        // Mock success response
        setLicenseData({
          company: "Digital Evidence Corp",
          expiryDate: "2026-12-31",
          status: "active"
        });
        setStatus("active");
      } catch (err) {
        setStatus("error");
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const getStatusDisplay = () => {
    switch (status) {
      case "checking":
        return { icon: <ShieldQuestion className="w-4 h-4 text-gray-400 animate-pulse" />, text: "Checking License...", color: "text-gray-500" };
      case "active":
        return { icon: <ShieldCheck className="w-4 h-4 text-green-500" />, text: "License Active", color: "text-green-600" };
      case "expired":
        return { icon: <ShieldAlert className="w-4 h-4 text-red-500" />, text: "License Expired", color: "text-red-600" };
      case "error":
        return { icon: <ShieldAlert className="w-4 h-4 text-orange-500" />, text: "Connection Error", color: "text-orange-600" };
    }
  };

  const display = getStatusDisplay();

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-full shadow-sm text-[10px] font-bold">
      {display.icon}
      <span className={display.color}>{display.text}</span>
      {licenseData && status === "active" && (
        <span className="text-gray-400">| Expires: {licenseData.expiryDate}</span>
      )}
    </div>
  );
}
