import { expect, test } from "playwright/test";
import { uploadChatFixtures } from "./helpers/fixtures";

test("send project posts canonical source files and generated artifacts to Flask package endpoint", async ({ page }, testInfo) => {
  let capturedMultipartBody = "";

  await page.route("**/api/package-project", async (route) => {
    capturedMultipartBody = route.request().postData() ?? "";
    await route.fulfill({
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": 'attachment; filename="acceptance-package.zip"',
      },
      body: "fake zip bytes",
    });
  });

  await page.goto("/");
  await page.getByRole("button", { name: /^Chat$/ }).click();

  const files = await uploadChatFixtures(testInfo);
  await page.locator('input[type="file"]').setInputFiles(files);
  await page.getByRole("button", { name: /Start Generation/i }).click();
  await expect(page.getByText("Ready").first()).toBeVisible();

  await page.getByRole("button", { name: /Send to System/i }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /Create Archive/i }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe("acceptance-package.zip");
  expect(capturedMultipartBody).toContain('name="archive_format"');
  expect(capturedMultipartBody).toContain("zip");
  expect(capturedMultipartBody).toContain('name="mode"');
  expect(capturedMultipartBody).toContain("chat");
  expect(capturedMultipartBody).toContain('name="source_files"');
  expect(capturedMultipartBody).toContain('name="artifacts"');
});
