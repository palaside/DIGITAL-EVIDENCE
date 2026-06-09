import argparse
import asyncio
import hashlib
import json
import os
import sys
import textwrap
import time
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from typing import Iterable, Optional

CURRENT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = CURRENT_DIR.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None

if load_dotenv:
    load_dotenv(PROJECT_ROOT / ".env")

from PIL import Image, ImageDraw, ImageFont

from bank_slip_reader.ocr_engine import OCREngine
from bank_slip_reader.slip_parser import SlipParser


SUPPORTED_IMAGE_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".bmp",
    ".tif",
    ".tiff",
}

DEFAULT_INPUT_DIR = r"D:\EDOK\Duplicates"
DEFAULT_TARGET = "จิณห์นิภา  ประสาทเขตรการ"
DEFAULT_OUTPUT_DIR = PROJECT_ROOT / "outputs" / "lawyer_slip_report"

PAGE_WIDTH = 1240
PAGE_HEIGHT = 1754
MARGIN_X = 70
MARGIN_Y = 70
LINE_HEIGHT = 34
TABLE_ROW_HEIGHT = 42
THUMBNAIL_BOX = (980, 1130)


@dataclass
class ProcessedSlip:
    index: int
    file_path: str
    file_name: str
    file_hash: str
    raw_text: str
    is_slip: bool
    target_matched: bool
    duplicate: bool
    duplicate_of: Optional[str]
    review_required: bool
    review_reason: Optional[str]
    transaction_date: Optional[str]
    transaction_time: Optional[str]
    sender_bank: Optional[str]
    sender_name: Optional[str]
    sender_account: Optional[str]
    receiver_bank: Optional[str]
    receiver_name: Optional[str]
    receiver_account: Optional[str]
    amount: Optional[float]
    currency: str
    transaction_id: Optional[str]
    memo: Optional[str]
    bank_name: Optional[str]
    fingerprint: Optional[str]
    error: Optional[str]


def normalize_text(value: object) -> str:
    if value is None:
        return ""
    return " ".join(str(value).replace("\u200b", "").split()).strip()


def normalize_for_match(value: object) -> str:
    return normalize_text(value).lower()


def normalize_amount(value: object) -> str:
    if value is None:
        return ""
    try:
        return f"{float(value):.2f}"
    except (TypeError, ValueError):
        return ""


def parse_date_value(value: object) -> str:
    if value is None:
        return ""
    text = normalize_text(value)
    if not text:
        return ""
    return text.split("T")[0]


def parse_time_value(value: object) -> str:
    return normalize_text(value)


