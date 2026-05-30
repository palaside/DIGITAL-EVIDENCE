function navigate(mode) {
    const btnChat = document.getElementById('btn-chat');
    const btnSlip = document.getElementById('btn-slip');
    const generateTitle = document.getElementById('generate-title');
    const modeDescription = document.getElementById('mode-description');

    if (mode === 'chat') {
        // Update Button Styles
        btnChat.className = "px-8 py-2 rounded-md font-medium text-sm border bg-white text-blue-900 border-blue-900 shadow-sm transition-colors";
        btnSlip.className = "px-8 py-2 rounded-md font-medium text-sm border bg-white text-gray-500 border-gray-200 hover:border-gray-300 transition-colors";
        
        // Update Text
        generateTitle.innerText = "Generate (Chat Mode)";
        modeDescription.innerText = 'สำหรับอัปโหลดแชท LINE ระบบจะจำลองกระดาษ A4 ขึ้นมาจัดเรียงรูปแชทให้พอดีโดย "ไม่ตัดขาดครึ่งกล่องข้อความ" (Object-Aware) เพื่อให้พิมพ์ไปใช้เป็นหลักฐานได้สวยงาม';
    } else if (mode === 'slip') {
        // Update Button Styles
        btnSlip.className = "px-8 py-2 rounded-md font-medium text-sm border bg-white text-blue-900 border-blue-900 shadow-sm transition-colors";
        btnChat.className = "px-8 py-2 rounded-md font-medium text-sm border bg-white text-gray-500 border-gray-200 hover:border-gray-300 transition-colors";
        
        // Update Text
        generateTitle.innerText = "Generate (Slip Mode)";
        modeDescription.innerText = 'สำหรับตรวจสอบสลิปโอนเงิน โดยมี AI ตรวจจับโลโก้ธนาคาร (YOLOv8) และอ่านตัวหนังสือบนสลิป (EasyOCR + PaddleOCR) เพื่อยืนยันความถูกต้อง';
    }
}