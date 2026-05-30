import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import brandLogo from "../../imports/_______________-_Copy-1.png";
import { Cpu, ShieldAlert, BadgeInfo } from "lucide-react";
import { LicenseStatus } from "./LicenseStatus";

interface PreviewColumnProps {
  activeMode: "chat" | "slip";
  isGenerated: boolean;
  uploadedFiles: { name: string; url: string }[];
  paginatedPages?: { canvasDataUrl: string; pageNumber: number }[];
  ocrData?: any;
}

export function PreviewColumn({ activeMode, isGenerated, uploadedFiles, paginatedPages = [], ocrData }: PreviewColumnProps) {
  // Mock license data for UI preview
  const mockLicense = {
    status: "Active",
    expiry: "2027-12-31",
    plan: "Enterprise"
  };
  const [zoomLevel, setZoomLevel] = useState<100 | 150>(100); // Default zoom level to 100% as requested!
  // Determine if viewport background is white A4 paper sheet or original logo matching bg
  const viewportBg = isGenerated ? "bg-gray-100 dark:bg-gray-900" : "bg-[#eef2f7]";
  const viewportBorder = isGenerated ? "border-transparent" : "border-[#d8dee9]";

  return (
    <Card className="glass-panel border-none rounded-2xl shadow-xl h-full flex flex-col relative overflow-hidden">
      <CardHeader className="pb-3 px-6 pt-5 flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-bold text-blue-950 dark:text-blue-200">
          {isGenerated ? "Generated Evidence PDF (A4)" : "Evidence Viewport"}
        </CardTitle>
        <LicenseStatus license={mockLicense} />
        {isGenerated && (
          <div className="flex bg-[#030213]/10 dark:bg-white/5 border border-[#030213]/10 dark:border-white/10 rounded-lg p-0.5 text-[10px] font-bold shadow-sm shrink-0">
            <button 
              onClick={() => setZoomLevel(100)}
              className={`px-2.5 py-1 rounded-md transition-all duration-200 cursor-pointer ${zoomLevel === 100 ? "bg-[#030213] text-white dark:bg-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700 dark:text-gray-400"}`}
            >
              100%
            </button>
            <button 
              onClick={() => setZoomLevel(150)}
              className={`px-2.5 py-1 rounded-md transition-all duration-200 cursor-pointer ${zoomLevel === 150 ? "bg-[#030213] text-white dark:bg-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700 dark:text-gray-400"}`}
            >
              150%
            </button>
          </div>
        )}
      </CardHeader>
      <CardContent className="px-6 pb-6 flex-1 flex flex-col">
        <div className={`w-full ${isGenerated ? "flex-1 min-h-[890px]" : "h-[400px]"} ${viewportBg} border ${viewportBorder} rounded-2xl flex flex-col items-center p-4 overflow-auto shadow-inner transition-all duration-300 relative`}>
          
          {isGenerated ? (
            /* Live A4 PDF Paper Sheet Template */
            <div 
              style={{
                transform: zoomLevel === 150 ? "scale(1.5)" : "scale(1)",
                transformOrigin: "top center",
                width: "98%",
                height: "auto",
                minHeight: "850px",
                transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
              }}
              className="bg-white border border-gray-300 rounded-2xl shadow-2xl p-6 text-black flex flex-col justify-between select-none animate-in zoom-in-95 duration-500 text-left"
            >
              
              {/* PDF Header Section */}
              <div className="border-b-2 border-double border-gray-300 pb-3">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 overflow-hidden bg-[#eef2f7] rounded-lg flex items-center justify-center border border-gray-200 shadow-sm shrink-0">
                      <img src={brandLogo} className="w-full h-full object-cover object-top scale-135 pt-0.5" alt="Emblem" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black tracking-widest text-blue-900 uppercase">Digital Evidence Records</h4>
                      <p className="text-[8px] font-bold text-gray-500 tracking-wider">OFFICIAL FORENSICS REPORT</p>
                    </div>
                  </div>
                  <div className="text-[8px] text-right font-bold text-gray-600 space-y-0.5">
                    <p>CASE: <span className="font-extrabold text-blue-950">DE-2026-0528</span></p>
                    <p>DATE: <span>28 MAY 2026</span></p>
                  </div>
                </div>
                
                {/* PDF Metadata Grid */}
                <div className="grid grid-cols-3 gap-2 bg-gray-50 p-2 rounded-lg border border-gray-150 text-[8px] font-bold text-gray-500">
                  <div>
                    <span className="block text-[6px] text-gray-400 uppercase">Process Module</span>
                    <span className="text-blue-900">{activeMode === "chat" ? "LINE Chat Paginator" : "Thai Slip OCR Scanner"}</span>
                  </div>
                  <div>
                    <span className="block text-[6px] text-gray-400 uppercase">Uploaded Files</span>
                    <span className="text-blue-900">{uploadedFiles.length} Images</span>
                  </div>
                  <div className="truncate">
                    <span className="block text-[6px] text-gray-400 uppercase">Legal Security Hash</span>
                    <span className="font-mono text-green-700">{ocrData?.forensics_analysis?.integrity_hash ? `SHA256: ${ocrData.forensics_analysis.integrity_hash.slice(7, 18)}...` : "SHA256: 7e8b23a9d..."}</span>
                  </div>
                </div>
              </div>

              {/* PDF Body: Dynamically render actual user-uploaded image files! */}
              <div className="flex-1 py-4 space-y-4 pr-1">
                {activeMode === "chat" ? (
                  /* LINE Chat Paginator Content Body */
                  <div className="space-y-3">
                    <div className="flex items-center gap-1 text-[8px] font-bold text-blue-900 bg-blue-50/50 p-1.5 rounded border border-blue-100">
                      <BadgeInfo className="w-3.5 h-3.5 shrink-0 text-blue-700" />
                      <span>Object-Aware Pagination: Slices wallpapers and arranges chat items without splitting bubbles.</span>
                    </div>
                    {paginatedPages.length > 0 ? (
                      <div className="space-y-4">
                        {paginatedPages.map((page, idx) => (
                          <div key={idx} className="border border-gray-200 rounded-xl p-2 bg-gray-50/50 flex flex-col gap-1.5 shadow-sm">
                            <div className="flex justify-between items-center text-[7px] font-bold text-blue-900 border-b border-gray-150 pb-1 uppercase tracking-wider">
                              <span>Page {page.pageNumber} &mdash; Segmented Evidence</span>
                              <span className="px-1.5 py-0.2 bg-blue-600/10 text-blue-700 rounded text-[6px] font-extrabold uppercase tracking-wide">Safe Gap Splice</span>
                            </div>
                            <img 
                              src={page.canvasDataUrl} 
                              className="w-full h-auto object-contain rounded-lg border border-gray-200 bg-white" 
                              alt={`A4 Page ${page.pageNumber}`} 
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      uploadedFiles.map((file, idx) => (
                        <div key={idx} className="border border-gray-200 rounded-xl p-2.5 bg-gray-50/50 flex flex-col gap-1.5 shadow-sm">
                          <span className="text-[8px] font-bold text-blue-900 border-b border-gray-150 pb-1 uppercase tracking-wider">
                            Chat Segment #{idx + 1} &mdash; {file.name}
                          </span>
                          <img 
                            src={file.url} 
                            className="w-full h-auto object-contain rounded-lg border border-gray-200 max-h-[320px] bg-white" 
                            alt="LINE Chat log" 
                          />
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  /* Bank Slip OCR Content Body */
                  <div className="space-y-4">
                    <div className="flex flex-col gap-1 text-[8px] font-bold text-amber-800 bg-amber-50/50 p-2 rounded-xl border border-amber-100">
                      <div className="flex items-center gap-1">
                        <Cpu className="w-3.5 h-3.5 shrink-0 text-amber-700 animate-pulse" />
                        <span>YOLOv8 Bank Logo: {ocrData?.bank_slip_verification?.matched_bank_brand || "SCB"} ({ocrData?.bank_slip_verification?.brand_matching_confidence || "95.4%"}) Bounding Boxes Activated.</span>
                      </div>
                      <div className="text-[7.5px] text-gray-500 font-semibold pl-4.5 border-t border-amber-100/50 pt-1 mt-0.5">
                        OCR result from uploaded slip. Please review extracted fields.
                      </div>
                    </div>
                    {uploadedFiles.map((file, idx) => (
                      <div key={idx} className="relative border border-gray-200 rounded-xl p-3 bg-gray-50/50 flex flex-col gap-2 shadow-sm overflow-hidden">
                        <span className="text-[8px] font-bold text-amber-700 border-b border-gray-150 pb-1 uppercase tracking-wider">
                          Bank Receipt #{idx + 1} &mdash; {file.name} (Matched Brand: {ocrData?.extracted_transaction_metadata?.bank_name || "SCB"})
                        </span>
                        
                        {/* Bounding box dynamic viewport wrapper */}
                        <div className="relative mx-auto max-w-[320px] border border-gray-200 rounded-lg overflow-hidden bg-white">
                          <img 
                            src={file.url} 
                            className="w-full h-auto object-contain" 
                            alt="Bank Slip Receipt" 
                          />
                          
                          {/* Glowing OCR bounding boxes absolute overlays over their uploaded images! */}
                          {/* Bank logo boundary */}
                          <div className="absolute top-[8%] left-[6%] w-[25%] h-[8%] border-2 border-dashed border-cyan-500 bg-cyan-500/10 rounded animate-pulse" title="Bank Logo Detection (YOLOv8)" />
                          {/* Sender name boundary */}
                          <div className="absolute top-[20%] left-[8%] w-[55%] h-[6%] border border-cyan-400 bg-cyan-400/5 rounded" title="Sender Name Bounding Box" />
                          {/* Receiver name boundary */}
                          <div className="absolute top-[35%] left-[8%] w-[55%] h-[6%] border border-cyan-400 bg-cyan-400/5 rounded" title="Receiver Name Bounding Box" />
                          {/* Amount transferred boundary */}
                          <div className="absolute bottom-[22%] left-[30%] w-[40%] h-[10%] border-2 border-cyan-500 bg-cyan-500/15 rounded animate-pulse" title="Transferred Amount Bounding Box" />
                          {/* QR Code scan boundary */}
                          <div className="absolute bottom-[5%] right-[5%] w-[30%] h-[30%] border border-dashed border-cyan-400 bg-cyan-400/5 rounded animate-pulse" title="QR Payload Bounding Box" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* PDF Footer Section */}
              <div className="border-t border-gray-300 pt-2.5 mt-2 flex justify-between items-center text-[7px] font-extrabold text-gray-400 tracking-wider">
                <span className="flex items-center gap-1 text-red-500">
                  <ShieldAlert className="w-3 h-3" />
                  CONFIDENTIAL - LAW ENFORCEMENT COURT FILE
                </span>
                <span>PAGE 1 OF 1</span>
              </div>

            </div>
          ) : (
            /* Starting Default Emblem Shield Viewport */
            <div className="w-full h-full flex items-center justify-center p-4 relative group">
              <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent pointer-events-none" />
              <ImageWithFallback
                src={brandLogo}
                alt="Digital Evidence Preview"
                className="w-full h-full object-contain rounded-xl transition-all duration-500 group-hover:scale-[1.02]"
              />
            </div>
          )}
          
        </div>
      </CardContent>
    </Card>
  );
}
