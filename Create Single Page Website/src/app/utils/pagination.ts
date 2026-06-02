/**
 * Object-Aware Pagination Utility
 * Analyzes image pixels using a horizontal projection profile (pixel variance)
 * and segments a long image into multiple A4-ratio pages, cutting only at safe gaps.
 */

export interface PageSegment {
  canvasDataUrl: string;
  pageNumber: number;
  height?: number;
}

interface ChatFragment {
  yTop: number;
  yBottom: number;
  objectHeight: number;
  widestSpan: number;
}

interface ChatObject {
  yTop: number;
  yBottom: number;
  mergedFrom: ChatFragment[];
}

const CHAT_FRAME_ASPECT_RATIO = 235 / 170;
const SHRINK_STEP = 0.98;
const MIN_SHRINK_SCALE = 0.5;

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

        // 1. Calculate row activity from local edges instead of whole-row variance.
        // LINE wallpaper textures can have enough color variance to be mistaken
        // for content, so object detection must look for actual foreground edges.
        const rowSolidness: boolean[] = [];
        const rowActivity: number[] = [];
        const sampleStep = 4;
        const edgeThreshold = 110;
        const solidActivityThreshold = 0.015;
        const minForegroundSpan = Math.round(width * 0.18);
        const rowWideEdgeSpan: boolean[] = [];
        const rowSpanWidths: number[] = [];
        const rowActiveCounts: number[] = [];

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

        // 2. Identify "Objects" (contiguous non-solid rows)
        const rawObjects: Array<{ yTop: number; yBottom: number }> = [];
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
              rawObjects.push({ yTop: objStart, yBottom: objEnd });
            }
          }
        }
        if (inObject) {
          rawObjects.push({ yTop: objStart, yBottom: height });
        }

        const objects: ChatObject[] = [];
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
            if ((rowActiveCounts[y] ?? 0) >= 4) {
              denseRows += 1;
            }
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
              yTop: obj.yTop,
              yBottom: obj.yBottom,
              objectHeight,
              widestSpan,
              keep: !looksLikeTinyStatusOnly && !looksLikeCenteredDateLabel,
            };
          })
          .filter((obj) => obj.keep);

        // A single chat bubble, sticker, or media card can contain interior
        // rows with very little edge activity. Merge nearby fragments back into
        // one logical object before pagination so we do not cut through the
        // middle of the same visible chat element.
        const mergeGapHeight = Math.max(20, Math.round(width * 0.045));
        for (const obj of filteredObjects) {
          const previous = objects[objects.length - 1];
          const shouldMerge =
            previous &&
            obj.yTop - previous.yBottom <= mergeGapHeight &&
            !hasSafeGapValley(
              previous.yBottom,
              obj.yTop,
              rowSolidness,
              rowActivity,
              rowWideEdgeSpan,
              width
            );

          if (shouldMerge) {
            previous.yBottom = obj.yBottom;
            previous.mergedFrom.push({
              yTop: obj.yTop,
              yBottom: obj.yBottom,
              objectHeight: obj.objectHeight,
              widestSpan: obj.widestSpan,
            });
          } else {
            objects.push({
              yTop: obj.yTop,
              yBottom: obj.yBottom,
              mergedFrom: [
                {
                  yTop: obj.yTop,
                  yBottom: obj.yBottom,
                  objectHeight: obj.objectHeight,
                  widestSpan: obj.widestSpan,
                },
              ],
            });
          }
        }

        // 3. Paginate into content-driven sheets
        // Keep A4 as a soft target, but never create artificial wallpaper fill
        // or split an object when we can keep the object whole and let the
        // final renderer scale the page content down.
        const a4Height = Math.round(width * 1.414);
        const frameFitHeight = Math.round(width * CHAT_FRAME_ASPECT_RATIO);
        const topPadding = 14;
        const bottomPadding = 18;
        const smallObjectOverflowAllowance = a4Height + Math.max(220, Math.round(width * 0.28));
        const maxInternalObjectHeight = Math.round(frameFitHeight / MIN_SHRINK_SCALE);
        const preparedObjects = objects.flatMap((obj) =>
          splitOversizedObject(
            obj,
            width,
            maxInternalObjectHeight,
            rowSolidness,
            rowActivity,
            rowWideEdgeSpan
          )
        );
        const pages: PageSegment[] = [];

        let currentY = 0;
        let pageNum = 1;

        while (currentY < height) {
          const remainingObjects = preparedObjects.filter((obj) => obj.yBottom > currentY);
          if (remainingObjects.length === 0) {
            break;
          }

          const nextObject = remainingObjects[0];
          const segmentStart =
            pageNum === 1
              ? 0
              : Math.max(currentY, Math.max(0, nextObject.yTop - topPadding));

          let targetCutY = height;
          let lastIncludedObject: ChatObject | null = null;
          let bestFitScale = 1;

          for (const obj of remainingObjects) {
            const paddedBottom = obj.yBottom + bottomPadding;
            const projectedHeight = paddedBottom - segmentStart;
            const shrinkDecision = evaluateShrinkFit(projectedHeight, frameFitHeight);

            if (!lastIncludedObject) {
              // Never split the first object on a page. Allow the renderer/PDF
              // layer to scale the page down instead of cutting the object.
              lastIncludedObject = obj;
              targetCutY = paddedBottom;
              bestFitScale = shrinkDecision.scale;
              continue;
            }

            if (projectedHeight <= a4Height) {
              lastIncludedObject = obj;
              targetCutY = paddedBottom;
              bestFitScale = shrinkDecision.scale;
              continue;
            }

            // If the next full object only slightly exceeds A4, keep it whole.
            const objectHeight = obj.yBottom - obj.yTop;
            const canAbsorbSmallTailObject =
              objectHeight <= Math.max(180, Math.round(width * 0.22)) &&
              projectedHeight <= smallObjectOverflowAllowance;

            if (canAbsorbSmallTailObject) {
              lastIncludedObject = obj;
              targetCutY = paddedBottom;
              bestFitScale = shrinkDecision.scale;
              continue;
            }

            if (
              shrinkDecision.fits &&
              shouldKeepObjectOnCurrentPage(
                targetCutY - segmentStart,
                objectHeight,
                frameFitHeight,
                shrinkDecision.scale
              )
            ) {
              lastIncludedObject = obj;
              targetCutY = paddedBottom;
              bestFitScale = shrinkDecision.scale;
              continue;
            }

            break;
          }

          if (lastIncludedObject) {
            targetCutY = Math.min(height, lastIncludedObject.yBottom + bottomPadding);
          }

          const sliceHeight = targetCutY - segmentStart;
          if (sliceHeight <= 0) {
            break;
          }

          // Create a canvas for this page segment
          const pageCanvas = document.createElement("canvas");
          pageCanvas.width = width;
          pageCanvas.height = sliceHeight;
          const pageCtx = pageCanvas.getContext("2d");

          if (pageCtx) {
            // Draw the sliced section of the chat
            pageCtx.drawImage(
              canvas,
              0,
              segmentStart,
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
              height: sliceHeight,
            });
          }

          currentY = targetCutY;
          const futureObject = preparedObjects.find((obj) => obj.yBottom > currentY);
          if (futureObject && futureObject.yTop - currentY > topPadding) {
            currentY = Math.max(0, futureObject.yTop - topPadding);
          }
        }

        mergeTinyTailPages(pages, width).then(resolve).catch(reject);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = (err) => reject(err);
    img.src = imageUrl;
  });
}

