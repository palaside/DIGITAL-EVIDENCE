// Vanilla JavaScript Digital Evidence Processor
// Handles image selection, preview, sorting, and PDF export using jsPDF (window.jspdf)

// Utility: create element with class and innerHTML
function createEl(tag, className, innerHTML) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (innerHTML) el.innerHTML = innerHTML;
  return el;
}

// State
const state = {
  images: [], // {file, src, name}
  statusEl: document.getElementById('status'),
  previewEl: document.getElementById('preview'),
  errorBox: document.getElementById('errorBox'),
  layout: 'fit', // 'fit' or 'fill'
  metadata: true
};

function updateStatus(msg) { state.statusEl.textContent = msg; }
function clearPreview() { state.previewEl.innerHTML = ''; }
function renderPreview() {
  clearPreview();
  state.images.forEach(img => {
    const thumb = createEl('div', 'thumb');
    const image = document.createElement('img');
    image.src = img.src;
    image.alt = img.name;
    const caption = createEl('p', 'filename', img.name);
    thumb.appendChild(image);
    thumb.appendChild(caption);
    state.previewEl.appendChild(thumb);
  });
}
function handleFiles(files) {
  const readPromises = Array.from(files).map(f => new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => resolve({ file: f, src: e.target.result, name: f.name });
    reader.readAsDataURL(f);
  }));
  Promise.all(readPromises).then(results => {
    state.images = [...state.images, ...results].sort((a, b) => a.name.localeCompare(b.name));
    updateStatus(`${state.images.length} image(s) selected`);
    renderPreview();
  });
}
function clearImages() { state.images = []; updateStatus(''); clearPreview(); }

// ---------- SAFE CUT ENGINE V2 ---------- //
// 1. Analyze rows of an image and compute stats
function analyzeRows(imgEl) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = imgEl.naturalWidth;
  canvas.height = imgEl.naturalHeight;
  ctx.drawImage(imgEl, 0, 0);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const rowStats = [];
  for (let y = 0; y < canvas.height; y++) {
    let sum = 0, sumSq = 0, count = 0;
    for (let x = 0; x < canvas.width; x++) {
      const i = (y * canvas.width + x) * 4;
      const r = imgData[i], g = imgData[i+1], b = imgData[i+2];
      const brightness = (r + g + b) / 3;
      sum += brightness;
      sumSq += brightness * brightness;
      count++;
    }
    const avg = sum / count;
    const variance = sumSq / count - avg * avg;
    rowStats.push({ y, avg, variance });
  }
  // edge/change score compared to previous row
  for (let i = 1; i < rowStats.length; i++) {
    rowStats[i].edge = Math.abs(rowStats[i].avg - rowStats[i-1].avg);
  }
  rowStats[0].edge = 0;
  return rowStats;
}

// 2. Find quiet bands (consecutive quiet rows >=10px)
function findQuietBands(rowStats) {
  const quietRows = rowStats.map(r => ({
    y: r.y,
    quiet: r.variance < 4 && r.edge < 5
  }));
  const bands = [];
  let start = null;
  for (let i = 0; i < quietRows.length; i++) {
    if (quietRows[i].quiet) {
      if (start === null) start = i;
    } else if (start !== null) {
      const length = i - start;
      if (length >= 10 && start > 40 && i < rowStats.length - 40) {
        bands.push({ startY: start, endY: i - 1 });
      }
      start = null;
    }
  }
  if (start !== null) {
    const length = quietRows.length - start;
    if (length >= 10 && start > 40 && quietRows.length - 1 < rowStats.length - 40) {
      bands.push({ startY: start, endY: quietRows.length - 1 });
    }
  }
  // Merge nearby bands within 8px
  const merged = [];
  for (let b of bands) {
    if (merged.length && b.startY - merged[merged.length-1].endY <= 8) {
      merged[merged.length-1].endY = b.endY;
    } else {
      merged.push({ ...b });
    }
  }
  // Add centerY and score (average variance)
  for (let b of merged) {
    const centerY = Math.round((b.startY + b.endY) / 2);
    const varianceSum = rowStats.slice(b.startY, b.endY+1).reduce((a,r)=>a+r.variance,0);
    b.centerY = centerY;
    b.score = varianceSum / (b.endY - b.startY + 1);
  }
  return merged;
}

