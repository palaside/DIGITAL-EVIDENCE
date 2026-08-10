import { expect, test } from "playwright/test";
import { uploadChatFixtures } from "./helpers/fixtures";

test("client-side ZIP packaging creates and downloads a zip package successfully", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: /CHAT/i }).click();

  const files = await uploadChatFixtures(testInfo);
  await page.locator('input[type="file"]').setInputFiles(files);
  await page.getByRole("button", { name: /PROCESS/i }).click();
  await expect(page.getByText("Ready").first()).toBeVisible();

  // Click Save for Winrar button to open the packaging modal
  await page.getByRole("button", { name: /SAVE FOR WINRAR/i }).click();
  
  // Select ZIP format inside modal
  await page.getByRole("button", { name: /^ZIP$/ }).click();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /Create Archive/i }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe("digital-evidence-package.zip");
});

test("client-side WinRAR SFX packaging creates and downloads an exe package successfully", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: /CHAT/i }).click();

  const files = await uploadChatFixtures(testInfo);
  await page.locator('input[type="file"]').setInputFiles(files);
  await page.getByRole("button", { name: /PROCESS/i }).click();
  await expect(page.getByText("Ready").first()).toBeVisible();

  // Click Save for Winrar to open the packaging modal
  await page.getByRole("button", { name: /SAVE FOR WINRAR/i }).click();
  
  // Select RAR format inside modal
  await page.getByRole("button", { name: /^RAR$/ }).click();

  // Fill in password
  await page.locator('input[type="password"]').first().fill("SecurePassword123!");
  
  // Fill in confirm password
  await page.locator('input[type="password"]').last().fill("SecurePassword123!");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /Create Archive/i }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe("digital-evidence-package.rar");
});