async function mergeTinyTailPages(pages: PageSegment[], width: number): Promise<PageSegment[]> {
  const tinyHeightThreshold = Math.max(180, Math.round(width * 0.22));
  const tailMergeHeightThreshold = Math.max(460, Math.round(width * 0.58));
  const softA4Height = Math.round(width * 1.414);
  const maxMergedTailHeight = Math.round(softA4Height * 1.52);
  const merged: PageSegment[] = [];

  for (const page of pages) {
    const currentHeight = page.height ?? 0;
    const previous = merged[merged.length - 1];
    const previousHeight = previous?.height ?? 0;
    const mergedHeight = previousHeight + currentHeight;
    const shouldMergeTailPage =
      previous &&
      currentHeight > 0 &&
      ((currentHeight <= tinyHeightThreshold) ||
        (currentHeight <= tailMergeHeightThreshold && mergedHeight <= maxMergedTailHeight));

    if (shouldMergeTailPage) {
      merged[merged.length - 1] = await stitchPageSegments(previous, page, width);
    } else {
      merged.push(page);
    }
  }

  return merged.map((page, index) => ({
    ...page,
    pageNumber: index + 1,
  }));
}

function splitOversizedObject(
  object: ChatObject,
  width: number,
  maxInternalObjectHeight: number,
  rowSolidness: boolean[],
  rowActivity: number[],
  rowWideEdgeSpan: boolean[]
): ChatObject[] {
  const objectHeight = object.yBottom - object.yTop;
  if (objectHeight <= maxInternalObjectHeight || object.mergedFrom.length < 2) {
    return [object];
  }

  const fragments = object.mergedFrom;
  const splitObjects: ChatObject[] = [];
  const minChunkHeight = Math.max(320, Math.round(width * 0.4));
  const baseGapThreshold = Math.max(12, Math.round(width * 0.015));
  const wideGapThreshold = Math.max(18, Math.round(width * 0.022));
  const wideFragmentThreshold = Math.round(width * 0.56);
  const mediaSpanThreshold = Math.round(width * 0.28);
  const mediaGapProtection = Math.max(42, Math.round(width * 0.06));

  let chunkStartIndex = 0;

  for (let index = 1; index < fragments.length; index++) {
    const previousFragment = fragments[index - 1];
    const nextFragment = fragments[index];
    const currentChunkTop = fragments[chunkStartIndex].yTop;
    const currentChunkHeight = previousFragment.yBottom - currentChunkTop;
    const projectedHeight = nextFragment.yBottom - currentChunkTop;

    if (projectedHeight <= maxInternalObjectHeight) {
      continue;
    }

    const gapStart = previousFragment.yBottom;
    const gapEnd = nextFragment.yTop;
    const gapHeight = gapEnd - gapStart;
    const requiresWideGap =
      previousFragment.widestSpan >= wideFragmentThreshold ||
      nextFragment.widestSpan >= wideFragmentThreshold;
    const minimumGapHeight = requiresWideGap ? wideGapThreshold : baseGapThreshold;
    const looksLikeContinuousMediaBody =
      previousFragment.widestSpan >= mediaSpanThreshold &&
      nextFragment.widestSpan >= mediaSpanThreshold &&
      gapHeight <= mediaGapProtection;

    const canSplitHere =
      currentChunkHeight >= minChunkHeight &&
      !looksLikeContinuousMediaBody &&
      gapHeight >= minimumGapHeight &&
      hasSafeGapValley(gapStart, gapEnd, rowSolidness, rowActivity, rowWideEdgeSpan, width);

    if (!canSplitHere) {
      continue;
    }

    const chunkFragments = fragments.slice(chunkStartIndex, index);
    splitObjects.push({
      yTop: chunkFragments[0].yTop,
      yBottom: chunkFragments[chunkFragments.length - 1].yBottom,
      mergedFrom: chunkFragments,
    });
    chunkStartIndex = index;
  }

  if (chunkStartIndex === 0) {
    return [object];
  }

  const tailFragments = fragments.slice(chunkStartIndex);
  splitObjects.push({
    yTop: tailFragments[0].yTop,
    yBottom: tailFragments[tailFragments.length - 1].yBottom,
    mergedFrom: tailFragments,
  });

  return splitObjects;
}

