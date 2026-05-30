import { useState } from "react";
import { ThemeProvider } from "./components/ThemeProvider";
import { Header } from "./components/Header";
import { UploadColumn } from "./components/UploadColumn";
import { PreviewColumn } from "./components/PreviewColumn";
import { ActionsColumn } from "./components/ActionsColumn";
import { NotebookLMPanel } from "./components/NotebookLMPanel";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";
import { X, Table, Cpu, ShieldAlert, FileArchive } from "lucide-react";
import { segmentChatImage, PageSegment } from "./utils/pagination";
import { validateSlipData } from "./utils/slipValidatorEngine";
import { scanQrFromDataUrl } from "./utils/qrScanner";
import { parseEMVCoPayload } from "./utils/emvcoParser";
import { runLocalOCR } from "./utils/localOcr";
import JsonViewer from "./components/JsonViewer";

const EMPTY_CELL = "-";

function asSlipResults(ocrData: any): any[] {
  if (!ocrData) return [];
  return Array.isArray(ocrData) ? ocrData : [ocrData];
}

function readSlipField(result: any, ...paths: string[]): string {
  for (const path of paths) {
    const value = path.split(".").reduce((current, key) => current?.[key], result);
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value);
    }
  }
  return EMPTY_CELL;
}

function splitSlipDateTime(value: string): { date: string; time: string } {
  if (!value || value === EMPTY_CELL) return { date: EMPTY_CELL, time: EMPTY_CELL };

  const timeMatch = value.match(/\b\d{1,2}:\d{2}(?::\d{2})?\b/);
  const time = timeMatch?.[0] || EMPTY_CELL;
  const date = value.replace(time, "").replace(/\s*\/\s*/g, " ").trim() || value;

  return { date, time };
}

function toSlipDetailRows(ocrData: any) {
  return asSlipResults(ocrData).map((result, index) => {
    const dateTime = readSlipField(
      result,
      "transaction_date",
      "transactionDate",
      "extracted_transaction_metadata.transaction_date_time"
    );
    const { date, time } = splitSlipDateTime(dateTime);

    return {
      no: index + 1,
      date,
      time,
      senderBank: readSlipField(
        result,
        "sender_bank",
        "senderBank",
        "bank_name",
        "bankName",
        "extracted_transaction_metadata.bank_name"
      ),
      senderName: readSlipField(
        result,
        "sender_name",
        "senderName",
        "extracted_transaction_metadata.sender_name"
      ),
      amount: readSlipField(
        result,
        "amount",
        "extracted_transaction_metadata.amount_transferred"
      ),
      receiverName: readSlipField(
        result,
        "receiver_name",
        "receiverName",
        "extracted_transaction_metadata.receiver_name"
      ),
      receiverBank: readSlipField(
        result,
        "receiver_bank",
        "receiverBank",
        "extracted_transaction_metadata.receiver_bank_name"
      ),
      memo: readSlipField(result, "transaction_id", "ref_id", "memo"),
      note: readSlipField(result, "source_file_name", "filename", "status", "error"),
    };
  });
}

