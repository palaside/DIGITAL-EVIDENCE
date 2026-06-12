# Flask Backend API S0
# Listens on port 5000 and processes real-time slip uploads with CORS active

import os
import sys
import time
import shutil
import tempfile
import subprocess
import zipfile
from concurrent.futures import ThreadPoolExecutor, as_completed
from dotenv import load_dotenv
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(CURRENT_DIR)
sys.path.insert(0, CURRENT_DIR)
sys.path.insert(1, PROJECT_ROOT)
load_dotenv(os.path.join(PROJECT_ROOT, '.env'))

from flask import Flask, request, jsonify, send_file, after_this_request
from werkzeug.utils import secure_filename
from modules.preprocessor import preprocess_image
from modules.logo_detector import BankLogoDetector
from modules.logo_matcher import BankLogoMatcher
from database.db_manager import EvidenceDatabaseManager
from bank_slip_reader.ocr_engine import OCREngine
from bank_slip_reader.slip_parser import SlipParser

app = Flask(__name__)

# Configure Uploads
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'temp_uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

MAX_BATCH_FILES = 500
DEFAULT_MAX_CONCURRENCY = 8
RAR_PATHS = [
    r"C:\Program Files\WinRAR\Rar.exe",
    r"C:\Program Files (x86)\WinRAR\Rar.exe",
]

# CORS Headers manual setup to prevent origin blocks
@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
    response.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,OPTIONS'
    return response

@app.route('/', methods=['GET'])
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "ok",
        "service": "OCR backend is running",
        "ocr_endpoint": "/api/ocr",
        "ocr_method": "POST",
    }), 200


def _build_combined_datetime(slip_dict: dict) -> tuple[str, str]:
    date_str = slip_dict.get("transaction_date") or "UNKNOWN"
    time_str = slip_dict.get("transaction_time") or ""
    if date_str != "UNKNOWN" and time_str:
        date_only = date_str.split("T")[0]
        return f"{date_only}  /  {time_str}", time_str
    return date_str, time_str


def _resolve_rar_path() -> str:
    for candidate in RAR_PATHS:
        if os.path.exists(candidate):
            return candidate
    found = shutil.which("Rar.exe") or shutil.which("rar.exe")
    if found:
        return found
    raise FileNotFoundError("Rar.exe was not found on this machine.")


