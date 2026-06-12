/**
 * Object-Aware Pagination Utility — Deterministic Segment Model
 *
 * Pipeline (4 stages):
 *   1. detect row fragments from pixel heuristic
 *   2. classify/merge into DetectedChatObject[] (semantic ledger)
 *   3. paginate from object ledger — every page gets sourceYStart, sourceYEnd, objectIds
 *   4. validate: adjacent pages must not overlap; no objectId in >1 page; no empty pages
 *
 * preview and PDF export both consume canvasDataUrl from the SAME PageSegment[].
 * Neither layer makes its own crop/split decision.
 */

// ─── Public interfaces ──────────────────────────────────────────────────────

export interface PageSegment {
  canvasDataUrl: string;
  pageNumber: number;
  height?: number;

  /** Absolute Y coordinate in the source canvas where this page starts. */
  sourceYStart: number;
  /** Absolute Y coordinate in the source canvas where this page ends (exclusive). */
  sourceYEnd: number;
  /** IDs of DetectedChatObject entries whose [yTop, yBottom] are entirely within this page. */
  objectIds: string[];
  /** Placement metadata used by both preview and PDF renderer. */
  placement: {
    scale: number;
    align: "bottom";
  };
  /** Non-fatal notes about this page (e.g. oversized object, low confidence). */
  warnings?: string[];
}

/**
 * Semantic object detected in the chat image.
 * Used as the ledger for pagination decisions and validation.
 */
export interface DetectedChatObject {
  id: string;
  type: "bubble" | "media" | "sticker" | "quote" | "system" | "unknown";
  yTop: number;
  yBottom: number;
  confidence: number;
  oversized?: boolean;
  warnings?: string[];
}

/**
 * Thrown when validatePageSegments() finds violations.
 * App.tsx catches this to block isGenerated and show a specific toast.
 */
export class PaginationValidationError extends Error {
  constructor(
    message: string,
    public readonly validationErrors: string[]
  ) {
    super(message);
    this.name = "PaginationValidationError";
  }
}

// ─── Internal types (unchanged from original) ────────────────────────────────

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

// ─── Constants ───────────────────────────────────────────────────────────────

const CHAT_FRAME_ASPECT_RATIO = 235 / 170;
const SHRINK_STEP = 0.98;
const MIN_SHRINK_SCALE = 0.5;

// ─── Validation gate ─────────────────────────────────────────────────────────

/**
 * Validates the finalized PageSegment[] ledger.
 * Returns a list of error strings. Empty array = valid.
 *
 * Rules enforced:
 *   1. Adjacent pages must not overlap: page[n].sourceYEnd <= page[n+1].sourceYStart
 *   2. No objectId may appear in more than one page (unless marked oversized).
 *   3. No page may have sourceYEnd <= sourceYStart (invalid range).
 *   4. No page may have zero objectIds AND a non-trivial content height.
 */
export function validatePageSegments(segments: PageSegment[]): string[] {
  const errors: string[] = [];

  // Rule 1: no overlap between adjacent pages
  for (let i = 0; i < segments.length - 1; i++) {
    const curr = segments[i];
    const next = segments[i + 1];
    if (curr.sourceYEnd > next.sourceYStart) {
      errors.push(
        `Overlap: page ${curr.pageNumber} ends at Y=${curr.sourceYEnd} but page ${next.pageNumber} starts at Y=${next.sourceYStart} (overlap=${curr.sourceYEnd - next.sourceYStart}px)`
      );
    }
  }

  // Rule 2: no duplicate objectId across pages
  const seen = new Map<string, number>();
  for (const seg of segments) {
    for (const id of seg.objectIds) {
      if (seen.has(id)) {
        errors.push(
          `Duplicate object "${id}" appears on both page ${seen.get(id)} and page ${seg.pageNumber}`
        );
      } else {
        seen.set(id, seg.pageNumber);
      }
    }
  }

  // Rule 3: invalid range
  for (const seg of segments) {
    if (seg.sourceYEnd <= seg.sourceYStart) {
      errors.push(
        `Page ${seg.pageNumber} has invalid Y range [${seg.sourceYStart}, ${seg.sourceYEnd}]`
      );
    }
  }

  // Rule 4: no page with significant height but zero detected objects
  // (wallpaper-only pages that slipped through the split logic).
  // Height threshold: ignore pages < 80px (those are safely swallowed by tail merge).
  const emptyPageHeightThreshold = 80;
  for (const seg of segments) {
    const segHeight = seg.sourceYEnd - seg.sourceYStart;
    if (seg.objectIds.length === 0 && segHeight > emptyPageHeightThreshold) {
      errors.push(
        `Page ${seg.pageNumber} has no detected objects but spans ${segHeight}px — possible wallpaper-only page`
      );
    }
  }

  return errors;
}

