#!/usr/bin/env python3
"""Fail when a page drifts from the site's shared shell.

The terminal is the only navigation, so a page that ships without it is a
dead end. Each page must also be real UTF-8 -- two pages were once UTF-16
full of CP437 mojibake while declaring charset=utf-8, and every em-dash
rendered as garbage.

Run locally with:  python3 tools/check-pages.py
"""

import glob
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

REQUIRED = [
    ('href="styles.css"', "must link styles.css"),
    ('src="terminal.js"', "must load terminal.js (it is the only navigation)"),
    ('<meta charset="utf-8">', "must declare charset=utf-8"),
]
FORBIDDEN = [
    ("chapter-nav", "still has the retired chapter-nav buttons"),
    ("ΓÇö", "contains CP437 mojibake"),
]
CHAPTER_IN_TITLE = re.compile(r'<(?:title|h1)\b[^>]*>\s*Chapter\s+\d+\s*:', re.I)


def main():
    pages = sorted(os.path.basename(p) for p in glob.glob(os.path.join(ROOT, "*.html")))
    if not pages:
        print("ERROR: no .html pages found in site root")
        return 1

    problems = []

    for page in pages:
        path = os.path.join(ROOT, page)
        raw = open(path, "rb").read()

        if raw.startswith((b"\xff\xfe", b"\xfe\xff")):
            problems.append((page, "is UTF-16; the site is UTF-8"))
            continue
        try:
            text = raw.decode("utf-8")
        except UnicodeDecodeError as e:
            problems.append((page, f"is not valid UTF-8 ({e})"))
            continue

        for needle, why in REQUIRED:
            if needle not in text:
                problems.append((page, why))
        for needle, why in FORBIDDEN:
            if needle in text:
                problems.append((page, why))
        if CHAPTER_IN_TITLE.search(text):
            problems.append((page, 'title carries a "Chapter N:" prefix; '
                                   "the index owns the ordering"))

    print(f"Checked {len(pages)} page(s) for a consistent shell.")

    if problems:
        print(f"\n{len(problems)} inconsistency(ies):\n")
        for page, why in problems:
            print(f"  {page}: {why}")
        return 1

    print("All pages share the same shell.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
