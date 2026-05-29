# modules/slip_parser_v2.py
"""
Slip Parser V2 - Full extraction for Thai bank slips

สกัดข้อมูลจากข้อความ OCR สลิปธนาคารไทย:
  - ชื่อธนาคาร
  - วันที่/เวลาทำรายการ
  - ชื่อผู้โอน (Sender)
  - ชื่อผู้รับ (Receiver)
  - จำนวนเงิน
  - เลขอ้างอิง (Ref ID)
"""

import re
from typing import Dict, Tuple, Optional
from dataclasses import dataclass, asdict, field
import json

# ═══════════════════════════════════════════════
#  ธนาคาร lookup table
# ═══════════════════════════════════════════════
THAI_BANKS = {
    # keyword → (code, display_name)
    "กสิกรไทย":        ("KBANK", "ธนาคารกสิกรไทย"),
    "กสิกร":           ("KBANK", "ธนาคารกสิกรไทย"),
    "kbank":           ("KBANK", "ธนาคารกสิกรไทย"),
    "ไทยพาณิชย์":     ("SCB",   "ธนาคารไทยพาณิชย์"),
    "ไทยพาณิช":       ("SCB",   "ธนาคารไทยพาณิชย์"),
    "scb":             ("SCB",   "ธนาคารไทยพาณิชย์"),
    "กรุงไทย":         ("KTB",   "ธนาคารกรุงไทย"),
    "ktb":             ("KTB",   "ธนาคารกรุงไทย"),
    "กรุงเทพ":         ("BBL",   "ธนาคารกรุงเทพ"),
    "bbl":             ("BBL",   "ธนาคารกรุงเทพ"),
    "กรุงศรี":         ("BAY",   "ธนาคารกรุงศรีอยุธยา"),
    "กรุงศรีอยุธยา":   ("BAY",   "ธนาคารกรุงศรีอยุธยา"),
    "bay":             ("BAY",   "ธนาคารกรุงศรีอยุธยา"),
    "ทหารไทย":         ("TTB",   "ธนาคารทหารไทยธนชาต"),
    "ทหารไทยธนชาต":    ("TTB",   "ธนาคารทหารไทยธนชาต"),
    "ttb":             ("TTB",   "ธนาคารทหารไทยธนชาต"),
    "ออมสิน":          ("GSB",   "ธนาคารออมสิน"),
    "gsb":             ("GSB",   "ธนาคารออมสิน"),
    "ธอส":             ("GHB",   "ธนาคารอาคารสงเคราะห์"),
    "ghb":             ("GHB",   "ธนาคารอาคารสงเคราะห์"),
    "ยูโอบี":          ("UOB",   "ธนาคารยูโอบี"),
    "uob":             ("UOB",   "ธนาคารยูโอบี"),
    "ทิสโก้":          ("TISCO", "ธนาคารทิสโก้"),
    "tisco":           ("TISCO", "ธนาคารทิสโก้"),
    "lh bank":         ("LHB",   "ธนาคารแลนด์แอนด์เฮาส์"),
    "แลนด์แอนด์เฮาส์": ("LHB",  "ธนาคารแลนด์แอนด์เฮาส์"),
    "ซีไอเอ็มบี":      ("CIMB",  "ธนาคารซีไอเอ็มบีไทย"),
    "cimb":            ("CIMB",  "ธนาคารซีไอเอ็มบีไทย"),
    "พร้อมเพย์":       ("PROMPTPAY", "พร้อมเพย์"),
    "promptpay":       ("PROMPTPAY", "พร้อมเพย์"),
}

# ═══════════════════════════════════════════════
#  คำที่ใช้ระบุบริบท sender/receiver
# ═══════════════════════════════════════════════
SENDER_LABELS = [
    "จาก", "ผู้โอน", "โอนจาก", "from", "sender",
    "ชื่อบัญชี", "ชื่อเจ้าของบัญชีต้นทาง",
]
RECEIVER_LABELS = [
    "ถึง", "ผู้รับ", "โอนไปยัง", "to", "receiver",
    "ชื่อบัญชีปลายทาง", "ชื่อผู้รับโอน",
]
AMOUNT_LABELS = [
    "จำนวน", "จำนวนเงิน", "amount", "baht", "บาท", "thb",
    "ยอดโอน", "ยอดชำระ", "ยอดรวม",
]
DATE_LABELS = [
    "วันที่", "date", "เวลา", "time", "วันเวลา", "ทำรายการ",
]
REF_LABELS = [
    "เลขอ้างอิง", "ref", "reference", "รายการ", "เลขที่รายการ",
    "transaction id", "หมายเลขอ้างอิง", "รหัสอ้างอิง",
]


