from pathlib import Path
path = Path('src/app/utils/slipValidation.ts')
text = path.read_text(encoding='utf-8')
normalized = text.replace('\r\n', '\n')
old = '''  let cleaned = text
    .toLowerCase()
    .replace(/[^\w\sก-๙]/g, "") // Keep alphanumeric and Thai characters
    .replace(/\s+/g, " ")
    .trim();
'''
new = '''  let cleaned = text.toLowerCase();

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
'''
if old not in normalized:
    raise SystemExit('old block not found')
updated = normalized.replace(old, new, 1)
path.write_text(updated.replace('\n', '\r\n'), encoding='utf-8')
print('updated')
