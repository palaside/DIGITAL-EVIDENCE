# Slip Mode — 360° Technical Specification (โหมด Slip แบบ 360 องศา)

เวอร์ชัน: 1.0
วันที่: 2026-08-09
เจ้าของ: DIGITAL EVIDENCE — Engineering

สรุปสั้น ๆ
โหมด `Slip` ออกแบบมาเพื่อประมวลผลภาพสลิปธนาคารจำนวนมากอย่างเป็นระบบ ระดับความน่าเชื่อถือทางนิติวิทยาศาสตร์สูง ต้องสามารถป้องกันการปลอมแปลง, ตรวจจับซ้ำ, จัดลำดับตามคิว และส่งออกเป็น PDF รายงานหลักฐานพร้อม Summary Ledger ที่เป็นทางการ

## 1. ขอบเขต
- อินพุต: ชุดไฟล์ภาพ (jpg, jpeg, png, heic) ที่ผู้ใช้อัปโหลดหรือสตรีมจากโฟลเดอร์/กล้อง
- เอาต์พุต: (1) หน้า PDF หลักฐานพร้อม Summary Ledger, (2) JSON evidence bundle ต่อสลิป, (3) audit trail (HMAC-signed events)

## 2. Pipeline (9 ขั้นตอน)
1) Image Ingestion & Preprocessing
   - รับภาพจาก Upload, Watch-folder หรือ API.
   - ตรวจสอบ MIME, ขนาดไฟล์ และ checksum (SHA-256) ทันที
   - เก็บสำเนา raw immutable (read-only) ใน storage ชั้นหนึ่ง (hash-addressed)
   - Preprocessing: auto-orient, de-noise (bilateral), adaptive contrast (CLAHE), deskew, padding/trim ให้ขอบสม่ำเสมอ
   - สร้าง metadata เบื้องต้น: resolution, DPI, color-profile, histogram

2) Bank Identification
   - ตรวจจับโลโก้/สี/เลย์เอาต์ด้วย lightweight CV model (ResNet-based classifier หรือ template match)
   - ให้ความเชื่อมั่น (confidence) และรหัสธนาคาร (bank_code)
   - ถ้าค่าความเชื่อมั่นต่ำกว่า threshold → แท็กเป็น `bank_unknown` และให้มนุษย์ตรวจ

3) The Ultimate Truth Verification (QR Code / Digital Truth)
   - สแกน QR/Barcodes บนสลิป (หลาย pass — different scales)
   - หากพบ QR ที่ทำหน้าที่เป็น signed payload: validate signature (PKI), verify issuer, และ cross-check transaction id กับ external API (ถ้ามี)
   - บันทึกผลยืนยัน (verified / unverifiable / mismatch)

4) Multi-Pass OCR
   - รันสองระดับ: (A) layout-aware OCR (blocks/lines) เช่น Tesseract LSTM/WhisperOCR wrapper, (B) field-focused OCR with region proposals (amount box, name, date/time, memo)
   - ใช้ ensemble: หลาย OCR + language model post-correction (Thai name/title normalization)
   - เก็บ confidence per-field

5) Data Parsing & Regex
   - Normalization: แปลงวันที่/เวลาเป็น ISO8601, ล้างคำนำหน้าทางราชาศัพท์/ยศ, ปรับ locale/ตัวคั่นตัวเลข
   - Regex-driven extraction: amount, account-like numbers, memo, ชื่อผู้โอน/ผู้รับ
   - Mapping bank-specific field positions (bank_code → template rules)

6) Anti-Fraud Deduplication
   - Multi-key dedupe: image perceptual hash (pHash), SHA-256 raw, fields-signature (bank+amount+date+time+last4)
   - Temporal dedupe (same transaction id within window) และ spatial dedupe (same image content)
   - หากพบ duplicate → mark as `duplicate_candidate` พร้อม rationale

7) Watermark Injection & Evidence Stamping
   - สร้าง evidence stamp: sequential evidence id (monotonic per-batch), HMAC(signature over file hash + metadata + evidence id)
   - ฝังลายน้ำสารสนเทศ (ไม่ทำลาย) บนสำเนาต้นฉบับที่ส่งออก: evidence id, timestamp (UTC), operator id, non-reversible hash
   - เก็บ original raw สำรองแยกไว้เสมอ

