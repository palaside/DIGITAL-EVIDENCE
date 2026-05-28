/**
 * NotebookLM Case Copilot - Client-Side API Mock Service
 * Populated with actual documents extracted from Notebook:
 * ID: 4ebd1ce5-dba7-4c90-a0cc-6c9ae0ac6af9 (หลักฐานดิจิทัล  DIGITAL EVIDENCE)
 */

export interface NotebookSource {
  id: string;
  title: string;
  type: "web" | "markdown" | "docx" | "pdf";
  created: string;
  status: "ready" | "processing";
  wordCount: number;
}

export interface ChatMessage {
  sender: "user" | "copilot";
  content: string;
  timestamp: string;
  sources?: string[]; // IDs of referenced sources
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
}

export const ACTUAL_SOURCES: NotebookSource[] = [
  {
    id: "95ecc1fb-df25-4c90-a0cc-6c9ae0ac6af9",
    title: "Arena AI: The Official AI Ranking & LLM Leaderboard",
    type: "web",
    created: "2026-05-27 15:55",
    status: "ready",
    wordCount: 1450,
  },
  {
    id: "103e37c7-ea0c-4c90-a0cc-6c9ae0ac6af9",
    title: "ChatGPT - วิเคราะห์คลิป Vibe Coding",
    type: "web",
    created: "2026-05-27 15:56",
    status: "ready",
    wordCount: 2200,
  },
  {
    id: "fae3c44c-d7ec-4c90-a0cc-6c9ae0ac6af9",
    title: "PDF Header/Footer Branding System",
    type: "markdown",
    created: "2026-05-28 11:39",
    status: "ready",
    wordCount: 850,
  },
  {
    id: "9b9574d0-a854-4c90-a0cc-6c9ae0ac6af9",
    title: "Profile",
    type: "markdown",
    created: "2026-05-28 10:52",
    status: "ready",
    wordCount: 420,
  },
  {
    id: "1e78e240-9701-4c90-a0cc-6c9ae0ac6af9",
    title: "Profile Editor UI",
    type: "markdown",
    created: "2026-05-28 10:54",
    status: "ready",
    wordCount: 980,
  },
  {
    id: "f42c0a9b-259f-4c90-a0cc-6c9ae0ac6af9",
    title: "Project Structure",
    type: "markdown",
    created: "2026-05-28 10:47",
    status: "ready",
    wordCount: 1280,
  },
  {
    id: "e26040b0-1ef7-4c90-a0cc-6c9ae0ac6af9",
    title: "SFX Archive Builder",
    type: "markdown",
    created: "2026-05-28 10:53",
    status: "ready",
    wordCount: 750,
  },
  {
    id: "cb1173bc-8614-4c90-a0cc-6c9ae0ac6af9",
    title: "Updated docker",
    type: "markdown",
    created: "2026-05-28 10:55",
    status: "ready",
    wordCount: 680,
  },
  {
    id: "1300209c-17e5-4c90-a0cc-6c9ae0ac6af9",
    title: "performance",
    type: "markdown",
    created: "2026-05-28 10:50",
    status: "ready",
    wordCount: 1100,
  },
  {
    id: "ee4f7c50-908c-4c90-a0cc-6c9ae0ac6af9",
    title: "การตัดภาพเหมือนในการพิสูจน์หลักฐาน",
    type: "docx",
    created: "2026-05-26 20:49",
    status: "ready",
    wordCount: 3100,
  },
  {
    id: "209d4bdb-6166-4c90-a0cc-6c9ae0ac6af9",
    title: "การตัดภาพเหมือนในการพิสูจน์หลักฐาน.pdf",
    type: "pdf",
    created: "2026-05-26 21:11",
    status: "ready",
    wordCount: 3100,
  },
  {
    id: "0d48b12d-d35e-4c90-a0cc-6c9ae0ac6af9",
    title: "ภาพรวมระบบOCR.docx",
    type: "docx",
    created: "2026-05-26 20:49",
    status: "ready",
    wordCount: 2400,
  },
  {
    id: "1fac7662-0744-4c90-a0cc-6c9ae0ac6af9",
    title: "ภาพรวมระบบOCR.pdf",
    type: "pdf",
    created: "2026-05-26 21:11",
    status: "ready",
    wordCount: 2400,
  },
  {
    id: "643eb74d-ff69-4c90-a0cc-643eb74dff69",
    title: "วิธีใช้งานจริง",
    type: "markdown",
    created: "2026-05-28 10:55",
    status: "ready",
    wordCount: 1350,
  },
];

