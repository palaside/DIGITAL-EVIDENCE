const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { fabric } = require('fabric');
const { jsPDF } = require('jspdf');

const ROOT = path.join(__dirname, '..');
const INPUT_DIR = path.join(ROOT, 'inputs');
const OUTPUT_DIR = path.join(ROOT, 'outputs');
const LOG_DIR = path.join(ROOT, 'logs');

const A4_CANVAS_WIDTH = 1240;
const A4_CANVAS_HEIGHT = 1754;
const SAFE_MARGIN = 60;
const MIN_GAP = 24;

const canvas = new fabric.Canvas('a4-canvas', {
  width: A4_CANVAS_WIDTH,
  height: A4_CANVAS_HEIGHT,
  backgroundColor: '#ffffff'
});

let currentY = SAFE_MARGIN;
let evidenceItems = [];

function setStatus(text) {
  const el = document.getElementById('status');
  if (el) el.textContent = text;
}

function ensureDirs() {
  [INPUT_DIR, OUTPUT_DIR, LOG_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });
}

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function listImages() {
  ensureDirs();
  return fs.readdirSync(INPUT_DIR)
    .filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map(name => path.join(INPUT_DIR, name));
}

function addChatImage(filePath) {
  return new Promise((resolve, reject) => {
    fabric.Image.fromURL(filePath, img => {
      const maxWidth = A4_CANVAS_WIDTH - SAFE_MARGIN * 2;
      img.scaleToWidth(maxWidth);
      img.set({
        left: SAFE_MARGIN,
        top: currentY,
        selectable: true,
        lockRotation: true,
        lockMovementX: true,
        objectCaching: false,
        metadata: {
          filename: path.basename(filePath),
          fullpath: filePath,
          sha256: sha256(filePath),
          mtime: fs.statSync(filePath).mtime.toISOString()
        }
      });
      canvas.add(img);
      evidenceItems.push(img);
      currentY += img.getScaledHeight();
      canvas.setHeight(Math.max(A4_CANVAS_HEIGHT, currentY + SAFE_MARGIN));
      canvas.renderAll();
      resolve(img);
    }, { crossOrigin: 'anonymous' });
  });
}

function isCutLineSafe(objects, cutLineY, padding = 8) {
  return !objects.some(obj => {
    const top = obj.top - padding;
    const bottom = obj.top + obj.getScaledHeight() + padding;
    return cutLineY > top && cutLineY < bottom;
  });
}

function hasMinimumGap(objects, y, minGap = MIN_GAP) {
  for (let yy = y - Math.floor(minGap / 2); yy <= y + Math.floor(minGap / 2); yy++) {
    if (!isCutLineSafe(objects, yy, 0)) return false;
  }
  return true;
}

function findGapValley(objects, targetY, searchRange = 280) {
  const start = Math.min(targetY, canvas.height - SAFE_MARGIN);
  const stop = Math.max(SAFE_MARGIN, start - searchRange);
  for (let y = start; y >= stop; y--) {
    if (isCutLineSafe(objects, y) && hasMinimumGap(objects, y)) return y;
  }
  return null;
}

function getSafeCutPoint(objects, yTarget) {
  if (yTarget >= canvas.height - SAFE_MARGIN) return canvas.height;
  if (isCutLineSafe(objects, yTarget) && hasMinimumGap(objects, yTarget)) return yTarget;
  const safeY = findGapValley(objects, yTarget);
  return safeY || yTarget;
}

function writeAudit(pdfName, pages) {
  const log = {
    generated_at: new Date().toISOString(),
    pdf: pdfName,
    total_files: evidenceItems.length,
    pages,
    files: evidenceItems.map(item => item.metadata)
  };
  const logPath = path.join(LOG_DIR, `audit_${Date.now()}.json`);
  fs.writeFileSync(logPath, JSON.stringify(log, null, 2), 'utf8');
}

async function exportEvidencePDF() {
  ensureDirs();
  if (evidenceItems.length === 0) {
    setStatus('NO INPUT IMAGES');
    return;
  }
  setStatus('EXPORTING PDF...');

  const doc = new jsPDF('p', 'mm', 'a4');
  let sourceY = 0;
  let pageIndex = 0;
  const pages = [];
  const pageHeightPx = A4_CANVAS_HEIGHT;

  while (sourceY < canvas.height - 1) {
    if (pageIndex > 0) doc.addPage();

    const targetY = sourceY + pageHeightPx;
    const cutY = getSafeCutPoint(evidenceItems, targetY);
    const cropHeight = Math.max(1, cutY - sourceY);

    const pageData = canvas.toDataURL({
      format: 'jpeg',
      quality: 1.0,
      multiplier: 2,
      left: 0,
      top: sourceY,
      width: canvas.width,
      height: cropHeight
    });

    const imgWidthMm = 210;
    const imgHeightMm = Math.min(287, (cropHeight * imgWidthMm) / canvas.width);
    doc.addImage(pageData, 'JPEG', 0, 0, imgWidthMm, imgHeightMm);

    doc.setFontSize(8);
    doc.setTextColor(90);
    doc.text(`Page ${pageIndex + 1}`, 186, 292);
    doc.text(`Generated: ${new Date().toISOString()}`, 10, 292);
    doc.text(`Files: ${evidenceItems.length}`, 10, 296);

    pages.push({ page: pageIndex + 1, from_y: sourceY, cut_y: cutY, mode: cutY === targetY ? 'target' : 'safe-gap-or-fallback' });

    if (cutY <= sourceY) break;
    sourceY = cutY;
    pageIndex++;
  }

  const pdfName = `Chat_Evidence_Report_${Date.now()}.pdf`;
  const outPath = path.join(OUTPUT_DIR, pdfName);
  fs.writeFileSync(outPath, Buffer.from(doc.output('arraybuffer')));
  writeAudit(pdfName, pages);
  setStatus(`DONE: ${pdfName}`);
}

async function loadImagesAutomatically() {
  ensureDirs();
  setStatus('LOADING INPUTS...');
  const files = listImages();
  for (const file of files) await addChatImage(file);
  setStatus(files.length ? `READY: ${files.length} image(s)` : 'READY: put images in inputs/');
}

window.exportEvidencePDF = exportEvidencePDF;
window.addEventListener('DOMContentLoaded', loadImagesAutomatically);
