# PROJECT STATUS

วันที่: 2026-06-07

สถานะล่าสุด:
- เพิ่มระบบ `shrink-first` สำหรับการ fit เข้า A4 โดยลดสเกลทีละ 2% ก่อนเสมอ
- แยก helper `src/layout-fit.js` สำหรับคำนวณ scale/position ที่ไม่ overflow
- เพิ่ม test `tests/layout-fit.test.js`
- ปรับ `src/renderer.js` ให้ใช้ helper ใหม่และ clip พื้นที่ในกรอบเพื่อกันหลุดกรอบ
- ปรับกฎการจัดวางแนวตั้งให้ชิดด้านบนของกรอบเมื่อมีพื้นที่เหลือ แทนการดันไปกองด้านล่าง
- เพิ่ม auto-trim พื้นที่ว่างบน-ล่างของแต่ละหน้า ก่อน render ลงกรอบจริง
- เปลี่ยน fallback cut เป็น `rollback` ถ้าเส้นตัดชนอ็อบเจกต์ จะถอยก่อนอ็อบเจกต์แทนการตัดกลางชิ้นงาน
- ปิดช่องทาง `EPIPE` โดยทำให้ log helper ใน `src/main.js` swallow error ของ `stdout/stderr` แทนการโยนกลับ
- ลดการ log จาก renderer ให้ทำงานเฉพาะตอน `--test` ใน [src/renderer.js](/D:/Project/หลักฐานดิจิทัล%20DIGITAL%20EVIDENCE/StartUp/chat-evidence-processor/src/renderer.js#L1)

ผลการตรวจ:
- `npm test` ผ่าน
- `node --check src/renderer.js` ผ่าน
- `node --check src/main.js` ผ่าน
- `npm start -- --test` ผ่าน และ export `outputs/evidence.pdf` กับ `outputs/audit_log.txt` สำเร็จ (page count ล่าสุด 204)
- รอบทดสอบสดล่าสุดยังไม่เจอ popup `EPIPE`

หมายเหตุ:
- ระบบยังใช้ pagination เดิมเป็น fallback สำหรับงานยาว
- โหมดหลักตอน fit คือย่อก่อน แล้วค่อยขยับ/ผ่อนเงื่อนไขภายในกรอบ
