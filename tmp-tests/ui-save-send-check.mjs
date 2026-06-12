import playwrightPkg from "../Create Single Page Website/node_modules/playwright/index.js";
import path from "node:path";

const { chromium } = playwrightPkg;

const appUrl = "http://127.0.0.1:5173/";
const sampleImage = path.resolve(
  "D:/Project/หลักฐานดิจิทัล  DIGITAL EVIDENCE/Create Single Page Website/src/imports/digital_evidence_logo_full.png"
);

const browser = await chromium.launch({ headless: true, channel: "msedge" });
const context = await browser.newContext({ acceptDownloads: true });
const page = await context.newPage();

try {
  await page.goto(appUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForSelector('input[type="file"]', { state: "attached", timeout: 30000 });

  await page.locator('input[type="file"]').setInputFiles(sampleImage);
  await page.getByRole("button", { name: "Start Generation" }).click();

  await page.waitForFunction(() => {
    const saveButton = Array.from(document.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Save Evidence")
    );
    return saveButton && !saveButton.hasAttribute("disabled");
  }, { timeout: 20000 });

  const saveDownloadPromise = page.waitForEvent("download", { timeout: 15000 });
  await page.getByRole("button", { name: "Save Evidence" }).click();
  const saveDownload = await saveDownloadPromise;
  const saveFilename = saveDownload.suggestedFilename();
  await saveDownload.saveAs(path.resolve("D:/Project/หลักฐานดิจิทัล  DIGITAL EVIDENCE/tmp-tests", saveFilename));

  await page.getByRole("button", { name: "Send to System" }).click();
  await page.waitForSelector("text=Archive format", { timeout: 5000 });
  const packageDownloadPromise = page.waitForEvent("download", { timeout: 20000 });
  await page.getByRole("button", { name: "Create Archive" }).click();
  const packageDownload = await packageDownloadPromise;
  const packageFilename = packageDownload.suggestedFilename();
  await packageDownload.saveAs(path.resolve("D:/Project/หลักฐานดิจิทัล  DIGITAL EVIDENCE/tmp-tests", packageFilename));

  console.log(JSON.stringify({
    saveFilename,
    packageFilename,
  }, null, 2));
} finally {
  await browser.close();
}
