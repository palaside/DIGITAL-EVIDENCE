---
name: problem-solving-framework
description: >
  A structured problem-solving framework derived from real debugging work on
  Chat Mode Pagination in the DIGITAL EVIDENCE project. Provides 7 concrete
  techniques for root-cause analysis, validation-first development, scope
  discipline, and evidence-based debugging. Apply this skill when facing any
  complex, multi-layered technical problem — especially when previous patch
  attempts have not resolved the root cause.
---

# Problem-Solving Skills Framework
> Derived from: Chat Mode Pagination Problem (DIGITAL EVIDENCE project)

---

## 🎯 Skill 1: Root Cause vs Symptom Analysis

### Technique: "5-Layer Problem Peeling"

```
Symptom: หน้า PDF ไม่ตรงกับ preview
  Layer 1: CSS positioning problem?        → แก้ object-bottom
  Layer 2: Export logic different?          → sync render functions
  Layer 3: Data source inconsistent?       → ใช้ metadata เดียวกัน
  Layer 4: Page boundary undefined?        → เพิ่ม sourceYStart/End
  Layer 5: No validation of data integrity? → เพิ่ม validation gate  ← ROOT CAUSE
```

### Application Pattern
- อย่าแก้ที่เห็นก่อน — ถาม "ทำไมเกิดอาการนี้" ก่อนเสมอ
- Trace backward จาก output ที่ผิดไปหา input หรือ process ที่ผิด
- แก้ที่ **deepest layer** ที่แก้แล้วปัญหาอื่นหายไปด้วย
- ถ้าแก้แล้วต้องแก้อีกซ้ำ ๆ แสดงว่ายังไม่ถึง root cause

---

## 🏗️ Skill 2: Systematic Architecture Design

### Technique: "Data Model First, UI Later"

```
❌ Wrong approach: แก้ที่ PreviewColumn.tsx CSS

✅ Right approach:
  1. Define data contract: PageSegment with full metadata
  2. Build validation rules: no overlap, no duplicate objectId
  3. Implement data layer: object ledger + semantic classifier
  4. Then adjust UI to consume validated data only
```

### Application Pattern
- Start with **data structure ที่อยากได้ในอุดมคติ** ก่อนเขียน logic
- Define **invariants** (กฎที่ต้องเป็นจริงเสมอ) เป็นลายลักษณ์อักษร
- Build **validation ก่อน business logic** — รู้ว่า correct คืออะไรก่อน
- Make UI **dumb** — รับ validated data มาแสดงเท่านั้น ไม่ตัดสินใจเอง

---

## ✅ Skill 3: Validation-First Development

### Technique: "Fail Fast, Fail Clear"

```typescript
// ❌ Wrong — try to fix everything silently
function processData(input) {
  const result = transform(input);
  return patchProblems(result); // ซ่อนปัญหาแทนที่จะแก้
}

// ✅ Right — validate before proceed
function processData(input) {
  const result = transform(input);
  const validation = validate(result);

  if (!validation.success) {
    throw new ValidationError(validation.errors); // block ไปเลย + บอกสาเหตุ
  }

  return result;
}
```

### Application Pattern
- Define **success criteria explicitly** ก่อนเริ่มเขียน code
- **Block progression** เมื่อ criteria ไม่ผ่าน — ดีกว่า silent wrong output
- Make errors **informative** — บอกว่าผิดอะไร, ที่ไหน, แก้ยังไง
- **Don't paper over problems** — แก้จริง ๆ ไม่ใช่ซ่อน

---

## 🔄 Skill 4: Incremental Risk Management

### Technique: "Layered Implementation"

```
Week 1: Core concept + validation gate
        ↓ ทดสอบ concept พื้นฐานก่อน
Week 2: Integration + real data testing
        ↓ ใช้งานได้แล้วค่อยเพิ่ม
Week 3: Edge cases + fallback strategy
        ↓ polish เมื่อ main path แข็งแรง
```

### Application Pattern
- ทำให้ **core working ก่อน** แล้วค่อย add features รอบนอก
- **Test each layer** ก่อนไป layer ถัดไป (อย่า build ทุกอย่างพร้อมกัน)
- Prepare **fallback** สำหรับเมื่อ new approach ไม่ work
- Preserve **working state** — ถ้า new version broken ต้อง rollback ได้เสมอ

---

## 🕵️ Skill 5: Evidence-Based Debugging