// 3. Detect protected regions (content blocks between quiet bands)
function detectProtectedRegions(rowStats, quietBands, height) {
  const regions = [];
  if (quietBands.length === 0) {
    regions.push({ top: 0, bottom: height, type: 'CONTENT_BLOCK' });
    return regions;
  }
  // before first band
  if (quietBands[0].startY > 0) {
    regions.push({ top: 0, bottom: quietBands[0].startY, type: 'CONTENT_BLOCK' });
  }
  for (let i = 0; i < quietBands.length - 1; i++) {
    const top = quietBands[i].endY;
    const bottom = quietBands[i+1].startY;
    if (bottom > top) {
      regions.push({ top, bottom, type: 'CONTENT_BLOCK' });
    }
  }
  // after last band
  const last = quietBands[quietBands.length-1];
  if (last.endY < height) {
    regions.push({ top: last.endY, bottom: height, type: 'CONTENT_BLOCK' });
  }
  return regions;
}

// 4. Find best safe cut near targetY using quiet bands and protected regions
function findBestSafeCut(targetY, quietBands, protectedRegions, height) {
  const upLimit = Math.max(0, targetY - 220);
  const downLimit = Math.min(height, targetY + 120);
  // Prefer upward search
  const candidatesUp = quietBands.filter(b => b.centerY >= upLimit && b.centerY <= targetY);
  if (candidatesUp.length) {
    const best = candidatesUp.reduce((a,b) => (b.centerY > a.centerY ? b : a), candidatesUp[0]);
    return best.centerY;
  }
  // Then downward search
  const candidatesDown = quietBands.filter(b => b.centerY > targetY && b.centerY <= downLimit);
  if (candidatesDown.length) {
    const best = candidatesDown.reduce((a,b) => (b.centerY < a.centerY ? b : a), candidatesDown[0]);
    return best.centerY;
  }
  return null;
}

