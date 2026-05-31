import io
import sys
import types
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch


PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))


class _FakeYOLO:
    def __init__(self, *args, **kwargs):
        pass


sys.modules.setdefault("ultralytics", types.SimpleNamespace(YOLO=_FakeYOLO))

import thai_ocr_project.app as app_module


class _FakeRecord:
    def __init__(self, record_id: int):
        self.case_number = f"CASE-{record_id}"
        self.id = record_id
        self.created_at = __import__("datetime").datetime(2026, 6, 1, 12, 0, record_id)


class _FakeParsedSlip:
    def __init__(self, filename: str, memo: str | None):
        self.filename = filename
        self.memo = memo

    def to_dict(self):
        return {
            "bank_name": "ธนาคารกรุงไทย",
            "bank_code": "KTB",
            "bank_confidence": 0.99,
            "transaction_id": f"REF-{self.filename}",
            "amount": 123.45,
            "currency": "THB",
            "transaction_date": "2025-08-11T00:00:00",
            "transaction_time": "20:41",
            "sender": {
                "name": "ผู้โอนทดสอบ",
                "account": "XXX-X-XX111-1",
                "bank": "ธนาคารกรุงไทย",
            },
            "receiver": {
                "name": "ผู้รับทดสอบ",
                "account": "XXX-X-XX222-2",
                "bank": "ธนาคารทหารไทยธนชาต",
            },
            "memo": self.memo,
            "success": True,
            "error_message": None,
        }


class SlipBatchApiTests(unittest.TestCase):
    def setUp(self):
        app_module.app.config["TESTING"] = True
        self.client = app_module.app.test_client()

    def test_post_ocr_returns_batch_summary_and_writes_once_per_slip(self):
        save_calls = []

        async def fake_extract_text(image_path: str) -> str:
            return f"OCR::{Path(image_path).name}"

        async def fake_parse(raw_text: str, file_name: str = ""):
            memo = "Shoppy 12/1800 ด." if file_name.startswith("slip-1") else None
            return _FakeParsedSlip(file_name, memo)

        def fake_save_record(_self, record_data: dict):
            save_calls.append(record_data)
            return _FakeRecord(len(save_calls))

        with patch.object(app_module, "preprocess_image", return_value=None), \
             patch.object(app_module.BankLogoDetector, "detect_logo", return_value={
                 "success": True,
                 "bbox": [1, 2, 3, 4],
                 "cropped_logo": "logo",
                 "brand": "Krungthai",
                 "confidence": 0.95,
             }), \
             patch.object(app_module.BankLogoMatcher, "match_brand", return_value={
                 "brand": "Krungthai",
                 "confidence": 0.95,
                 "feature_vector_size": 64,
             }), \
             patch("bank_slip_reader.ocr_engine.OCREngine.extract_text", new=AsyncMock(side_effect=fake_extract_text)), \
             patch("bank_slip_reader.slip_parser.SlipParser.parse", new=AsyncMock(side_effect=fake_parse)), \
             patch.object(app_module.EvidenceDatabaseManager, "save_record", new=fake_save_record):
            response = self.client.post(
                "/api/ocr",
                data={
                    "image": [
                        (io.BytesIO(b"fake-image-1"), "slip-1.jpeg"),
                        (io.BytesIO(b"fake-image-2"), "slip-2.jpeg"),
                    ]
                },
                content_type="multipart/form-data",
            )

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()

        self.assertIn("combined_results", payload)
        self.assertIn("batch_summary", payload)
        self.assertEqual(payload["batch_summary"]["total_files"], 2)
        self.assertEqual(payload["batch_summary"]["processed_files"], 2)
        self.assertEqual(payload["batch_summary"]["success_count"], 2)
        self.assertEqual(payload["batch_summary"]["failure_count"], 0)
        self.assertEqual(payload["batch_summary"]["failed_files"], [])

        self.assertEqual(len(payload["combined_results"]), 2)
        self.assertEqual(payload["combined_results"][0]["memo"], "Shoppy 12/1800 ด.")
        self.assertIsNone(payload["combined_results"][1]["memo"])
        self.assertEqual(len(save_calls), 2)


if __name__ == "__main__":
    unittest.main()
