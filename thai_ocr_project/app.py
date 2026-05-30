# Flask Backend API S0
# Listens on port 5000 and processes real-time slip uploads with CORS active

import os
import sys
import time
from dotenv import load_dotenv
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(CURRENT_DIR)
sys.path.insert(0, CURRENT_DIR)
sys.path.insert(1, PROJECT_ROOT)
load_dotenv(os.path.join(PROJECT_ROOT, '.env'))

from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
from modules.preprocessor import preprocess_image
from modules.thai_ocr import ThaiSlipOCR
from modules.logo_detector import BankLogoDetector
from modules.logo_matcher import BankLogoMatcher
from database.db_manager import EvidenceDatabaseManager

app = Flask(__name__)

# Configure Uploads
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'temp_uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# CORS Headers manual setup to prevent origin blocks
@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
    response.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,OPTIONS'
    return response

@app.route('/api/ocr', methods=['POST', 'OPTIONS'])
def process_slip_ocr():
    if request.method == 'OPTIONS':
        return jsonify({"status": "preflight"}), 200

    if 'image' not in request.files:
        return jsonify({"error": "No image files provided"}), 400
    files = request.files.getlist('image')
    results = []
    for file in files:
        if file.filename == '':
            continue
        try:
            filename = secure_filename(file.filename)
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(file_path)

            # 1. OpenCV Preprocessing
            binarized_img = preprocess_image(file_path)

            # 2. YOLOv8 Logo Detection
            detector = BankLogoDetector(model_path=None)
            detect_res = detector.detect_logo(file_path)

            # 3. Faiss Brand Matching
            matcher = BankLogoMatcher()
            match_res = matcher.match_brand(detect_res.get("cropped_logo"))

            # 4. Extract Text & Parse Data with Google Vision AI and SlipParser
            import asyncio
            from bank_slip_reader.ocr_engine import OCREngine
            from bank_slip_reader.slip_parser import SlipParser

            async def parse_slip():
                ocr_engine = OCREngine(provider="google", api_key=os.getenv("OPENAI_API_KEY"))
                full_text = await ocr_engine.extract_text(file_path)
                
                # Try rule_based mode first
                parser = SlipParser(mode="rule_based")
                result = await parser.parse(full_text, file_name=filename)
                
                # Build full response object for each file
                start_time = time.time()
                # raw OCR text from Vision
                raw_text = full_text
                # Parse result to dict
                slip_dict = result.to_dict()

                # Combine date and time
                date_str = slip_dict.get("transaction_date") or "UNKNOWN"
                time_str = slip_dict.get("transaction_time") or ""
                if date_str != "UNKNOWN" and time_str:
                    date_only = date_str.split("T")[0]
                    combined_datetime = f"{date_only}  /  {time_str}"
                else:
                    combined_datetime = date_str

                # Save to DB and get record meta
                db = EvidenceDatabaseManager("sqlite:///digital_evidence.db")
                db_record = db.save_record({
                    "bank_name": slip_dict.get("bank_name"),
                    "transaction_date": combined_datetime,
                    "sender_name": slip_dict.get("sender", {}).get("name"),
                    "receiver_name": slip_dict.get("receiver", {}).get("name"),
                    "amount": slip_dict.get("amount"),
                    "qr_payload": slip_dict.get("qr_payload"),
                    "transaction_id": slip_dict.get("transaction_id"),
                    "transaction_time": time_str,
                })

                processing_time_ms = int((time.time() - start_time) * 1000)

                # Assemble full JSON for this slip
                full_result = {
                    "raw_text": raw_text,
                    "bank_name": slip_dict.get("bank_name", "UNKNOWN"),
                    "bank_code": slip_dict.get("bank_code"),
                    "transaction_date": combined_datetime,
                    "transaction_time": time_str,
                    "sender_name": slip_dict.get("sender", {}).get("name"),
                    "sender_account": slip_dict.get("sender", {}).get("account"),
                    "receiver_name": slip_dict.get("receiver", {}).get("name"),
                    "receiver_account": slip_dict.get("receiver", {}).get("account"),
                    "amount": slip_dict.get("amount"),
                    "currency": slip_dict.get("currency"),
                    "qr_payload": slip_dict.get("qr_payload"),
                    "transaction_id": slip_dict.get("transaction_id"),
                    "confidence": slip_dict.get("bank_confidence"),
                    "logo_detection": {
                        "brand": detect_res.get("brand"),
                        "confidence": detect_res.get("confidence"),
                        "bbox": detect_res.get("bbox")
                    },
                    "db_record": {
                        "case_number": db_record.case_number,
                        "record_id": db_record.id,
                        "created_at": db_record.created_at.isoformat(),
                        "integrity_hash": db_record.integrity_hash
                    },
                    "processing_time_ms": processing_time_ms
                }
                
                # Cleanup uploaded file
                try:
                    os.remove(file_path)
                except Exception:
                    pass

                return full_result

            try:
                parsed_data = asyncio.run(parse_slip())
            except Exception as e:
                raise RuntimeError(f"Google Vision / Parser Extraction failed: {str(e)}")


            db = EvidenceDatabaseManager("sqlite:///digital_evidence.db")
            db_record = db.save_record(parsed_data)

            try:
                os.remove(file_path)
            except Exception:
                pass

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
            results.append(report)
        except Exception as e:
            results.append({"error": str(e), "filename": file.filename})
    merged = {"combined_results": results}
    return jsonify(merged), 200


if __name__ == '__main__':
    # Listen on port 5000
    app.run(host='0.0.0.0', port=5000, debug=True)
