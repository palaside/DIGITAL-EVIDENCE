import fs from "node:fs";
import path from "node:path";
import { chromium } from "../Create Single Page Website/node_modules/playwright/index.mjs";

const filePath = String.raw`D:\EDOK\แชทที่ 3\chatv3 (10).jpg`;
const outputPath = String.raw`D:\Project\หลักฐานดิจิทัล  DIGITAL EVIDENCE\tmp-tests\chat20-analysis\chatv3-10-debug.json`;

const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage();
await page.goto("http://127.0.0.1:5173/", { waitUntil: "domcontentloaded", timeout: 90000 });

const base64 = fs.readFileSync(filePath).toString("base64");
const imageUrl = `data:image/jpeg;base64,${base64}`;

const result = await page.evaluate(async ({ imageUrl, fileName }) => {
  const mod = await import("http://127.0.0.1:5173/src/app/utils/pagination.ts");
  const img = new Image();
  img.src = imageUrl;
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
  });
  const segments = await mod.segmentChatImage(imageUrl);
  return Promise.all(
    segments.map(
      (segment) =>
        new Promise((resolve) => {
          const image = new Image();
          image.onload = () =>
            resolve({
              fileName,
              naturalHeight: image.naturalHeight,
            });
          image.src = segment.canvasDataUrl;
        })
    )
  );
}, { imageUrl, fileName: path.basename(filePath) });

fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
await browser.close();
console.log(JSON.stringify({ outputPath, result }, null, 2));