// ─── Semantic classifier ─────────────────────────────────────────────────────

/**
 * Assigns a semantic type to a ChatObject using rule-based heuristics.
 * Operates on the same rowSpanWidths / rowActiveCounts arrays computed in
 * segmentChatImage() so no additional pixel pass is needed.
 */
function classifyChatObject(
  obj: ChatObject,
  imageWidth: number,
  rowSpanWidths: number[],
  rowActiveCounts: number[]
): DetectedChatObject {
  const id = `obj-y${obj.yTop}-${obj.yBottom}`;
  const height = obj.yBottom - obj.yTop;

  let maxSpan = 0;
  let totalActive = 0;
  let rows = 0;

  for (let y = obj.yTop; y < obj.yBottom; y++) {
    const span = rowSpanWidths[y] ?? 0;
    const active = rowActiveCounts[y] ?? 0;
    maxSpan = Math.max(maxSpan, span);
    totalActive += active;
    rows++;
  }

  const maxSpanRatio = imageWidth > 0 ? maxSpan / imageWidth : 0;
  const avgDensity = rows > 0 ? totalActive / rows : 0;
  const aspectRatio = maxSpan > 0 ? height / maxSpan : 0;

  // System / date label: very short, either very narrow or very wide centered
  if (height < 55 && (maxSpanRatio < 0.28 || (maxSpanRatio > 0.72 && avgDensity < 2.5))) {
    return { id, type: "system", yTop: obj.yTop, yBottom: obj.yBottom, confidence: 0.7 };
  }

  // Media (photos, videos, link previews): wide span + significant height + high density
  if (maxSpanRatio > 0.48 && height > 130 && avgDensity > 4.5) {
    const oversized = height > 800;
    return {
      id,
      type: "media",
      yTop: obj.yTop,
      yBottom: obj.yBottom,
      confidence: 0.78,
      oversized,
      warnings: oversized ? ["oversized media object"] : undefined,
    };
  }

  // Sticker: moderate span, square-ish aspect ratio, moderate height
  if (
    maxSpanRatio > 0.22 &&
    maxSpanRatio < 0.62 &&
    height > 70 &&
    height < 420 &&
    aspectRatio > 0.45 &&
    aspectRatio < 2.8
  ) {
    return { id, type: "sticker", yTop: obj.yTop, yBottom: obj.yBottom, confidence: 0.6 };
  }

  // Bubble (text message): moderate span, variable height
  if (maxSpanRatio < 0.78 && height < 600) {
    return { id, type: "bubble", yTop: obj.yTop, yBottom: obj.yBottom, confidence: 0.72 };
  }

  // Unknown — conservative: treat the same as bubble for pagination
  return {
    id,
    type: "unknown",
    yTop: obj.yTop,
    yBottom: obj.yBottom,
    confidence: 0.35,
    warnings: ["low-confidence classification; using conservative placement"],
  };
}

