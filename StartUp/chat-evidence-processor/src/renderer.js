const fs = require("fs");
const path = require("path");
const { jsPDF } = require("jspdf");
const { ipcRenderer } = require("electron");
const { fitBoxToFrame, findActiveBounds, findRollbackCutY } = require("./layout-fit");

const isTestMode = process.argv.includes("--test");

// DOM elements
const btnScan = document.getElementById("btn-scan");
const btnProcess = document.getElementById("btn-process");
const logOutput = document.getElementById("log-output");
const fileCountEl = document.getElementById("file-count");
const projectPathEl = document.getElementById("project-path");
const lastOutputEl = document.getElementById("last-output");

// Paths
const projectPath = path.resolve(__dirname, "..");
const inputsDir = path.join(projectPath, "inputs");
const outputsDir = path.join(projectPath, "outputs");

// Ensure folders exist
if (!fs.existsSync(inputsDir)) fs.mkdirSync(inputsDir, { recursive: true });
if (!fs.existsSync(outputsDir)) fs.mkdirSync(outputsDir, { recursive: true });

// Initialize UI status
projectPathEl.textContent = projectPath;
scanFiles();

if (isTestMode) {
  addLog("Test mode active. Auto-running pipeline...", "system");
  setTimeout(() => {
    runPipeline();
  }, 500);
}

// Event listeners
btnScan.addEventListener("click", () => {
  scanFiles();
  addLog("System scanned inputs/ directory.", "system");
});

btnProcess.addEventListener("click", () => {
  runPipeline();
});

// Logs text helper
function addLog(text, type = "info") {
  const line = document.createElement("div");
  line.className = `log-line ${type}`;
  line.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
  logOutput.appendChild(line);
  logOutput.scrollTop = logOutput.scrollHeight;
  if (isTestMode) {
    console.log(`[Renderer] [${type.toUpperCase()}] ${text}`);
  }
}

// 1. Scan staged files
function scanFiles() {
  try {
    if (!fs.existsSync(inputsDir)) {
      fileCountEl.textContent = "0 files";
      return [];
    }
    const files = fs.readdirSync(inputsDir);
    const imageFiles = files
      .filter((file) => {
        const ext = path.extname(file).toLowerCase();
        return [".png", ".jpg", ".jpeg", ".webp", ".bmp"].includes(ext);
      })
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

    fileCountEl.textContent = `${imageFiles.length} file(s)`;
    return imageFiles;
  } catch (error) {
    addLog(`Error scanning files: ${error.message}`, "error");
    return [];
  }
}

// Helper: load local image into HTML Image object
function loadImage(filePath) {
  return new Promise((resolve, reject) => {
    try {
      const ext = path.extname(filePath).replace(".", "");
      const data = fs.readFileSync(filePath);
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(new Error(`Image load failed for ${filePath}`));
      img.src = `data:image/${ext};base64,${data.toString("base64")}`;
    } catch (err) {
      reject(err);
    }
  });
}

