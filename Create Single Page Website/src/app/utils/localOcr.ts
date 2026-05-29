import Tesseract from 'tesseract.js';
import { OcrDataPayload } from './slipValidatorEngine';

export interface LocalOcrProgress {
  status: string;
  progress: number;
}

/**
 * Runs Tesseract.js on the browser to extract text from a slip image.
 * Uses both Thai and English models.
 */
export async function runLocalOCR(
  imageUrl: string, 
  onProgress?: (p: LocalOcrProgress) => void
): Promise<OcrDataPayload> {
  
  const worker = await Tesseract.createWorker('tha+eng', 1, {
    logger: m => {
      if (onProgress) {
        onProgress({ status: m.status, progress: m.progress });
      }
    }
  });

  const { data: { text: rawText } } = await worker.recognize(imageUrl);
  await worker.terminate();

  console.log("=== RAW TESSERACT OCR TEXT ===");
  console.log(rawText);

  // Fix common OCR typos
  let text = rawText.replace(/สืบตรี/g, 'สิบตรี');

  // Parse heuristics from raw text
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const fullText = lines.join(' ');

  let transactionDate = "Unknown";
  let senderName = "Unknown";
  let receiverName = "Unknown";
  let amountTransferred = "Unknown";

  // Heuristic 1: Find Date
  const dateRegex = /\d{1,2}\s+(ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.)\s+\d{4}/;
  const dateMatch = fullText.match(dateRegex);
  const timeRegex = /\d{2}:\d{2}/;
  const timeMatch = fullText.match(timeRegex);
  if (dateMatch) {
    transactionDate = dateMatch[0];
    if (timeMatch) transactionDate += ` ${timeMatch[0]}`;
  }

  // Heuristic 2: Find Amount
  const amountRegex = /(\d{1,3}(,\d{3})*(\.\d{2})?)\s*บาท/;
  const amountMatch = fullText.match(amountRegex);
  if (amountMatch) {
    amountTransferred = `${amountMatch[1]} THB`;
  }

  // Heuristic 3: Find Sender and Receiver
  const titleRegex = /^(นาย|นาง|น\.ส\.|นางสาว|ด\.ช\.|ด\.ญ\.|สิบตรี|ร้อยตรี|พันตรี|พลตรี|จ่า|ว่าที่|คุณ|ผู้)/;
  
  let toIndex = lines.findIndex(l => l.includes('ไปยัง') || l.includes('โอนไป') || l.includes('ไปที่'));
  
  if (toIndex !== -1) {
    // Look backwards for sender
    for (let i = toIndex - 1; i >= 0; i--) {
      // Exclude obvious bank lines, account numbers, and system labels (including Tesseract misspellings)
      if (
         lines[i].match(/(ธนาคาร|กรุงไทย|กสิกร|ไทยพาณิชย์|ออมสิน|ทหารไทย|ธ\.ก\.ส\.)/) || 
         lines[i].match(/\d/) ||
         lines[i].match(/(รหัส|อ้างอิง|โอนเงิน|สำเร็จ|จํานวนเงิน|ค่าธรรมเนียม|รายการ|เวลา|รหส|ขางอง|Aa)/)
      ) {
         continue;
      }
      if (titleRegex.test(lines[i]) || /^[a-zA-Zก-๙\s\.]+$/.test(lines[i])) {
         senderName = lines[i];
         break;
      }
    }
    // Look forwards for receiver
    for (let i = toIndex + 1; i < lines.length; i++) {
      if (
         lines[i].match(/(ธนาคาร|กรุงไทย|กสิกร|ไทยพาณิชย์|ออมสิน|ทหารไทย|ธ\.ก\.ส\.)/) || 
         lines[i] === '***' || 
         lines[i].toLowerCase().includes('xxx') || 
         lines[i].match(/\d/) ||
         lines[i].match(/(รหัส|อ้างอิง|โอนเงิน|สำเร็จ|จํานวนเงิน|ค่าธรรมเนียม|รายการ|เวลา|รหส|ขางอง|Aa)/)
      ) {
         continue;
      }
      if (titleRegex.test(lines[i]) || /^[a-zA-Zก-๙\s\.]+$/.test(lines[i])) {
         receiverName = lines[i];
         break;
      }
    }
  }

  if (senderName === "Unknown") {
     const names = lines.filter(l => titleRegex.test(l));
     if (names.length >= 1) senderName = names[0];
     if (names.length >= 2) receiverName = names[1];
  }

  return {
    "forensics_analysis": {
        "case_number": "DE-TESSERACT",
        "database_record_id": 0,
        "processing_timestamp": new Date().toISOString(),
        "integrity_hash": "SHA256:7e8b23a9d98f7e2a87c102a1b5c68f9a2e31d4e8b09f1a23b4c5d6e7f8a901bc",
    },
    "bank_slip_verification": {
        "brand_matching_confidence": "Local OCR",
    },
    "extracted_transaction_metadata": {
      "bank_name": fullText,
      "transaction_date_time": transactionDate,
      "sender_name": senderName,
      "receiver_name": receiverName,
      "amount_transferred": amountTransferred,
      "qr_code_hash_payload": ""
    }
  };
}
