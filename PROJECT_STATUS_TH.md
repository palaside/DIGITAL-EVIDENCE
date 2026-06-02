# DIGITAL EVIDENCE - PROJECT STATUS

อัปเดตล่าสุด: 3 มิถุนายน 2569  
Workspace หลัก: `D:\Project\หลักฐานดิจิทัล  DIGITAL EVIDENCE`  
Branch หลัก: `main`

## เริ่มงานจากตรงนี้

ก่อนแก้ไฟล์ทุกครั้ง ให้รัน:

```powershell
git status --short --branch
git log -5 --format="%h %cI %s"
```

ห้าม revert, ลบ, stage หรือ commit ไฟล์ที่ไม่เกี่ยวข้องกับ scope ปัจจุบัน

## Commit ล่าสุด

- `d643401a` - `Refine chat pagination shrink-first framing`
- เวลา commit: `2 มิถุนายน 2569 เวลา 20:10:19 น.`

## ขอบเขตปัจจุบัน

พัฒนาแบบ SPA ก่อน Electron

- Frontend SPA: `Create Single Page Website`
- OCR backend: `thai_ocr_project`
- Slip parser: `bank_slip_reader`

## โหมดหลัก

### Chat Mode

อัปโหลดภาพแชท LINE แล้วจัดลงกรอบเอกสาร A4 โดยห้ามผ่ากลาง object เช่น bubble, ข้อความ, sticker, รูป หรือ media card

### Slip Mode

อัปโหลดสลิปหลายใบ อ่าน OCR ด้วย Google Cloud Vision และ parse field ในเครื่องด้วย `rule_based`

ค่าที่ต้องคงไว้:

- `ocr_provider = google_cloud_vision`
- `parser = rule_based`

## Source Of Truth สูงสุด: Chat Pagination

เมื่อแก้เรื่องตัดหน้า, จัดลงกรอบ หรือย่อภาพใน Chat Mode ให้ยึดกติกานี้:

1. ใช้ `segment-first` แต่ห้ามผ่ากลาง object เด็ดขาด
2. ตัดสินใจแบบ `frame-fit-first`
3. ใช้ engine แบบ `shrink-first, bottom-anchor`
4. ต้องลองย่อทั้งภาพแบบรักษาสัดส่วน เหมือนจับมุมแล้วย่อ
5. ช่องว่างซ้ายขวาจากการย่อ ยอมรับได้
6. ใช้ iterative loop: ลองวาง -> ถ้า object สุดท้ายควรอยู่หน้านี้ -> ย่อ 2% -> ลองวางใหม่ -> วัดว่าชิดขอบล่างขึ้นไหม
7. ถ้า object สุดท้ายติดมาเพียงเล็กน้อย และย่อไม่คุ้ม ให้ตัดก่อน object แล้วนำ object ทั้งก้อนไปหน้าถัดไป
8. ห้ามย่อจนเล็กผิดธรรมชาติเพื่อฝืนยัด object เข้าหน้าเดิม
9. objective นี้ต้อง encode อยู่ใน algorithm ไม่ใช่แก้เฉพาะภาพตัวอย่าง

ไฟล์หลัก:

- `Create Single Page Website/src/app/utils/pagination.ts`
- `Create Single Page Website/src/app/utils/pdfExport.ts`

## สถานะที่พิสูจน์แล้ว

### Chat Mode

- Commit ล่าสุดฝัง logic `segment-first + frame-fit-first + shrink-first + bottom-anchor`
- ทดสอบกับ `D:\EDOK\แชทที่ 3` จำนวน 20 รูปแรกแล้ว
- `npm.cmd run verify` ผ่าน
- regression หลัก `page-017 / page-018 / page-019` ดีขึ้นตามกติกา
- ยังไม่เคลมว่าทุกไฟล์ในทุกโฟลเดอร์ผ่าน 100%

### Slip Mode

- Backend route: `POST /api/ocr`
- Browser help route: `GET /api/ocr`
- Health routes: `GET /`, `GET /health`
- รองรับผลหลายไฟล์พร้อม `batch_summary`
- Google Cloud Vision + local `rule_based` parser ถูก wire จริง
- `memo` ถูกส่งจาก parser ผ่าน backend ไป frontend แล้ว

### Save / Send Project

- Save Evidence สร้าง PDF จริง
- Send Project รองรับ ZIP
- Backend มี route `POST /api/package-project`

## คำสั่งตรวจหลัก

### SPA

```powershell
cd "D:\Project\หลักฐานดิจิทัล  DIGITAL EVIDENCE\Create Single Page Website"
npm.cmd run verify
```

### Chat regression ตัวแทน

```powershell
cd "D:\Project\หลักฐานดิจิทัล  DIGITAL EVIDENCE"
node .\tmp-tests\analyze-chat20.mjs
node .\tmp-tests\segment-chat20-direct.mjs
node .\tmp-tests\assert-chat20-overlong.mjs
```

ไม่จำเป็นต้องไล่ทั้งโฟลเดอร์ทุกครั้ง ให้ใช้ regression set ตัวแทนก่อน  
ค่อยไล่ทั้งโฟลเดอร์เมื่อเปลี่ยน detector, decision engine หรือพบ edge case ใหม่

## สถานะ Worktree ณ วันที่สร้างเอกสาร

มี local changes ที่ยังไม่ได้ commit หลาย scope ห้ามนำมาปนกัน:

### UI redesign shell

- `Create Single Page Website/src/app/App.tsx`
- `Create Single Page Website/src/app/components/Header.tsx`
- `Create Single Page Website/src/app/components/PreviewColumn.tsx`
- `Create Single Page Website/src/app/components/ThemeProvider.tsx`
- `Create Single Page Website/src/styles/*`
- `Create Single Page Website/vite.config.js`
- `Create Single Page Website/src/imports/digital_evidence_logo_full.png`

### Save / Send และ backend

- `Create Single Page Website/src/app/components/ActionsColumn.tsx`
- `thai_ocr_project/app.py`
- `thai_ocr_project/run_backend.py`

### ไฟล์ local / generated ห้าม commit ปน

- `.env`
- `gen-lang-client-*.json`
- `tmp-tests/`
- `Screenshot 2026-06-02 170902.png`
- `thai_ocr_project/digital_evidence.db`

ข้อควรระวัง: `thai_ocr_project/digital_evidence.db` ยังถูก track อยู่ แม้ `.gitignore` จะมี `*.db` แล้ว ต้องแยก cleanup ออกจาก feature commit

## กติกา Commit

1. เช็ก `git status --short --branch` ก่อน stage
2. stage เฉพาะไฟล์ใน scope เดียว
3. ห้าม commit `.env`, credential JSON, database, temp output หรือ test artifact
4. รัน verification ที่เกี่ยวข้องก่อน commit
5. หลัง commit ให้รายงาน hash และไฟล์ที่เข้า commit จริง

## ลำดับงานถัดไป

1. เก็บ scope `Save / Send Project` ให้สะอาดและ commit แยก
2. เก็บ scope `UI redesign shell` ให้สะอาดและ commit แยก
3. แยก cleanup ไฟล์ database ที่ยังถูก track ออกจาก feature work

