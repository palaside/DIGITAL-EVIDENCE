import fs from "node:fs";
import path from "node:path";
import { chromium } from "../Create Single Page Website/node_modules/playwright/index.mjs";

const sourceDir = String.raw`D:\EDOK\แชทที่ 3`;
const outputPath = String.raw`D:\Project\หลักฐานดิจิทัล  DIGITAL EVIDENCE\tmp-tests\chat20-analysis\segments-by-source.json`;

const files = fs
  .readdirSync(sourceDir)
  .filter((name) => /^chatv3 \(\d+\)\.jpg$/i.test(name))
  .sort((a, b) => {
    const aNum = Number(a.match(/\((\d+)\)/)?.[1] ?? 0);
    const bNum = Number(b.match(/\((\d+)\)/)?.[1] ?? 0);
    return aNum - bNum;
  })
  .slice(0, 20)
  .map((name) => path.join(sourceDir, name));

const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage();
await page.goto("http://127.0.0.1:5173/", { waitUntil: "domcontentloaded", timeout: 90000 });

const results = [];
for (const filePath of files) {
  const base64 = fs.readFileSync(filePath).toString("base64");
  const imageUrl = `data:image/jpeg;base64,${base64}`;
  const result = await page.evaluate(async ({ imageUrl, fileName }) => {
    const mod = await import("http://127.0.0.1:5173/src/app/utils/pagination.ts");
    const segments = await mod.segmentChatImage(imageUrl);
    return {
      fileName,
      count: segments.length,
      segmentHeights: await Promise.all(
        segments.map(
          (segment) =>
            new Promise((resolve) => {
              const img = new Image();
              img.onload = () => resolve(img.naturalHeight);
              img.src = segment.canvasDataUrl;
            })
        )
      ),
    };
  }, { imageUrl, fileName: path.basename(filePath) });
  results.push(result);
}

fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
await browser.close();
console.log(JSON.stringify({ outputPath, results }, null, 2));
