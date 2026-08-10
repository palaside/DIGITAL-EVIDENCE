import React, { useState } from "react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import projectLogo from "../../imports/digital_evidence_logo_full.png";

interface PreviewColumnProps {
  activeMode: "chat" | "slip";
  isGenerated: boolean;
  uploadedFiles: { name: string; url: string }[];
  paginatedPages?: { canvasDataUrl: string; pageNumber: number }[];
  ocrData?: any;
}

export function PreviewColumn({
  activeMode,
  isGenerated,
  uploadedFiles,
  paginatedPages = [],
  ocrData,
}: PreviewColumnProps) {
  const getThaiFormattedDate = () => {
    const now = new Date();
    const day = now.getDate();
    const month = now.getMonth() + 1;
    const christianYear = now.getFullYear();
    const buddhistYear = christianYear + 543;
    const shortYear = buddhistYear.toString().slice(-2);
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    return `${day}/${month}/${shortYear} : ${hours}.${minutes}`;
  };

  const currentDate = new Date().toISOString().split("T")[0];
  const formattedDateWithTime = getThaiFormattedDate();
  const totalPages = paginatedPages.length || (uploadedFiles.length > 0 ? uploadedFiles.length : 1);

  return (
    <div className="flex h-full flex-col rounded-3xl border border-cyan-500/20 bg-[#0b1329]/80 p-5 backdrop-blur-md">
      {/* Main Preview Frame Container */}
      <div className="relative flex-1 flex flex-col items-center justify-start rounded-2xl border border-cyan-500/30 bg-[#060a14] p-4 shadow-[inset_0_0_30px_rgba(0,0,0,0.8)] overflow-y-auto">
        {isGenerated && paginatedPages.length > 0 ? (
          <div className="w-full space-y-6 flex flex-col items-center py-2">
            {paginatedPages.map((page, idx) => (
              <div
                key={idx}
                className="w-full max-w-[480px] aspect-[210/297] bg-white text-slate-900 shadow-2xl rounded-sm p-4 flex flex-col justify-between border border-slate-200 select-none"
              >
                {/* Header */}
                <div className="flex items-end justify-between border-b border-slate-200 pb-2">
                  <div className="flex flex-col items-start space-y-1">
                    <div className="h-8 w-8 rounded border border-slate-200 bg-slate-50 p-0.5 flex items-center justify-center">
                      <img src={projectLogo} alt="Logo" className="h-full w-full object-contain" />
                    </div>
                    <div className="flex flex-col text-left leading-none space-y-0.5">
                      <span className="text-[7.5px] font-black text-slate-800">หลักฐานดิจิทัล</span>
                      <span className="text-[7.5px] font-black tracking-tight text-slate-800">DIGITAL EVIDENCE</span>
                    </div>
                  </div>
                  <div className="text-right text-[9px] text-slate-800 font-mono space-y-0.5 leading-tight">
                    <div className="font-bold">Chat Mode</div>
                    <div>PAGE: {page.pageNumber}</div>
                    <div>{formattedDateWithTime}</div>
                  </div>
                </div>

                {/* Central Block Container */}
                <div className="flex-1 my-3 bg-[#12335f] rounded p-6 flex items-center justify-center overflow-hidden">
                  <img
                    src={page.canvasDataUrl}
                    alt={`Page ${page.pageNumber}`}
                    className="max-w-full max-h-full object-contain rounded-sm m-2"
                    style={{ display: "block" }}
                  />
                </div>

                {/* Footer */}
                <div className="border-t border-slate-200 pt-2 text-center">
                  <p className="text-[7.5px] leading-relaxed text-slate-500 font-normal px-1">
                    "DIGITAL EVIDENCE เป็นเพียงการเครื่องมืออำนวยความสะดวกให้กับผู้ว่าจ้าง โดยไม่ได้ดัดแปลง แก้ไข เพิ่ม-ลบ เนื้อหา จากต้นฉบับใดๆ และไม่มีส่วนเกี่ยวข้องใดๆกับเนื้อหาในเอกสาร เป็นเพียงเครื่องมือที่ทำงานเกี่ยวกับระบบไฟล์ เอกสารแบบอิเล็กทรอนิกส์ เท่านั้น"
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : isGenerated && uploadedFiles.length > 0 ? (
          <div className="w-full space-y-6 flex flex-col items-center py-2">
            {uploadedFiles.map((file, idx) => (
              <div
                key={idx}
                className="w-full max-w-[480px] aspect-[210/297] bg-white text-slate-900 shadow-2xl rounded-sm p-4 flex flex-col justify-between border border-slate-200 select-none"
              >
                {/* Header */}
                <div className="flex items-end justify-between border-b border-slate-200 pb-2">
                  <div className="flex flex-col items-start space-y-1">
                    <div className="h-8 w-8 rounded border border-slate-200 bg-slate-50 p-0.5 flex items-center justify-center">
                      <img src={projectLogo} alt="Logo" className="h-full w-full object-contain" />
                    </div>
                    <div className="flex flex-col text-left leading-none space-y-0.5">
                      <span className="text-[7.5px] font-black text-slate-800">หลักฐานดิจิทัล</span>
                      <span className="text-[7.5px] font-black tracking-tight text-slate-800">DIGITAL EVIDENCE</span>
                    </div>
                  </div>
                  <div className="text-right text-[9px] text-slate-800 font-mono space-y-0.5 leading-tight">
                    <div className="font-bold">Slip Mode</div>
                    <div>PAGE: {idx + 1}</div>
                    <div>{formattedDateWithTime}</div>
                  </div>
                </div>

                {/* Central Block Container */}
                <div className="flex-1 my-3 bg-[#12335f] rounded p-6 flex items-center justify-center overflow-hidden">
                  <img
                    src={file.url}
                    alt={file.name}
                    className="max-w-full max-h-full object-contain rounded-sm m-2"
                    style={{ display: "block" }}
                  />
                </div>

                {/* Footer */}
                <div className="border-t border-slate-200 pt-2 text-center">
                  <p className="text-[7.5px] leading-relaxed text-slate-500 font-normal px-1">
                    "DIGITAL EVIDENCE เป็นเพียงการเครื่องมืออำนวยความสะดวกให้กับผู้ว่าจ้าง โดยไม่ได้ดัดแปลง แก้ไข เพิ่ม-ลบ เนื้อหา จากต้นฉบับใดๆ และไม่มีส่วนเกี่ยวข้องใดๆกับเนื้อหาในเอกสาร เป็นเพียงเครื่องมือที่ทำงานเกี่ยวกับระบบไฟล์ เอกสารแบบอิเล็กทรอนิกส์ เท่านั้น"
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Placeholder Canvas */
          <div className="flex h-full w-full max-w-[500px] flex-col items-center justify-center rounded-xl border border-dashed border-cyan-500/20 bg-cyan-950/10 p-8 text-center my-auto">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-500/30 bg-cyan-950/40 p-2 shadow-[0_0_20px_rgba(0,163,255,0.2)]">
              <ImageWithFallback src={projectLogo} alt="Digital Evidence Logo" className="h-full w-full object-contain" />
            </div>
            <h3 className="mt-4 text-base font-bold uppercase tracking-wider text-slate-200">
              DOCUMENT PREVIEW CANVAS
            </h3>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              {activeMode === "chat"
                ? "อัปโหลดภาพแชทและกด PROCESS เพื่อสร้างเอกสาร A4 สำหรับส่งออก"
                : "อัปโหลดภาพสลิปธนาคารและกด PROCESS เพื่อสกัดข้อมูลและตรวจสอบความถูกต้อง"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
