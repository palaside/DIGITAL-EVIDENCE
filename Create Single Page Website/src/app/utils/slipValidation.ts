import { THAI_BANKS, ThaiBank } from "./thaiBanks";

/**
 * Normalizes text for better matching:
 * - Converts to lowercase
 * - Removes extra spaces, punctuation, and special characters
 */
function normalizeText(text: string): string {
  if (!text) return "";
  let cleaned = text
    .toLowerCase()
    .replace(/[^\w\sก-๙]/g, "") // Keep alphanumeric and Thai characters
    .replace(/\s+/g, " ")
    .trim();
    
  // Remove "ธนาคาร" prefix which messes up fuzzy matching
  if (cleaned.startsWith("ธนาคาร")) {
    cleaned = cleaned.replace("ธนาคาร", "").trim();
  }
  return cleaned;
}

/**
 * Calculates a simple similarity score (Levenshtein distance based or simple includes)
 * For better accuracy in production, a string similarity library (like string-similarity) should be used.
 * Here we use a robust keyword matching approach which is very effective for bank names.
 */
export function verifyBankName(ocrText: string): {
  matchedBank: ThaiBank | null;
  confidence: number;
  originalText: string;
} {
  const normalizedInput = normalizeText(ocrText);
  if (!normalizedInput) {
    return { matchedBank: null, confidence: 0, originalText: ocrText };
  }

  // 1. Exact Abbreviation Match (Highest Confidence)
  // Check if the input exactly matches an abbreviation (e.g., "SCB", "KBANK")
  for (const bank of THAI_BANKS) {
    for (const abbr of bank.abbreviations) {
      if (normalizedInput.toUpperCase() === abbr.toUpperCase()) {
        return { matchedBank: bank, confidence: 100, originalText: ocrText };
      }
    }
  }

  // 2. Keyword matching
  // Check if any keyword or name is contained in the OCR text, or vice versa
  let bestMatch: ThaiBank | null = null;
  let highestScore = 0;

  for (const bank of THAI_BANKS) {
    let currentScore = 0;

    // Check against keywords
    for (const keyword of bank.keywords) {
      const normalizedKeyword = normalizeText(keyword);
      if (normalizedInput.includes(normalizedKeyword)) {
        // Longer keywords matching gives higher confidence
        const score = 60 + (normalizedKeyword.length * 2);
        if (score > currentScore) currentScore = score;
      }
    }

    // Check against Thai Name
    const normNameTh = normalizeText(bank.nameTh);
    if (normalizedInput.includes(normNameTh) || normNameTh.includes(normalizedInput)) {
       currentScore = 95;
    }

    // Check against English Name
    const normNameEn = normalizeText(bank.nameEn);
    if (normalizedInput.includes(normNameEn) || normNameEn.includes(normalizedInput)) {
      currentScore = 95;
    }

    if (currentScore > highestScore) {
      highestScore = currentScore;
      bestMatch = bank;
    }
  }

  // 3. Fallback: Character overlap (Fuzzy-like behavior) for typos
  // If we still have no good match, check for typos in keywords
  if (highestScore < 50) {
    for (const bank of THAI_BANKS) {
      for (const keyword of bank.keywords) {
        const normKeyword = normalizeText(keyword);
        if (normKeyword.length < 3) continue; // Skip very short keywords

        let matchCount = 0;
        // Count how many characters match in sequence
        for (let i = 0; i < normKeyword.length; i++) {
          if (normalizedInput.includes(normKeyword.substring(i, i + 2))) {
            matchCount++;
          }
        }
        
        const ratio = matchCount / (normKeyword.length - 1);
        if (ratio > 0.7) { // 70% of character pairs match
          const score = Math.floor(ratio * 70);
          if (score > highestScore) {
            highestScore = score;
            bestMatch = bank;
          }
        }
      }
    }
  }

  // Cap confidence at 99% for non-exact matches to indicate it was corrected
  const finalConfidence = Math.min(highestScore, 99);

  return {
    matchedBank: highestScore > 40 ? bestMatch : null, // Threshold of 40 to accept a match
    confidence: highestScore > 40 ? finalConfidence : 0,
    originalText: ocrText,
  };
}

/**
 * Formats the bank name for display
 */
export function formatBankName(bank: ThaiBank | null, originalText: string): string {
  if (!bank) return originalText || "Unknown Bank";
  return `${bank.abbreviations[0] || bank.nameEn} (${bank.nameTh})`;
}