8) Interactive Review
   - UI แสดงสลิปทีละชิ้น: image, parsed fields, OCR confidence, bank guess, QR verification, dedupe status
   - Allow: accept/edit fields, mark as rejected, attach notes, escalate to specialist
   - ทุกการแก้ไขต้องบันทึก audit event (who, when, before→after)

9) PDF & Ledger Export
   - สร้าง PDF หลักฐาน: หน้าแต่ละสลิป (watermarked), และหน้า Summary Ledger สุดท้าย
   - Summary Ledger: ตาราง timeline flow ตาม schema ด้านล่าง
   - เซ็นไฟล์ (optional): PDF signature และเก็บ bundle (.zip) พร้อม manifest.json และ audit log

## 3. System Conditions (เงื่อนไขการทำงาน)
- ทุกไฟล์และเหตุการณ์ต้องมี immutable audit trail (append-only log) ที่มี HMAC/RS256 signature
- เก็บ raw originals แยกจาก processed copies และไม่อนุญาตให้เขียนทับ
- Thresholds (configurable): OCR confidence, bank id confidence, dedupe similarity
- การเชื่อมต่อไปยัง third-party verification services ต้องทำผ่าน TLS 1.2+ และมี retry/backoff
- การเข้าถึง UI สำหรับแก้ไขต้องมี role-based access control; ทุก action ต้องมี operator ID

## 4. Strict Prohibitions (ข้อห้ามเด็ดขาด)
เพื่อคงความบริสุทธิ์ของพยานหลักฐาน ห้ามโปรแกรมเมอร์ทำสิ่งต่อไปนี้:
1) แก้ไขหรือเขียนทับไฟล์ `raw original` หลังจากบันทึกค่า checksum แล้ว (ต้องเก็บ raw immutable เสมอ)
2) ฝัง metadata ที่ทำให้ข้อมูลต้นฉบับเปลี่ยนค่าเชิงไบนารีที่ใช้ตรวจสอบอ้างอิง (เช่น เปลี่ยน pixel ที่เปลี่ยน hash) — การปั๊มลายน้ำต้องทำกับสำเนา processed copy เท่านั้น
3) ยอมรับผลการตรวจสอบจากแหล่งเดียวโดยไม่มีการเก็บหลักฐานการตรวจสอบ (เช่น ถ้ามีการยืนยัน QR ที่ sign แล้ว ต้องเก็บ signature, signer cert และผลการ validate)

## 5. Summary Ledger Structure (ตารางสรุป)
ตาราง Summary Ledger ในหน้าแผ่นสุดท้ายของรายงานหลักฐานดิจิทัลถูกออกแบบตามมาตรฐาน `Pattle.pdf` โดยรองรับโครงสร้างข้อมูล 11 คอลัมน์เพื่อแสดงเส้นทางการเงินพร้อมบริบทเชิงกฎหมายแบบครบถ้วนที่สุด

### 5.1 Column-by-Column Ingestion Steps
ระบบจะสกัดข้อมูลจากภาพสลิปแต่ละใบผ่าน OCR และจัดเรียงลงใน 11 คอลัมน์หลักดังนี้:
1. `sequence` — ลำดับรายการตามคิวภาพ (upload order) หรือ priority ที่ operator กำหนด
2. `transaction_date` — วันที่ทำรายการ (ISO date; normalized, timezone-aware UTC)
3. `transaction_time` — เวลาทำรายการ (HH:MM:SS)
4. `bank_from` — ธนาคารผู้โอน
5. `sender_name` — ชื่อผู้โอน (normalized และล้างคำนำหน้าทางราชาศัพท์)
6. `amount` — จำนวนเงิน (numeric เก็บเป็น integer สตางค์/เซ็นต์; แสดงทั้งตัวเลขและคำอ่านไทยในเซลล์เดียว)
7. `receiver_name` — ชื่อผู้รับ (normalized, title-stripped)
8. `bank_to` — ธนาคารผู้รับ
9. `transaction_id` — รหัสรายการหรือ reference ที่สกัดจากสลิป
10. `memo` — บันทึกช่วยจำ / หมายเหตุเสริม (raw text, truncated to safe length, preserve original punctuation)
11. `status` — สถานะการตรวจสอบ (verified, duplicate_candidate, manual_edited, rejected, accepted)