// Helper: sliding-window MAD pixel matching
async function detectOverlap(img1, img2) {
  // Normalize comparison width
  const compareWidth = 600;
  const scale1 = compareWidth / img1.width;
  const scale2 = compareWidth / img2.width;

  const h1 = Math.round(img1.height * scale1);
  const h2 = Math.round(img2.height * scale2);

  const maxSearchHeight = Math.min(600, h1, h2);
  const minOverlap = 60;
  const step = 4;
  const madThreshold = 14.0;

  // Render bottom strip of img1
  const canvas1 = document.createElement("canvas");
  canvas1.width = compareWidth;
  canvas1.height = maxSearchHeight;
  const ctx1 = canvas1.getContext("2d");
  ctx1.drawImage(
    img1,
    0, img1.height - Math.round(maxSearchHeight / scale1), img1.width, Math.round(maxSearchHeight / scale1),
    0, 0, compareWidth, maxSearchHeight
  );
  const pix1 = ctx1.getImageData(0, 0, compareWidth, maxSearchHeight).data;

  // Render top strip of img2
  const canvas2 = document.createElement("canvas");
  canvas2.width = compareWidth;
  canvas2.height = maxSearchHeight;
  const ctx2 = canvas2.getContext("2d");
  ctx2.drawImage(
    img2,
    0, 0, img2.width, Math.round(maxSearchHeight / scale2),
    0, 0, compareWidth, maxSearchHeight
  );
  const pix2 = ctx2.getImageData(0, 0, compareWidth, maxSearchHeight).data;

  // Sliding search
  for (let k = maxSearchHeight; k >= minOverlap; k -= step) {
    let diff = 0;
    let samples = 0;

    for (let r = 0; r < k; r += 5) {
      const r1 = maxSearchHeight - k + r; // bottom of canvas1
      const r2 = r;                       // top of canvas2

      const rowBase1 = r1 * compareWidth;
      const rowBase2 = r2 * compareWidth;

      for (let col = 0; col < compareWidth; col += 6) {
        const i1 = (rowBase1 + col) * 4;
        const i2 = (rowBase2 + col) * 4;

        diff += Math.abs(pix1[i1] - pix2[i2]) +
                Math.abs(pix1[i1+1] - pix2[i2+1]) +
                Math.abs(pix1[i1+2] - pix2[i2+2]);
        samples += 3;
      }
    }

    const mad = diff / samples;
    if (mad < madThreshold) {
      // Return overlap size relative to img2 scale
      const originalOverlap = Math.round(k / scale2);
      return originalOverlap;
    }
  }

  return 0; // No overlap
}