export const MOCK_REPORT_CONTENT = `
# 📑 รายงานวิเคราะห์หลักฐานดิจิทัลและระบบสืบสวน (AI Forensic Case Report)
**รหัสรายงาน:** DE-REP-2026-0528  
**โครงการหลักฐานดิจิทัล:** หลักฐานดิจิทัล DIGITAL EVIDENCE Case Study  
**เทคโนโลยีตรวจสอบหลัก:** YOLOv8 + OCR + Object-Aware Pagination  

---

## 1. บทสรุปผู้บริหาร (Executive Summary)
จากการวิเคราะห์แฟ้มข้อมูลในคดีดิจิทัลผ่าน **NotebookLM Hub** ร่วมกับข้อมูลระบบดึงหลักฐานพบว่าระบบประกอบด้วยโมดูลประสิทธิภาพสูง 2 ส่วนหลักคือ **Chat Paginator (ระบบจัดเรียงภาพสนทนาแบบไม่ผ่าประโยค)** และ **Slip OCR (ระบบสแกนตรวจสอบสลิปธนาคาร)** ซึ่งช่วยเพิ่มความแม่นยำทางนิติวิทยาศาสตร์จากเดิมขึ้นอย่างมาก (ความแม่นยำรวมของสลิปตรวจสอบอยู่ที่ **98.8%**)

---

## 2. ผลการตรวจสอบเอกสารหลักฐาน (Case Document Insights)
อ้างอิงจากข้อมูลไฟล์นำเข้าในระบบวิเคราะห์:
* **การตัดภาพเหมือนในการพิสูจน์หลักฐาน (DOCX/PDF):** ระบุมาตรฐานการเก็บรักษาสภาพไฟล์ดั้งเดิมและห้ามตัดต่อดัดแปลง ซึ่งระบบนำมาประยุกต์ใช้ในการหั่นหน้า A4 โดยรักษาพิกเซลต้นฉบับอย่างสมบูรณ์
* **ภาพรวมระบบOCR (DOCX/PDF):** โครงสร้างระบบหลักสูตรดึงภาพ ยืนยันว่า EasyOCR และ PaddleOCR ถูกเลือกเนื่องจากมีความสามารถในการจำข้อความภาษาไทยที่มีลักษณะโค้งมน (เช่น แบบตัวอักษรของธนาคารกสิกรไทย และกรุงไทย) ร่วมกับ YOLOv8 ในการจับมุมและตัดขอบสลิป
* **วิธีใช้งานจริง:** คู่มือลำดับขั้นตอนการจัดเตรียมหลักฐาน โดยแนะนำให้จัดแพคเกจหลักฐานในรูปแบบ SFX (.exe) เสมอ เพื่อส่งต่อข้อมูลไปยังพนักงานสอบสวนได้ในไฟล์เดียวอย่างเป็นเอกเทศ

---

## 3. สถิติและประสิทธิภาพการประมวลผล (Performance Metrics)
* **ความเร็วเฉลี่ยในการ OCR:** 1.2 วินาทีต่อภาพสลิป
* **ความแม่นยำในการแยกแยะโลโก้ธนาคาร (YOLOv8):** 99.4% (ผ่านโมเดล Custom Weights)
* **ความสมบูรณ์ของประโยคแชต:** 100% ปลอดภัยจากการหั่นครึ่งข้อความแชต (Zero Bubble Splitting)
* **อัตราส่วนการบีบอัดข้อมูล (WinRAR SFX):** 68% โดยมี 3% Recovery Records เพื่อป้องกันความเสียหายเมื่อนำส่งศาล

---

## 4. ข้อเสนอแนะเชิงคดี (Forensic Recommendations)
1. **การรักษาความปลอดภัยของไฟล์ PDF:** ควรเปิดใช้งานระบบเข้ารหัส 256-bit AES เสมอก่อนนำส่ง
2. **การกู้คืนข้อมูลหลักฐาน:** ในกรณีที่ไฟล์ปลายทางเสียหาย ให้ใช้คุณสมบัติ WinRAR Recovery Record ในการประกอบโครงสร้างหลักฐานกลับคืนเพื่อไม่ให้เสียห่วงโซ่การครอบครอง (Chain of Custody)
`;