การจัดทำแต่ละคอลัมน์ต้องปฏิบัติตามหลักการ:
- ถอดข้อมูลจาก OCR + field parsing โดยใช้ทั้ง layout-aware และ region-proposal methods
- เก็บค่า raw OCR, normalized value, confidence score และ final status ไว้ใน metadata
- ในการวางข้อมูลลงตาราง ให้ใช้ค่าที่ผ่านการ validation แล้วก่อน หากมีความไม่แน่นอน ให้แสดงเป็น `unverified` หรือ `manual_review`
- จำนวนเงินต้องแปลงเป็นค่า integer สตางค์/เซ็นต์ก่อนคำนวณ และ format ในรายงานให้อยู่ในรูป `฿X,XXX.XX (หนึ่งพัน... บาทถ้วน)`

### 5.2 Bottom Total Summary Row
แถวสรุปผลล่างสุดของตาราง Summary Ledger มีความสำคัญเป็นพิเศษ ต้องแสดงผลภายใต้เงื่อนไขดังนี้:
- ใช้เฉพาะรายการที่สถานะเป็น `accepted` หรือ `verified`
- คำนวณ `Total Sum / ยอดเงินรวม` จากฟิลด์ `amount` ของรายการที่ผ่านเกณฑ์ดังกล่าว
- คำนวณ `Average Amount / ยอดเงินเฉลี่ย` จากรายการเดียวกัน
- แสดงผลด้วย **ตัวอักษรภาษาไทยหนาและขีดเส้นใต้คู่** ตามรูปแบบราชการ
- หากไม่มีรายการ accepted/verified ให้แสดง `ยอดเงินรวม 0 บาท` พร้อมหมายเหตุ `No verified data`
- แถวสรุปต้องอยู่ติดขอบล่างของตาราง ไม่อนุญาตให้ตัดหรือแยกแถวนี้ไปหน้าถัดไป

วิธีการคำนวณ:
- `total_sum = sum(amount[i] for i in rows if status[i] in {"accepted","verified"})`
- `average_amount = total_sum / count` เมื่อ `count` คือจำนวนรายการที่สถานะเป็น `accepted` หรือ `verified`
- ควรใช้ arithmetic ที่รักษาความเที่ยงตรงของสตางค์ทั้งหมดก่อนแปลงเป็นหน่วยบาทเพื่อแสดงผล

### 5.3 Strict System Rules for Summary Ledger
- ห้ามนำรายการที่สถานะ `duplicate_candidate`, `rejected`, หรือ `manual_review` มาคำนวณยอดรวมหรือค่าเฉลี่ย
- ห้ามแก้ไขเปลี่ยนค่าจำนวนเงินโดยไม่เก็บ audit trail และเหตุผลของการแก้ไข
- ห้ามตัดรายการกลางบรรทัดหรือแยกเซลล์ข้อมูลเด็ดขาด
- ห้ามแสดงผลเป็นสีหรือฟอนต์ที่ทำให้เข้าใจผิดว่าข้อมูลถูกปรับแต่ง; รูปแบบต้องสอดคล้องกับเอกสารหลักฐานสำหรับศาล
- หากมีการปรับปรุงสถานะแถวใด ต้องเก็บ event audit log ของการเปลี่ยนแปลงนั้นทุกครั้ง

Rules:
- ลำดับรันตามคิวภาพ (upload order) เว้นแต่ operator จะแทรก priority
- ดึงฟอร์แมตวันที่/เวลา ให้ normalize เป็น timezone-aware UTC แล้วแสดงตามรูปแบบท้องถิ่นใน PDF
- ล้างคำนำหน้าทางราชาศัพท์ออกจากชื่อ (configurable list)
- จำนวนเงินในตารางให้แสดงทั้งตัวเลขและคำอ่าน (ไทย) ในเซลล์เดียวได้ตามรูปแบบเอกสารศาล

