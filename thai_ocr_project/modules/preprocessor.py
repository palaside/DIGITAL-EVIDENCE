import cv2
import numpy as np

def preprocess_image(image_path: str) -> np.ndarray:
    """
    Preprocess image to maximize OCR text readability.
    1. Read in grayscale
    2. Apply Bilateral Filter (reduces noise, keeps edges sharp)
    3. Apply Adaptive Gaussian Thresholding for high-contrast binarization
    """
    # Load image in grayscale
    img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        raise FileNotFoundError(f"Could not load image at path: {image_path}")

    # Remove noise using Bilateral Filter (smooths flat areas, keeps borders sharp)
    filtered = cv2.bilateralFilter(img, d=9, sigmaColor=75, sigmaSpace=75)

    # Apply Adaptive Gaussian Thresholding
    binarized = cv2.adaptiveThreshold(
        filtered,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        15,
        2
    )

    return binarized