# ═══════════════════════════════════════════════
#  Data class
# ═══════════════════════════════════════════════
@dataclass
class SlipData:
    bank_code: str = "Unknown"
    bank_name: str = "Unknown"
    sender_name: str = "Unknown"
    receiver_name: str = "Unknown"
    amount: float = 0.0
    currency: str = "THB"
    date: str = "Unknown"
    time: str = "Unknown"
    ref_id: str = "Unknown"
    raw_text: str = ""
    confidence: float = 0.0

    def to_dict(self) -> dict:
        return asdict(self)

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), ensure_ascii=False, indent=2)


# ═══════════════════════════════════════════════
#  Main Parser
# ═══════════════════════════════════════════════
class SlipParserV2:
    """Full-featured slip parser for Thai bank slips."""

    def __init__(self, debug: bool = False):
        self.debug = debug

    # ─────────────────────────────
    #  1. Bank name
    # ─────────────────────────────
    def _find_bank(self, text: str) -> Tuple[str, str]:
        """Return (bank_code, bank_name). Longest keyword match wins."""
        txt_lower = text.lower()
        best: Optional[Tuple[str, str]] = None
        best_len = 0
        for keyword, (code, name) in THAI_BANKS.items():
            if keyword.lower() in txt_lower and len(keyword) > best_len:
                best = (code, name)
                best_len = len(keyword)
        return best if best else ("Unknown", "Unknown")

    # ─────────────────────────────
    #  2. Amount
    # ─────────────────────────────
    def _find_amount(self, lines: list[str]) -> float:
        """Extract the transaction amount (largest number that looks like money)."""
        # Pattern: 1,234.56 or 1234.56 or 1,234
        pattern = re.compile(r'[\d,]+\.?\d{0,2}')
        candidates = []

        for i, line in enumerate(lines):
            line_lower = line.lower()
            # If line contains amount-related keywords, prioritize it
            near_label = any(kw in line_lower for kw in AMOUNT_LABELS)
            matches = pattern.findall(line)
            for m in matches:
                try:
                    val = float(m.replace(',', ''))
                    # Filter out years (e.g. 2567, 2024) and small noise numbers
                    if val > 0 and not (2000 <= val <= 2100):
                        candidates.append((val, 10 if near_label else 1))
                except ValueError:
                    pass

        if not candidates:
            return 0.0
        # Pick highest-priority (label-adjacent) value; break ties by larger amount
        candidates.sort(key=lambda x: (x[1], x[0]), reverse=True)
        return candidates[0][0]

    # ─────────────────────────────
    #  3. Date & Time
    # ─────────────────────────────
    def _find_date_time(self, text: str) -> Tuple[str, str]:
        """Extract date and time from OCR text."""
        date_val = "Unknown"
        time_val = "Unknown"

        # Thai Buddhist Era date patterns  (dd/mm/yy หรือ dd/mm/yyyy)
        be_full   = re.search(r'(\d{1,2})[/\-\.](\d{1,2})[/\-\.](\d{4})', text)
        be_short  = re.search(r'(\d{1,2})[/\-\.](\d{1,2})[/\-\.](\d{2})', text)
        # Written Thai date: "15 พฤษภาคม 2567"
        thai_written = re.search(
            r'(\d{1,2})\s*(ม\.?ค\.?|ก\.?พ\.?|มี\.?ค\.?|เม\.?ย\.?|พ\.?ค\.?|มิ\.?ย\.?|'
            r'ก\.?ค\.?|ส\.?ค\.?|ก\.?ย\.?|ต\.?ค\.?|พ\.?ย\.?|ธ\.?ค\.?|'
            r'มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|'
            r'กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม)\s*(\d{2,4})',
            text
        )

        if be_full:
            d, m, y = be_full.groups()
            # Convert BE → CE if year > 2100
            yr = int(y)
            if yr > 2100:
                yr -= 543
            date_val = f"{int(d):02d}/{int(m):02d}/{yr}"
        elif be_short:
            d, m, y = be_short.groups()
            yr = int(y) + (2000 if int(y) < 70 else 1900)
            date_val = f"{int(d):02d}/{int(m):02d}/{yr}"
        elif thai_written:
            d, month_str, y = thai_written.groups()
            yr = int(y)
            if yr > 2100:
                yr -= 543
            date_val = f"{int(d):02d} {month_str.strip()} {yr}"

        # Time: HH:MM or HH:MM:SS
        time_match = re.search(r'(\d{1,2}):(\d{2})(?::(\d{2}))?', text)
        if time_match:
            hh, mm, ss = time_match.groups()
            time_val = f"{int(hh):02d}:{mm}" + (f":{ss}" if ss else "")

        return date_val, time_val

    # ─────────────────────────────
    #  4. Sender & Receiver
    # ─────────────────────────────
    def _find_names(self, lines: list[str]) -> Tuple[str, str]:
        """Extract sender and receiver names using context labels."""
        sender = "Unknown"
        receiver = "Unknown"

        # Thai name pattern: ชื่อ-นามสกุล (Thai chars + optional mask ***)
        thai_name = re.compile(
            r'[ก-๙a-zA-Z][ก-๙a-zA-Zเแโใไ\s\.\*x]+(?:\s+[ก-๙a-zA-Z\*x]+){1,4}'
        )
        # Masked name pattern: นาย***  or นาย xxx
        masked = re.compile(r'[ก-๙]{2,}[\*xX]+[ก-๙\s\*xX]*')

        def _extract_name_from_line(line: str) -> Optional[str]:
            # Remove label prefix (e.g. "ผู้โอน: ")
            stripped = re.sub(r'^[^:：]*[:：]\s*', '', line).strip()
            # Try masked first
            m = masked.search(stripped) or thai_name.search(stripped)
            if m:
                name = m.group(0).strip()
                # Filter out bank names and short noise
                if len(name) >= 2 and not any(bk in name for bk in ["ธนาคาร", "Bank"]):
                    return name
            return None

        for i, line in enumerate(lines):
            line_lower = line.lower().strip()

            if any(lbl in line_lower for lbl in SENDER_LABELS):
                # Name may be on same line or next line
                name = _extract_name_from_line(line)
                if not name and i + 1 < len(lines):
                    name = _extract_name_from_line(lines[i + 1])
                if name and sender == "Unknown":
                    sender = name

            if any(lbl in line_lower for lbl in RECEIVER_LABELS):
                name = _extract_name_from_line(line)
                if not name and i + 1 < len(lines):
                    name = _extract_name_from_line(lines[i + 1])
                if name and receiver == "Unknown":
                    receiver = name

        return sender, receiver

    # ─────────────────────────────
    #  5. Reference ID
    # ─────────────────────────────
    def _find_ref_id(self, text: str) -> str:
        """Extract transaction reference / slip ID."""
        # Common patterns: N0067719, TH910480E6, long digit sequences, etc.
        patterns = [
            r'(?:ref|reference|เลขอ้างอิง|หมายเลข|รายการ)[^\w]*([\w]{6,30})',
            r'\b([A-Z]{1,3}\d{6,20})\b',          # N0067719, TH123456
            r'\b(\d{15,22})\b',                    # long numeric ref
        ]
        for pat in patterns:
            m = re.search(pat, text, re.IGNORECASE)
            if m:
                return m.group(1).strip()
        return "Unknown"

    # ─────────────────────────────
    #  Main parse
    # ─────────────────────────────
    def parse(self, ocr_result: Dict, bank_code: str = "", qr_data: str = "") -> SlipData:
        """
        Parse OCR result dict and return fully populated SlipData.
        Expected input: { "full_text": "...", "details": [...] }
        """
        slip = SlipData()
        raw = ocr_result.get("full_text", "")
        if isinstance(ocr_result, str):
            raw = ocr_result  # allow passing raw string directly
        slip.raw_text = raw

        lines = [ln.strip() for ln in raw.splitlines() if ln.strip()]

        # 1. Bank name
        code, name = self._find_bank(raw)
        slip.bank_code = bank_code or code
        slip.bank_name = name

        # 2. Amount
        slip.amount = self._find_amount(lines)

        # 3. Date / Time
        slip.date, slip.time = self._find_date_time(raw)

        # 4. Sender / Receiver
        slip.sender_name, slip.receiver_name = self._find_names(lines)

        # 5. Ref ID
        slip.ref_id = self._find_ref_id(raw)

        # 6. Simple confidence heuristic
        found = sum([
            slip.bank_name != "Unknown",
            slip.amount > 0,
            slip.date != "Unknown",
            slip.sender_name != "Unknown",
            slip.receiver_name != "Unknown",
            slip.ref_id != "Unknown",
        ])
        slip.confidence = round(found / 6, 2)

        if self.debug:
            print("🔎 Parse result:")
            print(slip.to_json())

        return slip


# ═══════════════════════════════════════════════
#  Quick test
# ═══════════════════════════════════════════════
if __name__ == "__main__":
    sample = {
        "full_text": (
            "ธนาคารกรุงไทย\n"
            "โอนเงินสำเร็จ\n"
            "วันที่ 15/05/2567 เวลา 14:32\n"
            "ผู้โอน: นายสมชาย ใจดี\n"
            "ผู้รับ: นางสาวมณี ดีมาก\n"
            "จำนวนเงิน 4,500.00 บาท\n"
            "เลขอ้างอิง N0067719\n"
        )
    }
    parser = SlipParserV2(debug=True)
    result = parser.parse(sample)
    print("\nResult JSON:\n" + result.to_json())
