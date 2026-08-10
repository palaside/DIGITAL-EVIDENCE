/**
 * Titles, civil, academic, medical, military, and police ranks to remove
 * to get pure names for forensic evidence standards.
 */
const TITLES_TO_STRIP = [
  "พล.ต.อ.", "พล.ต.ท.", "พล.ต.ต.", "พ.ต.อ.", "พ.ต.ท.", "พ.ต.ต.",
  "ร.ต.อ.", "ร.ต.ท.", "ร.ต.ต.", "ดาบตำรวจ", "ด.ต.", "จ.ส.อ.", "จ.ส.ท.", "จ.ส.ต.", "ส.อ.", "ส.ท.", "ส.ต.",
  "พล.อ.", "พล.ท.", "พล.ต.", "พ.อ.", "พ.ท.", "พ.ต.", "ร.อ.", "ร.ท.", "ร.ต.",
  "ว่าที่ ร.ต.หญิง", "ว่าที่ ร.ต.", "ว่าที่ ร.อ.",
  "ศาสตราจารย์ ดร.", "ศ.ดร.", "รองศาสตราจารย์ ดร.", "รศ.ดร.", "ผู้ช่วยศาสตราจารย์ ดร.", "ผศ.ดร.",
  "ศาสตราจารย์", "ศ.", "รองศาสตราจารย์", "รศ.", "ผู้ช่วยศาสตราจารย์", "ผศ.", "ดร.",
  "นายแพทย์", "นพ.", "แพทย์หญิง", "พญ.", "ทันตแพทย์หญิง", "ทพ.ญ.", "ทันตแพทย์", "ทพ.",
  "เภสัชกรหญิง", "ภก.ญ.", "เภสัชกร", "ภก.", "สัตวแพทย์หญิง", "สพ.ญ.", "สัตวแพทย์", "สพ.บ.",
  "นาย", "นางสาว", "น.ส.", "นาง", "เด็กชาย", "ด.ช.", "เด็กหญิง", "ด.ญ.",
  "assoc. prof. dr.", "asst. prof. dr.", "prof. dr.", "assoc. prof.", "asst. prof.", "prof.", "dr.",
  "mr.", "mrs.", "miss", "ms.", "mr", "mrs", "miss", "ms", "dr", "prof"
];

/**
 * Cleans a person's name by stripping standard titles and ranks.
 */
export function cleanPersonName(rawName: string): { cleanName: string; confidence: number; originalText: string } {
  if (!rawName) return { cleanName: "", confidence: 0, originalText: rawName };

  let clean = rawName.trim();
  let modified = false;

  // Case insensitive title removal for English, and match Thai titles
  for (const title of TITLES_TO_STRIP) {
    const regex = new RegExp(`^${title.replace(/\./g, "\\.")}\\s*`, 'i');
    if (regex.test(clean)) {
      clean = clean.replace(regex, "").trim();
      modified = true;
    }
  }

  // Remove common OCR artifacts (like random bullets or brackets)
  clean = clean.replace(/^[-•*\[\]()]+/, "").trim();

  return {
    cleanName: clean,
    confidence: modified ? 99 : 90,
    originalText: rawName
  };
}

