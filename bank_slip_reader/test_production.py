import asyncio, sys, os, json
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "")

sys.path.insert(0, str(Path(__file__).parent.parent))

from bank_slip_reader.ocr_engine import OCREngine
from bank_slip_reader.slip_parser import SlipParser

IMAGE_PATH = sys.argv[1] if len(sys.argv) > 1 else str(
    Path(__file__).parent.parent /
    "Create Single Page Website/src/imports/bank_slip_ocr_preview.png"
)

async def main():
    print(f"📸 อ่านรูป: {Path(IMAGE_PATH).name}")
    print("─" * 50)

    # Step 1: Google Vision OCR
    ocr = OCREngine(
        provider="google",
        api_key=os.getenv("OPENAI_API_KEY")
    )
    raw_text = await ocr.extract_text(IMAGE_PATH)
    print("🔤 OCR Text ที่อ่านได้:")
    print(raw_text)
    print("─" * 50)

    # Step 2: Parse with GPT-4o-mini
    parser = SlipParser(
        openai_api_key=os.getenv("OPENAI_API_KEY"),
        mode="ai"
    )
    result = await parser.parse(raw_text, file_name=Path(IMAGE_PATH).name)
    result.success = True
    d = result.to_dict()

    print("📊 ผลลัพธ์ที่แยกได้:")
    print(f"  🏦 Bank       : {d['bank_name']} ({d['bank_code']}) conf={d['bank_confidence']:.0%}")
    print(f"  💰 Amount     : {d['amount']} {d['currency']}")
    print(f"  📅 Date       : {d['transaction_date']}")
    print(f"  👤 Sender     : {d['sender']['name']} | acc={d['sender']['account']} | bank={d['sender']['bank']}")
    print(f"  👤 Receiver   : {d['receiver']['name']} | acc={d['receiver']['account']} | bank={d['receiver']['bank']}")
    print(f"  🔖 Ref ID     : {d['transaction_id']}")
    print(f"  ⏱  Time       : {d.get('time', 'N/A')}")

asyncio.run(main())
