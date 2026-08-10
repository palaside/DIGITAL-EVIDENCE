import React, { useState } from "react";
import { ThemeProvider } from "./components/ThemeProvider";
import { Header } from "./components/Header";
import { UploadColumn } from "./components/UploadColumn";
import { PreviewColumn } from "./components/PreviewColumn";
import { ActionsColumn } from "./components/ActionsColumn";
import { SummaryLedgerModal } from "./components/SummaryLedgerModal";
import { NotebookLMPanel } from "./components/NotebookLMPanel";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";
import { X, Table, Cpu, ShieldAlert, FileArchive, MessagesSquare, ReceiptText, Workflow, LockKeyhole, Package2 } from "lucide-react";
import { segmentChatImage, PageSegment, PaginationValidationError, detectCrossFileOverlap, trimImageTop } from "./utils/pagination";
import { validateSlipData } from "./utils/slipValidatorEngine";
import { scanQrFromDataUrl } from "./utils/qrScanner";
import { parseEMVCoPayload } from "./utils/emvcoParser";
import { buildEvidencePdfBlob, exportEvidencePdf } from "./utils/pdfExport";
import { calculateSlipTotal, formatSlipTotal } from "./utils/slipTotals";
import { normalizeArchiveName, validatePackageOptions } from "./utils/packageValidation";
import { buildSfxArchive } from "./utils/sfxBuilder";
import JSZip from "jszip";
import JsonViewer from "./components/JsonViewer";
import { cleanPersonName } from "./utils/slipNameParser";
import { extractAmount } from "./utils/slipAmountParser";
import { normalizeSlipDate } from "./utils/slipDateParser";
import { THAI_BANKS } from "./utils/thaiBanks";
import { Input } from "./components/ui/input";

const EMPTY_CELL = "-";

function normalizeBankName(rawBank: string): string {
  if (!rawBank || rawBank === EMPTY_CELL) return EMPTY_CELL;
  const lower = rawBank.toLowerCase().trim();
  const match = THAI_BANKS.find(
    (b) =>
      b.nameTh.includes(rawBank) ||
      b.keywords.some((k) => lower.includes(k.toLowerCase())) ||
      b.abbreviations.some((a) => lower.includes(a.toLowerCase()))
  );
  return match ? match.nameTh : rawBank;
}

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
  const rawDate = value.replace(time, "").replace(/\s*\/\s*/g, " ").trim() || value;
  const date = normalizeSlipDate(rawDate).normalizedDate || rawDate;

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

    const rawSenderBank = readSlipField(
      result,
      "sender_bank",
      "senderBank",
      "bank_name",
      "bankName",
      "extracted_transaction_metadata.bank_name"
    );

    const rawSenderName = readSlipField(
      result,
      "sender_name",
      "senderName",
      "extracted_transaction_metadata.sender_name"
    );

    const rawAmount = readSlipField(
      result,
      "amount",
      "extracted_transaction_metadata.amount_transferred"
    );

    const rawReceiverName = readSlipField(
      result,
      "receiver_name",
      "receiverName",
      "extracted_transaction_metadata.receiver_name"
    );

    const rawReceiverBank = readSlipField(
      result,
      "receiver_bank",
      "receiverBank",
      "extracted_transaction_metadata.receiver_bank_name"
    );

    const rawMemo = readSlipField(result, "memo", "extracted_transaction_metadata.memo");
    const rawRefId = readSlipField(
      result,
      "transaction_id",
      "transactionId",
      "ref_id",
      "refId",
      "extracted_transaction_metadata.transaction_id"
    );

    const parsedAmount = extractAmount(rawAmount);
    const cleanedSenderName = cleanPersonName(rawSenderName).cleanName || rawSenderName;
    const cleanedReceiverName = cleanPersonName(rawReceiverName).cleanName || rawReceiverName;

    const row = {
      no: index + 1,
      sourceFileName: result?.source_file_name || `Slip ${index + 1}`,
      status: result?.error ? "ล้มเหลว" : result?.isDuplicate ? "สลิปทำซ้ำ" : "สแกนสำเร็จ",
      error: result?.error || "",
      date,
      time,
      senderBank: normalizeBankName(rawSenderBank),
      senderName: cleanedSenderName,
      amount: parsedAmount.numericAmount > 0
        ? parsedAmount.numericAmount.toFixed(2)
        : (rawAmount !== EMPTY_CELL ? rawAmount : "0.00"),
      numericAmount: parsedAmount.numericAmount,
      receiverName: cleanedReceiverName,
      receiverBank: normalizeBankName(rawReceiverBank),
      memo: rawMemo === EMPTY_CELL ? "-" : rawMemo,
      refId: rawRefId === EMPTY_CELL ? "-" : rawRefId,
      note: result?.error ? "ล้มเหลว" : result?.isDuplicate ? "สลิปทำซ้ำ" : "สแกนสำเร็จ",
    };

    const hasExtractedData = [
      row.date,
      row.time,
      row.senderBank,
      row.senderName,
      row.amount,
      row.receiverName,
      row.receiverBank,
      row.memo,
      row.refId,
    ].some((value) => value !== EMPTY_CELL && value !== "-");

    return {
      ...row,
      hasExtractedData,
    };
  });
}

