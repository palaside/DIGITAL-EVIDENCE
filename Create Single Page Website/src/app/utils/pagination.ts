/**
 * Object-Aware Pagination Utility
 * Analyzes image pixels using a horizontal projection profile (pixel variance)
 * and segments a long image into multiple A4-ratio pages, cutting only at safe gaps.
 */

export interface PageSegment {
  canvasDataUrl: string;
  pageNumber: number;
}

export function segmentChatImage(
  imageUrl: string,
  targetWidth: number = 800
): Promise<PageSegment[]> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        // Maintain original aspect ratio, set width to targetWidth
        const scale = targetWidth / img.width;
        canvas.width = targetWidth;
        canvas.height = img.height * scale;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        const width = canvas.width;
        const height = canvas.height;

        // 1. Calculate horizontal variance for each row to find gaps
        const rowSolidness: boolean[] = [];
        const threshold = 15; // Max standard deviation to count as solid wallpaper background

        for (let y = 0; y < height; y++) {
          let sumR = 0, sumG = 0, sumB = 0;
          const pixelCount = width;

          // Sample pixels across the row
          for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            sumR += data[idx];
            sumG += data[idx + 1];
            sumB += data[idx + 2];
          }

          const meanR = sumR / pixelCount;
          const meanG = sumG / pixelCount;
          const meanB = sumB / pixelCount;

          let diffSum = 0;
          // Sample every 4th pixel for speed
          for (let x = 0; x < width; x += 4) {
            const idx = (y * width + x) * 4;
            const rDiff = data[idx] - meanR;
            const gDiff = data[idx + 1] - meanG;
            const bDiff = data[idx + 2] - meanB;
            diffSum += rDiff * rDiff + gDiff * gDiff + bDiff * bDiff;
          }

          const variance = diffSum / (pixelCount / 4);
          const stdDev = Math.sqrt(variance);

          // If standard deviation is low, it's a solid background color (a gap!)
          rowSolidness[y] = stdDev < threshold;
        }

        // 2. Identify "Objects" (contiguous non-solid rows)
        interface ChatObject {
          yTop: number;
          yBottom: number;
        }

        const objects: ChatObject[] = [];
        let inObject = false;
        let objStart = 0;

        // Minimum height of a chat element to avoid tiny noise
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
              objects.push({ yTop: objStart, yBottom: objEnd });
            }
          }
        }
        if (inObject) {
          objects.push({ yTop: objStart, yBottom: height });
        }

        // 3. Paginate into A4 sheets
        // A4 aspect ratio is width:height = 1:1.414 (e.g. 800w x 1131h)
        const a4Height = Math.round(width * 1.414);
        const pages: PageSegment[] = [];

        let currentY = 0;
        let pageNum = 1;

        while (currentY < height) {
          // Default target slice height
          let targetCutY = currentY + a4Height;

          // If this is the last page (remaining height is less than A4 height)
          if (targetCutY >= height) {
            targetCutY = height;
          } else {
            // Find a safe gap to slice
            // Search in a window back up to 25% of the A4 height
            const searchWindowMin = targetCutY - Math.round(a4Height * 0.25);
            let safeCutY = -1;

            // Find a gap that doesn't intersect any object
            for (let y = targetCutY; y >= searchWindowMin; y--) {
              const insideObject = objects.some(
                (obj) => y >= obj.yTop && y <= obj.yBottom
              );

              if (!insideObject && rowSolidness[y]) {
                safeCutY = y;
                break;
              }
            }

            // If found a safe gap, cut there! Otherwise, fall back to targetCutY
            if (safeCutY !== -1) {
              targetCutY = safeCutY;
            }
          }

          const sliceHeight = targetCutY - currentY;
          if (sliceHeight <= 0) {
            break;
          }

          // Create a canvas for this page segment
          const pageCanvas = document.createElement("canvas");
          pageCanvas.width = width;
          pageCanvas.height = a4Height;
          const pageCtx = pageCanvas.getContext("2d");

          if (pageCtx) {
            // Fill background with the wallpaper color (sampled from the top row of the segment)
            const bgIdx = (currentY * width + Math.floor(width / 2)) * 4;
            const bgR = data[bgIdx];
            const bgG = data[bgIdx + 1];
            const bgB = data[bgIdx + 2];
            pageCtx.fillStyle = `rgb(${bgR}, ${bgG}, ${bgB})`;
            pageCtx.fillRect(0, 0, width, a4Height);

            // Draw the sliced section of the chat
            pageCtx.drawImage(
              canvas,
              0,
              currentY,
              width,
              sliceHeight,
              0,
              0,
              width,
              sliceHeight
            );

            pages.push({
              canvasDataUrl: pageCanvas.toDataURL("image/png"),
              pageNumber: pageNum++,
            });
          }

          currentY = targetCutY;
        }

        resolve(pages);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = (err) => reject(err);
    img.src = imageUrl;
  });
}
