import { validateSlipData, OcrDataPayload } from './slipValidatorEngine';

const messyOcrData: OcrDataPayload = {
  extracted_transaction_metadata: {
    bank_name: "ธนาคารกสีกรไทบ", // Typos in Kasikorn
    transaction_date_time: "  14 Oct 66   09:30 ", // Mixed English month and 2-digit year
    sender_name: "นาย สมชาย ใจดี มาก", // Has title
    receiver_name: "ด.ญ. มานะ รักเรียน", // Has title
    amount_transferred: " 1,234.50บาท ", // Has currency string and spaces
    qr_code_hash_payload: "" // No QR for this test
  },
  bank_slip_verification: {
    brand_matching_confidence: "60.0%"
  }
};

console.log("=== RAW OCR DATA (MESSY) ===");
console.log(JSON.stringify(messyOcrData.extracted_transaction_metadata, null, 2));
console.log("\n");

console.log("=== VALIDATED SLIP DATA (CLEANED) ===");
const result = validateSlipData(messyOcrData);

const output = {
  bankName: result.bankName,
  bankConfidence: result.bankConfidence,
  transactionDate: result.transactionDate,
  senderName: result.senderName,
  receiverName: result.receiverName,
  amount: result.amount
};
console.log(JSON.stringify(output, null, 2));
