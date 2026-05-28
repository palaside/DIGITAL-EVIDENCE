import re
from typing import Dict, Any

class ThaiSlipOCR:
    def __init__(self):
        # Lazily load reader only when needed
        self.reader = None

    def _get_reader(self):
        if self.reader is None:
            import easyocr
            # Load English and Thai languages
            self.reader = easyocr.Reader(['th', 'en'], gpu=False)
        return self.reader

    def extract_text(self, preprocessed_img) -> str:
        """Runs EasyOCR on preprocessed image and merges outputs into a single text block."""
        reader = self._get_reader()
        results = reader.readtext(preprocessed_img)
        # Sort vertically and horizontally
        results = sorted(results, key=lambda x: (x[0][0][1], x[0][0][0]))
        text_lines = [r[1] for r in results]
        return "\n".join(text_lines)

    def parse_fields(self, full_text: str) -> Dict[str, Any]:
        """Parses bank receipts using advanced regular expressions."""
        parsed_data = {
            "bank_name": "UNKNOWN",
            "transaction_date": "UNKNOWN",
            "sender_name": "UNKNOWN",
            "receiver_name": "UNKNOWN",
            "amount": 0.0,
            "qr_payload": "UNKNOWN"
        }

        lines = [line.strip() for line in full_text.split("\n") if line.strip()]

        # 1. Identify Bank Name
        bank_keywords = {
            "KASIKORNBANK": ["kbank", "kasikorn", "กสิกร", "กสิกรไทย"],
            "SCB": ["scb", "ไทยพาณิชย์", "siam commercial"],
            "Krungthai": ["krungthai", "ktb", "กรุงไทย"],
            "Bangkok Bank": ["bangkok bank", "bbl", "กรุงเทพ"],
            "Krungsri": ["krungsri", "bay", "กรุงศรี"]
        }

        for bank, keys in bank_keywords.items():
            for key in keys:
                if re.search(key, full_text, re.IGNORECASE):
                    parsed_data["bank_name"] = bank
                    break

        # 2. Extract Amount Transferred
        # Matches patterns like "4,500.00 THB", "จำนวนเงิน 100.00 บาท", "Amount: 1,234.50"
        amount_match = re.search(r'(?:จำนวนเงิน|amount|บาท|thb)?\s*([\d,]+\.\d{2})\s*(?:บาท|thb)?', full_text, re.IGNORECASE)
        if amount_match:
            try:
                parsed_data["amount"] = float(amount_match.group(1).replace(",", ""))
            except ValueError:
                pass

        # 3. Extract Sender & Receiver
        # Looks for keywords like "นาย", "นาง", "นางสาว", "company", "co., ltd."
        name_patterns = [
            r'(?:นาย|นาง|นางสาว|mr\.|mrs\.|ms\.)\s*([a-zA-Zก-๙\s]+)',
            r'(?:จาก|from|sender)\s*:\s*([a-zA-Zก-๙\s]+)',
            r'(?:ไปยัง|to|receiver)\s*:\s*([a-zA-Zก-๙\s]+)'
        ]
        
        found_names = []
        for pat in name_patterns:
            matches = re.finditer(pat, full_text, re.IGNORECASE)
            for m in matches:
                name = m.group(1).strip()
                if len(name) > 3 and name not in found_names:
                    found_names.append(name)

        if len(found_names) >= 1:
            parsed_data["sender_name"] = found_names[0]
        if len(found_names) >= 2:
            parsed_data["receiver_name"] = found_names[1]

        # 4. Extract Date / Time
        date_pattern = r'(\d{1,2}\s*(?:ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s*\d{2,4}(?:\s*\d{2}:\d{2}(?::\d{2})?)?)'
        date_match = re.search(date_pattern, full_text, re.IGNORECASE)
        if date_match:
            parsed_data["transaction_date"] = date_match.group(1)

        # 5. Extract QR Code payload simulation
        qr_match = re.search(r'000201[0-9a-zA-Z]+', full_text)
        if qr_match:
            parsed_data["qr_payload"] = qr_match.group(0)

        return parsed_data