Bottom line (ฐานขอบล่าง): คำนวณและพิมพ์ `ยอดเงินรวม / Total Sum` และ `ยอดเงินเฉลี่ย` ด้วย **ตัวอักษรภาษาไทยหนาและขีดเส้นใต้คู่** ตามรูปแบบทางราชการ — ต้องมีการคำนวณจากฟิลด์ `จำนวนเงิน` ทั้งหมดที่สถานะเป็น `accepted` หรือ `verified` เท่านั้น

## 6. TDD & Acceptance Criteria
- ทุกฟีเจอร์ต้องเริ่มด้วย unit tests (Vitest/Jest for frontend TS, pytest/unittest for Python tools)
- ตัวอย่างชุดทดสอบสำคัญ:
  - ingestion: checksum generation, immutable storage behavior
  - preprocessing: deskew/padding deterministic outputs for sample inputs
  - bank id: classifier accuracy on fixture set
  - QR verification: signature validation and mismatch handling
  - OCR pipeline: field-level confidence thresholds and normalization
  - dedupe: mark duplicates with rationale
  - PDF export: ledger layout and bottom-line formatting
- Acceptance: run on sample dataset (N>=100) with known ground-truth; false-positive rate for duplicates < configurable threshold, QR verification accuracy 100% for signed payloads

## 7. Security, Privacy, and Compliance
- Personal data handling: PII must be minimised in logs; redact/secure sensitive fields when exporting non-authorized bundles
- Access control + operator authentication; session recording for privileged actions
- Data retention policy configurable; by default keep raw originals and audit trail for minimum 7 years

## 8. Artifacts & Handoff
- Files produced per batch: `evidence_bundle_<batch>.zip` containing `manifest.json`, `audit.log`, `pdf_report.pdf`, `raw/`, `processed/`
- Figma assets: provide tokenized components for slip viewer, ledger table, review forms

## 9. Implementation Notes & Priorities (MVP)
1. Implement immutable ingestion + hashing + storage
2. Implement multi-pass OCR + simple parser for amount/date/name
3. Implement PDF export with ledger and bottom-line formatting
4. Add interactive review UI and audit trail

## 10. WinRAR SFX Evidence Archive (ไฟล์บีบอัดดึงตัวเองอัตโนมัติ)
ฟีเจอร์นี้ออกแบบมาเพื่อสร้างและบันทึกไฟล์พยานหลักฐานในรูปแบบ WinRAR SFX Archive ที่ล็อกรหัสผ่านได้ และแสดงข้อจำกัดความรับผิดชอบทางกฎหมายก่อนแตกไฟล์

### 10.1 ส่วนที่ 1: วิธีการกรอกข้อมูลเริ่มต้น (Initial Input Window)
ก่อนเข้าสู่การตั้งค่าพารามิเตอร์หลักของ WinRAR, ระบบต้องแสดงหน้าต่างป๊อปอัปแบบครั้งเดียวให้ผู้ใช้กรอกข้อมูลต่อไปนี้:
- `Archive Name` ชื่อไฟล์พยานหลักฐาน
- `Password` รหัสผ่านสำหรับ SFX archive
- `Password Confirmation` ยืนยันรหัสผ่าน
- `Legal Disclaimer` ข้อความรับผิดชอบทางกฎหมายที่จะแสดงก่อนแตกไฟล์
- `Evidence Batch ID` หรือ `Case Reference`

เงื่อนไข:
- ต้องไม่อนุญาตให้ผู้ใช้ข้ามหน้าต่างนี้ได้ หากยังไม่กรอกข้อมูลครบถ้วน
- หากรหัสผ่านไม่ผ่านเกณฑ์ความแข็งแรง (เช่น ความยาวต่ำกว่า 12 ตัวอักษร หรือไม่มีตัวอักษรหลากหลายประเภท) ให้แสดง warning และปิดการกดบันทึก
- ข้อมูลต้องถูกเก็บชั่วคราวเฉพาะใน session memory ของหน้า UI เท่านั้น ไม่บันทึกลง storage ถาวรก่อนการสร้าง archive

ข้อห้าม:
- ห้ามให้กรอก `Password` หลายครั้งเพื่อหลีกเลี่ยง human error โดยไม่ยืนยันรหัสก่อน
- ห้ามบันทึกรหัสผ่านเป็น plain text ใน log หรือ error payload

