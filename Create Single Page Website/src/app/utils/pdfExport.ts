import brandLogo from "../../imports/_______________-_Copy-1.png";

const MM_TO_PX = 6;
const PAGE_WIDTH_MM = 210;
const PAGE_HEIGHT_MM = 297;
const DISCLAIMER =
  '"DIGITAL EVIDENCE เป็นเพียงการเครื่องมืออำนวยความสะดวกให้กับผู้ว่าจ้าง โดยไม่ได้ดัดแปลง แก้ไข เพิ่ม-ลบ เนื้อหาจากต้นฉบับใดๆ และไม่มีส่วนเกี่ยวข้องใดๆกับเนื้อหาในเอกสาร เป็นเพียงเครื่องมือที่ทำงานเกี่ยวกับระบบไฟล์เอกสารแบบอิเล็กทรอนิกส์ เท่านั้น"';

export interface PdfSlipRow {
  no: number;
  date: string;
  time: string;
  senderBank: string;
  senderName: string;
  amount: string;
  receiverName: string;
  receiverBank: string;
  memo: string;
  note: string;
}

interface PdfExportOptions {
  mode: "chat" | "slip";
  sourceImages: string[];
  slipRows: PdfSlipRow[];
}

export interface PdfExportResult {
  blob: Blob;
  filename: string;
}

function mm(value: number) {
  return value * MM_TO_PX;
}

function createPageCanvas(widthMm: number, heightMm: number) {
  const canvas = document.createElement("canvas");
  canvas.width = mm(widthMm);
  canvas.height = mm(heightMm);
  return canvas;
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to load an image for PDF export."));
    image.src = url;
  });
}

function drawContainedImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
  verticalAlign: "center" | "bottom" = "center"
) {
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const renderWidth = image.naturalWidth * scale;
  const renderHeight = image.naturalHeight * scale;
  const renderY =
    verticalAlign === "bottom"
      ? y + (height - renderHeight)
      : y + (height - renderHeight) / 2;
  context.drawImage(
    image,
    x + (width - renderWidth) / 2,
    renderY,
    renderWidth,
    renderHeight
  );
}

function drawHeader(
  context: CanvasRenderingContext2D,
  logo: HTMLImageElement,
  modeLabel: string,
  pageNumber: number,
  totalPages: number,
  widthMm: number
) {
  const now = new Date();
  context.drawImage(logo, mm(4), mm(3), mm(14), mm(15));
  context.fillStyle = "#111827";
  context.font = `${mm(3.4)}px Tahoma, sans-serif`;
  context.fillText(`โหมดการทำงาน: ${modeLabel}`, mm(22), mm(7));
  context.fillText(`จำนวนหน้า: ${totalPages}`, mm(22), mm(12));
  context.fillText(`วันที่/เวลา: ${now.toLocaleString("th-TH")}`, mm(22), mm(17));
  context.textAlign = "right";
  context.fillText(`PAGE: ${pageNumber} / ${totalPages}`, mm(widthMm - 5), mm(9));
  context.textAlign = "left";
}

function wrapText(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = Array.from(text);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const nextLine = `${line}${word}`;
    if (line && context.measureText(nextLine).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = nextLine;
    }
  }

  if (line) lines.push(line);
  return lines;
}

function drawFooter(context: CanvasRenderingContext2D, widthMm: number, heightMm: number) {
  context.fillStyle = "#111827";
  context.font = `${mm(2.5)}px Tahoma, sans-serif`;
  const lines = wrapText(context, DISCLAIMER, mm(widthMm - 12));
  lines.slice(0, 3).forEach((line, index) => {
    context.fillText(line, mm(6), mm(heightMm - 10 + index * 3));
  });
}

function clippedText(context: CanvasRenderingContext2D, value: string, maxWidth: number) {
  if (context.measureText(value).width <= maxWidth) return value;
  let output = value;
  while (output.length > 1 && context.measureText(`${output}...`).width > maxWidth) {
    output = output.slice(0, -1);
  }
  return `${output}...`;
}

async function createEvidencePage(
  imageUrl: string,
  logo: HTMLImageElement,
  modeLabel: string,
  pageNumber: number,
  totalPages: number
) {
  const canvas = createPageCanvas(PAGE_WIDTH_MM, PAGE_HEIGHT_MM);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to create a PDF page.");

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  drawHeader(context, logo, modeLabel, pageNumber, totalPages, PAGE_WIDTH_MM);

  const frame = { x: mm(20), y: mm(28), width: mm(170), height: mm(235) };
  context.strokeStyle = "#166534";
  context.lineWidth = mm(0.4);
  context.strokeRect(frame.x, frame.y, frame.width, frame.height);
  drawContainedImage(
    context,
    await loadImage(imageUrl),
    frame.x,
    frame.y,
    frame.width,
    frame.height,
    modeLabel === "Chat Mode" ? "bottom" : "center"
  );

  drawFooter(context, PAGE_WIDTH_MM, PAGE_HEIGHT_MM);
  return canvas;
}

function parseAmount(value: string) {
  const normalized = value.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  return normalized ? Number(normalized[0]) : 0;
}