### Technique: "Concrete Test Case Driven"

```
❌ Vague:   "บางครั้งหน้า PDF ผิด"
✅ Specific: "page 19-20 ใน D:\EDOK\แชทที่ 3 มี content ซ้ำ 3 บรรทัด"

❌ Guess:   "น่าจะเป็นเรื่อง CSS"
✅ Trace:   "sourceYStart ของ page 20 = 1250,
             sourceYEnd  ของ page 19 = 1280
             → overlap 30px ← นี่คือหลักฐาน"
```

### Application Pattern
- เก็บ **real failing cases** ไว้เป็น regression test ไม่ลบทิ้ง
- วัดปัญหา **เป็นตัวเลข** — px, timestamp, count, ratio
- Test fix กับ **original problem case** ไม่ใช่แค่ synthetic test
- Document **"what fixed what"** เพื่อไม่ให้ปัญหากลับมา

---

## 🎌 Skill 6: Scope Discipline

### Technique: "Project Boundary Enforcement"

```
In Scope ✅              Out of Scope ❌
────────────────────     ──────────────────────
Chat Mode pagination     Slip Mode changes
Object detection         AI-powered classification
Validation gate          UI redesign
Preview/export parity    Backend OCR
```

### Application Pattern
- ตั้ง **explicit boundaries** ตั้งแต่เริ่ม พร้อมเขียนไว้ใน status file
- **Resist scope creep** แม้จะ "แค่เพิ่มนิดหน่อย" — ทุกอย่างสำคัญ
- **Close current phase ก่อนเปิด phase ใหม่** เสมอ
- Say no to perfection — **good enough เพื่อปิดงาน** ดีกว่า perfect แต่ไม่เสร็จ

---

## 🧪 Skill 7: Systematic Testing Strategy

### Technique: "3-Layer Test Pyramid"

```
Layer 3 — Real Data   : D:\EDOK\แชทที่ 3 samples (20+ files)
                ↑ only after Layer 2 passes
Layer 2 — Integration : pagination pipeline, error handling, export flow
                ↑ only after Layer 1 passes
Layer 1 — Unit        : validation rules, classifier logic, edge cases
```

### Application Pattern
- **Test pyramid แทน test scatter** — มี strategy ชัด ไม่สุ่มทดสอบ
- **Failing test first** แล้วค่อยเขียน code ให้ผ่าน (TDD mindset)
- **Real data ท้ายสุด** — unit test ไม่ครอบคลุม edge case ทั้งหมด
- **Regression test จาก historical bugs** — ปัญหาที่เคยเจอต้องมี test ป้องกัน

---

## 🎓 Meta-Skill: Problem-Solving Mindset

### Core Principles

| Principle | ความหมาย |
|-----------|-----------|
| **แก้ทีเดียวให้หายขาด** | ไม่ patch ซ้ำ ๆ ในที่เดิม |
| **ปิดงานด้วยหลักฐาน** | ไม่ใช่ด้วยความรู้สึกว่า "น่าจะโอค" |
| **เลือกทำ 1 อย่างให้เสร็จ** | แทน 3 อย่างครึ่ง ๆ กลาง ๆ |
| **บอกว่าไม่รู้เมื่อไม่รู้จริง** | แล้วหา evidence ก่อนพูด |
| **ออกแบบให้ debug ได้** | ไม่ใช่ออกแบบให้ขายดีเท่านั้น |

### When Stuck — Escape Checklist

```
□ ลอง 5-Layer Problem Peeling (Skill 1)
□ เปลี่ยนจาก "แก้ให้ work" → "หาว่าทำไมไม่ work"
□ หา concrete test case แทนการคิดเปล่า ๆ
□ ถาม "ถ้าแก้ตรงนี้จะแก้ปัญหาอื่นด้วยไหม?"
□ ตรวจว่า scope creep แอบเพิ่มมาไหม (Skill 6)
□ มี failing evidence จริงไหม หรือแค่ assume (Skill 5)
```

### Red Flags — หยุดถ้าเห็นสิ่งเหล่านี้

- แก้ไฟล์เดิมซ้ำ ๆ มากกว่า 3 รอบโดยไม่มี new insight
- ไม่มี concrete test case แต่รีบ code
- แก้ UI/CSS ก่อนรู้ว่า data layer ถูกต้อง
- เพิ่ม feature ใหม่ขณะที่ core ยังพัง
- Build ผ่านแต่ไม่ได้ทดสอบกับ real data

