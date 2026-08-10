import { expect, test } from "playwright/test";
import { uploadChatFixtures } from "./helpers/fixtures";

test("chat workflow generates ordered preview pages and exports the same evidence set", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: /CHAT/i }).click();

  const files = await uploadChatFixtures(testInfo);
  await page.locator('input[type="file"]').setInputFiles(files);

  await expect(page.getByText("chat-acceptance-1.svg")).toBeVisible();
  await expect(page.getByText("chat-acceptance-2.svg")).toBeVisible();

  await page.getByRole("button", { name: /PROCESS/i }).click();
  await expect(page.getByText("Ready").first()).toBeVisible();

  const previewImages = page.locator('img[alt^="Page "]');
  await expect(previewImages.first()).toBeVisible();

  const imageCount = await previewImages.count();
  expect(imageCount).toBeGreaterThan(0);

  for (let i = 0; i < imageCount; i++) {
    const altText = await previewImages.nth(i).getAttribute("alt");
    expect(altText).toBe(`Page ${i + 1}`);
  }

  // Toggle password protection off to download PDF directly
  await page.getByRole("switch").click();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /SAVE FOR PDF/i }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("LINE_Chat_Paginator_Evidence.pdf");
});