// ─── Main export ─────────────────────────────────────────────────────────────

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

        const scale = targetWidth / img.width;
        canvas.width = targetWidth;
        canvas.height = img.height * scale;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        const width = canvas.width;
        const height = canvas.height;

        // ── Stage 1: per-row pixel analysis ─────────────────────────────────
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
            const upIdx = y > 0 ? ((y - 1) * width + x) * 4 : idx;

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
            firstActiveX !== -1 && lastActiveX !== -1
              ? lastActiveX - firstActiveX
              : 0;
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

        // ── Stage 2a: raw object detection ──────────────────────────────────
        const rawObjects: Array<{ yTop: number; yBottom: number }> = [];
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
        if (inObject) {
          rawObjects.push({ yTop: objStart, yBottom: height });
        }

        // Stage 2b: filter noise / date labels
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
              yTop: obj.yTop,
              yBottom: obj.yBottom,
              objectHeight,
              widestSpan,
              keep: !looksLikeTinyStatusOnly && !looksLikeCenteredDateLabel,
            };
          })
          .filter((obj) => obj.keep);

        // Stage 2c: merge nearby fragments into logical ChatObjects
        const mergeGapHeight = Math.max(20, Math.round(width * 0.045));
        const chatObjects: ChatObject[] = [];
        for (const obj of filteredObjects) {
          const previous = chatObjects[chatObjects.length - 1];
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
            chatObjects.push({
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

        // ── Stage 3: paginate from object ledger ─────────────────────────────
        // NOTE: splitOversizedObject() must run BEFORE semantic classification
        // so that IDs are assigned to the exact [yTop,yBottom] ranges that the
        // pagination loop uses. Classifying pre-split objects would produce IDs
        // that no longer match the sub-ranges after splitting.
        const a4Height = Math.round(width * 1.414);
        const frameFitHeight = Math.round(width * CHAT_FRAME_ASPECT_RATIO);
        const topPadding = 14;
        const bottomPadding = 18;
        const smallObjectOverflowAllowance =
          a4Height + Math.max(220, Math.round(width * 0.28));
        const maxInternalObjectHeight = Math.round(frameFitHeight / MIN_SHRINK_SCALE);

        const preparedObjects = chatObjects.flatMap((obj) =>
          splitOversizedObject(
            obj,
            width,
            maxInternalObjectHeight,
            rowSolidness,
            rowActivity,
            rowWideEdgeSpan
          )
        );

        // ── Stage 2d: semantic classification — runs on preparedObjects ───────
        // Each prepared (possibly split) ChatObject is classified and given a
        // unique ID that encodes its Y range after splitting.
        const semanticObjects: DetectedChatObject[] = preparedObjects.map((obj) =>
          classifyChatObject(obj, width, rowSpanWidths, rowActiveCounts)
        );

        const pages: PageSegment[] = [];
        let currentY = 0;
        let pageNum = 1;

        while (currentY < height) {
          const remainingObjects = preparedObjects.filter(
            (obj) => obj.yBottom > currentY
          );
          if (remainingObjects.length === 0) break;

          const nextObject = remainingObjects[0];
          const segmentStart =
            pageNum === 1
              ? 0
              : Math.max(
                  currentY,
                  Math.max(0, nextObject.yTop - topPadding)
                );

          let targetCutY = height;
          let lastIncludedObject: ChatObject | null = null;
          let bestFitScale = 1;

          for (const obj of remainingObjects) {
            const paddedBottom = obj.yBottom + bottomPadding;
            const projectedHeight = paddedBottom - segmentStart;
            const shrinkDecision = evaluateShrinkFit(projectedHeight, frameFitHeight);

            if (!lastIncludedObject) {
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
          if (sliceHeight <= 0) break;

          // Render canvas for this page
          const pageCanvas = document.createElement("canvas");
          pageCanvas.width = width;
          pageCanvas.height = sliceHeight;
          const pageCtx = pageCanvas.getContext("2d");

          if (pageCtx) {
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

            // Collect objectIds whose full extent lies within [segmentStart, targetCutY]
            const pageObjectIds: string[] = semanticObjects
              .filter(
                (sobj) =>
                  sobj.yTop >= segmentStart && sobj.yBottom <= targetCutY
              )
              .map((sobj) => sobj.id);

            pages.push({
              canvasDataUrl: pageCanvas.toDataURL("image/png"),
              pageNumber: pageNum++,
              height: sliceHeight,
              sourceYStart: segmentStart,
              sourceYEnd: targetCutY,
              objectIds: pageObjectIds,
              placement: {
                scale: bestFitScale,
                align: "bottom",
              },
            });
          }

          currentY = targetCutY;
          const futureObject = preparedObjects.find((obj) => obj.yBottom > currentY);
          if (futureObject && futureObject.yTop - currentY > topPadding) {
            currentY = Math.max(0, futureObject.yTop - topPadding);
          }
        }

        // ── Stage 4: merge tiny tail pages, then validate ────────────────────
        mergeTinyTailPages(pages, width)
          .then((merged) => {
            // Renumber after merge
            const renumbered = merged.map((page, index) => ({
              ...page,
              pageNumber: index + 1,
            }));

            // Validation gate: reject if any invariant is broken
            const errors = validatePageSegments(renumbered);
            if (errors.length > 0) {
              reject(
                new PaginationValidationError(
                  `Pagination produced invalid segments for this image`,
                  errors
                )
              );
              return;
            }

            // Log debug summary when enabled
            if (
              typeof localStorage !== "undefined" &&
              localStorage.getItem("DEBUG_CHAT_PAGINATION") === "1"
            ) {
              console.group("[ChatPagination] Segment ledger");
              renumbered.forEach((p) => {
                console.log(
                  `  page ${p.pageNumber}: Y[${p.sourceYStart}–${p.sourceYEnd}] ` +
                  `height=${p.height} objects=${p.objectIds.length} scale=${p.placement.scale.toFixed(3)}`
                );
              });
              console.groupEnd();
            }

            resolve(renumbered);
          })
          .catch(reject);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = (err) => reject(err);
    img.src = imageUrl;
  });
}

// ─── Tail page merge ──────────────────────────────────────────────────────────

async function mergeTinyTailPages(
  pages: PageSegment[],
  width: number
): Promise<PageSegment[]> {
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
        (currentHeight <= tailMergeHeightThreshold &&
          mergedHeight <= maxMergedTailHeight));

    if (shouldMergeTailPage) {
      merged[merged.length - 1] = await stitchPageSegments(previous, page, width);
    } else {
      merged.push(page);
    }
  }

  return merged;
}

