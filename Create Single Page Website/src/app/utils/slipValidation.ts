import { THAI_BANKS, ThaiBank } from "./thaiBanks";

/**
 * Normalizes text for better matching:
 * - Converts to lowercase
 * - Removes extra spaces, punctuation, and special characters
 */
function normalizeText(text: string): string {
  if (!text) return "";
  let cleaned = text.toLowerCase();

  const ocrCorrections: Array<[RegExp, string]> = [
    [/กสี/g, "กสิ"],
    [/ไทบ/g, "ไทย"],
    [/กุรง/g, "กรุง"],
    [/ศ/g, "ส"],
    [/ธ\.ก\.*ส\.*|ธกส/g, "ธกส"],
    [/ทหานไทย/g, "ทหารไทย"],
  ];

  for (const [pattern, replacement] of ocrCorrections) {
    cleaned = cleaned.replace(pattern, replacement);
  }

  cleaned = cleaned
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
       currentScore = 100;
    }

    // Check against English Name
    const normNameEn = normalizeText(bank.nameEn);
    if (normalizedInput.includes(normNameEn) || normNameEn.includes(normalizedInput)) {
      currentScore = 100;
    }

    if (currentScore > highestScore) {
      highestScore = currentScore;
      bestMatch = bank;
    }
  }

  // 3. Fallback: fuzzy similarity for OCR typos.
  // Use a combination of Levenshtein and bigram similarity to catch partial matches.
  if (highestScore < 60) {
    for (const bank of THAI_BANKS) {
      const candidates = [bank.nameTh, bank.nameEn, ...bank.keywords];
      for (const candidate of candidates) {
        const normCandidate = normalizeText(candidate);
        if (!normCandidate || normCandidate.length < 3) continue;

        const levenshteinScore = getLevenshteinSimilarity(normalizedInput, normCandidate);
        const bigramScore = getBigramSimilarity(normalizedInput, normCandidate);
        const similarity = Math.max(levenshteinScore, bigramScore);

        if (similarity >= 0.65) {
          const score = Math.floor(similarity * 100);
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

function getLevenshteinSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const distance = levenshtein(a, b);
  const maxLength = Math.max(a.length, b.length);
  return maxLength === 0 ? 1 : 1 - distance / maxLength;
}

function getBigramSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const bigrams = (value: string) =>
    new Set(Array.from({ length: Math.max(value.length - 1, 0) }, (_, i) => value.slice(i, i + 2)));

  const aBigrams = bigrams(a);
  const bBigrams = bigrams(b);
  const intersection = new Set([...aBigrams].filter((item) => bBigrams.has(item)));
  const total = new Set([...aBigrams, ...bBigrams]).size;

  return total === 0 ? 0 : intersection.size / total;
}

function levenshtein(a: string, b: string): number {
  const matrix = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => j)
  );

  for (let i = 0; i <= a.length; i++) {
    matrix[i][0] = i;
  }

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[a.length][b.length];
}