### 10.2 ส่วนที่ 2: ขั้นตอนการจัดตั้งค่าแถบโปรแกรมบีบอัด (Program Interface Simulator Steps)
การตั้งค่า WinRAR ต้องจำลองตาม UI สองแถบเมนูหลัก ดังนี้:

#### 10.2.1 แถบ "ทั่วไป" (General Tab)
- เลือก `Create SFX archive`
- กำหนด `Archive name` ให้สอดคล้องกับ `Evidence Batch ID`
- กำหนด `Compression method` เป็น `Best`
- เลือก `Put recovery record` เพื่อช่วยลดความเสียหายของ archive หากเกิดข้อผิดพลาด
- เปิด `Set password` และตั้งค่าตาม `Password` ที่กรอกในหน้าต่างแรก
- เลือก `Encrypt file names` เพื่อไม่ให้ชื่อไฟล์ภายใน archive โผล่ก่อนการเปิดด้วยรหัสผ่าน

#### 10.2.2 แถบ "ขั้นสูง" (Advanced Tab)
เมื่อคลิกแถบ `Advanced`:
- เลือก `SFX options`
- ในหน้า `General` ของ SFX options ให้กำหนด:
  - `Path to extract` เป็น `%TEMP%\DigitalEvidence_<batch>` หรือโฟลเดอร์ที่ระบบกำหนด
  - `Overwrite mode` ตั้งค่าเป็น `Ask before overwrite` หรือ `Extract and replace files` ตามนโยบาย
  - `Run after extraction` เลือกสคริปต์ตรวจสอบไฟล์หรือ viewer ที่ระบบกำหนด
- เข้าสู่หัวข้อ `Text and Icon Options`:
  - ใส่ `Title` เป็น `DIGITAL EVIDENCE Secure Archive`
  - ใส่ `Text to display` เป็นข้อความรับผิดชอบทางกฎหมายที่ผู้ใช้ต้องอ่านก่อนแตกไฟล์
  - ใส่ `License` หรือ `Legal info` ด้วยรายละเอียดของเงื่อนไขการใช้พยานหลักฐาน
  - กำหนด `Icon` เป็นโลโก้ของระบบ `DIGITAL EVIDENCE`
- ตั้งค่าการแสดงผล `Show license before extraction` ให้เป็น `Yes`
- ตั้งค่า `Auto extract` หรือ `Silent mode` เท่านั้นเมื่อ policy อนุญาต; มิฉะนั้นต้องให้ผู้ใช้ยืนยันด้วยตนเอง

### 10.3 ส่วนที่ 3: เงื่อนไขสำคัญในการทำงานของระบบ (System Conditions)
- Archive ต้องถูกสร้างบนไฟล์สำรอง processed copy เท่านั้น ไม่ใช่ raw original
- รหัสผ่านต้องถูกเข้ารหัสและไม่ถูกบันทึกลงในระบบหลังการสร้าง archive แล้ว
- ข้อความรับผิดชอบทางกฎหมายต้องแสดงก่อนแตกไฟล์เสมอ และต้องมีช่องให้ผู้ใช้ยืนยันก่อนดำเนินการ
- ชื่อไฟล์ archive และโฟลเดอร์เป้าหมายต้องมีรูปแบบเดียวกับ policy ของคดี เช่น `DEvidence_<batch>_<date>.exe`
- หากการสร้าง archive ล้มเหลว ระบบต้องแสดง error ที่ไม่เปิดเผยรหัสผ่านหรือข้อมูลสำคัญ

### 10.4 ส่วนที่ 4: ข้อห้ามเด็ดขาดในการจัดเก็บพยานหลักฐาน (Strict Prohibitions)
- ห้ามไม่ให้สร้าง SFX archive จากไฟล์ raw original โดยตรง
- ห้ามเก็บรหัสผ่านเป็น plain text, fingerprint, หรือ debug log
- ห้ามออกแบบ archive ให้สามารถแตกไฟล์ได้โดยไม่ต้องกรอกรหัสผ่าน
- ห้ามลดทอนหรือแก้ไขข้อความรับผิดชอบทางกฎหมายในหน้าต่างก่อนแตกไฟล์
- ห้ามใช้โหมด extraction ที่ bypass การยืนยันผู้ใช้ เช่น `silent auto-extract` เมื่อไม่มีเหตุผลทางนิติวิทยาศาสตร์รองรับ

