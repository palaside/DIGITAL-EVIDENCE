/**
 * Titles to remove to get the pure name for cross-checking databases.
 */
const TITLES_TO_STRIP = [
  "นาย", "นางสาว", "น.ส.", "นาง", "เด็กชาย", "ด.ช.", "เด็กหญิง", "ด.ญ.",
  "ว่าที่ ร.ต.", "ว่าที่ ร.ต.หญิง", "mr.", "mrs.", "miss", "ms.", "mr", "mrs", "miss", "ms"
];

/**
 * Cleans a person's name by stripping standard titles.
 */
export function cleanPersonName(rawName: string): { cleanName: string; confidence: number; originalText: string } {
  if (!rawName) return { cleanName: "", confidence: 0, originalText: rawName };

  let clean = rawName.trim();
  let modified = false;

  // Case insensitive title removal for English, and match Thai titles
  for (const title of TITLES_TO_STRIP) {
    // Regex to match title at the beginning, accounting for possible spaces
    // e.g., "นาย สมชาย", "น.ส. สมหญิง", "Mr. John"
    const regex = new RegExp(`^${title.replace(/\./g, "\\.")}\\s*`, 'i');
    if (regex.test(clean)) {
      clean = clean.replace(regex, "");
      modified = true;
      break; // Usually only one title at the start
    }
  }

  // Remove common OCR artifacts (like random bullets or brackets)
  clean = clean.replace(/^[-•*\[\]()]+/, "").trim();

  return {
    cleanName: clean,
    confidence: modified ? 99 : 90, // High confidence if we successfully identified and stripped a title
    originalText: rawName
  };
}
