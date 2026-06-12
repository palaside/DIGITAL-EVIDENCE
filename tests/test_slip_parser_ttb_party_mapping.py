import asyncio
import sys
import unittest
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from bank_slip_reader.slip_parser import SlipParser


TTB_RAW_TEXT = """Utb
b
b
โอนเงินสําเร็จ
16 ส.ค. 68, 19:18 น.
10,000.00
ค่าธรรมเนียม 0.00
นาย ณัฐชัย รักษาวงษ์
XXX-X-XX558-9
ttb
หนี ยอด 20,000 (1)
น.ส. จิณห์นิภา ประสาทเขตรการ
XXX-X-XX996-5
ttb
รหัสอ้างอิง: 202508161903564508
tb"""

TTB_WA_MONTH_RAW_TEXT = """Utb
to the the the tub tub tub to the
b ttb ttb tub tab tab 15 W.A. 68, 16:00 u.
ttb
100.00
ค่าธรรมเนียม 0.00
นาย ณัฐชัย รักษาวงษ์
XXX-X-XX558-9
ttb
นางสาว เปรมวดี ศรีราช
XXXXXXXX5879
GSB
รหัสอ้างอิง: 202505151502439098
tub"""


class SlipParserTtbPartyMappingTests(unittest.TestCase):
    def test_receiver_name_and_bank_are_not_replaced_by_masked_account(self):
        slip = asyncio.run(SlipParser(mode="rule_based").parse(TTB_RAW_TEXT, "ttb.jpg"))

        self.assertEqual(slip.sender_name, "นาย ณัฐชัย รักษาวงษ์")
        self.assertEqual(slip.sender_account, "XXX-X-XX558-9")
        self.assertEqual(slip.receiver_name, "น.ส. จิณห์นิภา ประสาทเขตรการ")
        self.assertEqual(slip.receiver_account, "XXX-X-XX996-5")
        self.assertEqual(slip.receiver_bank, "ธนาคารทหารไทยธนชาต")

    def test_ocr_month_alias_w_a_is_parsed_as_may_date(self):
        slip = asyncio.run(SlipParser(mode="rule_based").parse(TTB_WA_MONTH_RAW_TEXT, "ttb-wa.jpg"))

        self.assertEqual(slip.transaction_date.strftime("%Y-%m-%d"), "2025-05-15")
        self.assertEqual(slip.transaction_time, "16:00")

    def test_missing_visual_date_falls_back_to_reference_prefix(self):
        raw_text = """Utb
100.00
นาย ณัฐชัย รักษาวงษ์
XXX-X-XX558-9
ttb
นางสาว เปรมวดี ศรีราช
XXXXXXXX5879
GSB
รหัสอ้างอิง: 202505151502439098
tub"""

        slip = asyncio.run(SlipParser(mode="rule_based").parse(raw_text, "ttb-ref-date.jpg"))

        self.assertEqual(slip.transaction_date.strftime("%Y-%m-%d"), "2025-05-15")

    def test_bill_reference_number_is_not_used_as_amount(self):
        raw_text = """Utb
พอ พอ พอ พอ นอ จ่ายบิลสำเร็จ
ttb
16 W.A. 68, 18:13 U.
40.00
ค่าธรรมเนียม 0.00
นาย ณัฐชัย รักษาวงษ์
XXX-X-XX558-9
ttb
ร้านถุงเงิน (รัตนา กายดี)
(010753700088205)
1836006037022605006
thb thb RATANA
รหัสอ้างอิง: 202505161803449485
Utb"""

        slip = asyncio.run(SlipParser(mode="rule_based").parse(raw_text, "ttb-bill.jpg"))

        self.assertEqual(slip.amount, 40.0)

    def test_short_reference_prefix_is_used_as_transaction_date(self):
        raw_text = """Utb
b ttb tub tab tab tab 21 LU.E. 69, 10:26 u.
ttb
60.00
ค่าธรรมเนียม 0.00
นาย ณัฐชัย รักษาวงษ์
XXX-X-XX558-9
ttb
นางสาว วิภาวรรณ ชินอักษร
XXX-XXX-8577
พร้อมเพย์
รหัสอ้างอิง: 260421102630069281
tb"""

        slip = asyncio.run(SlipParser(mode="rule_based").parse(raw_text, "ttb-short-ref.jpg"))

        self.assertEqual(slip.transaction_date.strftime("%Y-%m-%d"), "2026-04-21")
        self.assertEqual(slip.transaction_time, "10:26")

    def test_amount_prefers_transaction_decimal_over_reference_suffix(self):
        raw_text = """Utb
พระพร 5 5 5 โอนเงินสำเร็จ
tub tub tub tub tub to 22 IU.E. 69, 17:06 u.
2,800.00
AsssuluЯ 0.00 ttb ttb ttb ttb ttb t
นาย ณัฐชัย รักษาวงษ์
XXX-X-XX558-9
ttb
นาย สุเมธ สุขเอม
XXXXXXXX0800
GSB
บันทึกช่วยจํา
สมาชิกกองทุน
รหัสอ้างอิง: 260422170611488141 -5 thb tip tib titb
Ub"""

        slip = asyncio.run(SlipParser(mode="rule_based").parse(raw_text, "ttb-reference-suffix.jpg"))

        self.assertEqual(slip.amount, 2800.0)

    def test_noisy_sender_name_is_trimmed_to_person_name(self):
        raw_text = """Ub
29 LU.E. 69, 10:38 U.
ttb ttb ttb to 115.00
p to thb thb tito น ค่าธรรมเนียม 0.00 to be title title title t
นาย ณัฐชัย รักษาวงษ์ เbe to tip to LED LED LED L
XXX-X-XX558-9
sommaiy pongngern ttb ttb
(010753600031501)
KB000002200099
รหัสอ้างอิง: 260429103811505892 ttb ttb"""

        slip = asyncio.run(SlipParser(mode="rule_based").parse(raw_text, "ttb-noisy-sender.jpg"))

        self.assertEqual(slip.sender_name, "นาย ณัฐชัย รักษาวงษ์")
        self.assertEqual(slip.receiver_name, "sommaiy pongngern")
        self.assertIsNone(slip.receiver_bank)
        self.assertEqual(slip.amount, 115.0)

    def test_self_transfer_keeps_receiver_name_when_account_and_bank_differ(self):
        raw_text = """Utb
to the the the tub tub tub to the
b ttb ttb ttb ttb tub 23 W.A. 68, 17:53 u.
ttb
100.00
ค่าธรรมเนียม 0.00
นาย ณัฐชัย รักษาวงษ์
XXX-X-XX558-9
ttb
นาย ณัฐชัย รักษาวงษ์
XXX-X-XX452-9
KTB
รหัสอ้างอิง: 202505231703091180
tb"""

        slip = asyncio.run(SlipParser(mode="rule_based").parse(raw_text, "ttb-self-transfer.jpg"))

        self.assertEqual(slip.sender_name, "นาย ณัฐชัย รักษาวงษ์")
        self.assertEqual(slip.sender_account, "XXX-X-XX558-9")
        self.assertEqual(slip.receiver_name, "นาย ณัฐชัย รักษาวงษ์")
        self.assertEqual(slip.receiver_account, "XXX-X-XX452-9")
        self.assertEqual(slip.receiver_bank, "ธนาคารกรุงไทย")

    def test_bill_payment_uses_merchant_as_receiver_without_guessing_receiver_bank(self):
        raw_text = """Utb
พอ พอ พอ พอ พอ จ่ายบิลสำเร็จ
ttb
7 มี.ค. 69, 22:24 น.
72.00
ค่าธรรมเนียม 0.00
นาย ณัฐชัย รักษาวงษ์
XXX-X-XX558-9
ttb
CJ 2044 Nong Pling Ruam Chai, Nakhon Sawan
(010753600031501)
KB000002264689
ttb ttb APIC17728970796149GC
รหัสอ้างอิง: 202603072203904235
回
Utb"""

        slip = asyncio.run(SlipParser(mode="rule_based").parse(raw_text, "ttb-bill-merchant.jpg"))

        self.assertEqual(slip.receiver_name, "CJ 2044 Nong Pling Ruam Chai, Nakhon Sawan")
        self.assertIsNone(slip.receiver_bank)


if __name__ == "__main__":
    unittest.main()