---

## 🔒 Skill 8: Privacy & Data Sensitivity Safeguards

### Technique: "Sensitivity-Aware Rendering"

```
บับเบิ้ลข้อความ (Chat Bubble), รูปโปรไฟล์, และหลักฐาน LINE screenshot เป็นข้อมูลที่มีความอ่อนไหวสูง (Sensitive/PII):
  1. การแสดงผลรูปภาพแชทต้องระวังเรื่องการระบุตัวตน (Blur Profile, Blur PII)
  2. การแบ่งหน้า (Pagination) ต้องแม่นยำ ไม่ทำให้ข้อความขาดหายหรือสับสนจนส่งผลเสียต่อรูปคดี
  3. ระบบรักษาความปลอดภัยต้นทางและปลายทาง (เช่น Secure Flags, CORS, Privacy Masking) ต้องอยู่ในเกณฑ์ห้ามหลุดลอย
```

### Application Pattern
- **Always mask by default**: หากผู้ใช้เลือกปิดการแสดงภาพโปรไฟล์/ข้อมูลระบุตัวตน ต้องประมวลผลการเบลออย่างแน่นหนาและห้ามเก็บข้อมูลดิบไว้ในที่สาธารณะ
- **Respect device security**: ตรวจสอบ flag การป้องกันภาพหน้าจอและสิทธิ์การเข้าถึงข้อมูลตามมาตรฐาน OS (Android/iOS/Web)
- **Maintain integrity**: การทำความสะอาดข้อมูล (Data sanitization/blur) ต้องไม่ทำลายความสมบูรณ์และบริบทของหลักฐานชั้นศาล (Data Evidentiary Value)

---

## 📲 Skill 9: Native & Web Hybrid Integration

### Technique: "Intent-Driven Delivery"

```
การส่งออกหรือแชร์หลักฐานดิจิทัล (Export/Share Intent):
  1. ตรวจสอบสภาวะแวดล้อมการทำงานของระบบ (Runtime Environment เช่น Native App / Electron vs Web Browser)
  2. ทำการ Optimize ขนาดข้อมูล (Compress), รูปแบบ (Format), และสัดส่วน (Aspect Ratio) ให้เหมาะสมกับแต่ละแพลตฟอร์มปลายทาง
  3. ใช้ Native API เมื่อพร้อมใช้งาน และมี Web API (เช่น navigator.share) เป็นแผนสำรอง (Fallback) เสมอ
```

### Application Pattern
- **Environment Detection**: ออกแบบโค้ดให้รู้ตัวเองเสมอว่ารันอยู่บน Native App หรือ Browser ทั่วไป
- **Target Optimization**: ก่อนส่งหลักฐาน ต้องล้างลายน้ำ ปรับความเข้ากันได้ และควบคุมขนาดไฟล์ให้ไม่เกินข้อจำกัดของช่องทางนั้น ๆ (เช่น LINE, Email หรือโฟลเดอร์หลักฐานคดี)
- **Graceful Intent Handlers**: ห้ามให้การแชร์หลักฐานเกิดข้อผิดพลาดค้างคา (Silent fail) หากระบบไม่รองรับ Native Interface ให้รัน fallback ดาวน์โหลดลงเครื่องทันที

---

## ⚡ Skill 10: Performance & Memory Optimization for Evidence Processing

### Technique: "Autorelease & Resize Strategy"

```
การประมวลผลไฟล์ภาพและหน้าหลักฐานขนาดใหญ่ (Large Evidence Images):
  1. จัดการและควบคุมหน่วยความจำ (Memory Lifecycle) โดยเฉพาะลูปที่ประมวลผลแบบ Batch หรือ Canvas Stitching เพื่อลดโอกาสเกิดหน่วยความจำเต็ม (Memory leak / crash)
  2. จำกัดขนาดด้านสูงสุดของภาพ (Maximum Dimension Limit เช่น 2048px หรือเป้าหมายที่เหมาะสม) เพื่อควบคุมปริมาณข้อมูลพิกเซลที่รันในหน่วยความจำ
  3. เคลียร์ตัวแปรและออบเจ็กต์ชั่วคราวออกทันทีหลังสิ้นสุดการใช้งาน (เช่น การเรียกใช้ Garbage Collector หรือขอบเขตของตัวแปรชั่วคราว)
```

