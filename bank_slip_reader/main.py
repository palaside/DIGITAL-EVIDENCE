"""
bank_slip_reader/main.py
Entry point – Production: Google Vision + GPT-4o-mini
"""
import asyncio
import os
import sys
import json
from pathlib import Path
from dotenv import load_dotenv

# โหลด .env จาก project root
load_dotenv(Path(__file__).parent.parent / ".env")

from .batch_processor import BatchProcessor


async def run_production(slip_files: list[str]) -> dict:
    """
    Production mode: Google Cloud Vision OCR + GPT-4o-mini parser
    ต้องตั้งค่าใน .env:
      OPENAI_API_KEY=sk-...
      GOOGLE_APPLICATION_CREDENTIALS=path/to/credentials.json
    """
    openai_key   = os.getenv("OPENAI_API_KEY", "")
    google_creds = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "")

    if not openai_key:
        print("⚠️  ไม่มี OPENAI_API_KEY → สลับไปใช้ rule-based mode")
        mode = "free"
    else:
        mode = "production"

    processor = BatchProcessor(
        openai_api_key=openai_key or None,
        google_credentials=google_creds or None,
        mode=mode,
        max_concurrent=5,
    )

    results = await processor.process_batch(slip_files)

    # Export
    out_path = Path(__file__).parent.parent / "output" / "slip_results.json"
    data = processor.export_json(results, str(out_path))

    # แสดงสรุป
    print("\n━━━ ผลลัพธ์ ━━━")
    for r in results:
        if r.success:
            print(
                f"  📋 {r.file_name}\n"
                f"     🏦 {r.bank_name.value} ({r.bank_confidence:.0%})\n"
                f"     💰 {r.amount:,.2f} {r.currency}\n"
                f"     📅 {r.transaction_date}\n"
                f"     👤 โอน: {r.sender_name} ({r.sender_account})\n"
                f"     👤 รับ:  {r.receiver_name} ({r.receiver_account})\n"
                f"     🔖 Ref: {r.transaction_id}\n"
            )
        else:
            print(f"  ❌ {r.file_name}: {r.error_message}")

    return data


async def run_text_mode(texts: list[str]) -> list[dict]:
    """
    Text mode: รับ OCR text strings โดยตรง (ไม่ต้องการรูปภาพ/API key)
    ใช้ rule-based parser เสมอ
    """
    processor = BatchProcessor(mode="free")
    results = await processor.process_text_batch(texts)
    return [r.to_dict() for r in results]


# ─── CLI entry point ─────────────────────────────────────────────────────────
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Bank Slip OCR System")
    parser.add_argument("--mode",   default="production", choices=["production", "free", "text"])
    parser.add_argument("--dir",    help="โฟลเดอร์ที่มีรูปสลิป")
    parser.add_argument("--files",  nargs="*", help="ระบุไฟล์รูปโดยตรง")
    parser.add_argument("--text",   help="OCR text string (สำหรับทดสอบ)")
    args = parser.parse_args()

    if args.text:
        result = asyncio.run(run_text_mode([args.text]))
        print(json.dumps(result, ensure_ascii=False, indent=2))

    elif args.mode in ("production", "free"):
        from .batch_processor import BatchProcessor as BP
        proc = BP(mode=args.mode)

        if args.dir:
            files = proc.scan_directory(args.dir)
        elif args.files:
            files = args.files
        else:
            print("ระบุ --dir หรือ --files หรือ --text")
            sys.exit(1)

        asyncio.run(run_production(files))