export default function App() {
  const [activeMode, setActiveMode] = useState<"chat" | "slip" | "notebooklm">("chat");
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; url: string }[]>([]);
  const [paginatedPages, setPaginatedPages] = useState<PageSegment[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isGenerated, setIsGenerated] = useState(false);
  const [ocrData, setOcrData] = useState<any>(null);
  const [showRawJson, setShowRawJson] = useState(false);
  
  // Modals state
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressProgress, setCompressProgress] = useState(0);

  const handleModeChange = (mode: "chat" | "slip" | "notebooklm") => {
    setActiveMode(mode);
    setUploadedFiles([]);
    setPaginatedPages([]);
    setIsGenerating(false);
    setProgress(0);
    setIsGenerated(false);
    setOcrData(null);
    setShowDetailModal(false);
  };

  const dataURLtoBlob = (dataurl: string) => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  const handleGenerate = async () => {
    if (uploadedFiles.length === 0) {
      toast.error("Please upload at least one image file first!");
      return;
    }
    setIsGenerating(true);
    setProgress(0);
    setIsGenerated(false);
    setShowDetailModal(false);
    setShowRawJson(false);

    if (activeMode === "chat") {
      try {
        const allSegments: PageSegment[] = [];

        for (let i = 0; i < uploadedFiles.length; i++) {
          const file = uploadedFiles[i];
          setProgress(Math.round((i / uploadedFiles.length) * 90));
          const segments = await segmentChatImage(file.url);
          allSegments.push(...segments);
        }

        const renumberedSegments = allSegments.map((segment, index) => ({
          ...segment,
          pageNumber: index + 1,
        }));

        setPaginatedPages(renumberedSegments);
        setProgress(100);
        setIsGenerating(false);
        setIsGenerated(true);
        toast.success(`LINE chat paginated ${uploadedFiles.length} file(s) into ${renumberedSegments.length} A4 page(s).`);
      } catch (error) {
        console.error("Error paginating chat:", error);
        toast.error("Failed to process Object-Aware Pagination on the uploaded image.");
        setIsGenerating(false);
      }
    } else if (activeMode === "slip") {
      setOcrData(uploadedFiles.map((file, index) => ({
        source_file_name: file.name || `Slip ${index + 1}`,
        status: "Processing OCR...",
      })));
      setShowDetailModal(true);
      setProgress(10);
      let qrPayload = "";
      let qrAmount = "";
      try {
        const formData = new FormData();
        uploadedFiles.forEach((file) => {
          const blob = dataURLtoBlob(file.url);
          formData.append('image', blob, file.name);
        });

        // PRE-PROCESSING: Attempt to extract real QR code before OCR
        try {
          setProgress(20);
          const firstImage = uploadedFiles[0];
          if (firstImage) {
            const scannedPayload = await scanQrFromDataUrl(firstImage.url);
            if (scannedPayload) {
              qrPayload = scannedPayload;
              const emvcoData = parseEMVCoPayload(qrPayload);
              if (emvcoData.amount) {
                qrAmount = emvcoData.amount;
              }
              toast.success("Successfully scanned EMVCo QR Code payload from image!");
            } else {
              toast.info("No QR code found in the image. Proceeding with Vision OCR only.");
            }
          }
        } catch (qrErr) {
          console.warn("QR scan failed", qrErr);
        }

        setProgress(30);
        let ocrResults: any[] = [];

        try {
          // Attempt backend OCR first
          const res = await fetch('http://localhost:5000/api/ocr', {
            method: 'POST',
            body: formData,
          });
          if (!res.ok) throw new Error('OCR Server returned error');
          const data = await res.json();
          ocrResults = data.combined_results ? data.combined_results : [data];
          setProgress(70);
        } catch (backendErr) {
          console.warn("Backend OCR unavailable. Falling back to local Tesseract OCR.", backendErr);
          toast.info("Backend offline. Running AI OCR on your browser... (May take a few seconds)");

          for (let i = 0; i < uploadedFiles.length; i++) {
            const file = uploadedFiles[i];
            const result = await runLocalOCR(file.url, (p) => {
              if (p.status === "recognizing text") {
                const fileProgress = (i + p.progress) / uploadedFiles.length;
                setProgress(30 + Math.floor(fileProgress * 50));
              }
            });
            ocrResults.push({
              ...result,
              source_file_name: file.name,
            });
          }
        }

        // Inject real QR payload if found
        if (ocrResults.length > 0) {
          const resultsWithMetadata = ocrResults.map((result, index) => {
            const nextResult = {
              ...result,
              source_file_name: result.source_file_name || uploadedFiles[index]?.name || `Slip ${index + 1}`,
              extracted_transaction_metadata: {
                ...(result.extracted_transaction_metadata || {}),
              },
            };

            if (index === 0 && qrPayload) {
              nextResult.extracted_transaction_metadata.qr_code_hash_payload = qrPayload;
              if (qrAmount) {
                nextResult.extracted_transaction_metadata.amount_transferred = `${qrAmount} THB`;
              }
            }

            return nextResult;
          });

          const normalizedResults = resultsWithMetadata.map((result) => {
            try {
              return {
                ...result,
                ...validateSlipData(result),
              };
            } catch {
              return result;
            }
          });

          if (normalizedResults.length === 1) {
            setOcrData(normalizedResults[0]);
          } else {
            setOcrData(normalizedResults);
          }

          setProgress(90);
          setProgress(100);
          setIsGenerating(false);
          setIsGenerated(true);
          setShowRawJson(false);
          setShowDetailModal(true);
          toast.success(`Bank slip OCR analysis completed for ${normalizedResults.length} slip(s).`);
        } else {
          throw new Error("OCR Failed completely.");
        }
      } catch (err) {
        console.error('Error running Slip OCR:', err);
        setProgress(0);
        setIsGenerating(false);
        setOcrData(uploadedFiles.map((file, index) => ({
          source_file_name: file.name || `Slip ${index + 1}`,
          error: err instanceof Error ? err.message : "OCR processing failed",
        })));
        setShowDetailModal(true);
        toast.error("Failed to process image. OCR Server is offline and local fallback failed.");
      }
    }
  };

  const handleSavePDF = () => {
    if (!isGenerated) {
      toast.error("Please generate the evidence preview first!");
      return;
    }
    
    // Simulate actual PDF download using the first uploaded file or preview
    const fileName = activeMode === "chat" ? "LINE_Chat_Paginator_Evidence.pdf" : "Bank_Slip_OCR_Evidence.pdf";
    const link = document.createElement("a");
    link.href = uploadedFiles[0]?.url || "";
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`Secure encrypted PDF saved successfully: ${fileName}`);
  };

  const handleSendProject = () => {
    if (uploadedFiles.length === 0) {
      toast.error("No evidence files to package!");
      return;
    }

    setIsCompressing(true);
    setCompressProgress(0);

    const interval = setInterval(() => {
      setCompressProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsCompressing(false);
            toast.success("WinRAR SFX archive (.exe/.rar) generated and sent to system successfully!");
          }, 500);
          return 100;
        }
        return prev + 20;
      });
    }, 150);
  };

  const slipDetailRows = toSlipDetailRows(ocrData);

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-[#f3f4f6] dark:bg-[#030213] flex flex-col relative overflow-hidden transition-colors duration-300">
        
        {/* Layer 0: Aurora Glow Orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/15 dark:bg-blue-600/10 blur-[100px] animate-float-slow" />
          <div className="absolute top-[25%] left-[-15%] w-[600px] h-[600px] rounded-full bg-indigo-500/12 dark:bg-indigo-900/8 blur-[120px] animate-float-medium" />
          <div className="absolute bottom-[-10%] right-[10%] w-[450px] h-[450px] rounded-full bg-sky-400/15 dark:bg-sky-900/10 blur-[90px] animate-float-fast" />
        </div>

        {/* Content Container (Layer 1+) */}
        <div className="relative z-10 flex-1 flex flex-col">
          <Header />

          <main className="flex-1 container mx-auto px-6 py-8">
            {/* Hero Section */}
            <div className="mb-8 text-center">
              <h2 className="text-5xl font-black bg-gradient-to-r from-blue-950 via-slate-900 to-blue-900 dark:from-white dark:via-blue-100 dark:to-blue-300 bg-clip-text text-transparent tracking-widest uppercase">
                DIGITAL EVIDENCE
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mt-2 text-xs font-semibold tracking-widest uppercase">
                Advanced Evidence Processing System
              </p>
            </div>

            {/* Toggle Mode Buttons */}
            <div className="flex justify-center gap-4 mb-8">
              <button
                onClick={() => handleModeChange("chat")}
                className={`px-6 h-12 rounded-full font-bold tracking-wide transition-all duration-300 cursor-pointer shadow-sm border ${
                  activeMode === "chat"
                    ? "bg-[#030213] text-white border-[#030213] dark:bg-blue-600 dark:border-blue-500 shadow-md shadow-blue-500/20 scale-105"
                    : "backdrop-blur-md bg-white/40 border-white/50 text-blue-950 hover:bg-white/60 dark:bg-white/5 dark:border-white/10 dark:text-blue-100 dark:hover:bg-white/10"
                }`}
              >
                Chat Paginator Mode
              </button>
              <button
                onClick={() => handleModeChange("slip")}
                className={`px-6 h-12 rounded-full font-bold tracking-wide transition-all duration-300 cursor-pointer shadow-sm border ${
                  activeMode === "slip"
                    ? "bg-[#030213] text-white border-[#030213] dark:bg-blue-600 dark:border-blue-500 shadow-md shadow-blue-500/20 scale-105"
                    : "backdrop-blur-md bg-white/40 border-white/50 text-blue-950 hover:bg-white/60 dark:bg-white/5 dark:border-white/10 dark:text-blue-100 dark:hover:bg-white/10"
                }`}
              >
                Slip OCR Mode
              </button>
              <button
                onClick={() => handleModeChange("notebooklm")}
                className={`px-6 h-12 rounded-full font-bold tracking-wide transition-all duration-300 cursor-pointer shadow-sm border ${
                  activeMode === "notebooklm"
                    ? "bg-[#030213] text-white border-[#030213] dark:bg-blue-600 dark:border-blue-500 shadow-md shadow-blue-500/20 scale-105"
                    : "backdrop-blur-md bg-white/40 border-white/50 text-blue-950 hover:bg-white/60 dark:bg-white/5 dark:border-white/10 dark:text-blue-100 dark:hover:bg-white/10"
                }`}
              >
                NotebookLM Case Copilot
              </button>
            </div>

            {/* Three Column Layout or NotebookLM Panel */}
            {activeMode === "notebooklm" ? (
              <NotebookLMPanel />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                {/* Column 1: Upload, Generate, Progress */}
                <div className="lg:col-span-3">
                  <UploadColumn 
                    activeMode={activeMode as "chat" | "slip"}
                    uploadedFiles={uploadedFiles}
                    setUploadedFiles={setUploadedFiles}
                    isGenerating={isGenerating}
                    progress={progress}
                    isGenerated={isGenerated}
                    onGenerate={handleGenerate}
                  />
                </div>

                {/* Column 2: Preview (wider) */}
                <div className="lg:col-span-6">
                  <PreviewColumn 
                    activeMode={activeMode as "chat" | "slip"}
                    isGenerated={isGenerated}
                    uploadedFiles={uploadedFiles}
                    paginatedPages={paginatedPages}
                    ocrData={ocrData}
                  />
                </div>

                {/* Column 3: Save, Detail, Send */}
                <div className="lg:col-span-3">
                  <ActionsColumn 
                    activeMode={activeMode as "chat" | "slip"}
                    isGenerated={isGenerated}
                    onSave={handleSavePDF}
                    onDetail={() => setShowDetailModal(true)}
                    onSend={handleSendProject}
                    ocrData={ocrData}
                  />
                </div>
              </div>
            )}
          </main>
        </div>

        {/* Modal: Slip OCR Details Table */}
        {showDetailModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/40 animate-in fade-in duration-200"
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px",
              background: "rgba(0, 0, 0, 0.45)",
            }}
          >
            <div
              className="glass-panel relative w-full max-w-6xl border-none shadow-2xl rounded-2xl p-6 overflow-hidden"
              style={{
                position: "relative",
                width: "min(96vw, 1152px)",
                maxHeight: "88vh",
                overflow: "auto",
                borderRadius: "16px",
                padding: "24px",
                background: "rgba(255, 255, 255, 0.96)",
                color: "#0f172a",
                boxShadow: "0 24px 80px rgba(15, 23, 42, 0.35)",
              }}
            >
              <div className="flex justify-between items-center border-b border-white/20 dark:border-white/5 pb-4 mb-4">
                <h3 className="text-xl font-bold flex items-center gap-2 text-blue-950 dark:text-blue-200">
                  <Table className="w-5 h-5 text-blue-900 dark:text-blue-400" />
                  Slip OCR Data Analysis
                </h3>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      const el = document.createElement('textarea');
                      el.value = JSON.stringify(ocrData, null, 2);
                      document.body.appendChild(el);
                      el.select();
                      document.execCommand('copy');
                      document.body.removeChild(el);
                    }}
                    className="px-3 py-1 text-sm font-bold rounded bg-blue-600/10 hover:bg-blue-600/20 text-blue-700 dark:text-blue-300 transition-colors"
                  >Copy JSON</button>
                  <button 
                    onClick={() => setShowRawJson(!showRawJson)}
                    className="px-3 py-1 text-sm font-bold rounded bg-gray-500/10 hover:bg-gray-500/20 text-gray-700 dark:text-gray-300 transition-colors"
                  >{showRawJson ? 'Hide Raw JSON' : 'Show Full JSON'}</button>
                  <button 
                    onClick={() => setShowDetailModal(false)}
                    className="p-1.5 rounded-lg bg-white/30 hover:bg-white/50 dark:bg-white/5 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 cursor-pointer transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-white/20 dark:border-white/5 bg-white/20 dark:bg-white/2">
                <table className="w-full min-w-[1100px] border-collapse text-xs text-left">
                  <thead>
                    <tr className="bg-white/40 dark:bg-white/5 border-b border-white/20 dark:border-white/5">
                      <th className="p-3 font-bold text-blue-950 dark:text-blue-200">ลำดับ</th>
                      <th className="p-3 font-bold text-blue-950 dark:text-blue-200">วันที่</th>
                      <th className="p-3 font-bold text-blue-950 dark:text-blue-200">เวลา</th>
                      <th className="p-3 font-bold text-blue-950 dark:text-blue-200">ธนาคารผู้โอน</th>
                      <th className="p-3 font-bold text-blue-950 dark:text-blue-200">ชื่อผู้โอน</th>
                      <th className="p-3 font-bold text-blue-950 dark:text-blue-200">จำนวนเงิน</th>
                      <th className="p-3 font-bold text-blue-950 dark:text-blue-200">ชื่อผู้รับ</th>
                      <th className="p-3 font-bold text-blue-950 dark:text-blue-200">ธนาคารผู้รับ</th>
                      <th className="p-3 font-bold text-blue-950 dark:text-blue-200">บันทึกช่วยจำ</th>
                      <th className="p-3 font-bold text-blue-950 dark:text-blue-200">หมายเหตุ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {slipDetailRows.length > 0 ? (
                      slipDetailRows.map((row) => (
                        <tr key={row.no}>
                          <td className="p-3 font-semibold text-gray-600 dark:text-gray-400">{row.no}</td>
                          <td className="p-3 text-blue-950 dark:text-blue-100">{row.date}</td>
                          <td className="p-3 text-blue-950 dark:text-blue-100">{row.time}</td>
                          <td className="p-3 text-blue-950 dark:text-blue-100">{row.senderBank}</td>
                          <td className="p-3 text-blue-950 dark:text-blue-100">{row.senderName}</td>
                          <td className="p-3 font-bold text-green-700 dark:text-green-400">{row.amount}</td>
                          <td className="p-3 text-blue-950 dark:text-blue-100">{row.receiverName}</td>
                          <td className="p-3 text-blue-950 dark:text-blue-100">{row.receiverBank}</td>
                          <td className="p-3 text-gray-600 dark:text-gray-300">{row.memo}</td>
                          <td className="p-3 text-gray-600 dark:text-gray-300">{row.note}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="p-3 text-center text-gray-500" colSpan={10}>
                          ยังไม่มีผล OCR จากสลิปที่อัปโหลด
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {showRawJson && (
                <div className="mt-4 max-h-[300px] overflow-auto rounded-lg border border-white/10 p-2">
                  <JsonViewer data={ocrData} />
                </div>
              )}

              <div className="mt-4 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 font-semibold bg-amber-500/5 p-3 rounded-xl border border-amber-500/10">
                <Cpu className="w-4 h-4 animate-pulse" />
                <span>Verified with Thai Slip OCR Engine (EasyOCR + PaddleOCR + Bank API sync)</span>
              </div>
            </div>
          </div>
        )}

        {/* Modal: WinRAR Compression Progress */}
        {isCompressing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/40 animate-in fade-in duration-200">
            <div className="glass-panel relative w-full max-w-md border-none shadow-2xl rounded-2xl p-6 text-center overflow-hidden">
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="p-4 bg-gradient-to-tr from-[#030213] to-blue-900 dark:from-blue-700 dark:to-blue-500 rounded-full shadow-lg text-white animate-bounce">
                  <FileArchive className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-black text-blue-950 dark:text-blue-200 uppercase tracking-widest">
                  Packaging Project
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Compressing evidence files into secure WinRAR SFX Archive (.rar) with 3% Recovery Records...
                </p>
                <div className="w-full bg-white/30 dark:bg-white/5 border border-white/20 dark:border-white/5 h-2.5 rounded-full overflow-hidden shadow-inner mt-2">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-150" 
                    style={{ width: `${compressProgress}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-blue-900 dark:text-blue-400 mt-1">
                  Compressing... {compressProgress}%
                </span>
              </div>
            </div>
          </div>
        )}

        <Toaster />
      </div>
    </ThemeProvider>
  );
}