// ─── Page stitching ───────────────────────────────────────────────────────────

/**
 * Stitches two vertically adjacent PageSegments into one.
 * Merges sourceY ranges and objectIds so metadata stays correct.
 * The resulting page represents [upper.sourceYStart, lower.sourceYEnd].
 */
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
  if (!ctx) return upper;

  ctx.drawImage(upperImg, 0, 0, width, upperImg.naturalHeight);
  ctx.drawImage(lowerImg, 0, upperImg.naturalHeight, width, lowerImg.naturalHeight);

  // Merge object ID sets (deduplicate in case of overlap — should never happen
  // after validation, but be safe)
  const mergedIds = Array.from(
    new Set([...upper.objectIds, ...lower.objectIds])
  );

  return {
    canvasDataUrl: canvas.toDataURL("image/png"),
    pageNumber: upper.pageNumber,
    height: canvas.height,
    // sourceY spans the union of both segments
    sourceYStart: Math.min(upper.sourceYStart, lower.sourceYStart),
    sourceYEnd: Math.max(upper.sourceYEnd, lower.sourceYEnd),
    objectIds: mergedIds,
    placement: {
      // Use the lower scale (more conservative — shows more content squeezed in)
      scale: Math.min(upper.placement.scale, lower.placement.scale),
      align: "bottom",
    },
    warnings: [
      ...(upper.warnings ?? []),
      ...(lower.warnings ?? []),
      "merged tail segment",
    ],
  };
}

// ─── Oversized object splitter ────────────────────────────────────────────────

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

    if (projectedHeight <= maxInternalObjectHeight) continue;

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
      hasSafeGapValley(
        gapStart,
        gapEnd,
        rowSolidness,
        rowActivity,
        rowWideEdgeSpan,
        width
      );

    if (!canSplitHere) continue;

    const chunkFragments = fragments.slice(chunkStartIndex, index);
    splitObjects.push({
      yTop: chunkFragments[0].yTop,
      yBottom: chunkFragments[chunkFragments.length - 1].yBottom,
      mergedFrom: chunkFragments,
    });
    chunkStartIndex = index;
  }

  if (chunkStartIndex === 0) return [object];

  const tailFragments = fragments.slice(chunkStartIndex);
  splitObjects.push({
    yTop: tailFragments[0].yTop,
    yBottom: tailFragments[tailFragments.length - 1].yBottom,
    mergedFrom: tailFragments,
  });

  return splitObjects;
}

// ─── Gap safety check ─────────────────────────────────────────────────────────

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
  if (gapHeight < minGapHeight) return false;

  let solidRows = 0;
  let totalActivity = 0;

  for (let y = startY; y < endY; y++) {
    if (rowWideEdgeSpan[y]) return false;
    if (rowSolidness[y]) solidRows += 1;
    totalActivity += rowActivity[y] ?? 0;
  }

  const averageActivity = totalActivity / gapHeight;
  const solidRatio = solidRows / gapHeight;
  return solidRatio >= 0.85 && averageActivity <= 0.006;
}

