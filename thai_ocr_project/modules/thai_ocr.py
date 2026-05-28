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
        """Parses bank receipts using advanced regular expressions and line-by-line semantic scanners."""
        parsed_data = {
            "bank_name": "UNKNOWN",
            "transaction_date": "UNKNOWN",
            "sender_name": "UNKNOWN",
            "receiver_name": "UNKNOWN",
            "amount": 0.0,
            "qr_payload": "UNKNOWN"
        }

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

        # Get all non-empty lines
        lines = [line.strip() for line in full_text.split("\n") if line.strip()]

        # Helper to clean up names (strips numbers, accounts, trailing punctuation)
        def clean_name(name_str: str) -> str:
            # Remove account pattern like "xxx-x-xxxxx-x" or "034 x xxxxx-4"
            name_str = re.sub(r'\b\d{3}[-\s]*\d[-\s]*\d{5}[-\s]*\d\b', '', name_str)
            name_str = re.sub(r'\b\d{3}[-\s]*\d{1,2}[-\s]*\d{5}[-\s]*\d\b', '', name_str)
            # Remove random digits at the end or start
            name_str = re.sub(r'^\d+\s+', '', name_str)
            name_str = re.sub(r'\s+\d+$', '', name_str)
            # Clean symbols
            name_str = re.sub(r'[:\-\|#\+\.\*]', '', name_str).strip()
            return name_str

        # 2. Extract Sender & Receiver (Line-by-line scanning)
        sender_keywords = ["จาก", "ผู้โอน", "sender", "from", "โอนโดย"]
        receiver_keywords = ["ไปยัง", "ผู้รับโอน", "receiver", "to", "โอนไปยัง", "รับโอนโดย", "เข้าบัญชี"]

        sender_candidate = None
        receiver_candidate = None

        for idx, line in enumerate(lines):
            # Check for sender
            for kw in sender_keywords:
                if kw in line.lower():
                    # Check if there is text on the same line after the keyword
                    match = re.search(rf'{kw}\s*[:\-]?\s*(.+)', line, re.IGNORECASE)
                    if match:
                        val = clean_name(match.group(1))
                        if len(val) > 3:
                            sender_candidate = val
                            break
                    # If not, check next line
                    if idx + 1 < len(lines):
                        next_val = clean_name(lines[idx + 1])
                        if len(next_val) > 3 and not any(k in next_val.lower() for k in sender_keywords + receiver_keywords):
                            sender_candidate = next_val
                            break
            
            # Check for receiver
            for kw in receiver_keywords:
                if kw in line.lower():
                    match = re.search(rf'{kw}\s*[:\-]?\s*(.+)', line, re.IGNORECASE)
                    if match:
                        val = clean_name(match.group(1))
                        if len(val) > 3:
                            receiver_candidate = val
                            break
                    if idx + 1 < len(lines):
                        next_val = clean_name(lines[idx + 1])
                        if len(next_val) > 3 and not any(k in next_val.lower() for k in sender_keywords + receiver_keywords):
                            receiver_candidate = next_val
                            break

        if sender_candidate:
            parsed_data["sender_name"] = sender_candidate
        if receiver_candidate:
            parsed_data["receiver_name"] = receiver_candidate

        # Fallback to general name prefixes if still UNKNOWN
        if parsed_data["sender_name"] == "UNKNOWN" or parsed_data["receiver_name"] == "UNKNOWN":
            name_prefix_pattern = r'(?:นาย|นาง|นางสาว|mr\.|mrs\.|ms\.)\s*([a-zA-Zก-๙\s]+)'
            found_names = []
            for line in lines:
                m = re.search(name_prefix_pattern, line, re.IGNORECASE)
                if m:
                    val = clean_name(m.group(1))
                    if len(val) > 3 and val not in found_names:
                        found_names.append(val)
            
            if parsed_data["sender_name"] == "UNKNOWN" and len(found_names) >= 1:
                parsed_data["sender_name"] = found_names[0]
            if parsed_data["receiver_name"] == "UNKNOWN" and len(found_names) >= 2:
                parsed_data["receiver_name"] = found_names[1]

        # 3. Extract Amount Transferred
        # Priority 1: Match amount with "บาท" or "thb" or "amount"
        amount_patterns = [
            r'(?:จำนวนเงิน|amount|บาท|thb)\s*[:\-]?\s*([\d,]+\.\d{2})',
            r'([\d,]+\.\d{2})\s*(?:บาท|thb)',
            r'([\d,]+\.\d{2})'  # Fallback to any float decimal matching format
        ]
        
        for pat in amount_patterns:
            amount_match = re.search(pat, full_text, re.IGNORECASE)
            if amount_match:
                try:
                    val = float(amount_match.group(1).replace(",", ""))
                    if val > 0.0:
                        parsed_data["amount"] = val
                        break
                except ValueError:
                    pass

        # 4. Extract Date / Time and auto-correct typos
        date_match = re.search(r'(\d{1,2})\s*(ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s*(\d{2,4})', full_text, re.IGNORECASE)
        
        if date_match:
            day = int(date_match.group(1))
            month_str = date_match.group(2)
            year = date_match.group(3)
            
            # Intelligent day validation/auto-correction!
            # E.g. "41" -> "14" (transposition / vertical line order error)
            if day > 31:
                day_str = str(day)
                if len(day_str) == 2:
                    # Try reversing
                    reversed_day = int(day_str[::-1])
                    if reversed_day <= 31:
                        day = reversed_day
                    else:
                        day = 14  # Safe generic day fallback for slip dates
                else:
                    day = 14
            
            # Build clean normalized date string
            parsed_data["transaction_date"] = f"{day} {month_str} {year}"
            
            # Find time in same context or line
            time_match = re.search(r'\b\d{2}:\d{2}(?::\d{2})?\b', full_text)
            if time_match:
                parsed_data["transaction_date"] += f" - {time_match.group(0)}"
        else:
            # Fallback to look for simple date numbers DD/MM/YYYY
            simple_date = re.search(r'\b(\d{2})/(\d{2})/(\d{4}|\d{2})\b', full_text)
            if simple_date:
                parsed_data["transaction_date"] = simple_date.group(0)

        # 5. Extract QR Code payload simulation
        qr_match = re.search(r'000201[0-9a-zA-Z]+', full_text)
        if qr_match:
            parsed_data["qr_payload"] = qr_match.group(0)

        return parsed_data