### Application Pattern
- **Resource Lifecycle Management**: ทุกครั้งที่สร้างออบเจ็กต์ขนาดใหญ่ (เช่น Image, Canvas หรือ Blob) ในลูป ต้องมั่นใจว่ามีการทำลายหรือปล่อยทิ้งเมื่อพ้นรอบการประมวลผล
- **Automatic Image Resizing**: หากพบว่าขนาดความกว้าง/ความสูงของหลักฐานดิบมีขนาดใหญ่เกินความจำเป็นในการพิสูจน์หลักฐาน ให้ทำการย่อลงมาที่ขอบเขตจำกัดความเหมาะสมแบบอัตโนมัติ เพื่อประหยัด CPU/RAM
- **Prevent Memory Leak**: หลีกเลี่ยงการคงอ้างอิง (Strong reference) ของ Base64 Data URL หรือ Canvas Data ไว้ใน State แบบถาวรโดยไม่มีความจำเป็น

---

## 🧵 Skill 11: Non-Blocking Async Execution Queue

### Technique: "Single-Threaded Task Offloading"

```
การประมวลผลงานหนัก (Heavy Operations เช่น Image Processing, PDF Generation, vision OCR):
  1. หลีกเลี่ยงการบล็อกเธรดหลัก (Main/UI Thread) เพื่อป้องกันไม่ให้หน้าจอค้างหรือไม่ตอบสนอง (UI Freezing)
  2. แยกภาระงานไปประมวลผลบนเบื้องหลังด้วยคิวงานเดี่ยว (Single-Threaded Async Queue / Worker thread) แบบเป็นลำดับ
  3. ใช้กลไก Callback หรือ Promise/Future เพื่อส่งสัญญาณผลลัพธ์ (Success/Failure) กลับมาอัปเดตหน้า UI อย่างเป็นระบบ
```

### Application Pattern
- **Async Offloading**: ย้ายส่วนการคำนวณพิกเซลหนัก ๆ ใน `segmentChatImage` หรือการตรวจจับรูปภาพเข้าสู่ Web Worker หรือการทำงานแบบ Async ที่ไม่กวนการตอบสนองของเมาส์และปุ่มกด
- **Task Queue Safety**: ทำคิวงานประมวลผลทีละไฟล์ (Sequential execution queue) เพื่อไม่ให้ระบบดึงทรัพยากรเครื่องไปรันขนานจนเครื่องแฮงก์
- **Graceful Error Callback**: การส่งออกข้อผิดพลาดจากเธรดเบื้องหลังต้องถูกห่อในโครงสร้างผลลัพธ์ (เช่น `Result<T>` หรือ `try-catch`) เพื่อนำมารายงานบนหน้า UI เสมอ ไม่ให้แอปล่มแบบเงียบ ๆ (Silent crash)

---

## 🧩 Skill 12: Object-Aware Semantic Segmentation & Chat Entity Grouping

### Technique: "Visual Element Structuring"

```
การวิเคราะห์แชทแบบรู้ความหมาย (Semantic Chat Analysis):
  1. ตรวจจับส่วนประกอบย่อยของภาพแชท (เช่น Chat Bubble, รูปโปรไฟล์, แถบเวลา, แถบสถานะ, ข้อความระบบ) ออกเป็นพิกัดเชิงพื้นที่ (xLeft, xRight, yTop, yBottom)
  2. จัดกลุ่มองค์ประกอบเหล่านี้รวมเป็นโครงสร้างแชทสมบูรณ์หลัก (ChatMessage) ที่เชื่อมโยงถึงกันอย่างมีเหตุผล (Context Dependency)
  3. กำหนดความสำคัญของชิ้นส่วนแต่ละชิ้น (เช่น `isEssential` เพื่อบอกว่า ห้ามตัดแบ่งชิ้นส่วนนี้กลางทาง) เพื่อใช้วางแผนจัดหน้าให้สมบูรณ์
```

### Application Pattern
- **Visual Element Detection**: ใช้กลยุทธ์ตรวจจับเฉพาะ (เช่น Bubble Detector, Media Detector) วิเคราะห์พิกเซลภาพเพื่อแยกความกว้าง/ความสูงของแต่ละออบเจ็กต์
- **Logical Grouping**: เมื่อแกะ visual elements ได้แล้ว ให้กรุ๊ปรวมเป็นข้อความเดี่ยวตามระยะห่าง (gap) และความสัมพันธ์ของบริบท
- **Boundary Preservation**: ออบเจ็กต์ใดที่มีระดับความสำคัญสูง (isEssential) ต้องไม่ถูกตัดขาดครึ่งหนึ่ง (partial crop) ในการทำ pagination เว้นแต่เป็นออบเจ็กต์เดี่ยวที่สูงเกินขีดจำกัดความยาวหน้า (oversized)

