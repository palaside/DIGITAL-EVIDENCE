const { app, nativeImage } = require("electron");
const fs = require("fs");
const path = require("path");

app.whenReady().then(() => {
  try {
    const rootPath = path.resolve(__dirname);
    const imgPath = path.join(rootPath, "..", "..", "Screenshot 2026-06-02 170902.png");
    
    if (!fs.existsSync(imgPath)) {
      console.error(`Error: Source image not found at ${imgPath}`);
      app.quit();
      return;
    }

    const img = nativeImage.createFromPath(imgPath);
    const size = img.getSize();
    console.log(`Loaded image dimensions: ${size.width}x${size.height}`);

    if (size.width === 0 || size.height === 0) {
      console.error("Error: Failed to load image or image has 0 size.");
      app.quit();
      return;
    }

    // Split image vertically with 150px overlap in the middle
    const halfH = Math.floor(size.height / 2);
    const overlap = 150;

    const rect1 = { x: 0, y: 0, width: size.width, height: halfH + Math.floor(overlap / 2) };
    const rect2 = { x: 0, y: halfH - Math.floor(overlap / 2), width: size.width, height: size.height - (halfH - Math.floor(overlap / 2)) };

    const part1 = img.crop(rect1);
    const part2 = img.crop(rect2);

    const inputsDir = path.join(rootPath, "inputs");
    if (!fs.existsSync(inputsDir)) {
      fs.mkdirSync(inputsDir, { recursive: true });
    }

    fs.writeFileSync(path.join(inputsDir, "01_chat_part1.png"), part1.toPNG());
    fs.writeFileSync(path.join(inputsDir, "02_chat_part2.png"), part2.toPNG());

    console.log("Successfully generated test images inside 'inputs/'");
  } catch (err) {
    console.error("Failed to generate test images:", err);
  } finally {
    app.quit();
  }
});