function createSummaryPage(
  rows: PdfSlipRow[],
  logo: HTMLImageElement,
  pageNumber: number,
  totalPages: number,
  totalAmount: number,
  showTotal: boolean
) {
  const widthMm = PAGE_HEIGHT_MM;
  const heightMm = PAGE_WIDTH_MM;
  const canvas = createPageCanvas(widthMm, heightMm);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to create the OCR summary page.");

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  drawHeader(context, logo, "Slip Mode - OCR Data Analysis", pageNumber, totalPages, widthMm);

  const headers = [
    "ลำดับ",
    "วันที่",
    "เวลา",
    "ธนาคารผู้โอน",
    "ชื่อผู้โอน",
    "จำนวนเงิน",
    "ชื่อผู้รับ",
    "ธนาคารผู้รับ",
    "บันทึกช่วยจำ",
    "หมายเหตุ",
  ];
  const widths = [12, 24, 16, 29, 38, 24, 38, 30, 38, 30];
  const startX = 9;
  const startY = 27;
  const rowHeight = 7;

  context.strokeStyle = "#374151";
  context.lineWidth = mm(0.2);
  context.font = `${mm(2.75)}px Tahoma, sans-serif`;
  context.textBaseline = "middle";

  const drawRow = (values: string[], rowIndex: number, fill: string) => {
    let x = startX;
    const y = startY + rowIndex * rowHeight;
    values.forEach((value, index) => {
      context.fillStyle = fill;
      context.fillRect(mm(x), mm(y), mm(widths[index]), mm(rowHeight));
      context.strokeRect(mm(x), mm(y), mm(widths[index]), mm(rowHeight));
      context.fillStyle = "#111827";
      context.textAlign = index === 0 || index === 5 ? "center" : "left";
      const cellText = clippedText(context, value, mm(widths[index] - 2));
      const textX = index === 0 || index === 5 ? x + widths[index] / 2 : x + 1;
      context.fillText(cellText, mm(textX), mm(y + rowHeight / 2));
      x += widths[index];
    });
  };

  context.font = `bold ${mm(2.75)}px Tahoma, sans-serif`;
  drawRow(headers, 0, "#dcfce7");
  context.font = `${mm(2.65)}px Tahoma, sans-serif`;

  for (let index = 0; index < 20; index += 1) {
    const row = rows[index];
    drawRow(
      row
        ? [
            String(row.no),
            row.date,
            row.time,
            row.senderBank,
            row.senderName,
            row.amount,
            row.receiverName,
            row.receiverBank,
            row.memo,
            "",
          ]
        : ["", "", "", "", "", "", "", "", "", ""],
      index + 1,
      "#ffffff"
    );
  }

  if (showTotal) {
    const summaryY = startY + 21 * rowHeight + 2;
    context.fillStyle = "#111827";
    context.font = `bold ${mm(3.2)}px Tahoma, sans-serif`;
    context.textAlign = "right";
    context.fillText(`รวมยอดเงินทั้งหมด: ${totalAmount.toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท`, mm(widthMm - 10), mm(summaryY));
    context.textAlign = "left";
  }

  context.textBaseline = "alphabetic";
  drawFooter(context, widthMm, heightMm);
  return canvas;
}

export async function buildEvidencePdfBlob({ mode, sourceImages, slipRows }: PdfExportOptions): Promise<PdfExportResult> {
  if (sourceImages.length === 0) throw new Error("No evidence images are available for PDF export.");

  const { jsPDF } = await import("jspdf");
  const logo = await loadImage(brandLogo);
  const summaryPageCount = mode === "slip" ? Math.max(1, Math.ceil(slipRows.length / 20)) : 0;
  const totalPages = sourceImages.length + summaryPageCount;
  const document = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });

  for (let index = 0; index < sourceImages.length; index += 1) {
    if (index > 0) document.addPage("a4", "portrait");
    const page = await createEvidencePage(
      sourceImages[index],
      logo,
      mode === "chat" ? "Chat Mode" : "Slip Mode",
      index + 1,
      totalPages
    );
    document.addImage(page, "PNG", 0, 0, PAGE_WIDTH_MM, PAGE_HEIGHT_MM, undefined, "FAST");
  }

  if (mode === "slip") {
    const totalAmount = slipRows.reduce((sum, row) => sum + parseAmount(row.amount), 0);
    for (let index = 0; index < summaryPageCount; index += 1) {
      document.addPage("a4", "landscape");
      const pageNumber = sourceImages.length + index + 1;
      const summaryPage = createSummaryPage(
        slipRows.slice(index * 20, index * 20 + 20),
        logo,
        pageNumber,
        totalPages,
        totalAmount,
        index === summaryPageCount - 1
      );
      document.addImage(summaryPage, "PNG", 0, 0, PAGE_HEIGHT_MM, PAGE_WIDTH_MM, undefined, "FAST");
    }
  }

  const filename = mode === "chat" ? "LINE_Chat_Paginator_Evidence.pdf" : "Bank_Slip_OCR_Evidence.pdf";
  const blob = document.output("blob");
  return { blob, filename };
}

export async function exportEvidencePdf(options: PdfExportOptions) {
  const { blob, filename } = await buildEvidencePdfBlob(options);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return { blob, filename };
}
