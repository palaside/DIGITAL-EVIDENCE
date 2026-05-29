/**
 * Extracts and normalizes the monetary amount from raw OCR text.
 * Handles commas, spaces, currency symbols, and common OCR mistakes.
 */
export function extractAmount(ocrText: string): { amount: string; confidence: number; originalText: string } {
  if (!ocrText) return { amount: "", confidence: 0, originalText: ocrText };

  // Remove common currency symbols and textual artifacts
  let cleaned = ocrText
    .replace(/[฿B$€THBthbบาท]/g, "")
    .replace(/\s+/g, "");

  // Match standard number formats like:
  // 1,234.56 or 1234.56 or 1,234,567
  const match = cleaned.match(/(\d+(?:,\d{3})*(?:\.\d{2})?)/);

  if (match && match[0]) {
    // Determine confidence based on how much "junk" we had to remove
    const lengthDiff = ocrText.length - match[0].length;
    const confidence = lengthDiff <= 5 ? 99 : 85;

    // Return the clean number with commas for standard display
    return {
      amount: match[0] + " THB", // Standardize output
      confidence: confidence,
      originalText: ocrText
    };
  }

  // Fallback: If no standard format, just extract all digits and dots
  const digitsOnly = cleaned.replace(/[^\d.]/g, "");
  if (digitsOnly) {
    // If it looks like it lacks decimals, add them
    let formatted = digitsOnly;
    if (!formatted.includes(".")) {
       formatted += ".00";
    }
    return {
      amount: formatted + " THB",
      confidence: 60, // Low confidence since format was broken
      originalText: ocrText
    };
  }

  return { amount: "0.00 THB", confidence: 0, originalText: ocrText };
}