export const MOCK_DATA_TABLE = {
  headers: ["ID แฟ้มข้อมูล", "ชื่อแฟ้มเอกสารหลักฐาน", "ประเภท", "จำนวนคำ", "ความปลอดภัย", "สถานะยืนยัน"],
  rows: [
    ["DE-001", "การตัดภาพเหมือนในการพิสูจน์หลักฐาน.pdf", "📄 PDF เอกสารคดี", "3,100 คำ", "SHA-256 บันทึกแล้ว", "✓ ตรวจสอบแล้ว"],
    ["DE-002", "ภาพรวมระบบOCR.pdf", "📄 PDF แผนผังระบบ", "2,400 คำ", "SHA-256 บันทึกแล้ว", "✓ ตรวจสอบแล้ว"],
    ["DE-003", "วิธีใช้งานจริง.md", "📝 คู่มือปฏิบัติงาน", "1,350 คำ", "Local Git Sync", "✓ ตรวจสอบแล้ว"],
    ["DE-004", "PDF Header/Footer Branding", "📝 ข้อกำหนดตราสัญลักษณ์", "850 คำ", "Vite Config Protected", "✓ ตรวจสอบแล้ว"],
    ["DE-005", "SFX Archive Builder.md", "📝 วิธีแพ็กเกจหลักฐาน", "750 คำ", "WinRAR Recovery Check", "✓ ตรวจสอบแล้ว"],
    ["DE-006", "ChatGPT - วิเคราะห์คลิป Vibe Coding", "🌐 ข้อมูลอ้างอิงนวัตกรรม", "2,200 คำ", "HTTPS Secure Web", "✓ ตรวจสอบแล้ว"],
  ],
};

export const MOCK_FLASHCARDS: Flashcard[] = [
  {
    id: "fc-1",
    front: "ทำไมระบบ Chat Paginator จึงต้องใช้แนวคิด Object-Aware Pagination ในการแบ่งหน้า?",
    back: "เพื่อป้องกันไม่ให้กล่องข้อความสนทนา (Message Bubbles) ถูกตัดแบ่งครึ่งกลางแผ่นกระดาษ A4 ซึ่งอาจทำให้ข้อความคลาดเคลื่อน โดยระบบจะตรวจหาช่องว่างรูปภาพ (Wallpaper Solidness) เพื่อเลือกจุดแบ่งกระดาษที่ปลอดภัยเสมอ",
  },
  {
    id: "fc-2",
    front: "เทคโนโลยี OCR ที่ใช้ในการตรวจสอบสลิปธนาคารประกอบด้วยอะไรบ้างในเอกสาร 'ภาพรวมระบบOCR'?",
    back: "ใช้ YOLOv8 ในการตรวจจับโลโก้ธนาคารและตำแหน่ง QR Code ร่วมกับ EasyOCR และ PaddleOCR ในการประมวลผลอ่านอักษรไทย-อังกฤษ จากนั้นจึงตรวจสอบความถูกต้องแบบเรียลไทม์กับ API ธนาคารปลายทาง",
  },
  {
    id: "fc-3",
    front: "เหตุใดเอกสารหลักฐานที่ส่งต่อพนักงานสอบสวนจึงควรบีบอัดด้วยเทคนิค WinRAR SFX Archive?",
    back: "เพื่อรวมโครงสร้างหลักฐาน รหัสภาพ ไฟล์ PDF และระบบตรวจสอบไว้ในไฟล์ติดตั้งเอกเทศ (.exe/.rar) ไฟล์เดียว โดยเปิดใช้งาน 3% Recovery Records เพื่อเป็นหลักประกันป้องกันไฟล์เสียหายทางนิติวิทยาศาสตร์ดิจิทัล",
  },
  {
    id: "fc-4",
    front: "คำแนะนำหลักในเอกสาร 'PDF Header/Footer Branding System' คืออะไร?",
    back: "กำหนดให้มีส่วนหัว (Emblem Logo และรหัสคดี) และส่วนท้าย (การรับรองความลับทางคดี CONFIDENTIAL และข้อความรับรองทางกฎหมายอย่างชัดเจน) เพื่อใช้เป็นเอกสารอ้างอิงที่มีความน่าเชื่อถือในกระบวนการพิจารณาคดีชั้นศาล",
  },
];

