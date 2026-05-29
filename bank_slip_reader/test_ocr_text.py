import asyncio, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from bank_slip_reader.slip_parser import SlipParser

# ข้อความ OCR จริงที่ Google Vision อ่านได้จากรูป
OCR_TEXT = """บมจ. ธนาคารกสิกรไทย
KASIKORN BANK
การทรงเลือเได้
วันที่ พม 2566
14 ต.ค. 2566
วันที่กลาย นาย สมชาย มีสุข
NAME Mr. Somchai Meesook
ละวอมา KBank 034-x-xxxxx-4
วันที่กลาย บจก. เอแอนด์บี เทรดดิ้ง
NAME A&B Trading Co., Ltd.
ละวอมา SCB 112-x-xxxxx-9
อาอมกา 3,500.00 บาท
Transaction ID K-1234567890
Time 11:24"""

async def main():
    parser = SlipParser(mode="rule_based")
    r = await parser.parse(OCR_TEXT, file_name="real_slip.jpg")
    r.success = True
    d = r.to_dict()

    print("=== ผลลัพธ์ Rule-based Parser ===")
    print(f"Bank     : {d['bank_name']} ({d['bank_code']}) conf={d['bank_confidence']:.0%}")
    print(f"Amount   : {d['amount']} {d['currency']}")
    print(f"Date     : {d['transaction_date']}")
    print(f"Sender   : {d['sender']['name']} | acc={d['sender']['account']}")
    print(f"Receiver : {d['receiver']['name']} | acc={d['receiver']['account']}")
    print(f"Ref ID   : {d['transaction_id']}")

asyncio.run(main())