---

## 📐 Skill 13: Smart Boundary Detection & Multi-Heuristic Pagination Scoring

### Technique: "Optimal Cut-Point Scoring"

```
การหาจุดตัดหน้ากระดาษแชทที่เหมาะสมที่สุด (Optimal Cut-Point Search):
  1. วิเคราะห์หาช่วงพิกัด Y ที่เป็นไปได้รอบ ๆ ความสูงเป้าหมายของหน้ากระดาษ (Search Range)
  2. ให้คะแนนผู้สมัครจุดตัด (Cut Candidate Score) ตามน้ำหนักความเหมาะสมหลาย ๆ ด้าน (Multi-heuristic) เพื่อเลือกจุดตัดที่ดีที่สุด
  3. ตรวจสอบเงื่อนไขข้อจำกัดและความปลอดภัยหลังตัดกระดาษ (Context & Invariant Verification) เพื่อไม่ให้ขัดกับกฎของหลักฐาน
```

### Application Pattern
- **Multi-Heuristic Scoring**:
  - *Natural Conversation Breaks*: ให้คะแนนโบนัสสูงสุดเมื่อจุดตัดอยู่ระหว่างผู้ส่งแชทคนละคนกัน (Different Senders) หรือมีช่วงระยะเวลาห่างกันมาก (Time Gap)
  - *System Message Boundaries*: ให้คะแนนเป็นพิเศษเมื่อจุดตัดอยู่แถวขอบข้อความระบบ/ข้อความเปลี่ยนวันที่
  - *Large Whitespace Areas*: ให้คะแนนเมื่อจุดตัดอยู่ในพื้นที่ว่าง/พื้นหลัง ไม่มีข้อความหรือดีเทล
  - *Media Protection*: หักคะแนนอย่างรุนแรงหากพยายามตัดแบ่งกลางแถวช่วงที่มีรูปภาพ สติกเกอร์ หรือข้อมูลสื่อ เพื่อเลี่ยงไม่ให้รูปภาพหลักฐานถูกครอปแหว่ง
- **Verification Gate**: ตรวจสอบผลลัพธ์การตัดหน้าสุดท้ายว่าขัดกับความสัมพันธ์ทางบริบทของหลักฐาน (Context Preservation) หรือไม่

---

## 📐 Skill 14: Context-Preserving Chat Pagination Pipeline & Visual Padding

### Technique: "Smart Padding & Context Indicators"

```
ท่อประมวลผลการจัดหน้าและเติมขอบความต่อเนื่อง (Pagination Pipeline & Visual Padding):
  1. สร้างหน้าเอกสาร (Page Segment) จากพิกัดจุดตัดจุดชนอย่างละเอียดตามโครงสร้างบริบท (Context Preservation check)
  2. ครอปภาพตามพิกัด Y พร้อมคำนวณการเว้นระยะขอบบน-ล่างอัจฉริยะ (Smart Padding) เพื่อรักษาความสวยงามและเว้นที่สำหรับข้อมูลชิ้นแรก/ชิ้นสุดท้ายของหน้านั้น
  3. เพิ่มตัวบ่งชี้ความต่อเนื่องทางภาพ (Continuation Indicators เช่น ลูกศร หรือสัญลักษณ์สัญจรหน้าถัดไป) หากเนื้อหาคาบเกี่ยวไปหน้าถัดไป
```

### Application Pattern
- **Smart Image Cropping**: ทำการครอปและจัดพิกัดลงบน Canvas แผ่นใหม่ พร้อมวาดพื้นหลังสีพื้น (เช่น สีขาว หรือสีพื้นหลังห้องแชท LINE) ป้องกันไม่ให้มีรอยเปรอะ
- **Smart Padding**: 
  - *Top Padding*: เพิ่มระยะขอบด้านบน หากข้อความแรกของหน้ามีความเกี่ยวพันต่อเนื่องทางบริบทกับหน้าก่อนหน้า (เพื่อเป็นเบาะสายตา)
  - *Bottom Padding*: เพิ่มระยะขอบด้านล่าง หากบทสนทนาตรงท้ายหน้ายังไม่จบเพื่อส่งต่อไปยังหน้าถัดไป
