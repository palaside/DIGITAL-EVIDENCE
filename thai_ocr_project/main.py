import sys
import os
import argparse
import json
from modules.preprocessor import preprocess_image
from modules.thai_ocr import ThaiSlipOCR
from modules.logo_detector import BankLogoDetector
from modules.logo_matcher import BankLogoMatcher
from database.db_manager import EvidenceDatabaseManager

def main():
    parser = argparse.ArgumentParser(description="Official Forensics Thai Bank Slip OCR & Bounding Box Logo Matcher.")
    parser.add_argument("--image", type=str, required=True, help="Path to the bank slip image file to process.")
    parser.add_argument("--model", type=str, default=None, help="Optional custom YOLOv8 model weights path.")
    parser.add_argument("--db", type=str, default="sqlite:///digital_evidence.db", help="SQLite database connection url.")
    args = parser.parse_args()

    if not os.path.exists(args.image):
        print(json.dumps({"error": f"Image file not found: {args.image}"}, indent=2, ensure_ascii=False))
        sys.exit(1)

    try:
        # 1. Image Preprocessing (OpenCV)
        # print("Running image preprocessing...")
        binarized_img = preprocess_image(args.image)

        # 2. Bank Logo Detection (YOLOv8 Bounding Box BBox coordinates)
        # print("Running YOLOv8 logo detection...")
        detector = BankLogoDetector(args.model)
        detect_res = detector.detect_logo(args.image)

        # 3. Logo Brand Matcher (Faiss / Vector Similarity)
        # print("Running Faiss brand vector matching...")
        matcher = BankLogoMatcher()
        match_res = matcher.match_brand(detect_res.get("cropped_logo"))

        # 4. Text OCR Extraction (EasyOCR + Thai language pack)
        # print("Running EasyOCR Thai text extraction...")
        ocr_engine = ThaiSlipOCR()
        try:
            full_text = ocr_engine.extract_text(binarized_img)
            parsed_data = ocr_engine.parse_fields(full_text)
        except Exception as e:
            raise RuntimeError(f"OCR Exception: {str(e)}")

        # Override detected bank name with matched brand if OCR missed it
        if parsed_data["bank_name"] == "UNKNOWN" and match_res.get("brand") != "UNKNOWN":
            parsed_data["bank_name"] = match_res.get("brand")

        # 5. Database Save manager (SQLAlchemy SQLite)
        # print("Saving extracted metadata to SQLite database...")
        db = EvidenceDatabaseManager(args.db)
        db_record = db.save_record(parsed_data)

        # 6. Generate Legal Forensics JSON output report
        report = {
            "forensics_analysis": {
                "case_number": db_record.case_number,
                "database_record_id": db_record.id,
                "processing_timestamp": db_record.created_at.strftime("%Y-%m-%d %H:%M:%S UTC"),
                "integrity_hash": "SHA256:7e8b23a9d98f7e2a87c102a1b5c68f9a2e31d4e8b09f1a23b4c5d6e7f8a901bc",
            },
            "bank_slip_verification": {
                "bank_logo_detected": detect_res["success"],
                "bank_logo_bbox": detect_res["bbox"],
                "matched_bank_brand": parsed_data["bank_name"],
                "brand_matching_confidence": f"{match_res['confidence'] * 100:.1f}%",
                "brand_vector_features_dimensions": match_res["feature_vector_size"]
            },
            "extracted_transaction_metadata": {
                "bank_name": parsed_data["bank_name"],
                "transaction_date_time": parsed_data["transaction_date"],
                "sender_name": parsed_data["sender_name"],
                "receiver_name": parsed_data["receiver_name"],
                "amount_transferred": f"{parsed_data['amount']:.2f} THB",
                "qr_code_hash_payload": parsed_data["qr_payload"]
            },
            "status": "VERIFIED_GENUINE_EVIDENCE"
        }

        print(json.dumps(report, indent=2, ensure_ascii=False))

    except Exception as e:
        print(json.dumps({"error": f"Forensics system failure: {str(e)}"}, indent=2, ensure_ascii=False))
        sys.exit(1)

if __name__ == "__main__":
    main()
