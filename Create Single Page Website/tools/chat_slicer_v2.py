#!/usr/bin/env python3
"""
DIGITAL EVIDENCE - Chat Slicer v2

Robust, CLI-ready implementation of the chat-slicing algorithm described
in the conversation. Improvements and fixes:
- initialize split points correctly
- avoid infinite loops when shifting cut points
- derive canvas edge color robustly (median of top rows)
- sample-safe handling of small fragments
- CLI args, output directory, and basic logging

Usage:
  python tools/chat_slicer_v2.py --input test_chat_long.png --mode court_ready

This file is intended to be copy/paste-ready in an IDE.
"""

from __future__ import annotations

import argparse
import math
import os
from typing import List, Tuple

import cv2
import numpy as np


def compute_forbidden_zones(img: np.ndarray) -> List[Tuple[int, int]]:
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    # Invert around bright backgrounds to highlight dark text/bubbles
    thresh = cv2.threshold(gray, 242, 255, cv2.THRESH_BINARY_INV)[1]

    # Horizontal kernel wide enough to merge line fragments but not merge distant bubbles
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (80, 4))
    dilated = cv2.dilate(thresh, kernel, iterations=1)
    contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    zones: List[Tuple[int, int]] = []
    for cnt in contours:
        x, y, w, h = cv2.boundingRect(cnt)
        if h > 8:  # filter tiny noise
            zones.append((y, y + h))
    zones.sort(key=lambda r: r[0])
    # Merge overlapping zones for simpler checks
    merged: List[Tuple[int, int]] = []
    for s, e in zones:
        if not merged:
            merged.append((s, e))
        else:
            ps, pe = merged[-1]
            if s <= pe + 2:
                merged[-1] = (ps, max(pe, e))
            else:
                merged.append((s, e))
    return merged


def plan_split_points(img_height: int, max_h: int, forbidden_zones: List[Tuple[int, int]]) -> List[int]:
    split_points: List[int] = [0]
    current_y = 0
    safety_counter = 0
    max_iters = max(10000, (img_height // max(1, max_h)) + 100)

    while current_y + max_h < img_height and safety_counter < max_iters:
        intended_cut = current_y + max_h
        safe_cut = intended_cut
        for start, end in forbidden_zones:
            if start <= intended_cut <= end:
                safe_cut = end + 3
                break

        # Ensure progress: if safe_cut does not advance, nudge forward to avoid infinite loop
        if safe_cut <= current_y:
            safe_cut = min(img_height, current_y + max_h)

        safe_cut = min(safe_cut, img_height)
        # Append and advance
        if safe_cut <= current_y:
            # last resort: break loop
            break
        split_points.append(safe_cut)
        current_y = safe_cut
        safety_counter += 1

    if split_points[-1] != img_height:
        split_points.append(img_height)

    # Deduplicate and sort
    split_points = sorted(list(dict.fromkeys(split_points)))
    return split_points


def sample_edge_color(img: np.ndarray, rows: int = 5) -> Tuple[int, int, int]:
    # Take median color of the top `rows` rows to avoid single-pixel artifacts
    h = min(rows, img.shape[0])
    if h <= 0:
        return (255, 255, 255)
    sample = img[0:h, :, :].reshape(-1, 3)
    med = np.median(sample.astype(np.int32), axis=0).astype(np.uint8)
    # Return as BGR tuple
    return int(med[0]), int(med[1]), int(med[2])


def run_chat_mode_v2(
    image_path: str,
    max_w: int = 645,
    max_h: int = 890,
    mode: str = "court_ready",
    output_prefix: str = "chat_chunk",
    out_dir: str = ".",
):
    src_img = cv2.imread(image_path)
    if src_img is None:
        raise FileNotFoundError(f"Input image not found: {image_path}")

    img_height, img_width = src_img.shape[:2]
    print(f"⚙️ Processing mode={mode} input={image_path} size={img_width}x{img_height}")

    forbidden_zones = compute_forbidden_zones(src_img)

    split_points = plan_split_points(img_height, max_h, forbidden_zones)

    os.makedirs(out_dir, exist_ok=True)
    outputs: List[str] = []

    for i in range(len(split_points) - 1):
        y_start = int(split_points[i])
        y_end = int(split_points[i + 1])
        if y_end - y_start < 5:
            continue

        raw_chunk = src_img[y_start:y_end, 0:img_width]
        chunk_h, chunk_w = raw_chunk.shape[:2]

        is_final_page = (i == len(split_points) - 2)
        is_short_final_chunk = is_final_page and (chunk_h < (max_h * 0.8))

        if mode == "court_ready" or is_short_final_chunk:
            scale_w = max_w / float(chunk_w)
            scale_h = max_h / float(chunk_h)
            scale = min(scale_w, scale_h)

            new_w = max(1, int(round(chunk_w * scale)))
            new_h = max(1, int(round(chunk_h * scale)))

            resized_chunk = cv2.resize(raw_chunk, (new_w, new_h), interpolation=cv2.INTER_CUBIC)

            # background fill using median top color
            edge_color = sample_edge_color(resized_chunk, rows=5)
            canvas = np.full((max_h, max_w, 3), edge_color, dtype=np.uint8)

            x_offset = (max_w - new_w) // 2
            y_offset = 0
            canvas[y_offset : y_offset + new_h, x_offset : x_offset + new_w] = resized_chunk
            final_img = canvas
            status_msg = "court_ready (aspect-lock + padding)" if is_short_final_chunk else "court_ready"
        else:
            final_img = cv2.resize(raw_chunk, (max_w, max_h), interpolation=cv2.INTER_CUBIC)
            status_msg = "fill_frame (stretched)"

        filename = f"{output_prefix}_{i+1:03d}.png"
        output_path = os.path.join(out_dir, filename)
        success = cv2.imwrite(output_path, final_img)
        if not success:
            print(f"⚠️ Failed to write output {output_path}")
        else:
            print(f"📸 Saved page {i+1} -> {output_path} ({status_msg})")
            outputs.append(output_path)

    # best-effort cleanup
    del src_img
    return outputs


def main():
    parser = argparse.ArgumentParser(description="Chat Slicer v2 - split long chat screenshots into pages")
    parser.add_argument("--input", "-i", required=True, help="Input image path")
    parser.add_argument("--mode", "-m", choices=["court_ready", "fill_frame"], default="court_ready")
    parser.add_argument("--out", "-o", default=".", help="Output directory")
    parser.add_argument("--prefix", "-p", default="chat_chunk", help="Output filename prefix")
    parser.add_argument("--width", type=int, default=645, help="Target canvas width")
    parser.add_argument("--height", type=int, default=890, help="Target canvas height")

    args = parser.parse_args()
    outputs = run_chat_mode_v2(
        args.input, max_w=args.width, max_h=args.height, mode=args.mode, output_prefix=args.prefix, out_dir=args.out
    )
    print(f"Done. Produced {len(outputs)} files.")


if __name__ == "__main__":
    main()