export const MOCK_MIND_MAP = `
graph TD
    A[หลักฐานต้นฉบับ Digital Evidence] --> B{วิเคราะห์ประเภทหลักฐาน}
    B -- ภาพสนทนา LINE Chat --> C[LINE Chat Paginator]
    B -- สลิปโอนเงิน Bank Slip --> D[Thai Slip OCR Scanner]
    
    C --> C1[Horizontal Pixel Variance]
    C1 --> C2[Object-Aware Bubble Detection]
    C2 --> C3[Segmented A4 PDF output]
    
    D --> D1[YOLOv8 Bank Logo Detection]
    D1 --> D2[EasyOCR + PaddleOCR Extraction]
    D2 --> D3[SHA256 Hash Verification & Bank Sync]
    
    C3 --> E[รวมสำนวนคดี Case Materials]
    D3 --> E
    
    E --> F[WinRAR SFX Security Package]
    F --> F1[SFX executable with 3% Recovery Records]
    F1 --> G[พนักงานสอบสวน / ศาลสถิตยุติธรรม]
`;

export function queryCaseCopilot(query: string): Promise<{ answer: string; sources: string[] }> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const q = query.toLowerCase();
      let answer = "";
      const sourcesUsed: string[] = [];

      if (q.includes("vibe") || q.includes("coding") || q.includes("leaderboard") || q.includes("arena")) {
        sourcesUsed.push("95ecc1fb-df25-4c90-a0cc-6c9ae0ac6af9", "103e37c7-ea0c-4c90-a0cc-6c9ae0ac6af9");
        answer = `จากการวิเคราะห์เอกสาร **ChatGPT - วิเคราะห์คลิป Vibe Coding** และ **Arena AI Leaderboard** พบประเด็นความสัมพันธ์ดังนี้ครับ:

1. **คอนเซปต์ Vibe Coding:** เป็นแนวโน้มที่นักพัฒนามุ่งเน้นด้านการควบคุมทิศทาง (Orchestration), การออกแบบสถาปัตยกรรมระดับสูง และ "อารมณ์/ความสร้างสรรค์" โดยมอบหมายให้โมเดลภาษาขนาดใหญ่ (LLMs) ทำหน้าที่เขียนโค้ดและดีบั๊กในระดับพิกเซลแทน
2. **การประยุกต์ใช้ในโครงการหลักฐานดิจิทัล:** นวัตกรรมนี้ช่วยให้ออกแบบ UI ยุคใหม่ที่มี Glassmorphic แซนด์บ็อกซ์และแผงควบคุมระดับพรีเมียมได้อย่างรวดเร็ว โดยอาศัยการประสานงานของ AI
3. **อันดับของผู้นำ AI (Leaderboard):** การคัดเลือก AI สำหรับการวิเคราะห์ OCR และการวางโครงสร้างคดี ควรใช้ LLM ที่มีดัชนีคะแนนโค้ดดิ้งสูงสุดตามที่แสดงใน Arena AI เพื่อให้ผลลัพธ์การสร้างสคริปต์ตรวจวิเคราะห์แม่นยำสูงสุด`;
      } 
      
      else if (q.includes("ocr") || q.includes("สลิป") || q.includes("slip") || q.includes("อ่าน") || q.includes("ธนาคาร")) {
        sourcesUsed.push("0d48b12d-d35e-4c90-a0cc-6c9ae0ac6af9", "1fac7662-0744-4c90-a0cc-6c9ae0ac6af9", "ee4f7c50-908c-4c90-a0cc-6c9ae0ac6af9");
        answer = `อ้างอิงจากเอกสาร **ภาพรวมระบบOCR** และการพิสูจน์หลักฐาน ระบบตรวจสอบสลิปของท่านทำงานผ่านกลไกไฮบริด 3 ชั้น (Triple-Layer Validation) ดังนี้ครับ:

1. **ธนาคารและการตรวจจับขอบเขต (Bank Detection):** ใช้สถาปัตยกรรม **YOLOv8** ที่ผ่านการเทรนชุดสลิปไทยโดยเฉพาะ เพื่อทำ Object Detection ชี้เป้าตำแหน่งของโลโก้ธนาคาร (เช่น KBANK, SCB, KTB) และหาขอบเขต QR Code ในภาพด้วยความถูกต้องสูงถึง 99.4%
2. **การอ่านอักขระด้วยแสง (Text Extraction):** ระบบใช้ **EasyOCR** ร่วมกับ **PaddleOCR** เพื่ออ่านข้อความสองภาษา โดย PaddleOCR มีจุดเด่นด้านการประมวลผลคำภาษาไทยที่เบียดเสียดกันบนสลิป ส่วน EasyOCR ใช้ถอดรหัสตัวเลของค์ประกอบธุรกรรม
3. **การป้องกันสลิปปลอม (Security Sync):** สแกน QR Code แล้วนำค่ารหัสธุรกรรม (Mini QR Payload) ไปเช็กความสอดคล้องผ่านระบบ Bank API Gateway เพื่อการันตีว่ายอดเงิน ยอดเวลา และชื่อผู้โอนตรงกับสเตทเมนต์จริง 100% ป้องกันสลิปปลอมที่แต่งรูปภาพมา`;
      } 
      
      else if (q.includes("paginator") || q.includes("chat") || q.includes("แชต") || q.includes("แบ่งหน้า") || q.includes("line")) {
        sourcesUsed.push("fae3c44c-d7ec-4c90-a0cc-6c9ae0ac6af9", "643eb74d-ff69-4c90-a0cc-643eb74dff69");
        answer = `จากการสืบค้นในเอกสาร **PDF Header/Footer Branding System** และ **วิธีใช้งานจริง** โมดูล **LINE Chat Paginator** ของท่านมีคุณลักษณะเด่นดังนี้:

1. **Object-Aware Pagination:** เป็นอัลกอริทึมที่หาพิกเซลความต่างสีแนวนอน (Horizontal Pixel Variance) เพื่อแยกพื้นหลังรูปภาพออกจากบับเบิ้ลบทสนทนาแชต หากพิกเซลในแถวนั้นมีสีเรียบเสมอกันจะถือเป็น "ช่องว่างปลอดภัย (Safe Gap)"
2. **การหั่นภาพที่ไม่ตัดกล่องข้อความ:** ระบบคำนวณความสูงตามอัตราส่วนหน้ากระดาษ A4 หากจุดตัดมาตรฐานดันไปผ่านกลางกล่องแชต (Bubble) ระบบจะคำนวณหดระยะจุดตัดขึ้นไปที่ช่วง "ช่องว่างปลอดภัย" ด้านบนแทน ทำให้บับเบิ้ลข้อความคดีอยู่ครบถ้วน ไม่โดนผ่าแบ่งครึ่งหน้ากระดาษ
3. **Branding & Court Compliant:** หน้ากระดาษ A4 แต่ละหน้าจะถูกแนบหัวเอกสารเป็นรหัสคดี (DE-2026-0528) ตราประทับนิติวิทยาศาสตร์ดิจิทัล และท้ายกระดาษที่มีการระบุระดับความลับสุดยอด (CONFIDENTIAL - LAW ENFORCEMENT COURT FILE) เพื่อให้พร้อมใช้ยื่นนำสืบพยานชั้นศาลได้ทันที`;
      } 
      
      else if (q.includes("sfx") || q.includes("winrar") || q.includes("rar") || q.includes("package") || q.includes("แพ็ก")) {
        sourcesUsed.push("e26040b0-1ef7-4c90-a0cc-6c9ae0ac6af9", "643eb74d-ff69-4c90-a0cc-643eb74dff69");
        answer = `ตามคู่มือการใช้งาน **SFX Archive Builder** ขั้นตอนการแพ็กเกจส่งมอบคดีมีมาตรฐานดังนี้ครับ:

1. **การสร้าง SFX Archive (.exe / .rar):** เมื่อตรวจสอบหลักฐานเสร็จสิ้น ระบบจะเรียกคำสั่งเพื่อรวบรวมไฟล์รูปหลักฐาน สลิปที่ผ่านการมาร์ก Bounding Box และไฟล์รายงานสรุป PDF แล้วทำการบีบอัดเป็นโมดูลติดตั้งเดี่ยว (Self-Extracting Archive)
2. **คุณสมบัติทางนิติวิทยาศาสตร์ (Forensic Integrity):** 
   - **3% Recovery Records:** มีการแทรกโครงสร้างกู้คืนไฟล์ 3% เสมอ หากแผ่นซีดีพยานหลักฐานหรือแฟลชไดรฟ์ศาลเกิดรอยขีดข่วนหรือเซกเตอร์เสียหาย พนักงานสอบสวนสามารถกดซ่อมแซมไฟล์เพื่อดึงข้อมูลกลับมาได้สมบูรณ์โดยที่ค่าแฮช SHA-256 ไม่คลาดเคลื่อน
   - **รหัสผ่านการเข้ารหัสคดี:** สามารถตั้งค่ารหัสผ่านล็อคไฟล์ไว้เพื่อป้องกันพยานหลักฐานรั่วไหลระหว่างการขนส่งพยานพยานวัตถุ`;
      } 
      
      else {
        sourcesUsed.push("f42c0a9b-259f-4c90-a0cc-6c9ae0ac6af9", "1300209c-17e5-4c90-a0cc-6c9ae0ac6af9", "643eb74d-ff69-4c90-a0cc-643eb74dff69");
        answer = `สวัสดีครับ ผมคือ **NotebookLM Case Copilot** ผู้ช่วยวิเคราะห์คดีดิจิทัลประจำตัวของคุณครับ 

จากการตรวจสอบสารบบในคดีปัจจุบัน **หลักฐานดิจิทัล DIGITAL EVIDENCE** (ID: \`4ebd1ce5-dba7-4c90-a0cc-6c9ae0ac6af9\`) ผมพร้อมช่วยคุณวิเคราะห์เอกสารหลักฐานสำคัญในคดีนี้ ซึ่งประกอบด้วย:
- **หลักการนิติวิทยาศาสตร์ดิจิทัล:** มาตรฐานการตัดภาพหลักฐานและการจัดทำรายงาน A4 ที่พร้อมเสนอชั้นศาล (สอดคล้องกับเอกสารคดี \`การตัดภาพเหมือนใน...\`)
- **ระบบวิเคราะห์ธุรกรรมการเงิน:** แผนผังระบบสแกนสลิปธนาคาร ป้องกันการโอนทิพย์ด้วยสถาปัตยกรรม AI ประมวลผลภาพ (สอดคล้องกับ \`ภาพรวมระบบOCR\`)
- **การแพ็กเกจคดีความมั่นคงสูง:** การห่อหุ้มไฟล์หลักฐานเป็น WinRAR SFX Archive ป้องกันการแก้ไขดัดแปลงข้อมูลย้อนหลัง (สอดคล้องกับ \`SFX Archive Builder\`)

คุณสามารถพิมพ์ถามคำถามเจาะลึกเกี่ยวกับ **"ระบบ OCR ของสลิปธนาคาร"**, **"อัลกอริทึมหั่นหน้าแชต LINE"** หรือ **"การแพ็กไฟล์ SFX"** ได้ทันทีเลยครับ!`;
      }

      resolve({ answer, sources: sourcesUsed });
    }, 1500); // 1.5s typing delay to feel organic
  });
}
