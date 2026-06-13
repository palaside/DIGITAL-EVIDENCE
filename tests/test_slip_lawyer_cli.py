import unittest
from pathlib import Path
import json
import shutil

from thai_ocr_project.slip_lawyer_cli import (
    ProcessedSlip,
    apply_duplicate_filter,
    build_summary,
    has_complete_dedup_fingerprint,
    load_results_from_audit,
    make_fingerprint,
    target_matches,
)


TARGET_NAME = "จิณห์นิภา  ประสาทเขตรการ"
TEST_TMP_DIR = Path(__file__).resolve().parents[1] / ".tmp" / "unit-test-from-audit"


def make_slip(
    *,
    file_name: str,
    amount: float = 100.0,
    transaction_id: str = "REF001",
    receiver_name: str = TARGET_NAME,
    review_required: bool = False,
    fingerprint: str | None = None,
) -> ProcessedSlip:
    return ProcessedSlip(
        index=1,
        file_path=str(Path("D:/tmp") / file_name),
        file_name=file_name,
        file_hash=f"hash-{file_name}",
        raw_text=f"ผู้รับ {receiver_name}",
        is_slip=True,
        target_matched=True,
        duplicate=False,
        duplicate_of=None,
        review_required=review_required,
        review_reason="INCOMPLETE_DEDUP_FIELDS" if review_required else None,
        transaction_date="2026-06-09",
        transaction_time="12:34",
        sender_bank="ธนาคารกรุงไทย",
        sender_name="นาย ทดสอบ",
        sender_account="XXX-X-XX111-1",
        receiver_bank="ธนาคารทหารไทยธนชาต",
        receiver_name=receiver_name,
        receiver_account="XXX-X-XX222-2",
        amount=amount,
        currency="THB",
        transaction_id=transaction_id,
        memo=None,
        bank_name="ธนาคารกรุงไทย",
        fingerprint=fingerprint or f"fp-{amount}-{transaction_id}",
        error=None,
    )


class SlipLawyerCliTests(unittest.TestCase):
    def test_target_match_uses_exact_normalized_target_name(self):
        slip_dict = {
            "receiver": {"name": "จิณห์นิภา ประสาทเขตรการ"},
        }

        self.assertTrue(target_matches(TARGET_NAME, slip_dict, ""))
        self.assertFalse(target_matches(TARGET_NAME, {"receiver": {"name": "ชื่ออื่น"}}, ""))

    def test_complete_fingerprint_requires_core_fields(self):
        fields = {
            "transaction_date": "2026-06-09",
            "transaction_time": "12:34",
            "amount": "100.00",
            "sender_bank": "ธนาคารกรุงไทย",
            "sender_name": "นาย ทดสอบ",
            "receiver_bank": "ธนาคารทหารไทยธนชาต",
            "receiver_name": "จิณห์นิภา ประสาทเขตรการ",
            "transaction_id": "REF001",
        }

        self.assertTrue(has_complete_dedup_fingerprint(fields))
        self.assertEqual(make_fingerprint(fields), make_fingerprint(dict(reversed(list(fields.items())))))
        fields["amount"] = ""
        self.assertFalse(has_complete_dedup_fingerprint(fields))

    def test_duplicate_filter_excludes_second_identical_fingerprint(self):
        first = make_slip(file_name="a.jpg", fingerprint="same")
        second = make_slip(file_name="b.jpg", fingerprint="same")

        results = apply_duplicate_filter([first, second])

        self.assertFalse(results[0].duplicate)
        self.assertTrue(results[1].duplicate)
        self.assertEqual(results[1].duplicate_of, "a.jpg")

    def test_summary_counts_only_unique_non_review_amounts(self):
        unique = make_slip(file_name="a.jpg", amount=100.0, fingerprint="a")
        duplicate = make_slip(file_name="b.jpg", amount=100.0, fingerprint="a")
        review = make_slip(file_name="c.jpg", amount=900.0, review_required=True, fingerprint=None)
        results = apply_duplicate_filter([unique, duplicate, review])

        summary = build_summary(results, scanned_count=3)

        self.assertEqual(summary["target_matched"], 3)
        self.assertEqual(summary["unique_matched"], 1)
        self.assertEqual(summary["duplicates_excluded"], 1)
        self.assertEqual(summary["review_required"], 1)
        self.assertEqual(summary["total_amount"], 100.0)

    def test_from_audit_recomputes_target_match_and_deduplicates(self):
        shutil.rmtree(TEST_TMP_DIR, ignore_errors=True)
        TEST_TMP_DIR.mkdir(parents=True, exist_ok=True)
        (TEST_TMP_DIR / "a.jpg").write_bytes(b"fake-a")
        (TEST_TMP_DIR / "b.jpg").write_bytes(b"fake-b")
        audit_path = TEST_TMP_DIR / "audit.json"
        audit_path.write_text(
            json.dumps(
                {
                    "summary": {"scanned_files": 2},
                    "results": [
                        {
                            "file_name": "a.jpg",
                            "file_path": "old/a.jpg",
                            "file_hash": "a",
                            "raw_text": "",
                            "is_slip": True,
                            "target_matched": False,
                            "transaction_date": "2026-06-09",
                            "transaction_time": "12:34",
                            "sender_bank": "ธนาคารกรุงไทย",
                            "sender_name": "นาย ทดสอบ",
                            "receiver_bank": "ธนาคารทหารไทยธนชาต",
                            "receiver_name": "น.ส. จิณห์นิภา ประสาทเขตรการ",
                            "amount": 100.0,
                            "currency": "THB",
                            "transaction_id": "REF001",
                        },
                        {
                            "file_name": "b.jpg",
                            "file_path": "old/b.jpg",
                            "file_hash": "b",
                            "raw_text": "",
                            "is_slip": True,
                            "target_matched": False,
                            "transaction_date": "2026-06-09",
                            "transaction_time": "12:34",
                            "sender_bank": "ธนาคารกรุงไทย",
                            "sender_name": "นาย ทดสอบ",
                            "receiver_bank": "ธนาคารทหารไทยธนชาต",
                            "receiver_name": "น.ส. จิณห์นิภา ประสาทเขตรการ",
                            "amount": 100.0,
                            "currency": "THB",
                            "transaction_id": "REF001",
                        },
                    ],
                },
                ensure_ascii=False,
            ),
            encoding="utf-8",
        )

        results, source_summary = load_results_from_audit(audit_path, TARGET_NAME, image_root=TEST_TMP_DIR)
        shutil.rmtree(TEST_TMP_DIR, ignore_errors=True)

        self.assertEqual(source_summary["scanned_files"], 2)
        self.assertEqual(len(results), 2)
        self.assertTrue(results[0].target_matched)
        self.assertTrue(results[1].duplicate)
        self.assertEqual(results[0].file_path, str(TEST_TMP_DIR / "a.jpg"))


if __name__ == "__main__":
    unittest.main()