// 2. Main Processing Pipeline
async function runPipeline() {
  const images = scanFiles();
  if (images.length === 0) {
    addLog("Failed: No staged images found in inputs/ directory.", "error");
    alert("Please place chat screenshots in the inputs/ folder and scan again.");
    return;
  }

  addLog(`Starting evidence generation for ${images.length} files...`, "system");
  btnProcess.disabled = true;

  try {
    const loadedImages = [];
    const sourceMetadata = [];

    // Load all images and calculate SHA256 hashes
    const crypto = require("crypto");
    for (let i = 0; i < images.length; i++) {
      const fileName = images[i];
      const filePath = path.join(inputsDir, fileName);
      addLog(`Loading image ${i + 1}/${images.length}: ${fileName}...`);
      
      const fileBuffer = fs.readFileSync(filePath);
      const hash = crypto.createHash("sha256").update(fileBuffer).digest("hex");
      
      const img = await loadImage(filePath);
      loadedImages.push(img);
      sourceMetadata.push({ fileName, hash, width: img.width, height: img.height });
    }

    // Stitching Stage
    addLog("Detecting overlaps and stitching screenshots...", "info");
    const trimOffsets = new Array(images.length).fill(0);
    
    for (let i = 0; i < loadedImages.length - 1; i++) {
      const overlap = await detectOverlap(loadedImages[i], loadedImages[i + 1]);
      if (overlap > 0) {
        trimOffsets[i + 1] = overlap;
        addLog(`Overlap detected between files ${i+1} and ${i+2}: ${overlap}px. Auto-trim enabled.`, "success");
      } else {
        addLog(`No overlap detected between files ${i+1} and ${i+2}.`, "warning");
      }
    }

    // Compute totalHeight and gather commands
    const normalizedWidth = 800;
    let totalHeight = 0;
    const drawCommands = [];

    for (let i = 0; i < loadedImages.length; i++) {
      const img = loadedImages[i];
      const scale = normalizedWidth / img.width;
      const trimPx = trimOffsets[i];
      const imgH = img.height - trimPx;
      const scaledH = Math.round(imgH * scale);

      drawCommands.push({
        img,
        trimY: trimPx,
        trimH: imgH,
        destY: totalHeight,
        destH: scaledH,
        fileName: images[i]
      });

      totalHeight += scaledH;
    }

    addLog(`Stitching mapped. Virtual Canvas height: ${totalHeight}px.`, "success");

    // Scan for gap valleys slice-by-slice to stay within Chromium's canvas limits
    addLog("Scanning images for Gap Valleys...", "info");
    const solidRowActivity = new Array(totalHeight).fill(0);

    for (const cmd of drawCommands) {
      if (cmd.destH <= 0) continue;
      
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = normalizedWidth;
      tempCanvas.height = cmd.destH;
      const tempCtx = tempCanvas.getContext("2d");
      
      // Draw background color first
      tempCtx.fillStyle = "#ffffff";
      tempCtx.fillRect(0, 0, normalizedWidth, cmd.destH);

      // Draw image
      tempCtx.drawImage(
        cmd.img,
        0, cmd.trimY, cmd.img.width, cmd.trimH,
        0, 0, normalizedWidth, cmd.destH
      );

      const tempImgData = tempCtx.getImageData(0, 0, normalizedWidth, cmd.destH).data;

      // Analyze row variance (contrast activity)
      for (let y = 0; y < cmd.destH; y++) {
        let activeDiff = 0;
        let samples = 0;
        const rowOffset = y * normalizedWidth;
        const sampleStep = 5;

        for (let x = sampleStep; x < normalizedWidth; x += sampleStep) {
          const idx = (rowOffset + x) * 4;
          const idxPrev = (rowOffset + x - sampleStep) * 4;
          
          const diff = Math.abs(tempImgData[idx] - tempImgData[idxPrev]) +
                       Math.abs(tempImgData[idx+1] - tempImgData[idxPrev+1]) +
                       Math.abs(tempImgData[idx+2] - tempImgData[idxPrev+2]);
          activeDiff += diff;
          samples++;
        }

        solidRowActivity[cmd.destY + y] = activeDiff / samples;
      }
    }

    // A4 Dimension Settings
    const a4Ratio = 1.414;
    const pageHeight = Math.round(normalizedWidth * a4Ratio); // ~1131px (A4 page height)
    const usablePageHeight = 1090; // Usable height for chat content (fits inside the green frame)
    const frameX = 76;
    const frameY = 107;
    const frameWidth = 648;
    const frameHeight = 895;
    const scaleToFrameWidth = frameWidth / normalizedWidth; // 648 / 800 = 0.81
    
    // Find optimal cut points
    const cutPoints = [0];
    const pageFits = [];
    let currentY = 0;
    const auditCuts = [];

    addLog(`Standard page height: ${pageHeight}px (Usable chat content height: ${usablePageHeight}px). Starting pagination...`, "info");

    // Helper to calculate smoothed row activity around Y
    function getSmoothActivity(y) {
      const windowSize = 5; // average over y-5 to y+5
      let sum = 0;
      let count = 0;
      for (let i = -windowSize; i <= windowSize; i++) {
        const targetY = y + i;
        if (targetY >= 0 && targetY < totalHeight) {
          sum += solidRowActivity[targetY];
          count++;
        }
      }
      return count > 0 ? sum / count : 0;
    }

    while (currentY < totalHeight) {
      const idealCutY = currentY + usablePageHeight;

      if (idealCutY >= totalHeight) {
        cutPoints.push(totalHeight);
        auditCuts.push({ y: totalHeight, type: "end_of_image", score: 100 });
        break;
      }

      // Search range for gap valleys (from 420px above ideal down to 30px below ideal)
      const searchStart = idealCutY - 420;
      const searchEnd = Math.min(totalHeight - 50, idealCutY + 30);
      
      let bestCutY = idealCutY;
      let minScore = Infinity;
      let foundGap = false;
      const backgroundThreshold = 4.5; // Threshold for clean background activity (allows light camo pattern texture)

      for (let y = searchStart; y <= searchEnd; y++) {
        const smoothActivity = getSmoothActivity(y);
        
        // Calculate penalty score: lower is better
        // Activity penalty has high weight to avoid text/image, distance penalty keeps it close to idealCutY
        const distPenalty = Math.abs(y - idealCutY) * 0.08;
        const activityPenalty = smoothActivity * 20;
        const score = activityPenalty + distPenalty;

        if (smoothActivity < backgroundThreshold && score < minScore) {
          minScore = score;
          bestCutY = y;
          foundGap = true;
        }
      }

      if (foundGap) {
        const actualActivity = solidRowActivity[bestCutY];
        const contentHeight = bestCutY - currentY;
        const contentBoxHeight = contentHeight * scaleToFrameWidth;
        const fitPlan = fitBoxToFrame({
          boxWidth: frameWidth,
          boxHeight: contentBoxHeight,
          frameWidth,
          frameHeight,
          step: 0.02,
          minScale: 0.1,
          maxScale: 1,
          alignX: "center",
          alignY: "top",
        });

        const pageScale = fitPlan ? fitPlan.scale : Math.max(0.1, Math.min(1.0, frameHeight / contentBoxHeight));
        pageFits.push({
          scale: pageScale,
          pass: fitPlan ? fitPlan.pass : "split",
          width: fitPlan ? fitPlan.width : frameWidth * pageScale,
          height: fitPlan ? fitPlan.height : contentBoxHeight * pageScale,
          x: fitPlan ? fitPlan.x : 0,
          y: fitPlan ? fitPlan.y : 0,
        });
        cutPoints.push(bestCutY);
        auditCuts.push({ y: bestCutY, type: "gap_valley", score: Math.max(0, 100 - minScore) });
        addLog(`Optimal cut point found at Y=${bestCutY}px (Gap Valley, activity=${actualActivity.toFixed(2)}, scale=${pageScale.toFixed(3)})`, "success");
      } else {
        // Fallback cuts: rollback to before the active block rather than splitting it.
        const rollbackCutY = findRollbackCutY(solidRowActivity, currentY, idealCutY, 4.5, 8);
        const contentHeight = rollbackCutY - currentY;
        const contentBoxHeight = contentHeight * scaleToFrameWidth;
        const fitPlan = fitBoxToFrame({
          boxWidth: frameWidth,
          boxHeight: contentBoxHeight,
          frameWidth,
          frameHeight,
          step: 0.02,
          minScale: 0.1,
          maxScale: 1,
          alignX: "center",
          alignY: "top",
        });

        const pageScale = fitPlan ? fitPlan.scale : Math.max(0.1, Math.min(1.0, frameHeight / contentBoxHeight));
        pageFits.push({
          scale: pageScale,
          pass: fitPlan ? fitPlan.pass : "split",
          width: fitPlan ? fitPlan.width : frameWidth * pageScale,
          height: fitPlan ? fitPlan.height : contentBoxHeight * pageScale,
          x: fitPlan ? fitPlan.x : 0,
          y: fitPlan ? fitPlan.y : 0,
        });
        cutPoints.push(rollbackCutY);
        auditCuts.push({ y: rollbackCutY, type: "fallback_rollback", score: 0 });
        addLog(`No optimal gap valley found. Rolled back cut to Y=${rollbackCutY}px to avoid splitting an object.`, "warning");
        bestCutY = rollbackCutY;
      }

      currentY = bestCutY;
    }

    // Rendering pages
    addLog(`Creating ${cutPoints.length - 1} page(s)...`, "info");
    const pageCanvases = [];
    const timestampStr = new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });

    for (let i = 0; i < cutPoints.length - 1; i++) {
      const startY = cutPoints[i];
      const endY = cutPoints[i + 1];
      const activeBounds = findActiveBounds(solidRowActivity, startY, endY, 4.5, 8);
      const renderStartY = activeBounds.hasActiveContent ? activeBounds.startY : startY;
      const renderEndY = activeBounds.hasActiveContent ? activeBounds.endY : endY;
      const contentHeight = renderEndY - renderStartY;

      // Create page canvas
      const pCanvas = document.createElement("canvas");
      pCanvas.width = normalizedWidth;
      pCanvas.height = pageHeight;
      const pCtx = pCanvas.getContext("2d");

      // Background color fills
      pCtx.fillStyle = "#ffffff";
      pCtx.fillRect(0, 0, normalizedWidth, pageHeight);

      const activeBoxHeight = contentHeight * scaleToFrameWidth;
      const pageFit = fitBoxToFrame({
        boxWidth: frameWidth,
        boxHeight: activeBoxHeight,
        frameWidth,
        frameHeight,
        step: 0.02,
        minScale: 0.1,
        maxScale: 1,
        alignX: "center",
        alignY: "top",
      }) || {
        pass: "split",
        fits: false,
        scale: 1,
        width: frameWidth,
        height: activeBoxHeight,
        x: 0,
        y: 0,
      };
      const pageScale = pageFit.scale;
      const renderWidth = pageFit.width;
      const renderHeight = pageFit.height;
      const contentLeftX = frameX + (pageFit.x ?? (frameWidth - renderWidth) / 2);
      const contentTopY = frameY + (pageFit.y ?? 0);
      pageFits[i] = pageFit;

      // Guarantee no overflow even if a future change loosens geometry checks.
      pCtx.save();
      pCtx.beginPath();
      pCtx.rect(frameX, frameY, frameWidth, frameHeight);
      pCtx.clip();

      // Draw overlapping images onto the page canvas inside the green frame
      for (const cmd of drawCommands) {
        const cmdEnd = cmd.destY + cmd.destH;
        // Check if command overlaps with the page range [startY, endY]
        if (cmd.destY < renderEndY && cmdEnd > renderStartY) {
          const scale = normalizedWidth / cmd.img.width;
          
          // Calculate the overlapping segment in virtual pixels
          const overlapStartY = Math.max(renderStartY, cmd.destY);
          const overlapEndY = Math.min(renderEndY, cmdEnd);
          const overlapHeight = overlapEndY - overlapStartY;
          
          // Map back to source image coordinates
          const sy = cmd.trimY + (overlapStartY - cmd.destY) / scale;
          const sh = overlapHeight / scale;
          
          // Destination coordinates inside the green frame (scaled and centered)
          const dy = contentTopY + (overlapStartY - startY) * pageScale * scaleToFrameWidth;
          const dh = overlapHeight * pageScale * scaleToFrameWidth;
          
          const dx = contentLeftX;
          const dw = renderWidth;

          pCtx.drawImage(
            cmd.img,
            0, sy, cmd.img.width, sh,
            dx, dy, dw, dh
          );
        }
      }
      pCtx.restore();

      // Draw the green border frame Rect
      pCtx.save();
      pCtx.strokeStyle = "#166534"; // Green theme border
      pCtx.lineWidth = 3;
      pCtx.strokeRect(frameX, frameY, frameWidth, frameHeight);
      pCtx.restore();

      // Add overlays (Timestamp, Page number, original files)
      pCtx.save();
      
      // Top header
      pCtx.fillStyle = "#1e293b";
      pCtx.font = "bold 13px 'Outfit', sans-serif";
      pCtx.fillText("🔒 EVIDENTIARY PROCESSOR - CHAT RECORD", 30, 45);

      pCtx.strokeStyle = "rgba(15, 23, 42, 0.08)";
      pCtx.lineWidth = 1;
      pCtx.beginPath();
      pCtx.moveTo(30, 55);
      pCtx.lineTo(normalizedWidth - 30, 55);
      pCtx.stroke();

      // Top Disclaimer text (drawn between header line and green frame)
      pCtx.fillStyle = "#1f2937"; // dark charcoal gray for legal disclaimers
      pCtx.font = "italic 9.5px Tahoma, sans-serif";
      pCtx.textAlign = "center";
      
      const line1 = "\"DIGITAL EVIDENCE เป็นเพียงการเครื่องมืออำนวยความสะดวกให้กับผู้ว่าจ้าง โดยไม่ได้ดัดแปลง แก้ไข เพิ่ม-ลบ เนื้อหาจากต้นฉบับใดๆ";
      const line2 = "และไม่มีส่วนเกี่ยวข้องใดๆกับเนื้อหาในเอกสาร เป็นเพียงเครื่องมือที่ทำงานเกี่ยวกับระบบไฟล์เอกสารแบบอิเล็กทรอนิกส์ เท่านั้น\"";
      
      pCtx.fillText(line1, normalizedWidth / 2, 73);
      pCtx.fillText(line2, normalizedWidth / 2, 88);
      pCtx.textAlign = "left"; // reset alignment

      // Find files contributing to this page
      const filesOnPage = drawCommands
        .filter(cmd => {
          const cmdEnd = cmd.destY + cmd.destH;
          return cmd.destY <= renderEndY && cmdEnd >= renderStartY;
        })
        .map(cmd => cmd.fileName);

      const uniqueFiles = [...new Set(filesOnPage)].join(", ");

      // Bottom footer
      pCtx.strokeStyle = "rgba(15, 23, 42, 0.08)";
      pCtx.beginPath();
      pCtx.moveTo(30, pageHeight - 55);
      pCtx.lineTo(normalizedWidth - 30, pageHeight - 55);
      pCtx.stroke();

      pCtx.fillStyle = "#64748b";
      pCtx.font = "11px 'Outfit', sans-serif";
      pCtx.fillText(`Source Files: ${uniqueFiles}`, 30, pageHeight - 38);
      pCtx.fillText(`Date: ${timestampStr} (ICT)`, 30, pageHeight - 22);

      pCtx.textAlign = "right";
      pCtx.font = "bold 12px 'Outfit', sans-serif";
      pCtx.fillStyle = "#3b82f6";
      pCtx.fillText(`Page ${i + 1} of ${cutPoints.length - 1}`, normalizedWidth - 30, pageHeight - 35);
      
      pCtx.restore();
      pageCanvases.push(pCanvas);
    }

    // PDF Compilation using jsPDF
    addLog("Compiling and packaging PDF output...", "info");
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    for (let i = 0; i < pageCanvases.length; i++) {
      if (i > 0) pdf.addPage();
      const pCanvas = pageCanvases[i];
      const imgData = pCanvas.toDataURL("image/jpeg", 0.95);
      // A4 is 210mm x 297mm
      pdf.addImage(imgData, "JPEG", 0, 0, 210, 297);
    }

    const pdfPath = path.join(outputsDir, "evidence.pdf");
    const pdfBuffer = Buffer.from(pdf.output("arraybuffer"));
    fs.writeFileSync(pdfPath, pdfBuffer);
    
    // Compute output hash
    const pdfHash = crypto.createHash("sha256").update(pdfBuffer).digest("hex");

    // Write Audit Log
    addLog("Writing audit logs...", "info");
    const logPath = path.join(outputsDir, "audit_log.txt");
    let logContent = `CHAT EVIDENCE PROCESSOR - AUDIT LOG\n`;
    logContent += `===================================================\n`;
    logContent += `Process Timestamp : ${new Date().toISOString()} (UTC)\n`;
    logContent += `Output PDF File   : outputs/evidence.pdf\n`;
    logContent += `Output PDF Hash   : SHA256:${pdfHash}\n`;
    logContent += `Total Pages       : ${pageCanvases.length}\n`;
    logContent += `Stitched Height   : ${totalHeight}px\n\n`;
    
    logContent += `Source Images Metadata:\n`;
    sourceMetadata.forEach((meta, idx) => {
      logContent += `  [${idx + 1}] File: ${meta.fileName} | Size: ${meta.width}x${meta.height} | SHA256:${meta.hash}\n`;
    });
    
    logContent += `\nStitching Overlap Offsets:\n`;
    trimOffsets.forEach((offset, idx) => {
      logContent += `  File ${idx + 1} (${images[idx]}): Auto-trim offset = ${offset}px\n`;
    });

    logContent += `\nOptimal Page Cuts Decisions:\n`;
    auditCuts.forEach((cut, idx) => {
      const pageFit = pageFits[idx];
      const fitScaleText = pageFit ? ` | Fit Scale: ${pageFit.scale.toFixed(3)} | Fit Pass: ${pageFit.pass}` : "";
      logContent += `  Page Cut ${idx + 1}: Y=${cut.y}px | Cut Reason: ${cut.type} | Quality Score: ${cut.score.toFixed(1)}/100${fitScaleText}\n`;
    });
    
    logContent += `\n===================================================\n`;
    logContent += `END OF AUDIT LOG\n`;
    
    fs.writeFileSync(logPath, logContent);

    // Complete pipeline
    lastOutputEl.textContent = "outputs/evidence.pdf";
    addLog("Pipeline completed successfully!", "success");
    addLog(`PDF exported to: outputs/evidence.pdf`, "success");
    addLog(`Audit log exported to: outputs/audit_log.txt`, "success");
    
    if (isTestMode) {
      ipcRenderer.send("test-done", 0);
    } else {
      alert(`Success!\nGenerated ${pageCanvases.length} pages.\nPDF saved to outputs/evidence.pdf\nAudit log saved to outputs/audit_log.txt`);
    }

  } catch (err) {
    addLog(`Pipeline failed: ${err.message}`, "error");
    console.error(err);
    if (isTestMode) {
      ipcRenderer.send("test-done", 1);
    } else {
      alert(`Generation failed: ${err.message}`);
    }
  } finally {
    btnProcess.disabled = false;
  }
}
