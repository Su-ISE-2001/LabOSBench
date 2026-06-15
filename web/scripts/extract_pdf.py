#!/usr/bin/env python3
"""Extract text and tables from LabOSBench PDF to help populate results.json.

Usage:
    python scripts/extract_pdf.py papers/labosbench.pdf
    python scripts/extract_pdf.py papers/labosbench.pdf --output data/results_extracted.json
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

try:
    import fitz  # PyMuPDF
except ImportError:
    print("Install PyMuPDF: pip install pymupdf", file=sys.stderr)
    sys.exit(1)


def extract_pdf_text(pdf_path: Path) -> str:
    doc = fitz.open(pdf_path)
    pages = []
    for i, page in enumerate(doc):
        text = page.get_text()
        pages.append(f"\n--- Page {i + 1} ---\n{text}")
    doc.close()
    return "\n".join(pages)


def find_percentages(text: str) -> list[dict]:
    """Find percentage patterns that might be benchmark results."""
    results = []
    for m in re.finditer(r"([A-Za-z0-9\-_. ]{3,40}?)\s*[:\s]+(\d+\.?\d*)\s*%", text):
        name, val = m.group(1).strip(), float(m.group(2))
        if 0 < val <= 100:
            results.append({"name": name, "value": val})
    return results


def find_tables_hint(text: str) -> list[str]:
    """Return lines that look like table rows with multiple numbers."""
    hints = []
    for line in text.splitlines():
        nums = re.findall(r"\d+\.?\d*", line)
        if len(nums) >= 3 and len(line) < 200:
            hints.append(line.strip())
    return hints[:50]


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract LabOSBench PDF content")
    parser.add_argument("pdf", type=Path, help="Path to LabOSBench PDF")
    parser.add_argument(
        "--output", "-o", type=Path, default=None,
        help="Output JSON path (default: data/extracted_text.json)",
    )
    parser.add_argument("--text-only", action="store_true", help="Only dump raw text")
    args = parser.parse_args()

    if not args.pdf.exists():
        print(f"PDF not found: {args.pdf}", file=sys.stderr)
        sys.exit(1)

    text = extract_pdf_text(args.pdf)
    web_dir = Path(__file__).resolve().parent.parent
    out = args.output or web_dir / "data" / "extracted_text.json"

    if args.text_only:
        txt_path = out.with_suffix(".txt")
        txt_path.write_text(text, encoding="utf-8")
        print(f"Raw text saved to {txt_path}")
        return

    extracted = {
        "source_pdf": str(args.pdf),
        "page_count": text.count("--- Page"),
        "percentages_found": find_percentages(text),
        "table_row_hints": find_tables_hint(text),
        "full_text_preview": text[:8000],
        "note": "Review extracted data and manually update data/results.json",
    }

    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(extracted, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Extracted data saved to {out}")
    print(f"Found {len(extracted['percentages_found'])} percentage values")
    print(f"Found {len(extracted['table_row_hints'])} potential table rows")


if __name__ == "__main__":
    main()
