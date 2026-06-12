import fs from "node:fs";
import path from "node:path";
import { chromium } from "../Create Single Page Website/node_modules/playwright/index.mjs";

const sourceDir = String.raw`D:\EDOK\แชทที่ 3`;
const outputDir = String.raw`D:\Project\หลักฐานดิจิทัล  DIGITAL EVIDENCE\tmp-tests\chat10-analysis`;

fs.mkdirSync(outputDir, { recursive: true });

const files = fs
  .readdirSync(sourceDir)
  .filter((name) => /^chatv3 \(\d+\)\.jpg$/i.test(name))
  .sort((a, b) => {
    const aNum = Number(a.match(/\((\d+)\)/)?.[1] ?? 0);
    const bNum = Number(b.match(/\((\d+)\)/)?.[1] ?? 0);
    return aNum - bNum;
  })
  .slice(0, 10)
  .map((name) => path.join(sourceDir, name));

const browser = await chromium.launch({
  channel: "msedge",
  headless: true,
});

const page = await browser.newPage({
  viewport: { width: 1600, height: 2200 },
});

await page.goto("http://127.0.0.1:5173/", { waitUntil: "domcontentloaded", timeout: 90000 });
await page.setInputFiles('input[type="file"]', files);
await page.getByRole("button", { name: "Start Generation" }).click();

await page.waitForFunction(
  () => document.querySelectorAll('img[alt^="A4 Page"]').length > 0,
  { timeout: 180000 }
);

await page.waitForTimeout(1500);

const count = await page.locator('img[alt^="A4 Page"]').count();
const summary = [];

for (let i = 0; i < count; i++) {
  const img = page.locator('img[alt^="A4 Page"]').nth(i);
  const card = img.locator("..");
  const box = await card.boundingBox();
  const meta = await img.evaluate((node) => ({
    naturalWidth: node.naturalWidth,
    naturalHeight: node.naturalHeight,
    clientWidth: node.clientWidth,
    clientHeight: node.clientHeight,
    src: node.getAttribute("src") ?? "",
  }));

  const screenshotPath = path.join(outputDir, `page-${String(i + 1).padStart(3, "0")}.png`);
  if (box) {
    await card.screenshot({ path: screenshotPath });
  }

  summary.push({
    page: i + 1,
    screenshotPath,
    ...meta,
  });
}

fs.writeFileSync(
  path.join(outputDir, "summary.json"),
  JSON.stringify(
    {
      sourceFiles: files,
      pageCount: count,
      generatedPages: summary,
    },
    null,
    2
  )
);

await browser.close();
console.log(JSON.stringify({ outputDir, sourceCount: files.length, pageCount: count }, null, 2));
