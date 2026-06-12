/**
 * คอนฟิกพิกัดไฟล์ Excel
 *
 * กำหนดชื่อ (Name) → พาธไฟล์ (absolute / relative)
 * ใช้ `path.resolve` เพื่อให้พาธเป็นแบบเต็มเสมอ
 */
import path from "path";

export const ExcelFiles = {
  /** ตัวอย่าง: รายงานสรุปหลักฐานดิจิทัล */
  EvidenceSummary: path.resolve(
    __dirname, // โฟลเดอร์ config
    "../../data/Evidence_Summary.xlsx"
  ),

  /** ตัวอย่าง: รายการผู้ตรวจสอบ */
  InspectorList: path.resolve(
    __dirname,
    "../../data/Inspector_List.xlsx"
  ),

  /** เพิ่มไอเท็มใหม่ตามต้องการ */
  // YourName: path.resolve(__dirname, "../../data/YourFile.xlsx"),
} as const;

/**
 * ประเภทของคีย์ที่อนุญาตให้ใช้
 */
export type ExcelFileName = keyof typeof ExcelFiles;
