import argparse
import json
import shutil
from collections import defaultdict
from datetime import datetime
from pathlib import Path


DEFAULT_LIST_PATH = Path("outputs/lawyer_slip_report/matched-target-files-885.txt")
DEFAULT_SOURCE_DIR = Path(r"D:\EDOK\Duplicates")
DEFAULT_DEST_DIR = Path(r"D:\EDOK\Matched_Jinhipa_885")


def read_target_names(list_path: Path) -> list[str]:
    if not list_path.exists() or not list_path.is_file():
        raise FileNotFoundError(f"Matched file list not found: {list_path}")

    names = []
    seen = set()
    for raw_line in list_path.read_text(encoding="utf-8").splitlines():
        name = raw_line.strip()
        if not name or name in seen:
            continue
        names.append(name)
        seen.add(name)
    return names


def index_source_files(source_dir: Path) -> dict[str, list[Path]]:
    if not source_dir.exists() or not source_dir.is_dir():
        raise FileNotFoundError(f"Source folder not found: {source_dir}")

    index: dict[str, list[Path]] = defaultdict(list)
    for path in source_dir.rglob("*"):
        if path.is_file():
            index[path.name].append(path)
    return dict(index)


def build_destination_path(dest_dir: Path, source_dir: Path, source_path: Path, collision_counts: dict[str, int]) -> Path:
    try:
        relative = source_path.relative_to(source_dir)
    except ValueError:
        relative = Path(source_path.name)

    candidate = dest_dir / relative
    key = str(candidate).lower()
    if collision_counts[key] == 0:
        collision_counts[key] += 1
        return candidate

    collision_counts[key] += 1
    suffix = collision_counts[key]
    return candidate.with_name(f"{candidate.stem}__copy{suffix}{candidate.suffix}")


def copy_matched_files(
    *,
    list_path: Path,
    source_dir: Path,
    dest_dir: Path,
    dry_run: bool,
) -> dict:
    target_names = read_target_names(list_path)
    source_index = index_source_files(source_dir)
    collision_counts: dict[str, int] = defaultdict(int)

    copied = []
    missing = []
    duplicate_names = []

    for name in target_names:
        matches = source_index.get(name, [])
        if not matches:
            missing.append(name)
            continue
        if len(matches) > 1:
            duplicate_names.append({
                "file_name": name,
                "match_count": len(matches),
                "paths": [str(path) for path in matches],
            })

        for source_path in matches:
            dest_path = build_destination_path(dest_dir, source_dir, source_path, collision_counts)
            copied.append({
                "file_name": name,
                "source": str(source_path),
                "destination": str(dest_path),
            })
            if dry_run:
                continue
            dest_path.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source_path, dest_path)

    summary = {
        "mode": "dry_run" if dry_run else "copy",
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "list_path": str(list_path),
        "source_dir": str(source_dir),
        "dest_dir": str(dest_dir),
        "requested_names": len(target_names),
        "copied_files": len(copied),
        "missing_names": len(missing),
        "duplicate_name_groups": len(duplicate_names),
        "missing": missing,
        "duplicate_names": duplicate_names,
        "copied": copied,
    }
    return summary


def write_summary(dest_dir: Path, summary: dict, dry_run: bool) -> Path:
    report_dir = dest_dir if not dry_run else Path("outputs/lawyer_slip_report")
    report_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    report_path = report_dir / f"copy-matched-target-files-{stamp}.json"
    report_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    return report_path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Copy matched target files from a generated filename list without OCR.",
    )
    parser.add_argument("--list", default=str(DEFAULT_LIST_PATH), help="Path to matched-target-files-885.txt.")
    parser.add_argument("--source", default=str(DEFAULT_SOURCE_DIR), help="Recursive source folder.")
    parser.add_argument("--dest", default=str(DEFAULT_DEST_DIR), help="Destination folder.")
    parser.add_argument("--dry-run", action="store_true", help="Report what would be copied without writing files.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    summary = copy_matched_files(
        list_path=Path(args.list),
        source_dir=Path(args.source),
        dest_dir=Path(args.dest),
        dry_run=args.dry_run,
    )
    report_path = write_summary(Path(args.dest), summary, args.dry_run)

    print(f"Mode: {summary['mode']}")
    print(f"Requested names: {summary['requested_names']}")
    print(f"Copied files: {summary['copied_files']}")
    print(f"Missing names: {summary['missing_names']}")
    print(f"Duplicate-name groups: {summary['duplicate_name_groups']}")
    print(f"Report JSON: {report_path}")
    if summary["missing_names"]:
        print("Missing sample:")
        for name in summary["missing"][:20]:
            print(f"- {name}")
    return 0 if summary["missing_names"] == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
