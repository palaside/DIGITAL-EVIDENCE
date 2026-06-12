const assert = require("assert/strict");
const { buildShrinkFirstScaleCandidates, fitBoxToFrame, findActiveBounds, findRollbackCutY } = require("../src/layout-fit");

function approxEqual(actual, expected, epsilon = 1e-6) {
  assert.ok(Math.abs(actual - expected) <= epsilon, `Expected ${actual} to be within ${epsilon} of ${expected}`);
}

// 1) Scale candidates must shrink in 2% steps.
{
  const candidates = buildShrinkFirstScaleCandidates({ maxScale: 1, minScale: 0.9, step: 0.02 });
  assert.deepEqual(candidates, [1, 0.98, 0.96, 0.94, 0.92, 0.9]);
}

// 2) Fit should keep scale 1 when the box already fits.
{
  const fit = fitBoxToFrame({
    boxWidth: 600,
    boxHeight: 400,
    frameWidth: 800,
    frameHeight: 900,
    step: 0.02,
    minScale: 0.1,
    maxScale: 1,
    alignX: "center",
    alignY: "bottom",
  });

  assert.ok(fit);
  assert.equal(fit.pass, "shrink");
  assert.equal(fit.scale, 1);
  approxEqual(fit.x, 100);
  approxEqual(fit.y, 500);
  approxEqual(fit.width, 600);
  approxEqual(fit.height, 400);
}

// 3) When the box is slightly too tall, shrink-first must step down until it fits.
{
  const fit = fitBoxToFrame({
    boxWidth: 800,
    boxHeight: 908,
    frameWidth: 800,
    frameHeight: 895,
    step: 0.02,
    minScale: 0.1,
    maxScale: 1,
    alignX: "center",
    alignY: "bottom",
  });

  assert.ok(fit);
  assert.equal(fit.scale, 0.98);
  assert.ok(fit.height <= 895);
  assert.ok(fit.width <= 800);
  approxEqual(fit.x, 8);
  approxEqual(fit.y, 5.16);
}

// 4) If the box cannot fit even at the minimum scale, return null.
{
  const fit = fitBoxToFrame({
    boxWidth: 10000,
    boxHeight: 10000,
    frameWidth: 800,
    frameHeight: 895,
    step: 0.02,
    minScale: 0.1,
    maxScale: 1,
    alignX: "center",
    alignY: "bottom",
  });

  assert.equal(fit, null);
}

// 5) Active bounds should trim blank rows while preserving padding.
{
  const activity = new Array(100).fill(0);
  activity[20] = 0.5;
  activity[21] = 5.2;
  activity[22] = 4.9;
  activity[60] = 6.1;
  activity[61] = 0.2;

  const bounds = findActiveBounds(activity, 10, 80, 4.5, 3);
  assert.equal(bounds.hasActiveContent, true);
  assert.equal(bounds.startY, 18);
  assert.equal(bounds.endY, 64);
}

// 6) Rollback cut should move before the active block instead of splitting it.
{
  const activity = new Array(100).fill(0);
  activity[40] = 0.2;
  activity[41] = 5.4;
  activity[42] = 6.0;
  activity[43] = 5.1;
  activity[44] = 0.3;

  const cutY = findRollbackCutY(activity, 10, 42, 4.5, 2);
  assert.equal(cutY, 39);
}

console.log("layout-fit tests passed");
