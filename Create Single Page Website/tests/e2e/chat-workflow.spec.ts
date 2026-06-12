import { expect, test } from "playwright/test";
import { uploadChatFixtures } from "./helpers/fixtures";

test("chat workflow generates ordered preview pages and exports the same evidence set", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^Chat$/ }).click();

  const files = await uploadChatFixtures(testInfo);
  await page.locator('input[type="file"]').setInputFiles(files);

  await expect(page.getByText("chat-acceptance-1.svg")).toBeVisible();
  await expect(page.getByText("chat-acceptance-2.svg")).toBeVisible();

  await page.getByRole("button", { name: /Start Generation/i }).click();
  await expect(page.getByText("Ready").first()).toBeVisible();

  const pageLabels = page.getByText(/Page \d+ .+ Segmented Evidence/);
  await expect(pageLabels.first()).toBeVisible();

  const labelTexts = await pageLabels.allTextContents();
  expect(labelTexts.length).toBeGreaterThan(0);
  labelTexts.forEach((text, index) => {
    expect(text).toContain(`Page ${index + 1}`);
  });

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /Save Evidence/i }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("LINE_Chat_Paginator_Evidence.pdf");
});