def compute_file_hash(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def scan_image_files(input_dir: Path) -> list[Path]:
    return sorted(
        [
            path
            for path in input_dir.rglob("*")
            if path.is_file() and path.suffix.lower() in SUPPORTED_IMAGE_EXTENSIONS
        ],
        key=lambda item: str(item).lower(),
    )


def target_matches(target: str, slip_dict: dict, raw_text: str) -> bool:
    target_norm = normalize_for_match(target)
    candidates = [
        slip_dict.get("receiver", {}).get("name"),
        raw_text,
    ]
    return any(target_norm in normalize_for_match(candidate) for candidate in candidates)


def is_probable_slip(slip_dict: dict, raw_text: str) -> bool:
    raw_norm = normalize_for_match(raw_text)
    has_amount = slip_dict.get("amount") is not None
    has_party = bool(
        normalize_text(slip_dict.get("sender", {}).get("name"))
        or normalize_text(slip_dict.get("receiver", {}).get("name"))
    )
    has_bank = normalize_text(slip_dict.get("bank_name")) not in {"", "ไม่ทราบธนาคาร"}
    has_slip_word = any(
        token in raw_norm
        for token in [
            "จำนวนเงิน",
            "โอนเงินสำเร็จ",
            "จ่ายเงินสำเร็จ",
            "รหัสอ้างอิง",
            "transaction",
            "พร้อมเพย์",
            "ธนาคาร",
        ]
    )
    return (has_amount and (has_party or has_bank)) or (has_amount and has_slip_word)


def build_fingerprint_fields(slip_dict: dict) -> dict[str, str]:
    return {
        "transaction_date": parse_date_value(slip_dict.get("transaction_date")),
        "transaction_time": parse_time_value(slip_dict.get("transaction_time")),
        "amount": normalize_amount(slip_dict.get("amount")),
        "sender_bank": normalize_text(slip_dict.get("sender", {}).get("bank")),
        "sender_name": normalize_text(slip_dict.get("sender", {}).get("name")),
        "receiver_bank": normalize_text(slip_dict.get("receiver", {}).get("bank")),
        "receiver_name": normalize_text(slip_dict.get("receiver", {}).get("name")),
        "transaction_id": normalize_text(slip_dict.get("transaction_id")),
    }


def has_complete_dedup_fingerprint(fields: dict[str, str]) -> bool:
    required = [
        "transaction_date",
        "transaction_time",
        "amount",
        "sender_name",
        "receiver_name",
    ]
    return all(fields.get(key) for key in required)


def make_fingerprint(fields: dict[str, str]) -> str:
    payload = json.dumps(fields, ensure_ascii=False, sort_keys=True)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def safe_amount(value: object) -> Optional[float]:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def slip_from_result(
    *,
    index: int,
    file_path: Path,
    file_hash: str,
    raw_text: str,
    slip_dict: dict,
    target: str,
    duplicate: bool = False,
    duplicate_of: Optional[str] = None,
    review_reason: Optional[str] = None,
    error: Optional[str] = None,
) -> ProcessedSlip:
    fingerprint_fields = build_fingerprint_fields(slip_dict)
    fingerprint = make_fingerprint(fingerprint_fields) if has_complete_dedup_fingerprint(fingerprint_fields) else None
    target_matched = target_matches(target, slip_dict, raw_text)
    return ProcessedSlip(
        index=index,
        file_path=str(file_path),
        file_name=file_path.name,
        file_hash=file_hash,
        raw_text=raw_text,
        is_slip=is_probable_slip(slip_dict, raw_text),
        target_matched=target_matched,
        duplicate=duplicate,
        duplicate_of=duplicate_of,
        review_required=bool(review_reason),
        review_reason=review_reason,
        transaction_date=parse_date_value(slip_dict.get("transaction_date")) or None,
        transaction_time=parse_time_value(slip_dict.get("transaction_time")) or None,
        sender_bank=slip_dict.get("sender", {}).get("bank"),
        sender_name=slip_dict.get("sender", {}).get("name"),
        sender_account=slip_dict.get("sender", {}).get("account"),
        receiver_bank=slip_dict.get("receiver", {}).get("bank"),
        receiver_name=slip_dict.get("receiver", {}).get("name"),
        receiver_account=slip_dict.get("receiver", {}).get("account"),
        amount=safe_amount(slip_dict.get("amount")),
        currency=slip_dict.get("currency") or "THB",
        transaction_id=slip_dict.get("transaction_id"),
        memo=slip_dict.get("memo"),
        bank_name=slip_dict.get("bank_name"),
        fingerprint=fingerprint,
        error=error,
    )


def slip_from_audit_record(
    index: int,
    record: dict,
    target: str,
    file_path_override: Optional[Path] = None,
) -> ProcessedSlip:
    slip_dict = {
        "transaction_date": record.get("transaction_date"),
        "transaction_time": record.get("transaction_time"),
        "amount": record.get("amount"),
        "currency": record.get("currency") or "THB",
        "transaction_id": record.get("transaction_id"),
        "bank_name": record.get("bank_name"),
        "memo": record.get("memo"),
        "sender": {
            "name": record.get("sender_name"),
            "account": record.get("sender_account"),
            "bank": record.get("sender_bank"),
        },
        "receiver": {
            "name": record.get("receiver_name"),
            "account": record.get("receiver_account"),
            "bank": record.get("receiver_bank"),
        },
    }
    fingerprint_fields = build_fingerprint_fields(slip_dict)
    fingerprint = make_fingerprint(fingerprint_fields) if has_complete_dedup_fingerprint(fingerprint_fields) else None
    raw_text = record.get("raw_text") or ""
    target_matched = target_matches(target, slip_dict, raw_text)
    review_reason = record.get("review_reason")
    if target_matched and not fingerprint:
        review_reason = review_reason or "INCOMPLETE_DEDUP_FIELDS"
    if target_matched and not bool(record.get("is_slip")):
        review_reason = review_reason or "TARGET_MATCHED_BUT_NOT_PROBABLE_SLIP"

    return ProcessedSlip(
        index=index,
        file_path=str(file_path_override) if file_path_override else (record.get("file_path") or ""),
        file_name=record.get("file_name") or Path(record.get("file_path") or f"record-{index}").name,
        file_hash=record.get("file_hash") or "",
        raw_text=raw_text,
        is_slip=bool(record.get("is_slip")),
        target_matched=target_matched,
        duplicate=False,
        duplicate_of=None,
        review_required=bool(review_reason or record.get("error")),
        review_reason=review_reason,
        transaction_date=parse_date_value(record.get("transaction_date")) or None,
        transaction_time=parse_time_value(record.get("transaction_time")) or None,
        sender_bank=record.get("sender_bank"),
        sender_name=record.get("sender_name"),
        sender_account=record.get("sender_account"),
        receiver_bank=record.get("receiver_bank"),
        receiver_name=record.get("receiver_name"),
        receiver_account=record.get("receiver_account"),
        amount=safe_amount(record.get("amount")),
        currency=record.get("currency") or "THB",
        transaction_id=record.get("transaction_id"),
        memo=record.get("memo"),
        bank_name=record.get("bank_name"),
        fingerprint=fingerprint,
        error=record.get("error"),
    )


async def process_image(
    *,
    index: int,
    file_path: Path,
    target: str,
    ocr_engine: OCREngine,
    parser: SlipParser,
) -> ProcessedSlip:
    file_hash = compute_file_hash(file_path)
    try:
        raw_text = await ocr_engine.extract_text(str(file_path))
        parsed = await parser.parse(raw_text, file_name=file_path.name)
        slip_dict = parsed.to_dict()
        return slip_from_result(
            index=index,
            file_path=file_path,
            file_hash=file_hash,
            raw_text=raw_text,
            slip_dict=slip_dict,
            target=target,
        )
    except Exception as exc:
        return ProcessedSlip(
            index=index,
            file_path=str(file_path),
            file_name=file_path.name,
            file_hash=file_hash,
            raw_text="",
            is_slip=False,
            target_matched=False,
            duplicate=False,
            duplicate_of=None,
            review_required=True,
            review_reason="OCR_OR_PARSE_FAILED",
            transaction_date=None,
            transaction_time=None,
            sender_bank=None,
            sender_name=None,
            sender_account=None,
            receiver_bank=None,
            receiver_name=None,
            receiver_account=None,
            amount=None,
            currency="THB",
            transaction_id=None,
            memo=None,
            bank_name=None,
            fingerprint=None,
            error=str(exc),
        )


async def process_images(
    *,
    files: list[Path],
    target: str,
    max_files: Optional[int] = None,
) -> list[ProcessedSlip]:
    selected_files = files[:max_files] if max_files else files
    ocr_engine = OCREngine(provider="google")
    parser = SlipParser(mode="rule_based")
    results: list[ProcessedSlip] = []

    for index, file_path in enumerate(selected_files, start=1):
        print(f"[{index}/{len(selected_files)}] OCR {file_path.name}")
        results.append(
            await process_image(
                index=index,
                file_path=file_path,
                target=target,
                ocr_engine=ocr_engine,
                parser=parser,
            )
        )

    return apply_duplicate_filter(results)


def apply_duplicate_filter(results: list[ProcessedSlip]) -> list[ProcessedSlip]:
    seen: dict[str, ProcessedSlip] = {}
    final: list[ProcessedSlip] = []

    for item in results:
        if not item.is_slip or not item.target_matched:
            final.append(item)
            continue
        if not item.fingerprint:
            item.review_required = True
            item.review_reason = item.review_reason or "INCOMPLETE_DEDUP_FIELDS"
            final.append(item)
            continue
        original = seen.get(item.fingerprint)
        if original:
            item.duplicate = True
            item.duplicate_of = original.file_name
            final.append(item)
            continue
        seen[item.fingerprint] = item
        final.append(item)

    return final


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = [
        r"C:\Windows\Fonts\tahomabd.ttf" if bold else r"C:\Windows\Fonts\tahoma.ttf",
        r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf",
    ]
    for candidate in candidates:
        if os.path.exists(candidate):
            return ImageFont.truetype(candidate, size=size)
    return ImageFont.load_default()


def draw_wrapped_text(
    draw: ImageDraw.ImageDraw,
    text: str,
    xy: tuple[int, int],
    font: ImageFont.ImageFont,
    fill: str = "#111827",
    width: int = 90,
    line_height: int = LINE_HEIGHT,
) -> int:
    x, y = xy
    lines: list[str] = []
    for raw_line in str(text).splitlines() or [""]:
        if not raw_line:
            lines.append("")
            continue
        lines.extend(textwrap.wrap(raw_line, width=width, break_long_words=True) or [""])
    for line in lines:
        draw.text((x, y), line, font=font, fill=fill)
        y += line_height
    return y


def new_page(title: str) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    page = Image.new("RGB", (PAGE_WIDTH, PAGE_HEIGHT), "white")
    draw = ImageDraw.Draw(page)
    title_font = load_font(34, bold=True)
    draw.text((MARGIN_X, 42), title, font=title_font, fill="#0f172a")
    draw.line((MARGIN_X, 94, PAGE_WIDTH - MARGIN_X, 94), fill="#1d4ed8", width=3)
    return page, draw


def draw_footer(draw: ImageDraw.ImageDraw, page_no: int, total_pages: int) -> None:
    font = load_font(18)
    y = PAGE_HEIGHT - 54
    draw.line((MARGIN_X, y - 16, PAGE_WIDTH - MARGIN_X, y - 16), fill="#d1d5db", width=1)
    draw.text((MARGIN_X, y), "DIGITAL EVIDENCE - Lawyer Slip Report", font=font, fill="#4b5563")
    draw.text((PAGE_WIDTH - 210, y), f"Page {page_no}/{total_pages}", font=font, fill="#4b5563")


def format_money(value: Optional[float]) -> str:
    if value is None:
        return "-"
    return f"{value:,.2f} THB"


def unique_matched_slips(results: Iterable[ProcessedSlip]) -> list[ProcessedSlip]:
    return [
        item
        for item in results
        if item.is_slip and item.target_matched and not item.duplicate and not item.review_required and item.amount is not None
    ]


def matched_review_slips(results: Iterable[ProcessedSlip]) -> list[ProcessedSlip]:
    return [
        item
        for item in results
        if item.is_slip and item.target_matched and item.review_required and not item.duplicate
    ]


def duplicate_slips(results: Iterable[ProcessedSlip]) -> list[ProcessedSlip]:
    return [item for item in results if item.duplicate]


def build_summary(results: list[ProcessedSlip], scanned_count: int) -> dict:
    unique_items = unique_matched_slips(results)
    raw_target_matched = sum(1 for item in results if item.target_matched)
    return {
        "scanned_files": scanned_count,
        "processed_files": len(results),
        "probable_slips": sum(1 for item in results if item.is_slip),
        "matched_raw_before_dedup": raw_target_matched,
        "target_matched": raw_target_matched,
        "unique_matched": len(unique_items),
        "duplicates_excluded": len(duplicate_slips(results)),
        "review_required": sum(1 for item in results if item.review_required),
        "ocr_failed": sum(1 for item in results if item.error),
        "total_amount": round(sum(item.amount or 0 for item in unique_items), 2),
    }


def draw_table_header(draw: ImageDraw.ImageDraw, y: int, columns: list[tuple[str, int]]) -> int:
    font = load_font(18, bold=True)
    x = MARGIN_X
    draw.rectangle((MARGIN_X, y, PAGE_WIDTH - MARGIN_X, y + TABLE_ROW_HEIGHT), fill="#e5efff")
    for title, width in columns:
        draw.text((x + 6, y + 9), title, font=font, fill="#0f172a")
        x += width
    return y + TABLE_ROW_HEIGHT


def draw_table_row(draw: ImageDraw.ImageDraw, y: int, columns: list[tuple[str, int]], values: list[str]) -> int:
    font = load_font(16)
    x = MARGIN_X
    draw.line((MARGIN_X, y, PAGE_WIDTH - MARGIN_X, y), fill="#d1d5db", width=1)
    for value, (_, width) in zip(values, columns):
        clipped = normalize_text(value)
        if len(clipped) > 32:
            clipped = clipped[:29] + "..."
        draw.text((x + 6, y + 9), clipped, font=font, fill="#111827")
        x += width
    return y + TABLE_ROW_HEIGHT


def build_summary_pages(results: list[ProcessedSlip], input_dir: Path, target: str, summary: dict) -> list[Image.Image]:
    pages: list[Image.Image] = []
    page, draw = new_page("Slip Mode CLI - Lawyer Report")
    font = load_font(22)
    bold = load_font(22, bold=True)
    y = 130
    details = [
        ("Target", target),
        ("Input folder", str(input_dir)),
        ("Generated at", datetime.now().strftime("%Y-%m-%d %H:%M:%S")),
        ("Scanned files", str(summary["scanned_files"])),
        ("Probable slips", str(summary["probable_slips"])),
        ("Matched raw before dedup", str(summary["matched_raw_before_dedup"])),
        ("Unique matched slips", str(summary["unique_matched"])),
        ("Duplicates excluded", str(summary["duplicates_excluded"])),
        ("Review required", str(summary["review_required"])),
        ("OCR failed", str(summary["ocr_failed"])),
        ("Total amount", format_money(summary["total_amount"])),
    ]
    for label, value in details:
        draw.text((MARGIN_X, y), f"{label}:", font=bold, fill="#111827")
        y = draw_wrapped_text(draw, value, (340, y), font, width=72)
        y += 6
    pages.append(page)

    columns = [
        ("#", 52),
        ("Date", 132),
        ("Time", 86),
        ("Sender", 230),
        ("Amount", 150),
        ("Receiver", 250),
        ("File", 260),
    ]
    items = unique_matched_slips(results)
    page, draw = new_page("Unique Target Slips")
    y = 122
    y = draw_table_header(draw, y, columns)
    for row_no, item in enumerate(items, start=1):
        if y > PAGE_HEIGHT - 110:
            pages.append(page)
            page, draw = new_page("Unique Target Slips")
            y = draw_table_header(draw, 122, columns)
        y = draw_table_row(
            draw,
            y,
            columns,
            [
                str(row_no),
                item.transaction_date or "-",
                item.transaction_time or "-",
                item.sender_name or "-",
                format_money(item.amount),
                item.receiver_name or "-",
                item.file_name,
            ],
        )
    pages.append(page)
    return pages


def build_slip_pages(results: list[ProcessedSlip]) -> list[Image.Image]:
    pages: list[Image.Image] = []
    for row_no, item in enumerate(unique_matched_slips(results), start=1):
        page, draw = new_page(f"Slip Evidence #{row_no}")
        font = load_font(20)
        bold = load_font(20, bold=True)
        y = 124
        fields = [
            ("File", item.file_name),
            ("Date/Time", f"{item.transaction_date or '-'} {item.transaction_time or '-'}"),
            ("Sender", item.sender_name or "-"),
            ("Sender bank", item.sender_bank or item.bank_name or "-"),
            ("Amount", format_money(item.amount)),
            ("Receiver", item.receiver_name or "-"),
            ("Receiver bank", item.receiver_bank or "-"),
            ("Transaction ID", item.transaction_id or "-"),
            ("Memo", item.memo or "-"),
        ]
        for label, value in fields:
            draw.text((MARGIN_X, y), f"{label}:", font=bold, fill="#111827")
            y = draw_wrapped_text(draw, value, (300, y), font, width=58, line_height=28)
            y += 5

        image_top = max(y + 28, 420)
        image_bottom = PAGE_HEIGHT - 92
        image_box_height = image_bottom - image_top
        try:
            with Image.open(item.file_path) as source:
                source = source.convert("RGB")
                source.thumbnail((THUMBNAIL_BOX[0], min(THUMBNAIL_BOX[1], image_box_height)), Image.Resampling.LANCZOS)
                image_x = (PAGE_WIDTH - source.width) // 2
                page.paste(source, (image_x, image_top))
                draw.rectangle((image_x, image_top, image_x + source.width, image_top + source.height), outline="#d1d5db", width=2)
        except Exception as exc:
            draw.text((MARGIN_X, image_top), f"Image preview failed: {exc}", font=font, fill="#b91c1c")
        pages.append(page)
    return pages


def build_exception_pages(results: list[ProcessedSlip]) -> list[Image.Image]:
    pages: list[Image.Image] = []
    duplicates = duplicate_slips(results)
    review_items = [item for item in results if item.review_required]

    page, draw = new_page("Excluded Duplicates")
    columns = [("#", 52), ("File", 360), ("Duplicate of", 360), ("Amount", 170), ("Date", 160)]
    y = draw_table_header(draw, 122, columns)
    for row_no, item in enumerate(duplicates, start=1):
        if y > PAGE_HEIGHT - 110:
            pages.append(page)
            page, draw = new_page("Excluded Duplicates")
            y = draw_table_header(draw, 122, columns)
        y = draw_table_row(
            draw,
            y,
            columns,
            [str(row_no), item.file_name, item.duplicate_of or "-", format_money(item.amount), item.transaction_date or "-"],
        )
    if not duplicates:
        draw.text((MARGIN_X, y + 18), "No duplicate slips excluded.", font=load_font(20), fill="#111827")
    pages.append(page)

    page, draw = new_page("Review Required / OCR Failed")
    columns = [("#", 52), ("File", 360), ("Reason", 300), ("Error", 420)]
    y = draw_table_header(draw, 122, columns)
    for row_no, item in enumerate(review_items, start=1):
        if y > PAGE_HEIGHT - 110:
            pages.append(page)
            page, draw = new_page("Review Required / OCR Failed")
            y = draw_table_header(draw, 122, columns)
        y = draw_table_row(
            draw,
            y,
            columns,
            [str(row_no), item.file_name, item.review_reason or "-", item.error or "-"],
        )
    if not review_items:
        draw.text((MARGIN_X, y + 18), "No review-required items.", font=load_font(20), fill="#111827")
    pages.append(page)
    return pages


def render_pdf_report(results: list[ProcessedSlip], input_dir: Path, target: str, output_pdf: Path, summary: dict) -> None:
    pages: list[Image.Image] = []
    pages.extend(build_summary_pages(results, input_dir, target, summary))
    pages.extend(build_slip_pages(results))
    pages.extend(build_exception_pages(results))

    total_pages = len(pages)
    for idx, page in enumerate(pages, start=1):
        draw_footer(ImageDraw.Draw(page), idx, total_pages)

    output_pdf.parent.mkdir(parents=True, exist_ok=True)
    if not pages:
        page, draw = new_page("Slip Mode CLI - Lawyer Report")
        draw.text((MARGIN_X, 150), "No pages generated.", font=load_font(22), fill="#111827")
        pages = [page]
    pages[0].save(output_pdf, "PDF", resolution=150.0, save_all=True, append_images=pages[1:])


def write_audit_json(results: list[ProcessedSlip], output_json: Path, summary: dict) -> None:
    output_json.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "summary": summary,
        "results": [asdict(item) for item in results],
    }
    output_json.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def index_files_by_name(root: Path) -> dict[str, Path]:
    if not root.exists() or not root.is_dir():
        raise FileNotFoundError(f"Image root folder not found: {root}")
    indexed: dict[str, Path] = {}
    for path in root.rglob("*"):
        if path.is_file() and path.name not in indexed:
            indexed[path.name] = path
    return indexed


