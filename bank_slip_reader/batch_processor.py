"""
bank_slip_reader/batch_processor.py
ประมวลผลสลิปหลายใบพร้อมกัน (Async Batch Processing)
"""
import asyncio
from pathlib import Path

# PDF generation imports (optional, will be used if reportlab is installed)
try:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import inch
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
    from reportlab.lib import colors
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
except ImportError:
    # reportlab not installed; PDF export will be disabled until installed.
    A4 = inch = None
    SimpleDocTemplate = Table = TableStyle = Paragraph = None
    colors = None
    pdfmetrics = None
    TTFont = None
import time
import json
from pathlib import Path
from typing import List, Optional

from .models import BankSlipData, BankName
from .ocr_engine import OCREngine
from .slip_parser import SlipParser


class BatchProcessor:
    """
    ประมวลผลสลิปหลายใบพร้อมกัน
    สนับสนุน 2 mode:
      - production  : Google Vision OCR + GPT-4o-mini parser
      - free        : Rule-based เท่านั้น (ไม่ต้องการ API)
    """

    def __init__(
        self,
        openai_api_key: Optional[str] = None,
        google_credentials: Optional[str] = None,   # path to JSON credentials
        mode: str = "production",                    # "production" | "free"
        max_concurrent: int = 5,
    ):
        self.mode = mode

        # OCR provider
        if mode == "production":
            if google_credentials:
                import os
                os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = google_credentials
            ocr_provider = "google"
        else:
            ocr_provider = "rule"

        self.ocr  = OCREngine(provider=ocr_provider, api_key=openai_api_key)
        self.parser = SlipParser(
            openai_api_key=openai_api_key,
            mode="ai" if (mode == "production" and openai_api_key) else "rule_based",
        )
        self.semaphore = asyncio.Semaphore(max_concurrent)

    # ─── Single ────────────────────────────────────────────────────────────────
    async def process_single(self, source: str, file_name: str = "") -> BankSlipData:
        """
        ประมวลผลสลิปเดียว
        source: path ของไฟล์รูป (production) หรือ raw OCR text (free)
        """
        async with self.semaphore:
            t0 = time.time()
            name = file_name or Path(source).name if Path(source).exists() else "input"

            try:
                print(f"📄 ประมวลผล: {name}")
                raw_text = await self.ocr.extract_text(source)
                slip = await self.parser.parse(raw_text, file_name=name)
                slip.processing_time = time.time() - t0
                print(
                    f"  ✅ {name} "
                    f"({slip.processing_time:.2f}s) "
                    f"→ {slip.bank_name.value} "
                    f"| {slip.amount} {slip.currency}"
                )
                return slip

            except Exception as exc:
                print(f"  ❌ {name}: {exc}")
                return BankSlipData(
                    file_name=name,
                    success=False,
                    error_message=str(exc),
                    processing_time=time.time() - t0,
                )

    # ─── Batch ─────────────────────────────────────────────────────────────────
    async def process_batch(self, sources: List[str]) -> List[BankSlipData]:
        """Process multiple slip files and return results."""

        """ประมวลผลหลายสลิปพร้อมกัน"""
        total = len(sources)
        print(f"\n🚀 เริ่มประมวลผล {total} สลิป  (mode: {self.mode})")
        print("─" * 50)

        t0 = time.time()
        results = await asyncio.gather(
            *[self.process_single(src) for src in sources]
        )
        elapsed = time.time() - t0

        ok    = sum(1 for r in results if r.success)
        fail  = total - ok
        avg   = elapsed / total if total else 0

        print("─" * 50)
        print(f"📊 สรุป: ✅ {ok}/{total}  ❌ {fail}/{total}")
        print(f"⏱  รวม {elapsed:.2f}s  เฉลี่ย {avg:.2f}s/สลิป")

        # Export handling moved to caller (e.g., main script) to avoid undefined output_dir

        return list(results)

    # ─── Batch from text list ──────────────────────────────────────────────────
    async def process_text_batch(self, texts: List[str]) -> List[BankSlipData]:
        """รับ list ของ OCR text strings โดยตรง (ไม่ต้องการรูปภาพ)"""
        total = len(texts)
        print(f"\n🚀 ประมวลผล {total} OCR text (rule_based)")
        t0 = time.time()

        results = await asyncio.gather(
            *[self.parser.parse(text, file_name=f"slip_{i+1}") for i, text in enumerate(texts)]
        )
        # set processing_time
        elapsed = time.time() - t0
        for r in results:
            if r.processing_time == 0.0:
                r.processing_time = elapsed / total

        ok = sum(1 for r in results if r.success)
        print(f"✅ เสร็จ {ok}/{total}  ({elapsed:.2f}s)")
        return list(results)

    # ─── Utils ─────────────────────────────────────────────────────────────────
    def scan_directory(self, directory: str) -> List[str]:
        """หาไฟล์รูปทั้งหมดในโฟลเดอร์"""
        exts = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"}
        files = [str(p) for p in Path(directory).rglob("*") if p.suffix.lower() in exts]
        print(f"🔍 พบ {len(files)} ไฟล์รูปใน {directory}")
        return files

    def export_json(self, results: List[BankSlipData], output_path: str) -> dict:
        """Export results to JSON and return data dictionary."""
        """Export ผลลัพธ์เป็น JSON"""
        data = {
            "total":      len(results),
            "successful": sum(1 for r in results if r.success),
            "failed":     sum(1 for r in results if not r.success),
            "results":    [r.to_dict() for r in results],
        }
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"💾 บันทึกที่: {output_path}")
        return data

    def export_pdf(self, results: List[BankSlipData], output_path: str, mode: str = "Slip") -> str:
        """Generate a portrait PDF report with a custom header/footer.
        Parameters:
            results: List of parsed BankSlipData objects.
            output_path: Path where the PDF will be saved.
            mode: Processing mode string (e.g., "Chat" or "Slip").
        Returns the path to the created PDF.
        """
        if SimpleDocTemplate is None:
            raise RuntimeError("reportlab is not installed; cannot export PDF.")
        # Register Thai font if available
        font_name = "Helvetica"
        try:
            font_path = Path(__file__).parent / "fonts" / "THSarabunPSK.ttf"
            if font_path.exists():
                pdfmetrics.registerFont(TTFont("SarabunPSK", str(font_path)))
                font_name = "SarabunPSK"
        except Exception as e:
            print(f"⚠️ Font registration failed: {e}")

        # Determine rows per page (20 as per spec) and total pages
        rows_per_page = 20
        total_rows = len(results)
        total_pages = max(1, ((total_rows - 1) // rows_per_page) + 1)
        # Prepare table data
        header = [
            "ลำดับ", "วันที่", "เวลา", "ชื่อผู้โอน", "จำนวนเงิน",
            "ชื่อธนาคารผู้โอน", "ชื่อผู้รับโอน", "ชื่อธนาคารผู้รับโอน",
            "บันทึกช่วยจำ", "รหัสอ้างอิง"
        ]
        data = [header]
        for idx, slip in enumerate(results, start=1):
            date_str = slip.transaction_date.strftime("%d/%m/%Y") if slip.transaction_date else "-"
            time_str = slip.transaction_time or "-"
            amount_str = f"{slip.amount:,.2f}" if slip.amount is not None else "-"
            row = [
                str(idx), date_str, time_str,
                slip.sender_name or "-",
                amount_str,
                slip.sender_bank or "-",
                slip.receiver_name or "-",
                slip.receiver_bank or "-",
                slip.memo or "-",
                slip.transaction_id or "-",
            ]
            data.append(row)
        # Build PDF
        doc = SimpleDocTemplate(output_path, pagesize=A4,
                                leftMargin=inch, rightMargin=inch,
                                topMargin=inch, bottomMargin=inch)
        elements = []
        table = Table(data, repeatRows=1)
        style = TableStyle([
            ("FONTNAME", (0,0), (-1,-1), font_name),
            ("FONTSIZE", (0,0), (-1,0), 14),
            ("FONTSIZE", (0,1), (-1,-1), 12),
            ("BACKGROUND", (0,0), (-1,0), colors.lightgrey),
            ("ALIGN", (0,0), (-1,0), "CENTER"),
            ("ALIGN", (0,1), (-1,-1), "LEFT"),
            ("GRID", (0,0), (-1,-1), 0.5, colors.grey),
            ("BOTTOMPADDING", (0,0), (-1,0), 6),
        ])
        table.setStyle(style)
        elements.append(table)
        # Header/Footer drawing callback
        def add_page(canvas_obj, doc_obj):
            canvas_obj.saveState()
            # Header background (optional)
            # Find logo file
            logo_path = None
            for ext in [".jpg", ".png", ".jpeg"]:
                p = Path(__file__).parent / "assets" / f"logo{ext}"
                if p.exists():
                    logo_path = p
                    break
            
            if logo_path:
                canvas_obj.drawImage(str(logo_path), doc_obj.leftMargin, doc_obj.height + doc_obj.bottomMargin + 10,
                                      width=60, height=60, preserveAspectRatio=True, mask='auto')
                left_x = doc_obj.leftMargin + 75
            else:
                left_x = doc_obj.leftMargin

            # Text next to logo
            canvas_obj.setFont("Helvetica", 12)
            top_y = doc_obj.height + doc_obj.bottomMargin + 45
            canvas_obj.drawString(left_x, top_y, f"โหมด: {mode}")
            canvas_obj.drawString(left_x, top_y - 14, f"วันที่/เวลา: {time.strftime('%d/%m/%Y %H:%M:%S')}")
            canvas_obj.drawString(left_x, top_y - 28, f"จำนวนหน้า: {total_pages}")
            # Page number on top‑right
            canvas_obj.drawRightString(doc_obj.width + doc_obj.rightMargin, top_y, f"หน้า {canvas_obj.getPageNumber()}")
            # Footer disclaimer
            footer_text = ("DIGITAL EVIDENCE เป็นเพียงเครื่องมืออำนวยความสะดวกทางด้านเอกสาร โดยเป็นเพียงการขยายภาพจากเนื้อหาที่แท้จริง "
                           "ซึ่งไม่มีการดัดแปลง แก้ไข ลบ เพิ่ม หรือทำการใดๆที่มีผลต่อเนื้อหาของภาพ โดยทาง DIGITAL EVIDENCE "
                           "ไม่มีส่วนเกี่ยวข้องใดๆกับคดีที่อยู่ในเนื้อหาและเอกสารนี้เป็นการอำนวยความสะดวกให้กับเจ้าหน้าที่ในชั้นศาล")
            canvas_obj.setFont("Helvetica", 12)
            canvas_obj.drawString(doc_obj.leftMargin, doc_obj.bottomMargin - 30, footer_text)
            canvas_obj.restoreState()
        doc.build(elements, onFirstPage=add_page, onLaterPages=add_page)
        print(f"💾 PDF saved at: {output_path}")
        return output_path

    def save_pdf(self, results: List[BankSlipData], output_path: str, mode: str = "Slip") -> str:
        """Button‑style *Save*: generate PDF and keep it on disk."""
        return self.export_pdf(results, output_path, mode=mode)

    def save_and_open_pdf(self, results: List[BankSlipData], output_path: str, mode: str = "Slip") -> str:
        """Button‑style *Save PDF*: generate PDF then open it with the default viewer."""
        pdf_path = self.export_pdf(results, output_path, mode=mode)
        try:
            import os
            os.startfile(pdf_path)  # Windows only
        except Exception as e:
            print(f"⚠️ Unable to open PDF automatically: {e}")
        return pdf_path