function hasSafeGapValley(
  startY: number,
  endY: number,
  rowSolidness: boolean[],
  rowActivity: number[],
  rowWideEdgeSpan: boolean[],
  width: number
): boolean {
  const gapHeight = endY - startY;
  const minGapHeight = Math.max(12, Math.round(width * 0.015));
  if (gapHeight < minGapHeight) {
    return false;
  }

  let solidRows = 0;
  let totalActivity = 0;

  for (let y = startY; y < endY; y++) {
    if (rowWideEdgeSpan[y]) {
      return false;
    }
    if (rowSolidness[y]) {
      solidRows += 1;
    }
    totalActivity += rowActivity[y] ?? 0;
  }

  const averageActivity = totalActivity / gapHeight;
  const solidRatio = solidRows / gapHeight;

  return solidRatio >= 0.8 && averageActivity <= 0.0085;
}

function evaluateShrinkFit(
  contentHeight: number,
  frameFitHeight: number
): { fits: boolean; scale: number } {
  if (contentHeight <= frameFitHeight) {
    return { fits: true, scale: 1 };
  }

  let scale = 1;
  while (contentHeight * scale > frameFitHeight && scale > MIN_SHRINK_SCALE) {
    scale *= SHRINK_STEP;
  }

  if (contentHeight * scale > frameFitHeight) {
    return { fits: false, scale };
  }

  return { fits: true, scale };
}

function shouldKeepObjectOnCurrentPage(
  currentContentHeight: number,
  candidateObjectHeight: number,
  frameFitHeight: number,
  candidateScale: number
): boolean {
  if (candidateScale < MIN_SHRINK_SCALE) {
    return false;
  }

  const remainingFrameSpace = Math.max(0, frameFitHeight - currentContentHeight);
  const visibleFraction =
    candidateObjectHeight > 0 ? remainingFrameSpace / candidateObjectHeight : 0;

  if (visibleFraction < 0.18 && candidateScale < 0.9) {
    return false;
  }

  if (visibleFraction < 0.32 && candidateScale < 0.78) {
    return false;
  }

  if (currentContentHeight >= frameFitHeight * 0.92 && candidateScale < 0.72) {
    return false;
  }

  if (currentContentHeight <= frameFitHeight * 0.36) {
    return candidateScale >= MIN_SHRINK_SCALE;
  }

  if (visibleFraction >= 0.42 && candidateScale >= 0.52) {
    return true;
  }

  return candidateScale >= 0.58 || visibleFraction >= 0.6;
}

async function stitchPageSegments(
  upper: PageSegment,
  lower: PageSegment,
  width: number
): Promise<PageSegment> {
  const [upperImg, lowerImg] = await Promise.all([
    loadSegmentImage(upper.canvasDataUrl),
    loadSegmentImage(lower.canvasDataUrl),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = upperImg.naturalHeight + lowerImg.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return upper;
  }

  ctx.drawImage(upperImg, 0, 0, width, upperImg.naturalHeight);
  ctx.drawImage(lowerImg, 0, upperImg.naturalHeight, width, lowerImg.naturalHeight);

  return {
    canvasDataUrl: canvas.toDataURL("image/png"),
    pageNumber: upper.pageNumber,
    height: canvas.height,
  };
}

function loadSegmentImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = (error) => reject(error);
    image.src = dataUrl;
  });
}