def load_results_from_audit(
    audit_path: Path,
    target: str,
    image_root: Optional[Path] = None,
) -> tuple[list[ProcessedSlip], dict]:
    payload = json.loads(audit_path.read_text(encoding="utf-8"))
    source_summary = payload.get("summary") or {}
    source_results = payload.get("results") or []
    if not isinstance(source_results, list):
        raise ValueError("Audit JSON must contain a list at results")

    image_index = index_files_by_name(image_root) if image_root else None
    recomputed = [
        slip_from_audit_record(
            index=index,
            record=record,
            target=target,
            file_path_override=(
                image_index.get(record.get("file_name") or Path(record.get("file_path") or "").name)
                if image_index
                else None
            ),
        )
        for index, record in enumerate(source_results, start=1)
        if isinstance(record, dict)
    ]
    matched_only = [
        item
        for item in recomputed
        if item.target_matched
    ]
    filtered = apply_duplicate_filter(matched_only)
    return filtered, source_summary


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Scan a mixed evidence folder, select target bank slips, deduplicate them, and export a lawyer-ready PDF report.",
    )
    parser.add_argument("--input", default=DEFAULT_INPUT_DIR, help="Input folder containing mixed evidence files.")
    parser.add_argument("--target", default=DEFAULT_TARGET, help="Exact target receiver name/keyword to match.")
    parser.add_argument("--output-dir", default=str(DEFAULT_OUTPUT_DIR), help="Output directory for PDF and audit JSON.")
    parser.add_argument("--max-files", type=int, default=None, help="Optional limit for smoke testing.")
    parser.add_argument("--from-audit", default=None, help="Build a new report from an existing audit JSON without running OCR.")
    parser.add_argument("--image-root", default=None, help="Optional copied-image folder to resolve images when using --from-audit.")
    return parser.parse_args()


