import type { OcrDataPayload } from "./slipValidatorEngine";

export const messySlipOcrPayload: OcrDataPayload = {
  extracted_transaction_metadata: {
    bank_name: "ธนาคารกสีกรไทบ",
    transaction_date_time: "  14 Oct 66   09:30 ",
    sender_name: "นาย สมชาย ใจดี มาก",
    receiver_name: "ด.ญ. มานะ รักเรียน",
    amount_transferred: " 1,234.50บาท ",
    qr_code_hash_payload: "https://example.com/qr?payload=abcdef123456789012345",
  },
  bank_slip_verification: {
    brand_matching_confidence: "60.0%",
  },
};

export const expectedValidatedSlipData = {
  bankName: "KBANK (ธนาคารกสิกรไทย)",
  bankConfidence: "100.0%",
  transactionDate: "14 ต.ค. 2566   09:30",
  senderName: "สมชาย ใจดี มาก",
  receiverName: "มานะ รักเรียน",
  amount: "1,234.50 THB",
  qrPayload: "https://example.com/qr?payload=abcdef123456789012345",
  isQrVerified: true,
};

export const bankValidationCases = [
  {
    input: "ธนาคารกสิกรไทย",
    expected: "KBANK (ธนาคารกสิกรไทย)",
    minConfidence: 95,
  },
  {
    input: "ธนาคารกสีกรไทบ",
    expected: "KBANK (ธนาคารกสิกรไทย)",
    minConfidence: 60,
  },
  {
    input: "ธนาคารไทยเครดิต",
    expected: "TCB (ธนาคารไทยเครดิตเพื่อรายย่อย)",
    minConfidence: 80,
  },
  {
    input: "SCB",
    expected: "SCB (ธนาคารไทยพาณิชย์)",
    minConfidence: 100,
  },
  {
    input: "ธนาคารไม่รู้จัก",
    expected: "ธนาคารไม่รู้จัก",
    minConfidence: 0,
  },
];

export const amountParsingCases = [
  {
    input: " 1,234.50บาท ",
    expected: "1,234.50 THB",
    minConfidence: 90,
  },
  {
    input: "฿12 345",
    expected: "12345 THB",
    minConfidence: 60,
  },
  {
    input: "no amount",
    expected: "0.00 THB",
    minConfidence: 0,
  },
];

export const dateParsingCases = [
  {
    input: "14 Oct 66 09:30",
    expected: "14 ต.ค. 2566 09:30",
    minConfidence: 80,
  },
  {
    input: "15 ม.ค. 2567 11:00",
    expected: "15 ม.ค. 2567 11:00",
    minConfidence: 80,
  },
  {
    input: "2023-08-10",
    expected: "2566-08-10",
    minConfidence: 99,
  },
];

export const nameCleaningCases = [
  {
    input: "นาย สมชาย ใจดี มาก",
    expected: "สมชาย ใจดี มาก",
    minConfidence: 99,
  },
  {
    input: "ด.ญ. มานะ รักเรียน",
    expected: "มานะ รักเรียน",
    minConfidence: 99,
  },
  {
    input: "Mr. John Doe",
    expected: "John Doe",
    minConfidence: 99,
  },
  {
    input: "สมชาย ใจดี",
    expected: "สมชาย ใจดี",
    minConfidence: 90,
  },
];