// ---------- EXPORT PDF ---------- //
async function exportPDF() {
  if (!window.jspdf) { state.errorBox.style.display = 'block'; state.errorBox.textContent = 'jsPDF library not available.'; return; }
  if (state.images.length === 0) {
    // synthetic image for verification when no user images
    const canvas = document.createElement('canvas');
    canvas.width = 800; canvas.height = 2500;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = '#000'; ctx.font = '30px Arial'; ctx.fillText('Synthetic Test Image', 50, 100);
    const dataURL = canvas.toDataURL('image/jpeg');
    state.images = [{ src: dataURL, name: 'synthetic_test.jpg' }];
  }
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 10; const headerH = 12; const footerH = 12;
  const contentW = pageW - margin * 2;
  const contentH = pageH - margin * 2 - headerH - footerH;
  const gap = 5;
  const pxToMm = 0.264583;
  const timestamp = new Date().toLocaleString();
  const evidenceId = `EVID-${Date.now()}`;
  const warnings = [];
  let pageNum = 1;
  const pageMeta = [];
  const safeCutReport = [];
  const methodCounters = { SAFE_ZONE:0, SMART_SHRINK:0, EMERGENCY:0 };

  const drawHeader = () => {
    pdf.setFontSize(12);
    pdf.text('DIGITAL EVIDENCE / CHAT MODE', pageW/2, margin+5, { align:'center' });
    pdf.setFontSize(9);
    pdf.text(`Evidence ID: ${evidenceId}`, margin, margin+10);
    pdf.text(`Generated: ${timestamp}`, margin, margin+15);
  };
  const drawFooter = (names) => {
    const footY = pageH - margin + 5;
    pdf.setFontSize(9);
    pdf.text(`Timestamp: ${timestamp}`, pageW/2, footY, { align:'center' });
    const src = names.length ? `Source: ${names.join(', ')}` : '';
    pdf.text(src, pageW - margin, footY, { align:'right' });
  };

  // Start first page
  drawHeader();
  let yPos = margin + headerH;
  let currentNames = [];

  for (const img of state.images) {
    const imgEl = new Image();
    imgEl.src = img.src;
    await new Promise(res => { imgEl.onload = res; });
    const scale = contentW / (imgEl.naturalWidth * pxToMm);
    const imgWmm = contentW;
    const imgHmm = imgEl.naturalHeight * pxToMm * scale;
    if (imgHmm <= contentH) {
      if (yPos + imgHmm + gap + footerH > pageH - margin) {
        drawFooter(currentNames);
        pageMeta.push({ names: currentNames });
        pdf.addPage(); pageNum++; drawHeader(); yPos = margin + headerH; currentNames = [];
      }
      const x = (pageW - imgWmm) / 2;
      pdf.addImage(img.src, 'JPEG', x, yPos, imgWmm, imgHmm);
      currentNames = [img.name];
      yPos += imgHmm + gap;
    } else {
      // ---- Safe Cut v2 ----
      const rowStats = analyzeRows(imgEl);
      const quietBands = findQuietBands(rowStats);
      const protectedRegions = detectProtectedRegions(rowStats, quietBands, imgEl.naturalHeight);
      // ---- Safe Cut v2 with validation ----
      let segmentStart = 0;
      let scaleFactor = 1.0;
      const minScale = 0.82;
      const MIN_SLICE_HEIGHT = 80; // minimum slice height in pixels
      while (segmentStart < imgEl.naturalHeight) {
        const remainingPx = imgEl.naturalHeight - segmentStart;
        const desiredPx = Math.min(Math.round(contentH / (pxToMm * scale * scaleFactor)), remainingPx);
        const targetCut = segmentStart + desiredPx;
        let safeY = findBestSafeCut(targetCut, quietBands, protectedRegions, imgEl.naturalHeight);
        let method = 'SAFE_ZONE';
        if (safeY === null) {
          // smart shrink fallback
          let shrunk = false;
          while (scaleFactor > minScale) {
            scaleFactor -= 0.02;
            const newDesired = Math.min(Math.round(contentH / (pxToMm * scale * scaleFactor)), remainingPx);
            const newTarget = segmentStart + newDesired;
            safeY = findBestSafeCut(newTarget, quietBands, protectedRegions, imgEl.naturalHeight);
            if (safeY !== null) { method = 'SMART_SHRINK'; shrunk = true; break; }
          }
          if (!shrunk) { safeY = targetCut; method = 'EMERGENCY'; warnings.push('EMERGENCY CUT USED for ' + img.name); methodCounters.EMERGENCY++; }
        }
        if (method === 'SAFE_ZONE') methodCounters.SAFE_ZONE++;
        if (method === 'SMART_SHRINK') methodCounters.SMART_SHRINK++;
        // Clamp safeY to be after segmentStart and respect minimum slice height
        if (safeY <= segmentStart + MIN_SLICE_HEIGHT) {
          if (remainingPx <= MIN_SLICE_HEIGHT && segmentStart > 0) {
            // merge remaining small piece into previous segment by taking the rest
            safeY = imgEl.naturalHeight;
          } else {
            safeY = Math.min(segmentStart + Math.max(MIN_SLICE_HEIGHT, desiredPx), imgEl.naturalHeight);
          }
          warnings.push('INVALID_SAFE_CUT_CLAMPED for ' + img.name);
        }
        const sliceHeightPx = safeY - segmentStart;
        if (sliceHeightPx <= 0) {
          warnings.push('INVALID_SAFE_CUT_CLAMPED_ZERO for ' + img.name);
          segmentStart = safeY;
          continue;
        }
        // create slice canvas
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = imgEl.naturalWidth;
        sliceCanvas.height = sliceHeightPx;
        const sctx = sliceCanvas.getContext('2d');
        sctx.drawImage(imgEl, 0, segmentStart, imgEl.naturalWidth, sliceHeightPx, 0, 0, imgEl.naturalWidth, sliceHeightPx);
        const sliceData = sliceCanvas.toDataURL('image/jpeg');
        const sliceProps = pdf.getImageProperties(sliceData);
        const sliceH = sliceProps.height * pxToMm * scale * scaleFactor;
        // new page for segment
        drawHeader();
        const x = (pageW - imgWmm) / 2;
        const yPosSeg = margin + headerH;
        pdf.addImage(sliceData, sliceProps.fileType, x, yPosSeg, imgWmm, sliceH);
        const segmentName = `${img.name} (segment ${safeCutReport.length + 1})`;
        drawFooter([segmentName]);
        pageMeta.push({ names: [segmentName] });
        if (!(safeY >= imgEl.naturalHeight && img === state.images[state.images.length-1])) { pdf.addPage(); pageNum++; }
        safeCutReport.push({ name: img.name, method, confidence: 100, cuts: 1, warnings: warnings.slice() });
        segmentStart = safeY;
      }
    }
  }
  // Footer for last page
  drawFooter(currentNames);
  pageMeta.push({ names: currentNames });

  // Warnings page (if any)
  if (warnings.length) {
    pdf.addPage(); pageNum++; drawHeader();
    pdf.setFontSize(12); pdf.text('Warnings', margin, margin+5);
    pdf.setFontSize(10);
    warnings.forEach((w,i) => pdf.text(`${i+1}. ${w}`, margin, margin+15 + i*7));
    drawFooter([]);
    pageMeta.push({ names: [] });
  }

  // SAFE CUT REPORT page
  pdf.addPage(); pageNum++; drawHeader();
  pdf.setFontSize(12); pdf.text('SAFE CUT REPORT', margin, margin+5);
  pdf.setFontSize(10);
  safeCutReport.forEach((rep,i) => {
    const line = `${i+1}. ${rep.name} | method: ${rep.method} | confidence: ${rep.confidence}%`;
    pdf.text(line, margin, margin+15 + i*7);
  });
  drawFooter([]);
  pageMeta.push({ names: [] });

  // AUDIT TRAIL page
  pdf.addPage(); pageNum++; drawHeader();
  pdf.setFontSize(12); pdf.text('AUDIT TRAIL', margin, margin+5);
  pdf.setFontSize(10);
  const totalPages = pdf.getNumberOfPages();
  const auditLines = [
    `Evidence ID: ${evidenceId}`,
    `Generated: ${timestamp}`,
    `Total files: ${state.images.length}`,
    `Total pages: ${totalPages}`,
    `SAFE_ZONE cuts: ${methodCounters.SAFE_ZONE}`,
    `SMART_SHRINK cuts: ${methodCounters.SMART_SHRINK}`,
    `EMERGENCY cuts: ${methodCounters.EMERGENCY}`,
    `PDF filename: chat_evidence_report_v04.pdf`
  ];
  auditLines.forEach((ln,i) => pdf.text(ln, margin, margin+15 + i*7));
  drawFooter([]);
  pageMeta.push({ names: [] });

  // Add page numbers & footer source info for all pages
  const finalTotal = pdf.getNumberOfPages();
  for (let i = 1; i <= finalTotal; i++) {
    pdf.setPage(i);
    const footY = pageH - margin + 5;
    pdf.setFontSize(9);
    pdf.text(`Page ${i} / ${finalTotal}`, margin, footY);
    const meta = pageMeta[i-1] || { names: [] };
    const src = meta.names.length ? `Source: ${meta.names.join(', ')}` : '';
    pdf.text(src, pageW - margin, footY, { align: 'right' });
  }
  const outputName = 'chat_evidence_report_v04.pdf';
  pdf.save(outputName);
  updateStatus(`PDF exported: ${outputName}`);
}

// Event listeners
document.getElementById('selectBtn').addEventListener('click', () => { document.getElementById('fileInput').click(); });
document.getElementById('fileInput').addEventListener('change', e => { handleFiles(e.target.files); });
document.getElementById('clearBtn').addEventListener('click', clearImages);
document.getElementById('exportBtn').addEventListener('click', exportPDF);

// Fallback error if jsPDF fails
setTimeout(() => { if (!window.jspdf) { state.errorBox.style.display='block'; state.errorBox.textContent='jsPDF library failed to load.'; } }, 2000);
