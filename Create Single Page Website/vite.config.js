import { defineConfig } from 'vite';
export default defineConfig({
  server: {
    port: 5173,   // กำหนดพอร์ตที่ต้องการ
    strictPort: true   // ถ้าอยากให้หยุดถ้าพอร์ตถูกใช้
  }
});