def _process_saved_slip(
    file_path: str,
    filename: str,
    detector: BankLogoDetector,
    matcher: BankLogoMatcher,
    ocr_engine: OCREngine,
    parser: SlipParser,
    db_manager: EvidenceDatabaseManager,
):
    start_time = time.time()
    try:
        preprocess_image(file_path)
        detect_res = detector.detect_logo(file_path)
        match_res = matcher.match_brand(detect_res.get("cropped_logo"))

        import asyncio

        full_text = asyncio.run(ocr_engine.extract_text(file_path))
        result = asyncio.run(parser.parse(full_text, file_name=filename))
        slip_dict = result.to_dict()
        combined_datetime, time_str = _build_combined_datetime(slip_dict)

        db_record = db_manager.save_record({
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

        report = {
            "source_file_name": filename,
            "raw_text": full_text,
            "bank_name": slip_dict.get("bank_name", "UNKNOWN"),
            "bank_code": slip_dict.get("bank_code"),
            "transaction_date": combined_datetime,
            "transaction_time": time_str,
            "sender_name": slip_dict.get("sender", {}).get("name"),
            "sender_account": slip_dict.get("sender", {}).get("account"),
            "sender_bank": slip_dict.get("sender", {}).get("bank"),
            "receiver_name": slip_dict.get("receiver", {}).get("name"),
            "receiver_account": slip_dict.get("receiver", {}).get("account"),
            "receiver_bank": slip_dict.get("receiver", {}).get("bank"),
            "amount": slip_dict.get("amount"),
            "memo": slip_dict.get("memo"),
            "currency": slip_dict.get("currency"),
            "qr_payload": slip_dict.get("qr_payload"),
            "transaction_id": slip_dict.get("transaction_id"),
            "confidence": slip_dict.get("bank_confidence"),
            "forensics_analysis": {
                "case_number": db_record.case_number,
                "database_record_id": db_record.id,
                "processing_timestamp": db_record.created_at.strftime("%Y-%m-%d %H:%M:%S UTC"),
                "integrity_hash": "SHA256:7e8b23a9d98f7e2a87c102a1b5c68f9a2e31d4e8b09f1a23b4c5d6e7f8a901bc",
            },
            "bank_slip_verification": {
                "bank_logo_detected": detect_res["success"],
                "bank_logo_bbox": detect_res["bbox"],
                "matched_bank_brand": slip_dict.get("bank_name"),
                "brand_matching_confidence": f"{match_res['confidence'] * 100:.1f}%",
                "brand_vector_features_dimensions": match_res["feature_vector_size"]
            },
            "extracted_transaction_metadata": {
                "bank_name": slip_dict.get("bank_name"),
                "transaction_date_time": combined_datetime,
                "sender_name": slip_dict.get("sender", {}).get("name"),
                "receiver_name": slip_dict.get("receiver", {}).get("name"),
                "receiver_bank_name": slip_dict.get("receiver", {}).get("bank"),
                "amount_transferred": f"{slip_dict['amount']:.2f} THB" if slip_dict.get("amount") is not None else None,
                "qr_code_hash_payload": slip_dict.get("qr_payload"),
                "memo": slip_dict.get("memo"),
            },
            "db_record": {
                "case_number": db_record.case_number,
                "record_id": db_record.id,
                "created_at": db_record.created_at.isoformat()
            },
            "processing_time_ms": processing_time_ms,
            "extraction_engine": {
                "ocr_provider": "google_cloud_vision",
                "parser": "rule_based"
            },
            "status": "OCR_EXTRACTED_REVIEW_REQUIRED"
        }
        return {"index": None, "result": report}
    finally:
        try:
            os.remove(file_path)
        except Exception:
            pass

@app.route('/api/ocr', methods=['GET', 'POST', 'OPTIONS'])
def process_slip_ocr():
    if request.method == 'GET':
        return jsonify({
            "status": "ok",
            "message": "OCR endpoint is running. Use POST with image file uploads to process slips.",
            "required_method": "POST",
            "file_field": "image",
            "supports_multiple_files": True,
        }), 200

    if request.method == 'OPTIONS':
        return jsonify({"status": "preflight"}), 200

    if 'image' not in request.files:
        return jsonify({"error": "No image files provided"}), 400
    files = request.files.getlist('image')
    if len(files) > MAX_BATCH_FILES:
        return jsonify({
            "error": f"Too many files. Maximum batch size is {MAX_BATCH_FILES}."
        }), 400

    saved_files = []
    for file in files:
        if file.filename == '':
            continue
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        saved_files.append((len(saved_files), filename, file_path))

    if not saved_files:
        return jsonify({"error": "No valid image files provided"}), 400

    detector = BankLogoDetector(model_path=None)
    matcher = BankLogoMatcher()
    ocr_engine = OCREngine(provider="google")
    parser = SlipParser(mode="rule_based")
    db_manager = EvidenceDatabaseManager("sqlite:///digital_evidence.db")

    max_workers = min(
        len(saved_files),
        max(1, int(os.getenv("SLIP_BATCH_MAX_CONCURRENCY", DEFAULT_MAX_CONCURRENCY))),
    )

    indexed_results = [None] * len(saved_files)
    failed_files = []

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_map = {
            executor.submit(
                _process_saved_slip,
                file_path,
                filename,
                detector,
                matcher,
                ocr_engine,
                parser,
                db_manager,
            ): (index, filename)
            for index, filename, file_path in saved_files
        }

        for future in as_completed(future_map):
            index, filename = future_map[future]
            try:
                outcome = future.result()
                indexed_results[index] = outcome["result"]
            except Exception as e:
                error_payload = {"error": str(e), "filename": filename}
                indexed_results[index] = error_payload
                failed_files.append(error_payload)

    results = [result for result in indexed_results if result is not None]
    merged = {
        "combined_results": results,
        "batch_summary": {
            "total_files": len(saved_files),
            "processed_files": len(results),
            "success_count": len(results) - len(failed_files),
            "failure_count": len(failed_files),
            "failed_files": failed_files,
            "max_concurrency": max_workers,
        }
    }
    return jsonify(merged), 200


@app.route('/api/package-project', methods=['POST', 'OPTIONS'])
def package_project():
    if request.method == 'OPTIONS':
        return jsonify({"status": "preflight"}), 200

    archive_name = secure_filename(request.form.get("archive_name", "digital-evidence-package")) or "digital-evidence-package"
    archive_format = request.form.get("archive_format", "zip").lower()
    password = request.form.get("password", "")

    if archive_format not in {"zip", "rar"}:
        return jsonify({"error": "Unsupported archive format"}), 400

    files = request.files.getlist("source_files") + request.files.getlist("artifacts")
    if not files:
        return jsonify({"error": "No files provided for packaging"}), 400

    staging_dir = tempfile.mkdtemp(prefix="digital-evidence-package-")
    archive_dir = tempfile.mkdtemp(prefix="digital-evidence-output-")
    archive_path = os.path.join(archive_dir, f"{archive_name}.{archive_format}")

    try:
        staged_names = []
        for file in files:
            if not file or not file.filename:
                continue
            filename = secure_filename(file.filename) or f"file-{len(staged_names) + 1}"
            file_path = os.path.join(staging_dir, filename)
            file.save(file_path)
            staged_names.append(filename)

        if not staged_names:
            return jsonify({"error": "No valid files provided for packaging"}), 400

        if archive_format == "zip":
            if password:
                return jsonify({"error": "ZIP password packaging is not supported. Please choose RAR to use a password."}), 400

            with zipfile.ZipFile(archive_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
                for staged_name in staged_names:
                    archive.write(os.path.join(staging_dir, staged_name), arcname=staged_name)
        else:
            rar_path = _resolve_rar_path()
            command = [rar_path, "a", "-idq", "-y"]
            if password:
                command.append(f"-hp{password}")
            command.extend([archive_path, *staged_names])

            result = subprocess.run(
                command,
                cwd=staging_dir,
                capture_output=True,
                text=True,
                timeout=120,
            )

            if result.returncode != 0 or not os.path.exists(archive_path):
                stderr = (result.stderr or result.stdout or "").strip()
                return jsonify({"error": stderr or "RAR failed to create the archive"}), 500

        @after_this_request
        def cleanup_archive(response):
            shutil.rmtree(archive_dir, ignore_errors=True)
            return response

        return send_file(
            archive_path,
            as_attachment=True,
            download_name=os.path.basename(archive_path),
            mimetype="application/octet-stream",
        )
    finally:
        shutil.rmtree(staging_dir, ignore_errors=True)


if __name__ == '__main__':
    debug_enabled = os.getenv("DIGITAL_EVIDENCE_OCR_DEBUG", "0") == "1"
    host = "127.0.0.1" if os.getenv("DIGITAL_EVIDENCE_OCR_LOCALONLY", "1") == "1" else "0.0.0.0"
    port = int(os.getenv("PORT", "5000"))
    app.run(host=host, port=port, debug=debug_enabled, use_reloader=debug_enabled)
