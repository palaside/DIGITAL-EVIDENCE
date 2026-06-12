import fs from "node:fs";
import path from "node:path";

const resultsPath = path.resolve(
  "D:/Project/หลักฐานดิจิทัล  DIGITAL EVIDENCE/tmp-tests/chat20-analysis/segments-by-source.json"
);

if (!fs.existsSync(resultsPath)) {
  throw new Error(`Missing analysis file: ${resultsPath}`);
}

const payload = JSON.parse(fs.readFileSync(resultsPath, "utf8"));
const results = Array.isArray(payload) ? payload : payload.results ?? [];

function requireFile(name) {
  const found = results.find((entry) => entry.fileName === name);
  if (!found) {
    throw new Error(`Missing file result for ${name}`);
  }
  return found;
}

const chat7 = requireFile("chatv3 (7).jpg");
const chat9 = requireFile("chatv3 (9).jpg");
const chat10 = requireFile("chatv3 (10).jpg");
const chat14 = requireFile("chatv3 (14).jpg");

const overlongThreshold = 2500;
const tinyThreshold = 320;

if (chat7.segmentHeights.some((height) => height >= overlongThreshold)) {
  throw new Error(
    `chatv3 (7) still contains an overlong segment >= ${overlongThreshold}px: ${chat7.segmentHeights.join(", ")}`
  );
}

for (const [name, entry] of [
  ["chatv3 (9)", chat9],
  ["chatv3 (10)", chat10],
  ["chatv3 (14)", chat14],
]) {
  if (entry.segmentHeights.some((height) => height < tinyThreshold)) {
    throw new Error(`${name} regressed to tiny segment < ${tinyThreshold}px: ${entry.segmentHeights.join(", ")}`);
  }
}

console.log(
  JSON.stringify(
    {
      ok: true,
      checked: {
        "chatv3 (7)": chat7.segmentHeights,
        "chatv3 (9)": chat9.segmentHeights,
        "chatv3 (10)": chat10.segmentHeights,
        "chatv3 (14)": chat14.segmentHeights,
      },
    },
    null,
    2
  )
);
