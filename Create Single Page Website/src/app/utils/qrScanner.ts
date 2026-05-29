import jsQR from "jsqr";

/**
 * Scans an image data URL for a QR code.
 * Draws the image to an offscreen canvas to extract ImageData for jsQR.
 */
export async function scanQrFromDataUrl(dataUrl: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous"; // In case it's an external URL
    
    img.onload = () => {
      const canvas = document.createElement("canvas");
      // Scale down image if it's too large to improve scanning performance
      const MAX_WIDTH = 1200;
      let width = img.width;
      let height = img.height;
      
      if (width > MAX_WIDTH) {
        height = Math.round((height * MAX_WIDTH) / width);
        width = MAX_WIDTH;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        resolve(null);
        return;
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      
      try {
        const imageData = ctx.getImageData(0, 0, width, height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert", // Optimize for speed, standard slips don't have inverted QRs
        });
        
        if (code) {
          resolve(code.data);
        } else {
          // Fallback with inversion if standard scan fails
          const codeInverted = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "invertFirst",
          });
          resolve(codeInverted ? codeInverted.data : null);
        }
      } catch (err) {
        console.error("Error reading QR code from canvas", err);
        resolve(null);
      }
    };
    
    img.onerror = () => {
      console.error("Failed to load image for QR scanning");
      resolve(null);
    };
    
    img.src = dataUrl;
  });
}
