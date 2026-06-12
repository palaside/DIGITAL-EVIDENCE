const EPSILON = 1e-6;

function buildShrinkFirstScaleCandidates({ maxScale = 1, minScale = 0.1, step = 0.02 } = {}) {
  if (step <= 0) {
    throw new Error("step must be greater than 0");
  }
  if (maxScale < minScale) {
    throw new Error("maxScale must be greater than or equal to minScale");
  }

  const candidateCount = Math.floor((maxScale - minScale) / step + EPSILON);
  const candidates = [];

  for (let i = 0; i <= candidateCount; i += 1) {
    const scale = Number((maxScale - i * step).toFixed(6));
    candidates.push(scale);
  }

  const last = candidates[candidates.length - 1];
  if (Math.abs(last - minScale) > EPSILON) {
    candidates.push(Number(minScale.toFixed(6)));
  }

  return candidates.filter((value, index, array) => array.indexOf(value) === index);
}

function resolveHorizontalOffset(frameWidth, scaledWidth, alignX) {
  if (alignX === "left") return 0;
  if (alignX === "right") return frameWidth - scaledWidth;
  return (frameWidth - scaledWidth) / 2;
}

function resolveVerticalOffset(frameHeight, scaledHeight, alignY) {
  if (alignY === "top") return 0;
  if (alignY === "center") return (frameHeight - scaledHeight) / 2;
  return frameHeight - scaledHeight;
}

function fitBoxToFrame({
  boxWidth,
  boxHeight,
  frameWidth,
  frameHeight,
  maxScale = 1,
  minScale = 0.1,
  step = 0.02,
  alignX = "center",
  alignY = "bottom",
} = {}) {
  if (![boxWidth, boxHeight, frameWidth, frameHeight].every((value) => Number.isFinite(value) && value > 0)) {
    throw new Error("boxWidth, boxHeight, frameWidth, and frameHeight must be positive numbers");
  }

  const candidates = buildShrinkFirstScaleCandidates({ maxScale, minScale, step });

  for (const scale of candidates) {
    const scaledWidth = boxWidth * scale;
    const scaledHeight = boxHeight * scale;

    if (scaledWidth <= frameWidth + EPSILON && scaledHeight <= frameHeight + EPSILON) {
      const x = resolveHorizontalOffset(frameWidth, scaledWidth, alignX);
      const y = resolveVerticalOffset(frameHeight, scaledHeight, alignY);

      return {
        pass: "shrink",
        fits: true,
        scale,
        x,
        y,
        width: scaledWidth,
        height: scaledHeight,
      };
    }
  }

  return null;
}

function findActiveBounds(activityByRow, startY, endY, threshold = 4.5, padding = 8) {
  if (!Array.isArray(activityByRow)) {
    throw new Error("activityByRow must be an array");
  }
  if (!Number.isFinite(startY) || !Number.isFinite(endY) || endY <= startY) {
    throw new Error("startY and endY must define a positive range");
  }

  const safeStart = Math.max(0, Math.floor(startY));
  const safeEnd = Math.min(activityByRow.length, Math.ceil(endY));

  let top = -1;
  let bottom = -1;

  for (let y = safeStart; y < safeEnd; y += 1) {
    if ((activityByRow[y] ?? 0) >= threshold) {
      top = y;
      break;
    }
  }

  for (let y = safeEnd - 1; y >= safeStart; y -= 1) {
    if ((activityByRow[y] ?? 0) >= threshold) {
      bottom = y;
      break;
    }
  }

  if (top === -1 || bottom === -1 || bottom <= top) {
    return {
      hasActiveContent: false,
      startY: safeStart,
      endY: safeEnd,
    };
  }

  return {
    hasActiveContent: true,
    startY: Math.max(safeStart, top - padding),
    endY: Math.min(safeEnd, bottom + padding + 1),
  };
}

function findRollbackCutY(activityByRow, currentY, idealCutY, threshold = 4.5, padding = 8) {
  if (!Array.isArray(activityByRow)) {
    throw new Error("activityByRow must be an array");
  }
  if (!Number.isFinite(currentY) || !Number.isFinite(idealCutY)) {
    throw new Error("currentY and idealCutY must be finite numbers");
  }

  const lowerBound = Math.max(0, Math.floor(currentY) + 1);
  const upperBound = Math.min(activityByRow.length - 1, Math.floor(idealCutY));

  let probeY = upperBound;
  while (probeY > lowerBound && (activityByRow[probeY] ?? 0) < threshold) {
    probeY -= 1;
  }

  if (probeY <= lowerBound) {
    return Math.max(lowerBound, Math.min(upperBound, Math.floor(idealCutY)));
  }

  let blockEnd = probeY;
  while (blockEnd > lowerBound && (activityByRow[blockEnd] ?? 0) >= threshold) {
    blockEnd -= 1;
  }

  const blockStart = blockEnd + 1;
  const rollbackCut = Math.max(lowerBound, blockStart - padding);
  return Math.min(rollbackCut, upperBound);
}

module.exports = {
  buildShrinkFirstScaleCandidates,
  fitBoxToFrame,
  findActiveBounds,
  findRollbackCutY,
};
