/**
 * Extracts and normalizes the monetary amount from raw OCR text into float numbers.
 * Removes currency words like "บาท", "THB", commas, and OCR junk artifacts.
 */
export function extractAmount(ocrText: string): { amount: string; numericAmount: number; confidence: number; originalText: string } {
  if (!ocrText) return { amount: "0.00 THB", numericAmount: 0.0, confidence: 0, originalText: ocrText };

  // Remove common currency symbols, Thai words, and textual artifacts
  let cleaned = ocrText
    .replace(/[฿B$€THBthbบาท]/gi, "")
    .replace(/\s+/g, "");

  // Match standard number formats like: 1,234.56 or 1234.56
  const match = cleaned.match(/(\d+(?:,\d{3})*(?:\.\d{2})?)/);

  if (match && match[0]) {
    const rawNumberStr = match[0].replace(/,/g, "");
    const numericFloat = parseFloat(rawNumberStr);
    const lengthDiff = Math.abs(ocrText.length - match[0].length);
    const confidence = lengthDiff <= 5 ? 99 : 85;

    return {
      amount: `${match[0]} THB`,
      numericAmount: isNaN(numericFloat) ? 0.0 : numericFloat,
      confidence: confidence,
      originalText: ocrText
    };
  }

  // Fallback: extract digits and dots
  const digitsOnly = cleaned.replace(/[^\d.]/g, "");
  if (digitsOnly) {
    let formatted = digitsOnly;
    if (!formatted.includes(".")) {
       formatted += ".00";
    }
    const numericFloat = parseFloat(formatted);
    return {
      amount: `${formatted} THB`,
      numericAmount: isNaN(numericFloat) ? 0.0 : numericFloat,
      confidence: 60,
      originalText: ocrText
    };
  }

  return { amount: "0.00 THB", numericAmount: 0.0, confidence: 0, originalText: ocrText };
}