- **Visual Continuation Indicator**: วาดเส้นเชื่อมต่อหรือสัญลักษณ์ความต่อเนื่อง (เช่น "อ่านต่อหน้าถัดไป" หรือสัญลักษณ์ภาพแรเงา) ที่ขอบบนหรือขอบล่างของ Canvas หน้ากระดาษเมื่อต้องมีการตัดแบ่ง context

---

## 🎨 Skill 15: Evidentiary Visual Optimization & Readability Enhancement

### Technique: "Visual Polish & Contrast Tuning"

```
การเพิ่มคุณภาพการแสดงผลเพื่อการพิสูจน์หลักฐาน (Evidentiary Visual Polish):
  1. ปรับปรุงคอนทราสต์ของกล่องข้อความแชท (Chat Bubble Contrast Enhancement) เพื่อให้อ่านข้อความได้ชัดเจนยิ่งขึ้น โดยแยกการปรับระหว่างฝั่งผู้ใช้ (User) และฝั่งคู่กรณี (Contact)
  2. เพิ่มความเข้มและรายละเอียดตัวอักษร (Text Readability Optimization) เพื่ออำนวยความสะดวกในการอ่านหลักฐานเมื่อสั่งพิมพ์หรือส่งออกเป็น PDF
  3. เพิ่มข้อมูลกำกับสถานะการจัดหน้า (Page & Preservation Indicators) เช่น เลขหน้าสไตล์แอปแชท หรือตัวบ่งชี้เตือนหากความต่อเนื่องบริบทมีปัญหา
```

### Application Pattern
- **Bubble Enhancer**: แยกการประมวลผลพิกเซลของภาพตามประเภทกล่องข้อความ เช่น ปรับสีกล่องข้อความฝั่งผู้ใช้ให้คมชัดขึ้น และฝั่งคู่สนทนาให้อ่านง่ายขึ้น
- **Readability Filters**: ใช้ฟิลเตอร์ปรับจูนการตัดขอบและคอนทราสต์ตัวอักษรเพื่อลดความเบลอของตัวหนังสือจากรูปภาพสกรีนช็อตที่ถูกบีบอัดมา
- **Evidentiary Overlays**: วาดข้อมูลระบุหน้าเอกสาร (Page Number) หรือตัวเตือนในกรณีพิเศษทับลงไปบนมุมแคนวาสหลักฐานด้วยความโปร่งแสงต่ำ (Low opacity) เพื่อไม่ให้บดบังเนื้อหาสำคัญหลัก

---

## ⛓️ Skill 16: Orchestrated Evidentiary Pagination Pipeline

### Technique: "Four-Stage Orchestrated Segmentation"

```
สถาปัตยกรรมการร้อยเรียงท่อประมวลผลการจัดหน้า (Orchestration Pipeline Architecture):
  1. วิเคราะห์โครงสร้างความหมาย (Semantic Analysis) -> แกะ Entity ข้อความและองค์ประกอบภาพแชท
  2. กำหนดจุดแบ่งหน้าอัจฉริยะ (Smart Boundary Detection) -> คำนวณหา Y-cut points ที่รักษาความสมบูรณ์ของบทสนทนา
  3. ปรับปรุงคุณภาพภาพถ่ายหลักฐาน (Visual Style Optimization) -> เพิ่มคอนทราสต์ตัวอักษรและประทับ metadata overlays
  4. ตรวจสอบเงื่อนไขความถูกต้องขั้นสุดท้าย (Final Segment Validation) -> ป้องกันความผิดพลาดก่อนบันทึกหรือส่งออก
```

### Application Pattern
```typescript
// สถาปัตยกรรมตัวอย่างสไตล์ LINE App Pagination Pipeline (Conceptual Reference)
export async function segmentChatImageLikeLineApp(
  canvas: HTMLCanvasElement
): Promise<SmartPageSegment[]> {
  // 1. Semantic analysis
  const analyzer = new ChatSemanticAnalyzer()
  const messages = analyzer.analyzeChat(canvas)
  
  // 2. Smart boundary detection
  const paginator = new ContextPreservingPaginator()
  const segments = paginator.generatePages(canvas, messages)
  
  // 3. Visual optimization
  const optimizer = new LineStyleOptimizer()
  const optimizedSegments = segments.map(segment => ({
    ...segment,
    canvasDataUrl: optimizer.optimizePageVisuals(segment).toDataURL()
  }))
  
  // 4. Final validation
  const validator = new SmartSegmentValidator()
  const validated = validator.validateSegments(optimizedSegments, messages)
  
  if (!validated.success) {
    throw new PaginationError('Smart pagination failed', {
      reason: 'LINE-style validation failed',
      errors: validated.errors,
      fallbackAvailable: true
    })
  }
  
  return optimizedSegments
}
```

