import asyncio, sys
sys.path.insert(0, '.')
from bank_slip_reader.slip_parser import SlipParser

SLIPS = [
    "ธนาคารกรุงไทย\nวันที่ 15/05/2567 เวลา 14:32\nผู้โอน: นายสมชาย ใจดี\nบัญชี 123-4-56789-0\nผู้รับ: นางสาวมณี ดีมาก\nบัญชีปลายทาง 987-6-54321-0\nจำนวนเงิน 4,500.00 บาท\nเลขอ้างอิง N0067719",
    "ธนาคารกสิกรไทย\nวันที่ 20/05/2567 เวลา 09:15\nผู้โอน: นางสาวลดา สวยงาม\nผู้รับ: นายพล ดีใจ\nจำนวนเงิน 1,200.50 บาท\nref K0099123",
    "ธนาคารไทยพาณิชย์\nวันที่ 22/05/2567\nผู้โอน: นายวิชัย แก้วมณี\nผู้รับ: นางพิม ใสสะอาด\nยอดโอน 8,000.00 บาท\nเลขอ้างอิง TH910480",
]

async def main():
    parser = SlipParser(mode='rule_based')
    for i, text in enumerate(SLIPS):
        r = await parser.parse(text, file_name=f'slip_{i+1}.jpg')
        r.success = True
        d = r.to_dict()
        print(f"Slip {i+1}:")
        print(f"  Bank     : {d['bank_name']} ({d['bank_code']}) conf={d['bank_confidence']:.0%}")
        print(f"  Amount   : {d['amount']} {d['currency']}")
        print(f"  Date     : {d['transaction_date']}")
        print(f"  Sender   : {d['sender']['name']} | acc={d['sender']['account']}")
        print(f"  Receiver : {d['receiver']['name']} | acc={d['receiver']['account']}")
        print(f"  Ref ID   : {d['transaction_id']}")
        print()

asyncio.run(main())
