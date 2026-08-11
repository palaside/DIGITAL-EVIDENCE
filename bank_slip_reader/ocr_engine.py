"""
bank_slip_reader/ocr_engine.py
OCR Engine รองรับ: rule-based (ฟรี), tesseract (ฟรี), openai, google-vision
"""
import io
import base64
import os
import asyncio
from pathlib import Path
from typing import Optional


class OCREngine:
    """
    Unified OCR Engine รองรับหลาย provider:
      - "rule"     : ไม่ต้องการ API key (ใช้กับ text input)
      - "tesseract": ฟรี, ต้องติดตั้ง tesseract-ocr + pytesseract
      - "openai"   : GPT-4o Vision (ต้องมี OPENAI_API_KEY)
      - "google"   : Google Cloud Vision (ต้องมี credentials json)
    """

    def __init__(self, provider: str = "rule", api_key: Optional[str] = None):
        self.provider = provider.lower()
        self.api_key = api_key

    # ─── Public ────────────────────────────────────────────────────────────
    async def extract_text(self, source: str) -> str:
        """
        Extract text จาก:
          - path ของไฟล์รูปภาพ (.jpg/.png ฯลฯ)
          - ข้อความ OCR ที่ส่งมาโดยตรง (ถ้า provider == "rule")
        """
        if self.provider == "rule":
            # รับ text โดยตรง ไม่มีการอ่านรูป
            return source

        # PDF Handling Block using pymupdf (fitz)
        if Path(source).suffix.lower() == ".pdf":
            try:
                import fitz  # pymupdf
                import tempfile
                # Open PDF
                doc = fitz.open(source)
                texts = []
                for page_number in range(len(doc)):
                    page = doc.load_page(page_number)
                    pix = page.get_pixmap(dpi=300)
                    tmp_img = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
                    tmp_path = tmp_img.name
                    tmp_img.close()
                    try:
                        pix.save(tmp_path)
                        # Perform OCR on this page image
                        if self.provider == "google":
                            page_text = await self._google_vision_ocr(tmp_path)
                        elif self.provider == "tesseract":
                            page_text = self._tesseract_ocr(tmp_path)
                        elif self.provider == "openai":
                            page_text = await self._openai_vision_ocr(tmp_path)
                        else:
                            page_text = ""
                        texts.append(page_text)
                    finally:
                        if os.path.exists(tmp_path):
                            os.remove(tmp_path)
                return "\n\n".join(texts)
            except Exception as e:
                raise RuntimeError(f"PDF conversion failed: {e}")

        if self.provider == "tesseract":
            return self._tesseract_ocr(source)

        if self.provider == "openai":
            return await self._openai_vision_ocr(source)

        if self.provider == "google":
            return await self._google_vision_ocr(source)

        raise ValueError(f"Unknown OCR provider: {self.provider}")

    # ─── Tesseract (ฟรี) ───────────────────────────────────────────────────
    def _tesseract_ocr(self, image_path: str) -> str:
        try:
            import pytesseract
            from PIL import Image, ImageFilter, ImageEnhance
        except ImportError:
            raise RuntimeError(
                "ต้องติดตั้ง pytesseract และ Pillow: pip install pytesseract pillow\n"
                "และติดตั้ง Tesseract OCR + Thai language pack"
            )

        img = Image.open(image_path).convert("L")

        # เพิ่ม contrast + ลด noise
        img = ImageEnhance.Contrast(img).enhance(2.0)
        img = img.filter(ImageFilter.MedianFilter(size=3))

        # ขยายรูปถ้าเล็กเกินไป
        if img.width < 800:
            ratio = 800 / img.width
            from PIL import Image as PILImage
            img = img.resize(
                (int(img.width * ratio), int(img.height * ratio)),
                PILImage.LANCZOS,
            )

        return pytesseract.image_to_string(img, lang="tha+eng", config="--psm 6 --oem 3")

    # ─── OpenAI GPT-4o Vision ──────────────────────────────────────────────
    async def _openai_vision_ocr(self, image_path: str) -> str:
        try:
            from openai import AsyncOpenAI
        except ImportError:
            raise RuntimeError("ต้องติดตั้ง openai: pip install openai")

        if not self.api_key:
            raise RuntimeError("ต้องระบุ OPENAI_API_KEY")

        client = AsyncOpenAI(api_key=self.api_key)

        ext = Path(image_path).suffix.lower()
        media_type = {
            ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
            ".png": "image/png",  ".gif": "image/gif",
            ".webp": "image/webp",
        }.get(ext, "image/jpeg")

        with open(image_path, "rb") as f:
            b64 = base64.b64encode(f.read()).decode()

        resp = await client.chat.completions.create(
            model="gpt-4o",
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:{media_type};base64,{b64}", "detail": "high"},
                    },
                    {
                        "type": "text",
                        "text": (
                            "อ่านข้อความทั้งหมดจากสลิปธนาคารนี้ให้ครบถ้วน "
                            "รวมถึง: ชื่อธนาคาร, วันที่, เวลา, จำนวนเงิน, "
                            "เลขที่อ้างอิง, ชื่อผู้โอน, เลขบัญชีผู้โอน, "
                            "ชื่อผู้รับ, เลขบัญชีผู้รับ "
                            "ตอบเป็นข้อความที่อ่านได้ครบถ้วนที่สุด"
                        ),
                    },
                ],
            }],
            max_tokens=1000,
        )
        return resp.choices[0].message.content

    # ─── Google Cloud Vision ───────────────────────────────────────────────
    async def _google_vision_ocr(self, image_path: str) -> str:
        api_key = (
            self.api_key
            or os.getenv("GOOGLE_VISION_API_KEY")
            or os.getenv("GOOGLE_API_KEY")
        )
        if api_key:
            import base64
            import requests

            with open(image_path, "rb") as f:
                img_b64 = base64.b64encode(f.read()).decode("utf-8")

            url = f"https://vision.googleapis.com/v1/images:annotate?key={api_key}"
            payload = {
                "requests": [
                    {
                        "image": {"content": img_b64},
                        "features": [{"type": "DOCUMENT_TEXT_DETECTION"}],
                    }
                ]
            }
            try:
                resp = requests.post(url, json=payload, timeout=30)
                if resp.status_code == 200:
                    res_json = resp.json()
                    responses = res_json.get("responses", [])
                    if responses and "fullTextAnnotation" in responses[0]:
                        return responses[0]["fullTextAnnotation"]["text"]
                    if responses and "error" in responses[0]:
                        raise RuntimeError(f"Google Vision API error: {responses[0]['error'].get('message')}")
            except Exception as req_err:
                print(f"[Google Vision REST API Warning] {req_err}. Trying gRPC Client fallback...")

        try:
            from google.cloud import vision
            client = vision.ImageAnnotatorClient()
            with open(image_path, "rb") as f:
                content = f.read()
            image = vision.Image(content=content)
            response = client.document_text_detection(image=image)
            if response.error.message:
                raise RuntimeError(f"Google Vision Error: {response.error.message}")
            return response.full_text_annotation.text
        except Exception as e:
            raise RuntimeError(f"Google Cloud Vision OCR failed: {e}")