---

## 🛡️ Skill 17: Feature Flagging & Safe Fallback for Experimental Features

### Technique: "Conditional Execution & Graceful Fallback"

```
การทดลองฟีเจอร์ใหม่และแผนกู้ระบบอัตโนมัติ (Feature Flag & Graceful Fallback):
  1. ใช้การตั้งค่าเพื่อเปิด-ปิดการใช้งานฟีเจอร์ระดับทดลอง (เช่น LocalStorage / Feature Flags) เพื่อให้เปิดทดสอบแบบจำกัดวงได้ง่าย
  2. ออกแบบโครงสร้าง error ให้สามารถระบุสิทธิ์การสลับกลับ (เช่น `fallbackAvailable: true`) เพื่อคืนสภาพไปใช้ตรรกะเดิมที่ทำงานได้แน่นอน
  3. ห่อหุ้มตรรกะการรันด้วย Try-Catch ครอบคลุมสองระดับ (Dual-level Try-Catch) เพื่อสลับการทำงานเป็นโหมดสำรองเมื่อเกิดเหตุผิดพลาด (Graceful fallback)
```

### Application Pattern
```typescript
// สถาปัตยกรรมตัวอย่างสลับตรรกะประมวลผล (Conceptual Logic Switch)
const ENABLE_LINE_STYLE_PAGINATION = localStorage.getItem('EXPERIMENTAL_LINE_PAGINATION') === '1'

const handleChatGeneration = async () => {
  try {
    let segments: PageSegment[]
    
    if (ENABLE_LINE_STYLE_PAGINATION) {
      segments = await segmentChatImageLikeLineApp(canvas)
      console.log('[LINE-Style] Smart pagination completed')
    } else {
      segments = await segmentChatImage(canvas) // ตรรกะเดิมที่ทดสอบแล้วว่าผ่านแน่นอน
      console.log('[Legacy] Standard pagination completed')
    }
    
    setPaginatedPages(segments)
    setIsGenerated(true)
    
  } catch (error) {
    // แผนกู้คืนกรณีฟีเจอร์ใหม่ล้มเหลวระหว่างทำงานจริง
    if (error.fallbackAvailable && ENABLE_LINE_STYLE_PAGINATION) {
      console.warn('[LINE-Style] Falling back to standard pagination due to:', error.message)
      const segments = await segmentChatImage(canvas) // ถอยกลับมาจุดที่การันตีความสำเร็จ
      setPaginatedPages(segments)
      setIsGenerated(true)
    } else {
      throw error // ยื่น error ให้ระบบแจ้งเตือนหลักแสดงผล
    }
  }
}
```

---

## 🗺️ Skill 18: Evidentiary Pagination Upgrade Roadmap

### Technique: "Four-Phase Phased Upgrade Roadmap"

```
แผนงานยกระดับการแบ่งหน้าแชทอัจฉริยะ (Implementation Roadmap):
  - Phase 1: Basic Smart Detection (การตรวจจับและจัดกลุ่มขั้นพื้นฐาน)
    * ค้นหากล่องข้อความแชท (Chat bubble detection) ด้วยคอมพิวเตอร์วิทัศน์
    * กำหนดขอบเขตของแต่ละบล็อกข้อความ (Message boundary identification)
    * วิเคราะห์และจำแนกข้อมูลเบื้องหลัง (Basic context analysis)
  - Phase 2: Smart Boundary Logic (ตรรกะระบุจุดแบ่งหน้าอัจฉริยะ)
    * ตรวจหาจุดสิ้นสุดบทสนทนา (Conversation break detection)
    * กำหนดขอบเขตข้อความระบบ (System message boundaries)
    * เพิ่มประสิทธิภาพพื้นที่เว้นวรรคและขอบกระดาษ (Whitespace optimization)
  - Phase 3: Context Preservation (การรักษาความครบถ้วนของข้อมูล)
    * วิเคราะห์ความเชื่อมโยงของข้อความคู่ขนาน (Message dependency analysis)
    * คำนวณระยะขอบอัจฉริยะ (Smart padding calculation)
    * วาดตัวบ่งชี้การต่อเนื่องของหลักฐาน (Continuation indicators)
  - Phase 4: Visual Polish (การตกแต่งรายละเอียดขั้นสุดท้าย)
    * ตกแต่งสีสันกล่องแชทคมชัดสไตล์แอป LINE (LINE-style visual enhancements)
    * ประทับสัญลักษณ์เลขหน้า (Page indicators)
    * ตรวจสอบผลลัพธ์พิกเซลภาพรวมขั้นตอนสุดท้าย (Final optimization)
```

