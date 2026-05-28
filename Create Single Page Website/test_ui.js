import { chromium } from "playwright";
import * as path from "path";
import * as fs from "fs";

(async () => {
  console.log("Starting Playwright UI automated tests...");
  
  // Launch browser
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Set viewport to a nice desktop size
  await page.setViewportSize({ width: 1280, height: 960 });
  
  const destDir = "C:\\Users\\PALASIDE\\.gemini\\antigravity-ide\\brain\\daac9585-e81b-4390-a7d8-27f8e21f7888";
  
  try {
    // 1. Open the running Vite local server
    console.log("Opening http://localhost:5174/ ...");
    await page.goto("http://localhost:5174/", { waitUntil: "networkidle" });
    
    // Wait for the page content to render
    await page.waitForTimeout(2000);
    
    // Screenshot 0: Initial Load (Dark Mode active by default!)
    console.log("Saving initial loaded screenshot...");
    await page.screenshot({ path: path.join(destDir, "test_0_loaded.png") });
    
    // 2. Click on "Slip OCR Mode" button to toggle modes
    console.log("Switching to Slip OCR Mode...");
    await page.click("button:has-text('Slip OCR Mode')");
    await page.waitForTimeout(1000);
    
    // 3. Upload a test image
    console.log("Uploading simulated image file...");
    const testFile = "d:\\Project\\หลักฐานดิจิทัล  DIGITAL EVIDENCE\\Create Single Page Website\\src\\imports\\_______________-_Copy-1.png";
    
    // Set file input files
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click("text=Click to upload multiple images");
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(testFile);
    await page.waitForTimeout(1500);
    
    // Screenshot 1: Uploaded State
    console.log("Saving uploaded state screenshot...");
    await page.screenshot({ path: path.join(destDir, "test_1_uploaded.png") });
    
    // 4. Click "Run Slip OCR" to initiate progress and analysis
    console.log("Clicking Run Slip OCR button...");
    await page.click("button:has-text('Run Slip OCR')");
    
    // Wait for progress simulation to count up and generate
    console.log("Waiting for progress tracker to complete...");
    await page.waitForTimeout(4000);
    
    // Screenshot 2: Generated A4 PDF with glowing OCR boxes
    console.log("Saving generated state A4 preview screenshot...");
    await page.screenshot({ path: path.join(destDir, "test_2_generated.png") });
    
    // 5. Click "View Slip OCR Table" to trigger Glassmorphism details modal
    console.log("Opening Slip OCR Details Table modal...");
    await page.click("button:has-text('View Slip OCR Table')");
    await page.waitForTimeout(1500);
    
    // Screenshot 3: Details Modal Overlay
    console.log("Saving OCR details modal screenshot...");
    await page.screenshot({ path: path.join(destDir, "test_3_modal.png") });
    
    // Close modal
    console.log("Closing modal...");
    await page.click(".fixed button:has(svg.lucide-x)");
    await page.waitForTimeout(500);
    
    // 6. Click "Send WinRAR Archive"
    console.log("Testing Send WinRAR compression...");
    await page.click("button:has-text('Send WinRAR Archive')");
    await page.waitForTimeout(1500);
    
    // Screenshot 4: WinRAR compression popup
    console.log("Saving WinRAR compression screenshot...");
    await page.screenshot({ path: path.join(destDir, "test_4_winrar.png") });
    
    console.log("All UI tests completed successfully! Screenshots saved.");
  } catch (error) {
    console.error("Test failed with error:", error);
  } finally {
    await browser.close();
  }
})();