// ─── Shrink helpers ───────────────────────────────────────────────────────────

function evaluateShrinkFit(
  contentHeight: number,
  frameFitHeight: number
): { fits: boolean; scale: number } {
  if (contentHeight <= frameFitHeight) return { fits: true, scale: 1 };

  let scale = 1;
  while (contentHeight * scale > frameFitHeight && scale > MIN_SHRINK_SCALE) {
    scale *= SHRINK_STEP;
  }

  if (contentHeight * scale > frameFitHeight) return { fits: false, scale };
  return { fits: true, scale };
}

function shouldKeepObjectOnCurrentPage(
  currentContentHeight: number,
  candidateObjectHeight: number,
  frameFitHeight: number,
  candidateScale: number
): boolean {
  if (candidateScale < MIN_SHRINK_SCALE) return false;

  const remainingFrameSpace = Math.max(0, frameFitHeight - currentContentHeight);
  const visibleFraction =
    candidateObjectHeight > 0 ? remainingFrameSpace / candidateObjectHeight : 0;

  if (visibleFraction < 0.25 && candidateScale < 0.9) return false;
  if (visibleFraction < 0.45 && candidateScale < 0.78) return false;
  if (currentContentHeight >= frameFitHeight * 0.9 && candidateScale < 0.72)
    return false;
  if (currentContentHeight <= frameFitHeight * 0.3)
    return candidateScale >= MIN_SHRINK_SCALE;
  if (visibleFraction >= 0.5 && candidateScale >= 0.55) return true;
  return candidateScale >= 0.6 || visibleFraction >= 0.65;
}

// ─── Cross-file visual overlap detection ─────────────────────────────────────

/**
 * Result of a cross-file visual overlap check.
 */
export interface VisualOverlapResult {
  /**
   * How many pixels to trim from the TOP of the NEXT file before paginating.
   * 0 means no overlap was detected. Value is in original-image coordinates.
   */
  overlapPixels: number;
  /** Confidence 0–1 that the overlap is genuine (1 = perfect pixel match). */
  confidence: number;
  /** Algorithm used. "pixel-match" = sliding-window MAD, "none" = no overlap. */
  method: "pixel-match" | "none";
}

/**
 * Detects visual overlap between the tail of prevFileUrl and the head of nextFileUrl.
 *
 * This is needed when users upload sequential LINE screenshots that contain
 * the same chat messages at the bottom of one file and the top of the next.
 *
 * Algorithm:
 *   1. Scale both images to compareWidth for speed.
 *   2. Extract the bottom MAX_STRIP rows of prev and the top MAX_STRIP rows of next.
 *   3. Sliding window: for k = MAX_STRIP down to MIN_OVERLAP (step STEP_PX):
 *        compare prev[-k:] with next[:k] using mean absolute difference (MAD).
 *   4. If MAD < MAD_THRESHOLD → overlap of k pixels found (returned in original coords).
 *
 * Never throws. Returns { overlapPixels: 0, ... } on any error.
 */