### Application Pattern
- **Step-by-Step Delivery**: ปฏิบัติตามแผนทีละระดับ โดยต้องทดสอบฟีเจอร์และ validation gate ของ phase ก่อนหน้าให้ผ่านเกณฑ์การใช้งานจริงเสมอก่อนเริ่มดำเนินการ phase ถัดไป
- **Preserve Stability**: รักษาเสถียรภาพการรันระบบในโหมด legacy ในทุก ๆ phase ตราบใดที่ยังไม่ปิดงาน phase 4 อย่างสมบูรณ์ เพื่อลดความเสี่ยงที่แอปพลิเคชันจะล่มระหว่างทดสอบใช้งาน

---

## Quick Reference Card

```
Problem ใหม่?
  → Skill 1: Peel 5 layers ก่อน commit to solution

เริ่ม implement?
  → Skill 2: Data model first, then validation, then UI

อยากแก้เร็ว ๆ?
  → Skill 3: Validate first, fail fast, fail clear

เพิ่ม feature?
  → Skill 4: Core working → test → then add
  → Skill 6: Check scope boundary ก่อน

จัดการหลักฐาน / ข้อมูล PII?
  → Skill 8: Mask & Protect by default; รักษาความสมบูรณ์ของหลักฐาน

ส่งออก / แชร์ข้อมูลหลักฐาน?
  → Skill 9: Optimize ตามช่องทาง + จัดการ Native vs Web Fallback อย่างรอบคอบ

ไฟล์ใหญ่ / ทำงานช้า / ค้าง?
  → Skill 10: ย่อขนาดภาพอัตโนมัติ + เคลียร์หน่วยความจำชั่วคราวทันที
  → Skill 11: ย้ายงานประมวลผลหนักเข้าคิว Async / Worker เพื่อป้องกัน UI ค้าง

วิเคราะห์และแบ่งหน้าแชท?
  → Skill 12: แยกแยะชิ้นส่วนออบเจ็กต์ (isEssential) และวางขอบเขตการจัดกลุ่มเพื่อจัดหน้าแชทไม่ให้ขาดครึ่ง
  → Skill 13: ค้นหาจุดตัดด้วยคะแนนแบบ Multi-heuristic (ข้ามคนแชท, เลี่ยงครอปรูปแหว่ง, เกาะขอบเว้นวรรค)
  → Skill 14: สร้างแผ่นหน้ากระดาษพร้อมเติมขอบ (Smart Padding) และตัวบ่งชี้ความต่อเนื่องของข้อมูล (Continuation Indicators)
  → Skill 15: ปรับความคมชัดกล่องข้อความและตัวอักษร (Contrast Tuning) พร้อมประทับเลขหน้าพยานหลักฐาน (Evidentiary Overlays)
  → Skill 16: ร้อยเรียงกระบวนการแบ่งหน้า (Semantic Analysis → Cut Scoring → Visual Opt → Final Validation) ในลักษณะ Orchestrated Pipeline
  → Skill 17: ใช้ Feature Flags ควบคุมฟีเจอร์ระดับทดสอบ และเตรียม Graceful Fallback ไปหาตรรกะที่การันตีความปลอดภัยเสมอ
  → Skill 18: พัฒนาระบบแบ่งหน้าแชทอัจฉริยะตามลำดับ Roadmap 4 ระยะ (Basic Detection → Boundary Logic → Context Preservation → Visual Polish)

ทดสอบ?
  → Skill 5: Concrete evidence, not vague description
  → Skill 7: Layer 1 → Layer 2 → Layer 3

Stuck?
  → Meta-Skill: Escape checklist 6 ข้อด้านบน
```
