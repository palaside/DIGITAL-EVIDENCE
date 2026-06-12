import fs from "node:fs";
import path from "node:path";
import { chromium } from "../Create Single Page Website/node_modules/playwright/index.mjs";

const filePath = String.raw`D:\EDOK\แชทที่ 3\chatv3 (7).jpg`;
const outputPath = String.raw`D:\Project\หลักฐานดิจิทัล  DIGITAL EVIDENCE\tmp-tests\chat20-analysis\chatv3-7-debug.json`;

const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage();
await page.goto("http://127.0.0.1:5173/", { waitUntil: "domcontentloaded", timeout: 90000 });

const base64 = fs.readFileSync(filePath).toString("base64");
const imageUrl = `data:image/jpeg;base64,${base64}`;

const result = await page.evaluate(async ({ imageUrl, fileName }) => {
  const img = new Image();
  img.src = imageUrl;
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
  });

  const targetWidth = 800;
  const scale = targetWidth / img.width;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No canvas context");
  canvas.width = targetWidth;
  canvas.height = img.height * scale;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;
  const width = canvas.width;
  const height = canvas.height;

  const rowSolidness = [];
  const rowActivity = [];
  const sampleStep = 4;
  const edgeThreshold = 110;
  const solidActivityThreshold = 0.015;
  const minForegroundSpan = Math.round(width * 0.18);
  const rowWideEdgeSpan = [];
  const rowSpanWidths = [];
  const rowActiveCounts = [];

  for (let y = 0; y < height; y++) {
    let activePixels = 0;
    let sampleCount = 0;
    let firstActiveX = -1;
    let lastActiveX = -1;

    for (let x = sampleStep; x < width; x += sampleStep) {
      const idx = (y * width + x) * 4;
      const leftIdx = (y * width + (x - sampleStep)) * 4;
      const upIdx = y > 0 ? (((y - 1) * width + x) * 4) : idx;

      const horizontalContrast =
        Math.abs(data[idx] - data[leftIdx]) +
        Math.abs(data[idx + 1] - data[leftIdx + 1]) +
        Math.abs(data[idx + 2] - data[leftIdx + 2]);

      const verticalContrast =
        Math.abs(data[idx] - data[upIdx]) +
        Math.abs(data[idx + 1] - data[upIdx + 1]) +
        Math.abs(data[idx + 2] - data[upIdx + 2]);

      if (horizontalContrast + verticalContrast > edgeThreshold) {
        activePixels += 1;
        if (firstActiveX === -1) firstActiveX = x;
        lastActiveX = x;
      }
      sampleCount += 1;
    }

    rowActivity[y] = sampleCount > 0 ? activePixels / sampleCount : 0;
    rowActiveCounts[y] = activePixels;
    rowSpanWidths[y] =
      firstActiveX !== -1 && lastActiveX !== -1 ? lastActiveX - firstActiveX : 0;
    rowWideEdgeSpan[y] =
      firstActiveX !== -1 &&
      lastActiveX !== -1 &&
      lastActiveX - firstActiveX >= minForegroundSpan &&
      activePixels >= 2;
  }

  for (let y = 0; y < height; y++) {
    let smoothed = 0;
    let weightTotal = 0;

    for (let offset = -2; offset <= 2; offset++) {
      const row = y + offset;
      if (row < 0 || row >= height) continue;
      const weight = offset === 0 ? 3 : Math.abs(offset) === 1 ? 2 : 1;
      smoothed += rowActivity[row] * weight;
      weightTotal += weight;
    }

    const hasWideEdgeSpan = rowWideEdgeSpan[y];
    rowSolidness[y] =
      weightTotal > 0
        ? smoothed / weightTotal < solidActivityThreshold && !hasWideEdgeSpan
        : !hasWideEdgeSpan;
  }

  const rawObjects = [];
  let inObject = false;
  let objStart = 0;
  const minObjHeight = 5;

  for (let y = 0; y < height; y++) {
    const isObjectRow = !rowSolidness[y];
    if (isObjectRow && !inObject) {
      inObject = true;
      objStart = y;
    } else if (!isObjectRow && inObject) {
      inObject = false;
      const objEnd = y;
      if (objEnd - objStart >= minObjHeight) {
        rawObjects.push({ yTop: objStart, yBottom: objEnd });
      }
    }
  }
  if (inObject) rawObjects.push({ yTop: objStart, yBottom: height });

  const maxStatusWidth = Math.round(width * 0.18);
  const maxStatusHeight = Math.max(92, Math.round(width * 0.115));
  const maxCenteredLabelWidth = Math.round(width * 0.42);
  const maxCenteredLabelHeight = Math.max(74, Math.round(width * 0.09));
  const maxNoiseActivity = 3.2;

  const filteredObjects = rawObjects
    .map((obj) => {
      const objectHeight = obj.yBottom - obj.yTop;
      let widestSpan = 0;
      let totalActivity = 0;
      let denseRows = 0;

      for (let y = obj.yTop; y < obj.yBottom; y++) {
        widestSpan = Math.max(widestSpan, rowSpanWidths[y] ?? 0);
        totalActivity += rowActivity[y] ?? 0;
        if ((rowActiveCounts[y] ?? 0) >= 4) denseRows += 1;
      }

      const looksLikeTinyStatusOnly =
        objectHeight <= maxStatusHeight &&
        widestSpan <= maxStatusWidth &&
        totalActivity <= maxNoiseActivity &&
        denseRows <= Math.max(8, Math.round(objectHeight * 0.2));
      const looksLikeCenteredDateLabel =
        objectHeight <= maxCenteredLabelHeight &&
        widestSpan <= maxCenteredLabelWidth &&
        totalActivity <= maxNoiseActivity * 1.7 &&
        denseRows <= Math.max(10, Math.round(objectHeight * 0.22));

      return {
        ...obj,
        objectHeight,
        widestSpan,
        totalActivity: Number(totalActivity.toFixed(3)),
        denseRows,
        looksLikeTinyStatusOnly,
        looksLikeCenteredDateLabel,
        keep: !looksLikeTinyStatusOnly && !looksLikeCenteredDateLabel,
      };
    })
    .filter((obj) => obj.keep);

  const objects = [];
  const mergeGapHeight = Math.max(20, Math.round(width * 0.045));
  for (const obj of filteredObjects) {
    const previous = objects[objects.length - 1];
    if (previous && obj.yTop - previous.yBottom <= mergeGapHeight) {
      previous.yBottom = obj.yBottom;
      previous.mergedFrom.push({
        yTop: obj.yTop,
        yBottom: obj.yBottom,
        objectHeight: obj.objectHeight,
      });
    } else {
      objects.push({
        yTop: obj.yTop,
        yBottom: obj.yBottom,
        mergedFrom: [{ yTop: obj.yTop, yBottom: obj.yBottom, objectHeight: obj.objectHeight }],
      });
    }
  }

  const a4Height = Math.round(width * 1.414);
  const topPadding = 14;
  const bottomPadding = 18;
  const shrinkAllowance = Math.round(a4Height * 1.12);
  const smallObjectOverflowAllowance = a4Height + Math.max(220, Math.round(width * 0.28));
  const pages = [];
  let currentY = 0;
  let pageNum = 1;

  while (currentY < height) {
    const remainingObjects = objects.filter((obj) => obj.yBottom > currentY);
    if (remainingObjects.length === 0) break;

    const nextObject = remainingObjects[0];
    const segmentStart =
      pageNum === 1 ? 0 : Math.max(currentY, Math.max(0, nextObject.yTop - topPadding));

    let targetCutY = height;
    let lastIncludedObject = null;
    const considered = [];

    for (const obj of remainingObjects) {
      const paddedBottom = obj.yBottom + bottomPadding;
      const projectedHeight = paddedBottom - segmentStart;
      const objectHeight = obj.yBottom - obj.yTop;
      const canAbsorbSmallTailObject =
        objectHeight <= Math.max(180, Math.round(width * 0.22)) &&
        projectedHeight <= smallObjectOverflowAllowance;

      considered.push({
        yTop: obj.yTop,
        yBottom: obj.yBottom,
        objectHeight,
        paddedBottom,
        projectedHeight,
        canAbsorbSmallTailObject,
      });

      if (!lastIncludedObject) {
        lastIncludedObject = obj;
        targetCutY = paddedBottom;
        continue;
      }

      if (projectedHeight <= a4Height) {
        lastIncludedObject = obj;
        targetCutY = paddedBottom;
        continue;
      }

      if (projectedHeight <= shrinkAllowance || canAbsorbSmallTailObject) {
        lastIncludedObject = obj;
        targetCutY = paddedBottom;
      }
      break;
    }

    if (lastIncludedObject) {
      targetCutY = Math.min(height, lastIncludedObject.yBottom + bottomPadding);
    }

    const sliceHeight = targetCutY - segmentStart;
    pages.push({
      pageNumber: pageNum++,
      currentY,
      segmentStart,
      targetCutY,
      sliceHeight,
      firstRemainingObject: nextObject,
      lastIncludedObject,
      considered,
    });

    currentY = targetCutY;
    const futureObject = objects.find((obj) => obj.yBottom > currentY);
    if (futureObject && futureObject.yTop - currentY > topPadding) {
      currentY = Math.max(0, futureObject.yTop - topPadding);
    }
  }

  return {
    fileName,
    sourceSize: { width: img.width, height: img.height },
    scaledSize: { width, height },
    rawObjects: rawObjects.slice(0, 120),
    filteredObjects: filteredObjects.slice(0, 120),
    mergedObjects: objects.slice(0, 120),
    pages,
  };
}, { imageUrl, fileName: path.basename(filePath) });

fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
await browser.close();
console.log(JSON.stringify({ outputPath, pages: result.pages.length }, null, 2));
