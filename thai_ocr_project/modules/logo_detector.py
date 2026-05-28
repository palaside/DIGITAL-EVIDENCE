import os
import cv2
import numpy as np

class BankLogoDetector:
    def __init__(self, model_path: str = None):
        self.model_path = model_path
        self.model = None

    def _load_model(self):
        if self.model is None and self.model_path and os.path.exists(self.model_path):
            from ultralytics import YOLO
            self.model = YOLO(self.model_path)
        return self.model

    def detect_logo(self, image_path: str) -> Dict[str, Any]:
        """
        Detects bank logo bounding box.
        Falls back to standard ROI cropping (top-left 25% of receipt)
        if no custom YOLO model weights exist.
        """
        img = cv2.imread(image_path)
        if img is None:
            raise FileNotFoundError(f"Could not load image: {image_path}")

        height, width, _ = img.shape
        model = self._load_model()

        if model:
            # YOLOv8 Inference
            results = model(image_path)
            for result in results:
                boxes = result.boxes.xyxy.cpu().numpy()
                if len(boxes) > 0:
                    x1, y1, x2, y2 = map(int, boxes[0][:4])
                    cropped_logo = img[y1:y2, x1:x2]
                    return {
                        "success": True,
                        "bbox": [x1, y1, x2, y2],
                        "cropped_logo": cropped_logo
                    }

        # Robust standard fall-back crop (top-left bank receipts usually put logos at [top 5%-18%, left 5%-25%])
        x1 = int(width * 0.05)
        y1 = int(height * 0.05)
        x2 = int(width * 0.35)
        y2 = int(height * 0.18)

        cropped_logo = img[y1:y2, x1:x2]
        return {
            "success": False,
            "bbox": [x1, y1, x2, y2],
            "cropped_logo": cropped_logo,
            "message": "Fallback top-left ROI crop active"
        }