export default function App() {
  const [activeMode, setActiveMode] = useState<"chat" | "slip" | "notebooklm" | "newfeature">("chat");
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; url: string }[]>([]);
  const [paginatedPages, setPaginatedPages] = useState<PageSegment[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [isGenerated, setIsGenerated] = useState(false);
  const [ocrData, setOcrData] = useState<any>(null);
  const [batchSummary, setBatchSummary] = useState<any>(null);
  const [showRawJson, setShowRawJson] = useState(false);
  
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [passwordProtection, setPasswordProtection] = useState(true);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressProgress, setCompressProgress] = useState(0);
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [showPdfPasswordModal, setShowPdfPasswordModal] = useState(false);
  const [pdfPassword, setPdfPassword] = useState("");
  const [pdfConfirmPassword, setPdfConfirmPassword] = useState("");
  const [pdfPasswordError, setPdfPasswordError] = useState("");
  const [packageErrors, setPackageErrors] = useState<string[]>([]);
  const [packageOptions, setPackageOptions] = useState({
    archiveName: "digital-evidence-package",
    archiveFormat: "zip" as "zip" | "rar",
    password: "",
    confirmPassword: "",
    legalDisclaimer: "DIGITAL EVIDENCE เป็นเพียงการเครื่องมืออำนวยความสะดวกให้กับผู้ว่าจ้าง โดยไม่ได้ดัดแปลง แก้ไข เพิ่ม-ลบ เนื้อหา จากต้นฉบับใดๆ และไม่มีส่วนเกี่ยวข้องใดๆ กับเนื้อหาในเอกสาร เป็นเพียงเครื่องมือที่ทำงานเกี่ยวกับระบบไฟล์ เอกสารแบบอิเล็กทรอนิกส์ เท่านั้น",
    includePdf: true,
  });

  const handleModeChange = (mode: "chat" | "slip" | "notebooklm") => {
    setActiveMode(mode);
    setUploadedFiles([]);
    setPaginatedPages([]);
    setIsGenerating(false);
    setProgress(0);
    setStatusText("");
    setIsGenerated(false);
    setOcrData(null);
    setBatchSummary(null);
    setShowDetailModal(false);
    setShowPackageModal(false);
  };

  const openNewFeature = () => setActiveMode("newfeature");

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

  const triggerBlobDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number, errorMsg: string): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(errorMsg));
      }, timeoutMs);

      promise
        .then((res) => {
          clearTimeout(timer);
          resolve(res);
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  };

  const handleGenerate = async () => {
    if (uploadedFiles.length === 0) {
      toast.error("Please upload at least one image file first!");
      return;
    }
    setIsGenerating(true);
    setProgress(0);
    setStatusText("Initializing...");
    setIsGenerated(false);
    setShowDetailModal(false);
    setShowRawJson(false);
    setBatchSummary(null);

    if (activeMode === "chat") {
      try {
        const fileNames = uploadedFiles.map((f) => f.name.trim().toLowerCase());
        const seenNames = new Set<string>();
        const duplicateNames: string[] = [];
        for (const name of fileNames) {
          if (seenNames.has(name)) {
            if (!duplicateNames.includes(name)) duplicateNames.push(name);
          } else {
            seenNames.add(name);
          }
        }
        if (duplicateNames.length > 0) {
          toast.error(
            `Duplicate files detected: ${duplicateNames.join(", ")}. Remove copies before generating.`
          );
          setIsGenerating(false);
          return;
        }

        const trimOffsets: number[] = new Array(uploadedFiles.length).fill(0);
        const autoTrimLog: { file: string; trimPx: number; confidence: number }[] = [];

        for (let i = 0; i < uploadedFiles.length - 1; i++) {
          setProgress(Math.round((i / Math.max(1, uploadedFiles.length - 1)) * 15));
          setStatusText(`Checking visual overlap: ${i + 1}/${uploadedFiles.length - 1}`);
          const result = await detectCrossFileOverlap(
            uploadedFiles[i].url,
            uploadedFiles[i + 1].url
          );
          if (result.overlapPixels > 0) {
            trimOffsets[i + 1] = result.overlapPixels;
            autoTrimLog.push({
              file: uploadedFiles[i + 1].name,
              trimPx: result.overlapPixels,
              confidence: result.confidence,
            });
            console.log(
              `[CrossFileOverlap] Auto-trim "${uploadedFiles[i + 1].name}": ` +
              `${result.overlapPixels}px from top ` +
              `(confidence=${result.confidence.toFixed(2)}, MAD-match)`
            );
          }
        }

        const allSegments: (PageSegment & { sourceFileId: string })[] = [];

        for (let i = 0; i < uploadedFiles.length; i++) {
          const file = uploadedFiles[i];
          setProgress(15 + Math.round((i / uploadedFiles.length) * 75));
          setStatusText(`Processing ${i + 1}/${uploadedFiles.length}: ${file.name}`);
          console.log(`[ChatPagination] Processing ${i + 1}/${uploadedFiles.length}: ${file.name}`);

          const processFile = async () => {
            const imageUrl =
              trimOffsets[i] > 0
                ? await trimImageTop(file.url, trimOffsets[i])
                : file.url;

            return await segmentChatImage(imageUrl);
          };

          const segments = await withTimeout(
            processFile(),
            35000,
            `Generation stopped at file ${i + 1}/${uploadedFiles.length}: ${file.name} (processing timeout)`
          );

          const taggedSegments = segments.map((seg) => ({
            ...seg,
            sourceFileId: file.name,
          }));
          allSegments.push(...taggedSegments);
        }

        const globalObjectIds = new Set<string>();
        const globalDuplicates: string[] = [];
        for (const seg of allSegments) {
          for (const id of seg.objectIds) {
            if (globalObjectIds.has(id)) {
              globalDuplicates.push(`"${id}" (file: ${seg.sourceFileId})`);
            } else {
              globalObjectIds.add(id);
            }
          }
        }
        if (globalDuplicates.length > 0) {
          throw new PaginationValidationError(
            "Cross-file duplicate objectIds detected",
            globalDuplicates.map((d) => `Global duplicate objectId: ${d}`)
          );
        }

        const crossFileWarnings: string[] = [];
        for (let i = 0; i < allSegments.length - 1; i++) {
          const curr = allSegments[i];
          const next = allSegments[i + 1];
          if (curr.sourceFileId !== next.sourceFileId) {
            crossFileWarnings.push(
              `"${curr.sourceFileId}" -> "${next.sourceFileId}" at pages ${i + 1}/${i + 2}`
            );
          }
        }
        if (crossFileWarnings.length > 0) {
          console.warn("[ChatPagination] Cross-file boundaries:", crossFileWarnings);
        }

        const renumberedSegments = allSegments.map((segment, index) => ({
          ...segment,
          pageNumber: index + 1,
        }));
        setPaginatedPages(renumberedSegments);

        // Run OCR on the uploaded chat files to extract any slips and populate the ledger
        setProgress(90);
        setStatusText("Extracting slip OCR from chat...");
        try {
          const formData = new FormData();
          uploadedFiles.forEach((file) => {
            const blob = dataURLtoBlob(file.url);
            formData.append('image', blob, file.name);
          });
          const ocrRes = await fetch('http://localhost:5000/api/ocr', {
            method: 'POST',
            body: formData,
          });
          if (ocrRes.ok) {
            const ocrDataResult = await ocrRes.json();
            const ocrResults = ocrDataResult.combined_results ? ocrDataResult.combined_results : [ocrDataResult];
            
            const normalizedResults = ocrResults.map((result: any, index: number) => {
              const nextResult = {
                ...result,
                source_file_name: result.source_file_name || uploadedFiles[index]?.name || `Chat Page ${index + 1}`,
                extracted_transaction_metadata: {
                  ...(result.extracted_transaction_metadata || {}),
                },
              };
              try {
                return {
                  ...nextResult,
                  ...validateSlipData(nextResult),
                };
              } catch {
                return nextResult;
              }
            });
            
            // Only populate ledger items that actually resolved metadata (are actual slips)
            // Check raw OCR fields since normalizedResults are pre-toSlipDetailRows objects
            const validResults = normalizedResults.filter((r: any) => {
              const meta = r?.extracted_transaction_metadata || {};
              return (
                (meta.sender_name && meta.sender_name !== 'Unknown') ||
                (meta.receiver_name && meta.receiver_name !== 'Unknown') ||
                (meta.transaction_date_time && meta.transaction_date_time !== 'Unknown') ||
                (meta.amount_transferred && meta.amount_transferred !== 'Unknown') ||
                r?.sender_name || r?.senderName || r?.receiver_name || r?.receiverName
              );
            });

            if (validResults.length > 0) {
              if (validResults.length === 1) {
                setOcrData(validResults[0]);
              } else {
                setOcrData(validResults);
              }
            } else {
              // Keep all results in ledger even if OCR extracted no clean metadata
              setOcrData(normalizedResults.length === 1 ? normalizedResults[0] : normalizedResults);
            }
          }
        } catch (ocrErr) {
          console.warn("Background Chat OCR failed:", ocrErr);
        }

        setProgress(100);
        setStatusText("Ready");
        setIsGenerating(false);
        setIsGenerated(true);
        setBatchSummary({
          total_files: uploadedFiles.length,
          processed_files: uploadedFiles.length,
          success_count: uploadedFiles.length,
          failure_count: 0,
        });

        const trimNote =
          autoTrimLog.length > 0
            ? ` — auto-trimmed ${autoTrimLog.length} file(s) (overlap removed)`
            : "";
        const boundaryNote =
          crossFileWarnings.length > 0 && autoTrimLog.length === 0
            ? ` (${crossFileWarnings.length} cross-file boundary — check console)`
            : "";
        toast.success(
          `LINE chat paginated ${uploadedFiles.length} file(s) into ${renumberedSegments.length} A4 page(s).${trimNote}${boundaryNote}`
        );
      } catch (error) {
        setProgress(0);
        setStatusText("Error");
        if (error instanceof PaginationValidationError) {
          console.error("[ChatPagination] Validation failed:", error.validationErrors);
          const firstError = error.validationErrors[0] ?? "unknown validation error";
          toast.error(
            `Generation blocked — ${firstError}${
              error.validationErrors.length > 1
                ? ` (+${error.validationErrors.length - 1} more)`
                : ""
            }`
          );
        } else {
          console.error("Error paginating chat:", error);
          const errMsg = error instanceof Error ? error.message : "Failed to process Object-Aware Pagination on the uploaded image.";
          toast.error(errMsg);
        }
        setIsGenerating(false);
      }

    } else if (activeMode === "slip") {
      setOcrData(uploadedFiles.map((file, index) => ({
        source_file_name: file.name || `Slip ${index + 1}`,
        status: "Processing OCR...",
      })));
      setShowDetailModal(false);
      setProgress(10);
      let qrPayload = "";
      let qrAmount = "";
      try {
        const formData = new FormData();
        uploadedFiles.forEach((file) => {
          const blob = dataURLtoBlob(file.url);
          formData.append('image', blob, file.name);
        });

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
          const res = await fetch('http://localhost:5000/api/ocr', {
            method: 'POST',
            body: formData,
          });
          if (!res.ok) throw new Error('OCR Server returned error');
          const data = await res.json();
          setBatchSummary(data.batch_summary ?? null);
          ocrResults = data.combined_results ? data.combined_results : [data];
          setProgress(70);
        } catch (backendErr) {
          console.warn("Google Cloud Vision backend OCR failed — falling back to local Tesseract OCR.", backendErr);
          setStatusText("Falling back to local OCR...");
          setProgress(40);
          // Fallback: run Tesseract.js locally for each uploaded file
          const localResults: any[] = [];
          for (let i = 0; i < uploadedFiles.length; i++) {
            const file = uploadedFiles[i];
            try {
              const { runLocalOCR } = await import('./utils/localOcr');
              const localResult = await runLocalOCR(file.url, (p) => {
                setStatusText(`Local OCR: ${p.status} (${Math.round(p.progress * 100)}%)`);
              });
              localResults.push({
                ...localResult,
                source_file_name: file.name || `Slip ${i + 1}`,
              });
            } catch (localErr) {
              console.warn(`Local OCR failed for file ${file.name}:`, localErr);
              localResults.push({
                source_file_name: file.name || `Slip ${i + 1}`,
                error: localErr instanceof Error ? localErr.message : 'Local OCR failed',
                extracted_transaction_metadata: {},
              });
            }
          }
          ocrResults = localResults;
          setProgress(70);
        }

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
          setStatusText("Ready");
          setIsGenerating(false);
          setIsGenerated(true);
          setShowRawJson(false);
          setShowDetailModal(false);
          toast.success(`Bank slip OCR analysis completed for ${normalizedResults.length} slip(s).`);
        } else {
          throw new Error("OCR Failed completely.");
        }
      } catch (err) {
        console.error('Error running Slip OCR:', err);
        setProgress(0);
        setStatusText("Error");
        setIsGenerating(false);
        setOcrData(uploadedFiles.map((file, index) => ({
          source_file_name: file.name || `Slip ${index + 1}`,
          error: err instanceof Error ? err.message : "OCR processing failed",
        })));
        setShowDetailModal(false);
        toast.error("Failed to process image. OCR Server is offline and local fallback failed.");
      }
    }
  };

