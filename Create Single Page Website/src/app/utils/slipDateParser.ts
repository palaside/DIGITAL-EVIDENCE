const THAI_MONTHS = {
  "ม.ค.": "01", "มกราคม": "01",
  "ก.พ.": "02", "กุมภาพันธ์": "02",
  "มี.ค.": "03", "มีนาคม": "03",
  "เม.ย.": "04", "เมษายน": "04",
  "พ.ค.": "05", "พฤษภาคม": "05",
  "มิ.ย.": "06", "มิถุนายน": "06",
  "ก.ค.": "07", "กรกฎาคม": "07",
  "ส.ค.": "08", "สิงหาคม": "08",
  "ก.ย.": "09", "กันยายน": "09",
  "ต.ค.": "10", "ตุลาคม": "10",
  "พ.ย.": "11", "พฤศจิกายน": "11",
  "ธ.ค.": "12", "ธันวาคม": "12",
  "jan": "01", "feb": "02", "mar": "03", "apr": "04",
  "may": "05", "jun": "06", "jul": "07", "aug": "08",
  "sep": "09", "oct": "10", "nov": "11", "dec": "12"
};

/**
 * Normalizes slip dates while strictly keeping Buddhist Era (พ.ศ.) as requested by user.
 * e.g., "14 ต.ค. 66 10:30" -> "14 ต.ค. 2566 10:30"
 * e.g., "14 Oct 2023" -> "14 ต.ค. 2566"
 */
export function normalizeSlipDate(rawDate: string): { normalizedDate: string; confidence: number; originalText: string } {
  if (!rawDate) return { normalizedDate: "", confidence: 0, originalText: rawDate };

  let normalized = rawDate.trim();
  let confidence = 80; // Baseline

  // Convert English months to Thai abbreviation for consistency
  normalized = normalized.replace(/jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/gi, (match) => {
    const key = match.toLowerCase();
    const monthNum = THAI_MONTHS[key as keyof typeof THAI_MONTHS];
    const thAbbrs = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
    return thAbbrs[parseInt(monthNum) - 1];
  });

  // Handle 2-digit years ending (e.g., 66 -> 2566)
  // Look for 2 digits at the end of the date string or before time
  normalized = normalized.replace(/(\s|\.|-|\/)(\d{2})(\s|$)/, (match, prefix, year, suffix) => {
    const y = parseInt(year);
    // If it looks like a recent Thai year abbreviated (e.g., 66, 67, 68)
    if (y > 50 && y < 99) {
      return `${prefix}25${year}${suffix}`;
    }
    return match; // Not a year we can safely convert
  });

  // Convert A.D. (ค.ศ.) to B.E. (พ.ศ.)
  // Look for 4 digits that are likely 20xx
  normalized = normalized.replace(/(\b20\d{2}\b)/g, (match) => {
    const beYear = parseInt(match) + 543;
    confidence = 99; // Explicitly handled conversion
    return beYear.toString();
  });

  return {
    normalizedDate: normalized,
    confidence: confidence,
    originalText: rawDate
  };
}
