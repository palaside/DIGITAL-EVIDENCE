import playwrightPkg from "../Create Single Page Website/node_modules/playwright/index.js";

const { chromium } = playwrightPkg;

const browser = await chromium.launch({ headless: true, channel: "msedge" });
const page = await browser.newPage();

try {
  await page.goto("http://127.0.0.1:5173/", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForSelector('input[type="file"]', { timeout: 30000, state: "attached" });

  const result = await page.evaluate(async () => {
    const { segmentChatImage } = await import("http://127.0.0.1:5173/src/app/utils/pagination.ts");

    const makeWallpaper = (ctx, width, height) => {
      ctx.fillStyle = "#f3e5bf";
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = "rgba(235, 220, 182, 0.65)";
      ctx.lineWidth = 2;
      for (let y = -40; y < height + 40; y += 40) {
        ctx.beginPath();
        for (let x = 0; x <= width; x += 20) {
          const waveY = y + Math.sin((x / width) * Math.PI * 2) * 6;
          if (x === 0) ctx.moveTo(x, waveY);
          else ctx.lineTo(x, waveY);
        }
        ctx.stroke();
      }
    };

    const drawBubble = (ctx, x, y, width, height, side = "left") => {
      ctx.fillStyle = side === "left" ? "#ffffff" : "#d9c38a";
      ctx.strokeStyle = "rgba(90, 70, 30, 0.22)";
      ctx.lineWidth = 2;
      const radius = 22;
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#493520";
      ctx.font = "32px Arial";
      ctx.fillText("message", x + 28, y + 58);
    };

    const drawSticker = (ctx, x, y, size) => {
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2, size / 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#222";
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.fillStyle = "#ff6b6b";
      ctx.beginPath();
      ctx.arc(x + size * 0.38, y + size * 0.42, 8, 0, Math.PI * 2);
      ctx.arc(x + size * 0.62, y + size * 0.42, 8, 0, Math.PI * 2);
      ctx.fill();
    };

    const canvasToDataUrl = (canvas) => canvas.toDataURL("image/png");
    const measureHeights = async (segments) => {
      const heights = [];
      for (const segment of segments) {
        const img = new Image();
        img.src = segment.canvasDataUrl;
        await img.decode();
        heights.push(img.naturalHeight);
      }
      return heights;
    };

    const width = 800;

    // Case 1: one bubble then a huge wallpaper gap. First page must not
    // include the gap as if it were evidence.
    const gapCanvas = document.createElement("canvas");
    gapCanvas.width = width;
    gapCanvas.height = 2200;
    const gapCtx = gapCanvas.getContext("2d");
    makeWallpaper(gapCtx, gapCanvas.width, gapCanvas.height);
    drawBubble(gapCtx, 90, 120, 360, 120, "left");
    drawBubble(gapCtx, 360, 1620, 280, 110, "right");
    const gapSegments = await segmentChatImage(canvasToDataUrl(gapCanvas));
    const gapHeights = await measureHeights(gapSegments);

    // Case 2: second object slightly crosses the A4 soft limit. It should
    // stay whole on page 1 instead of being split.
    const nearBoundaryCanvas = document.createElement("canvas");
    nearBoundaryCanvas.width = width;
    nearBoundaryCanvas.height = 1700;
    const boundaryCtx = nearBoundaryCanvas.getContext("2d");
    makeWallpaper(boundaryCtx, nearBoundaryCanvas.width, nearBoundaryCanvas.height);
    drawBubble(boundaryCtx, 90, 90, 360, 120, "left");
    drawSticker(boundaryCtx, 500, 940, 180);
    drawBubble(boundaryCtx, 320, 1030, 320, 160, "right");
    drawBubble(boundaryCtx, 120, 1280, 360, 120, "left");
    const boundarySegments = await segmentChatImage(canvasToDataUrl(nearBoundaryCanvas));
    const boundaryHeights = await measureHeights(boundarySegments);

    return {
      gapCase: {
        pageCount: gapSegments.length,
        heights: gapHeights,
      },
      nearBoundaryCase: {
        pageCount: boundarySegments.length,
        heights: boundaryHeights,
      },
    };
  });

  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