const generatePdfWithPassword = async (password?: string) => {
  const mode = activeMode === "chat" ? "chat" : "slip";
  const sourceImages =
    mode === "chat" && paginatedPages.length > 0
      ? paginatedPages.map((page) => page.canvasDataUrl)
      : uploadedFiles.map((file) => file.url);

  if (sourceImages.length === 0) {
    toast.error("No images available for PDF export.");
    return;
  }

  if (mode === "chat") {
    if (sourceImages.length !== paginatedPages.length) {
      toast.error(`Preview page count (${paginatedPages.length}) does not match export image count (${sourceImages.length}).`);
      return;
    }
    const orderMismatch = paginatedPages.some((p, i) => p.pageNumber !== i + 1);
    if (orderMismatch) {
      toast.error("Page order mismatch detected in paginated preview. Export blocked.");
      return;
    }
  }

  try {
    await exportEvidencePdf({
      mode,
      sourceImages,
      slipRows: mode === "slip" ? slipDetailRows : [],
      password,
    });
    toast.success(password ? "Evidence PDF saved and encrypted successfully." : "Evidence PDF saved successfully.");
  } catch (error) {
    console.error("Error exporting evidence PDF:", error);
    toast.error("Unable to create the evidence PDF.");
  }
};

const handleSavePDF = async () => {
  if (!isGenerated) {
    toast.error("Please generate the evidence preview first!");
    return;
  }

  if (passwordProtection) {
    setPdfPassword("");
    setPdfConfirmPassword("");
    setPdfPasswordError("");
    setShowPdfPasswordModal(true);
  } else {
    await generatePdfWithPassword(undefined);
  }
};

  const handleSendProject = () => {
    if (uploadedFiles.length === 0) {
      toast.error("No evidence files to package!");
      return;
    }
    setPackageOptions((current) => ({
      ...current,
      archiveFormat: passwordProtection ? "rar" : "zip",
    }));
    setShowPackageModal(true);
  };

  const handleConfirmPackageProject = async () => {
    if (uploadedFiles.length === 0) {
      toast.error("No evidence files to package!");
      return;
    }

    const safeArchiveName = packageOptions.archiveName.trim() || "digital-evidence-package";
    const validation = validatePackageOptions(packageOptions);
    if (!validation.valid) {
      setPackageErrors(validation.errors);
      return;
    }

    setPackageErrors([]);
    setShowPackageModal(false);
    setIsCompressing(true);
    setCompressProgress(10);

    try {
      // 1. Prepare PDF Blob
      let pdfBlob: Blob | undefined;
      if (packageOptions.includePdf && isGenerated) {
        setCompressProgress(30);
        const { blob } = await buildEvidencePdfBlob({
          mode: activeMode === "chat" ? "chat" : "slip",
          sourceImages:
            activeMode === "chat" && paginatedPages.length > 0
              ? paginatedPages.map((page) => page.canvasDataUrl)
              : uploadedFiles.map((file) => file.url),
          slipRows: activeMode === "slip" ? slipDetailRows : [],
        });
        pdfBlob = blob;
      }

      // 2. Prepare OCR Metadata Blob
      let ocrBlob: Blob | undefined;
      if (activeMode === "slip" && ocrData) {
        ocrBlob = new Blob([JSON.stringify(ocrData, null, 2)], { type: "application/json" });
      }

      setCompressProgress(50);

      // 3. Package locally
      if (packageOptions.archiveFormat === "rar") {
        // SFX WinRAR executable builder
        const uploadedFilesAdapter = uploadedFiles.map(f => ({
          name: f.name,
          url: f.url
        }));
        
        const sfxFile = await buildSfxArchive(
          packageOptions,
          uploadedFilesAdapter,
          pdfBlob,
          ocrBlob
        );
        
        setCompressProgress(90);
        triggerBlobDownload(sfxFile, sfxFile.name);
      } else {
        // Direct ZIP archive builder
        const zip = new JSZip();
        
        // Add source files
        for (let i = 0; i < uploadedFiles.length; i++) {
          const file = uploadedFiles[i];
          const blob = dataURLtoBlob(file.url);
          const arr = new Uint8Array(await blob.arrayBuffer());
          zip.file(file.name, arr);
        }

        // Add optional PDF
        if (pdfBlob) {
          const pdfArr = new Uint8Array(await pdfBlob.arrayBuffer());
          zip.file("evidence.pdf", pdfArr);
        }

        // Add optional OCR json
        if (ocrBlob) {
          const jsonArr = new Uint8Array(await ocrBlob.arrayBuffer());
          zip.file("slip-ocr-analysis.json", jsonArr);
        }

        // Generate ZIP file
        const zipBlob = await zip.generateAsync({
          type: "blob",
          compression: "DEFLATE",
          compressionOptions: { level: 9 },
        });

        setCompressProgress(90);
        triggerBlobDownload(zipBlob, `${safeArchiveName}.zip`);
      }

      setCompressProgress(100);
      setTimeout(() => {
        setIsCompressing(false);
        const formatLabel = packageOptions.archiveFormat === "rar" ? "WinRAR SFX (.exe)" : "ZIP (.zip)";
        toast.success(`Project ${formatLabel} package generated successfully.`);
      }, 400);
    } catch (error) {
      console.error("Error packaging project:", error);
      setCompressProgress(0);
      setIsCompressing(false);
      toast.error(error instanceof Error ? error.message : "Failed to package the project.");
    }
  };

  const slipDetailRows = toSlipDetailRows(ocrData);
  const processingRows = slipDetailRows.filter((row) => row.status);
  const errorRows = slipDetailRows.filter((row) => row.error);
  const completedRows = slipDetailRows.filter((row) => row.hasExtractedData);
  const slipTotalAmount = calculateSlipTotal(completedRows);
  const modeTitle =
    activeMode === "chat"
      ? "Chat evidence"
      : activeMode === "slip"
        ? "Slip evidence"
        : activeMode === "notebooklm"
          ? "NotebookLM"
          : "New feature";
  const modeDescription =
    activeMode === "chat"
      ? "Paginate long chat screenshots into A4-ready evidence pages."
      : activeMode === "slip"
        ? "Extract OCR fields from bank slips, then review the evidence output."
        : "Switch back to Chat or Slip to continue the evidence workflow.";
  const entryStateLabel = isGenerating
    ? `${statusText || "Generating"}${progress > 0 ? ` • ${progress}%` : ""}`
    : isGenerated
      ? "Output ready for review and export"
      : uploadedFiles.length > 0
        ? `${uploadedFiles.length} file${uploadedFiles.length === 1 ? "" : "s"} ready to process`
        : "No source files uploaded yet";


  return (
    <ThemeProvider>
      <div className="min-h-screen bg-[#070b14] text-slate-100 selection:bg-cyan-500 selection:text-slate-950 font-sans">
        <Header
          activeMode={activeMode === "slip" ? "slip" : "chat"}
          onModeChange={(mode) => handleModeChange(mode)}
          uploadedFilesCount={uploadedFiles.length}
          isGenerating={isGenerating}
          isGenerated={isGenerated}
          progress={progress}
          statusText={statusText}
        />

        <main className="mx-auto w-full max-w-[1600px] px-4 py-6 md:px-6">
          {activeMode === "newfeature" ? (
            React.createElement(require('../pages/NewFeature').default)
          ) : activeMode === "notebooklm" ? (
            <NotebookLMPanel />
          ) : (
            <div className="grid grid-cols-1 gap-6 items-stretch lg:grid-cols-[minmax(18rem,22rem)_minmax(0,1.5fr)_minmax(18rem,22rem)]">
              {/* Column 1: Upload, Generate, Progress */}
              <div className="xl:min-w-0">
                <UploadColumn 
                  activeMode={activeMode === "slip" ? "slip" : "chat"}
                  uploadedFiles={uploadedFiles}
                  setUploadedFiles={setUploadedFiles}
                  isGenerating={isGenerating}
                  progress={progress}
                  statusText={statusText}
                  isGenerated={isGenerated}
                  onGenerate={handleGenerate}
                />
              </div>

              {/* Column 2: Preview (wider) */}
              <div className="xl:min-w-0">
                <PreviewColumn 
                  activeMode={activeMode === "slip" ? "slip" : "chat"}
                  isGenerated={isGenerated}
                  uploadedFiles={uploadedFiles}
                  paginatedPages={paginatedPages}
                  ocrData={ocrData}
                />
              </div>

              {/* Column 3: Save, Detail, Send */}
              <div className="xl:min-w-0">
                <ActionsColumn 
                  activeMode={activeMode === "slip" ? "slip" : "chat"}
                  isGenerated={isGenerated}
                  hasUploads={uploadedFiles.length > 0}
                  uploadedFilesCount={uploadedFiles.length}
                  passwordProtection={passwordProtection}
                  setPasswordProtection={setPasswordProtection}
                  onOpenSummaryModal={() => setShowSummaryModal(true)}
                  onSavePdf={handleSavePDF}
                  onSaveWinrar={handleSendProject}
                  onGenerate={handleGenerate}
                  isGenerating={isGenerating}
                />
              </div>
            </div>
          )}
        </main>

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
              className="glass-panel relative w-full border-none shadow-2xl rounded-[24px] p-4 overflow-hidden"
              style={{
                position: "relative",
                width: "min(98vw, 1480px)",
                maxHeight: "94vh",
                overflow: "auto",
                borderRadius: "24px",
                padding: "16px",
                background: "#f8fafc",
                color: "#111827",
                boxShadow: "0 24px 80px rgba(15, 23, 42, 0.35)",
              }}
            >
              <div className="sticky top-0 z-10 mb-3 flex items-center justify-between border-b border-slate-200 bg-[#f8fafc]/95 pb-3 backdrop-blur-sm">
                <h3 className="text-lg font-bold flex items-center gap-2 text-slate-950">
                  <Table className="w-4 h-4 text-[#1f5fa9]" />
                  Slip OCR Data Analysis
                </h3>
                <div className="flex gap-1.5">
                  <button 
                    onClick={() => {
                      const el = document.createElement('textarea');
                      el.value = JSON.stringify(ocrData, null, 2);
                      document.body.appendChild(el);
                      el.select();
                      document.execCommand('copy');
                      document.body.removeChild(el);
                    }}
                    className="px-2.5 py-1 text-xs font-bold rounded bg-blue-600/10 hover:bg-blue-600/20 text-blue-700 transition-colors"
                  >Copy JSON</button>
                  <button 
                    onClick={() => setShowRawJson(!showRawJson)}
                    className="px-2.5 py-1 text-xs font-bold rounded bg-gray-500/10 hover:bg-gray-500/20 text-gray-700 transition-colors"
                  >{showRawJson ? 'Hide Raw JSON' : 'Show Full JSON'}</button>
                  <button 
                    onClick={() => setShowDetailModal(false)}
                    className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-gray-500 cursor-pointer transition-all"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="mb-3 grid gap-2 md:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Uploaded slips</div>
                  <div className="mt-1 text-base font-semibold text-slate-950">{uploadedFiles.length}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Extracted rows</div>
                  <div className="mt-1 text-base font-semibold text-slate-950">{completedRows.length}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Batch status</div>
                  <div className="mt-1 text-xs font-semibold text-slate-950">
                    {processingRows.length > 0
                      ? `Processing ${processingRows.length} file(s)`
                      : errorRows.length > 0
                        ? `Review ${errorRows.length} failed file(s)`
                        : completedRows.length > 0
                          ? "OCR data extracted"
                          : "Waiting for OCR result"}
                  </div>
                </div>
              </div>

              {processingRows.length > 0 && (
                <div className="mb-3 max-h-28 overflow-auto rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs leading-5 text-slate-950">
                  กำลังประมวลผล {processingRows.length} ภาพ:
                  <span className="ml-2 font-medium">{processingRows.map((row) => row.sourceFileName).join(", ")}</span>
                </div>
              )}

              {errorRows.length > 0 && (
                <div className="mb-3 max-h-28 overflow-auto rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs leading-5 text-slate-950">
                  OCR ล้มเหลว {errorRows.length} ภาพ:
                  <span className="ml-2 font-medium">
                    {errorRows.map((row) => `${row.sourceFileName}${row.error ? ` (${row.error})` : ""}`).join(", ")}
                  </span>
                </div>
              )}

              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table
                  className="w-full border-collapse text-[11px] text-left text-slate-950"
                  style={{ minWidth: "1320px", tableLayout: "fixed" }}
                >
                  <thead className="sticky top-0 z-[1]">
                    <tr className="border-b border-slate-200 bg-slate-100">
                      <th className="px-2 py-2 font-bold text-slate-950 break-words w-[56px]">ลำดับ</th>
                      <th className="px-2 py-2 font-bold text-slate-950 break-words w-[112px]">วันที่</th>
                      <th className="px-2 py-2 font-bold text-slate-950 break-words w-[74px]">เวลา</th>
                      <th className="px-2 py-2 font-bold text-slate-950 break-words w-[170px]">ธนาคารผู้โอน</th>
                      <th className="px-2 py-2 font-bold text-slate-950 break-words w-[180px]">ชื่อผู้โอน</th>
                      <th className="px-2 py-2 font-bold text-slate-950 break-words w-[138px]">จำนวนเงิน</th>
                      <th className="px-2 py-2 font-bold text-slate-950 break-words w-[180px]">ชื่อผู้รับ</th>
                      <th className="px-2 py-2 font-bold text-slate-950 break-words w-[156px]">ธนาคารผู้รับ</th>
                      <th className="px-2 py-2 font-bold text-slate-950 break-words w-[164px]">บันทึกช่วยจำ</th>
                      <th className="px-2 py-2 font-bold text-slate-950 break-words w-[150px]">รหัสอ้างอิง</th>
                      <th className="px-2 py-2 font-bold text-slate-950 break-words w-[110px]">หมายเหตุ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {completedRows.length > 0 ? (
                      completedRows.map((row) => (
                        <tr key={row.no}>
                          <td className="px-2 py-2 font-semibold text-slate-700">{row.no}</td>
                          <td className="px-2 py-2 text-slate-950 break-words">{row.date}</td>
                          <td className="px-2 py-2 text-slate-950 break-words">{row.time}</td>
                          <td className="px-2 py-2 text-slate-950 break-words">{row.senderBank}</td>
                          <td className="px-2 py-2 text-slate-950 break-words">{row.senderName}</td>
                          <td className="px-2 py-2 font-bold text-emerald-700 break-words">
                            {row.amount ? (row.amount.startsWith("฿") ? row.amount : `฿${row.amount}`) : "฿0.00"}
                          </td>
                          <td className="px-2 py-2 text-slate-950 break-words">{row.receiverName}</td>
                          <td className="px-2 py-2 text-slate-950 break-words">{row.receiverBank}</td>
                          <td className="px-2 py-2 text-slate-700 break-words">{row.memo || "-"}</td>
                          <td className="px-2 py-2 font-mono text-[11px] text-slate-700 break-words">{row.refId || "-"}</td>
                          <td className="px-2 py-2 text-slate-700">{row.note}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="p-4 text-center text-slate-600" colSpan={11}>
                          {processingRows.length > 0
                            ? "กำลังรอผล OCR จากสลิปที่อัปโหลด"
                            : errorRows.length > 0
                              ? "ไม่พบข้อมูลที่สกัดได้จากสลิปที่อัปโหลด"
                              : "ยังไม่มีผล OCR จากสลิปที่อัปโหลด"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {completedRows.length > 0 && (
                    <tfoot>
                      <tr className="border-t-2 border-slate-300 bg-slate-100">
                        <td className="px-2 py-2 font-bold text-slate-950" colSpan={5}>
                          รวมเงิน
                        </td>
                        <td className="px-2 py-2 font-extrabold text-emerald-700 break-words">
                          {formatSlipTotal(slipTotalAmount)}
                        </td>
                        <td className="px-2 py-2 text-slate-500" colSpan={5}>
                          รวมจากรายการที่สกัดข้อมูลได้ {completedRows.length} รายการ
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {showRawJson && (
                <div className="mt-4 max-h-[300px] overflow-auto rounded-lg border border-slate-200 bg-white p-2">
                  <JsonViewer data={ocrData} />
                </div>
              )}

              <div className="mt-4 flex items-center gap-2 text-xs text-amber-700 font-semibold bg-amber-50 p-3 rounded-xl border border-amber-200">
                <Cpu className="w-4 h-4 animate-pulse" />
                <span>OCR result from uploaded slip. Please review extracted fields before using as evidence.</span>
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

        {showPackageModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/50 animate-in fade-in duration-200">
            <div className="glass-panel relative w-full max-w-2xl rounded-[28px] border-none p-6 shadow-2xl">
              <div className="mb-5 flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h3 className="flex items-center gap-2 text-xl font-bold text-slate-100">
                    <Package2 className="h-5 w-5 text-[#7fb7ef]" />
                    Package Project
                  </h3>
                  <p className="mt-1 text-sm text-slate-400">
                    Configure archive name, format, password, and included evidence outputs.
                  </p>
                </div>
                <button
                  onClick={() => setShowPackageModal(false)}
                  className="rounded-lg bg-white/5 p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Archive name</label>
                  <Input
                    value={packageOptions.archiveName}
                    onChange={(event) =>
                      setPackageOptions((current) => ({
                        ...current,
                        archiveName: event.target.value,
                      }))
                    }
                    className="glass-input h-11 border-white/10 bg-slate-900/70 text-slate-100"
                  />
                </div>
                {packageErrors.length > 0 && (
                  <div className="md:col-span-2 rounded-2xl border border-rose-400/30 bg-rose-950/20 px-4 py-3 text-sm text-rose-100">
                    <p className="mb-2 font-semibold uppercase tracking-[0.12em] text-rose-200">Package validation errors</p>
                    <ul className="list-disc pl-5 space-y-1">
                      {packageErrors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Archive format</label>
                  <div className="glass-segment inline-flex rounded-2xl p-1.5">
                    <button
                      onClick={() =>
                        setPackageOptions((current) => ({
                          ...current,
                          archiveFormat: "zip",
                          password: "",
                        }))
                      }
                      className={`min-w-[108px] rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                        packageOptions.archiveFormat === "zip"
                          ? "bg-[#12335f] text-white"
                          : "text-slate-300 hover:bg-white/10"
                      }`}
                    >
                      ZIP
                    </button>
                    <button
                      onClick={() => setPackageOptions((current) => ({ ...current, archiveFormat: "rar" }))}
                      className={`min-w-[108px] rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                        packageOptions.archiveFormat === "rar"
                          ? "bg-[#12335f] text-white"
                          : "text-slate-300 hover:bg-white/10"
                      }`}
                    >
                      RAR
                    </button>
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    <LockKeyhole className="h-3.5 w-3.5 text-[#7fb7ef]" />
                    Archive password (RAR only)
                  </label>
                  <Input
                    type="password"
                    value={packageOptions.password}
                    disabled={packageOptions.archiveFormat !== "rar"}
                    onChange={(event) =>
                      setPackageOptions((current) => ({
                        ...current,
                        password: event.target.value,
                      }))
                    }
                    placeholder={
                      packageOptions.archiveFormat === "rar"
                        ? "Optional password for RAR export"
                        : "Password is available when RAR is selected"
                    }
                    className="glass-input h-11 border-white/10 bg-slate-900/70 text-slate-100 placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    <LockKeyhole className="h-3.5 w-3.5 text-[#7fb7ef]" />
                    Confirm password
                  </label>
                  <Input
                    type="password"
                    value={packageOptions.confirmPassword}
                    disabled={packageOptions.archiveFormat !== "rar"}
                    onChange={(event) =>
                      setPackageOptions((current) => ({
                        ...current,
                        confirmPassword: event.target.value,
                      }))
                    }
                    placeholder={
                      packageOptions.archiveFormat === "rar"
                        ? "Confirm archive password"
                        : "Password confirmation available when RAR is selected"
                    }
                    className="glass-input h-11 border-white/10 bg-slate-900/70 text-slate-100 placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label htmlFor="legalDisclaimer" className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Legal disclaimer
                  </label>
                  <textarea
                    id="legalDisclaimer"
                    value={packageOptions.legalDisclaimer}
                    onChange={(event) =>
                      setPackageOptions((current) => ({
                        ...current,
                        legalDisclaimer: event.target.value,
                      }))
                    }
                    placeholder="Enter the legal disclaimer shown before extraction"
                    className="glass-input min-h-[120px] w-full resize-none rounded-xl border border-white/10 bg-slate-900/70 px-3 py-3 text-sm text-slate-100 placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>
                <div className="md:col-span-2 rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-slate-300">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={packageOptions.includePdf}
                      onChange={(event) =>
                        setPackageOptions((current) => ({
                          ...current,
                          includePdf: event.target.checked,
                        }))
                      }
                      className="h-4 w-4 rounded border-slate-600 bg-slate-900"
                    />
                    Include generated evidence PDF in the archive
                  </label>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowPackageModal(false)}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmPackageProject}
                  className="rounded-xl border border-[#2d5e9a]/30 bg-[#12335f] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#153d73]"
                >
                  Create Archive
                </button>
              </div>
            </div>
          </div>
        )}

        {showPdfPasswordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/55 animate-in fade-in duration-200">
            <div className="glass-panel relative w-full max-w-md rounded-[28px] border-none p-6 shadow-2xl">
              <div className="mb-5 flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h3 className="flex items-center gap-2 text-xl font-bold text-slate-100">
                    <LockKeyhole className="h-5 w-5 text-[#7fb7ef]" />
                    ตั้งรหัสผ่านสำหรับ PDF
                  </h3>
                  <p className="mt-1 text-sm text-slate-400">
                    กรุณาตั้งรหัสผ่านเพื่อเข้ารหัสไฟล์ PDF (เหมือนเวลาเปิดเอกสารสเตทเม้นท์ธนาคาร)
                  </p>
                </div>
                <button
                  onClick={() => setShowPdfPasswordModal(false)}
                  className="rounded-lg bg-white/5 p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4">
                {pdfPasswordError && (
                  <div className="rounded-2xl border border-rose-400/30 bg-rose-950/20 px-4 py-2 text-xs text-rose-200">
                    {pdfPasswordError}
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 block">รหัสผ่าน PDF</label>
                  <Input
                    type="password"
                    value={pdfPassword}
                    onChange={(event) => setPdfPassword(event.target.value)}
                    placeholder="รหัสผ่านสำหรับเปิดเอกสาร"
                    className="glass-input h-11 border-white/10 bg-slate-900/70 text-slate-100"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 block">ยืนยันรหัสผ่านอีกครั้ง</label>
                  <Input
                    type="password"
                    value={pdfConfirmPassword}
                    onChange={(event) => setPdfConfirmPassword(event.target.value)}
                    placeholder="ป้อนรหัสผ่านซ้ำอีกครั้ง"
                    className="glass-input h-11 border-white/10 bg-slate-900/70 text-slate-100"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowPdfPasswordModal(false)}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/10"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={async () => {
                    if (!pdfPassword.trim()) {
                      setPdfPasswordError("กรุณากรอกรหัสผ่าน");
                      return;
                    }
                    if (pdfPassword !== pdfConfirmPassword) {
                      setPdfPasswordError("รหัสผ่านไม่ตรงกัน");
                      return;
                    }
                    setPdfPasswordError("");
                    setShowPdfPasswordModal(false);
                    await generatePdfWithPassword(pdfPassword);
                  }}
                  className="rounded-xl border border-[#2d5e9a]/30 bg-[#12335f] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#153d73]"
                >
                  ตกลงและบันทึก
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Summary Ledger Modal */}
        <SummaryLedgerModal
          isOpen={showSummaryModal}
          onClose={() => setShowSummaryModal(false)}
          items={toSlipDetailRows(ocrData)}
        />

        <Toaster />
      </div>
    </ThemeProvider>
  );
}