async def async_main() -> int:
    args = parse_args()
    input_dir = Path(args.input)
    output_dir = Path(args.output_dir)
    target = args.target

    if args.from_audit:
        audit_path = Path(args.from_audit)
        if not audit_path.exists() or not audit_path.is_file():
            print(f"Audit JSON not found: {audit_path}", file=sys.stderr)
            return 2

        started = time.time()
        print(f"Audit input: {audit_path}")
        print(f"Target: {target}")
        print("Mode: from-audit (OCR disabled)")
        image_root = Path(args.image_root) if args.image_root else None
        if image_root:
            print(f"Image root: {image_root}")
        results, source_summary = load_results_from_audit(audit_path, target, image_root=image_root)
        scanned_count = int(source_summary.get("scanned_files") or source_summary.get("processed_files") or len(results))
        summary = build_summary(results, scanned_count=scanned_count)
        summary["source_audit"] = str(audit_path)
        summary["image_root"] = str(image_root) if image_root else None
        summary["mode"] = "from_audit"

        timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        output_pdf = output_dir / f"lawyer-slip-report-from-audit-{timestamp}.pdf"
        output_json = output_dir / f"lawyer-slip-report-from-audit-{timestamp}.audit.json"
        render_pdf_report(results, audit_path.parent, target, output_pdf, summary)
        write_audit_json(results, output_json, summary)

        elapsed = time.time() - started
        print("Done")
        print(f"PDF: {output_pdf}")
        print(f"Audit JSON: {output_json}")
        print(f"Matched raw before dedup: {summary['matched_raw_before_dedup']}")
        print(f"Unique matched slips: {summary['unique_matched']}")
        print(f"Duplicates excluded: {summary['duplicates_excluded']}")
        print(f"Review required: {summary['review_required']}")
        print(f"Total amount: {format_money(summary['total_amount'])}")
        print(f"Elapsed: {elapsed:.1f}s")
        return 0

    if not input_dir.exists() or not input_dir.is_dir():
        print(f"Input folder not found: {input_dir}", file=sys.stderr)
        return 2

    if not os.getenv("GOOGLE_APPLICATION_CREDENTIALS"):
        print("GOOGLE_APPLICATION_CREDENTIALS is not set. Google Cloud Vision OCR cannot run.", file=sys.stderr)
        return 2

    started = time.time()
    files = scan_image_files(input_dir)
    if not files:
        print(f"No supported image files found in: {input_dir}", file=sys.stderr)
        return 2

    print(f"Input folder: {input_dir}")
    print(f"Target: {target}")
    print(f"Image files found: {len(files)}")
    if args.max_files:
        print(f"Smoke-test limit: {args.max_files}")

    results = await process_images(files=files, target=target, max_files=args.max_files)
    summary = build_summary(results, scanned_count=len(files))

    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    output_pdf = output_dir / f"lawyer-slip-report-{timestamp}.pdf"
    output_json = output_dir / f"lawyer-slip-report-{timestamp}.audit.json"
    render_pdf_report(results, input_dir, target, output_pdf, summary)
    write_audit_json(results, output_json, summary)

    elapsed = time.time() - started
    print("Done")
    print(f"PDF: {output_pdf}")
    print(f"Audit JSON: {output_json}")
    print(f"Unique matched slips: {summary['unique_matched']}")
    print(f"Duplicates excluded: {summary['duplicates_excluded']}")
    print(f"Review required: {summary['review_required']}")
    print(f"Total amount: {format_money(summary['total_amount'])}")
    print(f"Elapsed: {elapsed:.1f}s")
    return 0


def main() -> int:
    return asyncio.run(async_main())


if __name__ == "__main__":
    raise SystemExit(main())