## 11. Figma Prompt for SPA UI Design
นี่คือชุดคำสั่งพร้อมใช้สำหรับป้อนเข้า Figma AI หรือ UI generator เพื่อสร้างหน้าจอ Single Page Application สำหรับระบบ DIGITAL EVIDENCE ตามกรอบสี โลโก้ และฟอนต์ที่กำหนด:

```text
Design a futuristic, high-security Single Page Application (SPA) dashboard for a cyber forensics tool named "DIGITAL EVIDENCE".
Theme & Styling:
- Background: Cyber dark theme using Deep Navy Blue (#12243D) and Charcoal Grey.
- Primary Accent: Shield Blue (#1D5C96 / #00A1E4) and Silver Grey (#8E9AA6) matching the official shield logo.
- Typography: Clean and modern "Sarabun" font. Body text is "Sarabun Light" at 16px.
- Aesthetic: Semi-transparent glassmorphism (liquid glass with 15% opacity, 20px backdrop blur, 1px bright border stroke).

UI Layout Structure:
1. Top Section: Centered Segmented Tab Selector with two large buttons: "[CHAT]" and "[SLIP]".
   - Active state: Sky Blue glow with underline.
   - Inactive state: 50% Silver Grey text.

2. Bottom Section: 3-Column Layout:
   - Left Column (Input Controls):
     1. "UPLOAD" Dropzone: Dashed blue-border box with cloud upload icon.
     2. "File List": Scrollable panel with grey background showing file names with icon/trash-can buttons.
     3. "PROCESS" Button: Solid blue primary action button with hover glow.

   - Middle Column (Interactive Canvas):
     - A rigid, centered container representing a 645x890px paper boundary.
     - The inner preview image must be mathematically centered at coordinate (322.5, 445) along X and Y axes.
     - Layout inside the canvas: Header shows logo, current mode, and timestamp. Footer shows "DIGITAL EVIDENCE" disclaimer text in 16px Sarabun Light.

   - Right Column (Export & Security Panel):
     1. "Summary" Button: Triggers a Liquid Glass popup overlay displaying an 11-column ledger table.
     2. "Password Protection Toggle": iOS-style rounded switch (ON/OFF).
     3. "SAVE FOR PDF" Button: Triggers a popup modal with a password input field, "SAVE" (blue) and "CANCEL" (grey) buttons.
     4. "SAVE FOR WINRAR" Button: Triggers a popup modal with two input fields: [File Name] and [Password], with "SAVE" and "CANCEL" buttons.
     5. "GENERATE" Button: Giant, neon-blue glowing action button at the bottom.
```

## 12. Design Methodology for the SPA Screen
หน้าจอ Single Page Application นี้ออกแบบตามหลักการจัดสรรพื้นที่ให้สอดคล้องกับงานนิติวิทยาศาสตร์ โดยให้ความสำคัญกับความชัดเจนของ workflow, การแยกคอลัมน์ตามหน้าที่ และการเน้นความปลอดภัยของข้อมูล:

- ใช้ layout 3 คอลัมน์เพื่อให้ผู้ใช้มองเห็น input controls, preview canvas, และ export/security options พร้อมกันในหน้าจอเดียว
- ซ้ายสุดเป็น control flow สำหรับนำเข้าข้อมูลและเริ่มกระบวนการ
- กลางเป็นพื้นที่ review/presentation ที่เป็นเสมือนฮาร์ดคอของระบบ
- ขวาสุดเป็น control panel สำหรับการสร้างเอกสาร, การล็อกไฟล์ และการตั้งค่าการส่งออก
- ฟอนต์ Sarabun Light 16px ช่วยให้ตัวอักษรอ่านง่ายในบริบทเนื้อหาเชิงเทคนิคและรายงาน