export async function detectCrossFileOverlap(
  prevFileUrl: string,
  nextFileUrl: string,
  compareWidth = 400
): Promise<VisualOverlapResult> {
  const NO_OVERLAP: VisualOverlapResult = { overlapPixels: 0, confidence: 0, method: "none" };

  try {
    const [prevImg, nextImg] = await Promise.all([
      loadSegmentImage(prevFileUrl),
      loadSegmentImage(nextFileUrl),
    ]);

    // Tuning knobs
    const MAX_STRIP_PX = 500;    // max strip height to examine at compareWidth scale
    const MIN_OVERLAP_PX = 60;   // smallest overlap we bother detecting (scaled)
    const STEP_PX = 8;           // sliding-window step (scaled pixels)
    const COL_SAMPLE = 6;        // sample every Nth column
    const ROW_SAMPLE = 4;        // sample every Nth row
    const MAD_THRESHOLD = 15.0;  // max per-channel mean absolute difference → "same"

    const prevScale = compareWidth / prevImg.naturalWidth;
    const nextScale = compareWidth / nextImg.naturalWidth;

    const prevScaledH = Math.round(prevImg.naturalHeight * prevScale);
    const nextScaledH = Math.round(nextImg.naturalHeight * nextScale);

    if (prevScaledH < MIN_OVERLAP_PX || nextScaledH < MIN_OVERLAP_PX) return NO_OVERLAP;

    const prevStripH = Math.min(MAX_STRIP_PX, prevScaledH);
    const nextStripH = Math.min(MAX_STRIP_PX, nextScaledH);

    // ── Render bottom strip of prev ──────────────────────────────────────────
    const prevCanvas = document.createElement("canvas");
    prevCanvas.width = compareWidth;
    prevCanvas.height = prevStripH;
    const prevCtx = prevCanvas.getContext("2d");
    if (!prevCtx) return NO_OVERLAP;

    const prevSrcY = prevImg.naturalHeight - Math.round(prevStripH / prevScale);
    const prevSrcH = prevImg.naturalHeight - Math.max(0, prevSrcY);
    prevCtx.drawImage(
      prevImg,
      0, Math.max(0, prevSrcY), prevImg.naturalWidth, prevSrcH,
      0, 0, compareWidth, prevStripH
    );
    const prevPixels = prevCtx.getImageData(0, 0, compareWidth, prevStripH).data;

    // ── Render top strip of next ─────────────────────────────────────────────
    const nextCanvas = document.createElement("canvas");
    nextCanvas.width = compareWidth;
    nextCanvas.height = nextStripH;
    const nextCtx = nextCanvas.getContext("2d");
    if (!nextCtx) return NO_OVERLAP;

    const nextSrcH = Math.round(nextStripH / nextScale);
    nextCtx.drawImage(
      nextImg,
      0, 0, nextImg.naturalWidth, nextSrcH,
      0, 0, compareWidth, nextStripH
    );
    const nextPixels = nextCtx.getImageData(0, 0, compareWidth, nextStripH).data;

    // ── Sliding window MAD comparison ────────────────────────────────────────
    const maxK = Math.min(prevStripH, nextStripH);

    for (let k = maxK; k >= MIN_OVERLAP_PX; k -= STEP_PX) {
      // Compare prev[end-k .. end] with next[0 .. k]
      let totalDiff = 0;
      let samples = 0;

      for (let row = 0; row < k; row += ROW_SAMPLE) {
        const prevRowBase = (prevStripH - k + row) * compareWidth;
        const nextRowBase = row * compareWidth;
        for (let col = 0; col < compareWidth; col += COL_SAMPLE) {
          const pi = (prevRowBase + col) * 4;
          const ni = (nextRowBase + col) * 4;
          // R + G + B channels (ignore alpha)
          totalDiff +=
            Math.abs(prevPixels[pi]     - nextPixels[ni]) +
            Math.abs(prevPixels[pi + 1] - nextPixels[ni + 1]) +
            Math.abs(prevPixels[pi + 2] - nextPixels[ni + 2]);
          samples += 3;
        }
      }

      if (samples === 0) continue;
      const mad = totalDiff / samples;

      if (mad < MAD_THRESHOLD) {
        // Convert k from scaled pixels back to original next-image pixels
        const overlapInOriginal = Math.round(k / nextScale);
        const confidence = Math.max(0, Math.min(1, 1 - mad / MAD_THRESHOLD));
        return { overlapPixels: overlapInOriginal, confidence, method: "pixel-match" };
      }
    }

    return NO_OVERLAP;
  } catch {
    return NO_OVERLAP;
  }
}

/**
 * Crops the top `trimPixels` rows from an image and returns a new PNG data URL.
 * Safe: returns the original URL if trimPixels <= 0 or on any error.
 */
export async function trimImageTop(imageUrl: string, trimPixels: number): Promise<string> {
  if (trimPixels <= 0) return imageUrl;

  try {
    const img = await loadSegmentImage(imageUrl);
    const newHeight = img.naturalHeight - trimPixels;
    if (newHeight <= 0) return imageUrl;

    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = newHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return imageUrl;

    ctx.drawImage(
      img,
      0, trimPixels, img.naturalWidth, newHeight,
      0, 0, img.naturalWidth, newHeight
    );
    return canvas.toDataURL("image/png");
  } catch {
    return imageUrl;
  }
}

// ─── Image loader ─────────────────────────────────────────────────────────────

function loadSegmentImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = (error) => reject(error);
    image.src = dataUrl;
  });
}
