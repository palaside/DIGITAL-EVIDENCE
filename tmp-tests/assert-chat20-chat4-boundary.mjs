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
const chat4 = results.find((entry) => entry.fileName === "chatv3 (4).jpg");

if (!chat4) {
  throw new Error("Missing file result for chatv3 (4).jpg");
}

const minimumAcceptableSegmentHeight = 700;
const undersized = chat4.segmentHeights.filter(
  (height) => height < minimumAcceptableSegmentHeight
);

if (undersized.length > 0) {
  throw new Error(
    `chatv3 (4) still contains undersized segment(s) < ${minimumAcceptableSegmentHeight}px: ${chat4.segmentHeights.join(", ")}`
  );
}

console.log(
  JSON.stringify(
    {
      ok: true,
      checked: {
        "chatv3 (4)": chat4.segmentHeights,
      },
    },
    null,
    2
  )
);