## 13. Step-by-Step UI Interaction Flow
### 13.1 ขั้นตอนที่ 1: เลือกโหมดและนำเข้าหลักฐาน (Left Column)
- ผู้ใช้เลือกแท็บ `CHAT` หรือ `SLIP` ที่ด้านบน
- ในคอลัมน์ซ้าย ให้มี Dropzone "UPLOAD" สำหรับลาก-วางหรือเลือกไฟล์
- หลังอัปโหลดแล้ว แสดงรายการไฟล์พร้อมไอคอนและปุ่มลบ
- เมื่อพร้อม ให้ผู้ใช้กด "PROCESS" เพื่อเริ่ม pipeline ตรวจสอบและสร้าง preview

### 13.2 ขั้นตอนที่ 2: ตรวจสอบพรีวิว (Middle Column)
- แสดง container 645x890px เป็น boundary ของเอกสาร
- ภายใน canvas มี header ที่แสดงโลโก้, โหมดปัจจุบัน, timestamp, และสถานะสลิป
- preview image ถูกจัดกึ่งกลางตามจุด (322.5, 445) เพื่อรักษาสมมาตรของการนำเสนอ
- footer แสดงข้อความ "DIGITAL EVIDENCE" ใน Sarabun Light 16px

### 13.3 ขั้นตอนที่ 3: ตั้งค่าความปลอดภัยและส่งออก (Right Column)
- ปุ่ม "Summary" เปิด overlay ที่แสดงตาราง 11 คอลัมน์
- ปุ่ม toggle เปิด/ปิด password protection สำหรับผลลัพธ์
- "SAVE FOR PDF" เปิด modal ใส่รหัสผ่านก่อนบันทึก
- "SAVE FOR WINRAR" เปิด modal ใส่ชื่อไฟล์และรหัสผ่านสำหรับ SFX archive
- ปุ่ม "GENERATE" ทำงานเป็น action ขั้นสุดท้าย จัดเก็บผลลัพธ์ตาม policy

## 14. Technical Conditions for the SPA Design
- ต้องไม่ใช้โทนสีสว่างที่ลดความรู้สึกความปลอดภัยของ UI
- ต้องใช้ฟอนต์ Sarabun Light 16px เป็นหลักในทุกส่วนของเนื้อหา
- ห้ามใช้ฟอนต์อื่นใน body text; อนุญาตให้ใช้ฟอนต์เฉพาะในโลโก้/แบรนด์เท่านั้น
- ข้อความสำคัญ เช่น legal disclaimer และ field labels ต้องอ่านง่ายบนพื้นหลัง dark theme
- UI ต้องรองรับ modal/popover สำหรับการยืนยันรหัสผ่านและข้อจำกัดทางกฎหมายโดยไม่หลุดจากหน้าจอเดียว

## 15. Strict Design Prohibitions for Figma
- ห้ามใช้สีสดจัดที่ไม่สอดคล้องกับธีม Cyber dark และโลโก้ Shield Blue
- ห้ามวางปุ่ม `PROCESS` หรือ `GENERATE` ในตำแหน่งที่ผู้ใช้สับสนกับแท็บโหมด
- ห้ามสร้าง modal แบบเต็มหน้าจอที่ทำให้ผู้ใช้สูญเสียบริบทของ workflow
- ห้ามออกแบบปุ่มหรือ UI element ที่แสดงผลว่าข้อมูลถูกล็อกโดยไม่ได้มีการยืนยันรหัสผ่านจริง
- ห้ามใช้ layout แบบ multi-page หรือ wizard multi-step; ต้องยังคงเป็น SPA หน้าเดียวเสมอ

---

> หมายเหตุ: หากต้องการ ผมสามารถต่อยอดส่วน Figma prompt นี้เป็น flow diagram, component spec หรือ template ก่อนส่งต่อให้ทีมออกแบบได้ทันที

---

หากคุณต้องการ ผมสามารถต่อยอดเป็นงานออกแบบ UI flow ของหน้าต่าง SFX และตัวอย่างข้อความ legal disclaimer ได้ทันทีครับ
---
โปรดบอกผมว่าต้องการให้ผม: (A) สร้างไฟล์ทดสอบตัวอย่าง (fixtures + unit tests) ต่อไปเลย, (B) เริ่มเขียนโมดูล `ingestion` + tests, หรือ (C) ปรับสเปคฉบับนี้เพิ่มเติมก่อนบันทึกเป็นเอกสารทางการ
