#!/usr/bin/env python3
"""Fail on dead internal links.

Checks every href in every .html page in the site root:

  page.html          -> the file must exist
  page.html#anchor   -> the file must exist AND carry id="anchor"
  #anchor            -> the current page must carry id="anchor"

External links (http, https, mailto, //) are left alone -- those go stale for
reasons outside this repo, and validate-references.yml already reports on them.

Run locally with:  python3 tools/check-links.py
"""

import glob
import os
import re
import sys
from urllib.parse import unquote

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXTERNAL = ("http://", "https://", "mailto:", "tel:", "//", "data:", "javascript:")

HREF = re.compile(r'href="([^"]*)"')
ID = re.compile(r'\bid="([^"]+)"')


def read(path):
    """Decode a page regardless of BOM, so encoding drift can't hide a bad link."""
    raw = open(path, "rb").read()
    for bom, encoding in ((b"\xff\xfe", "utf-16-le"),
                          (b"\xfe\xff", "utf-16-be"),
                          (b"\xef\xbb\xbf", "utf-8-sig")):
        if raw.startswith(bom):
            return raw.decode(encoding)
    return raw.decode("utf-8")


def main():
    pages = sorted(os.path.basename(p) for p in glob.glob(os.path.join(ROOT, "*.html")))
    if not pages:
        print("ERROR: no .html pages found in site root")
        return 1

    source = {p: read(os.path.join(ROOT, p)) for p in pages}
    ids = {p: set(ID.findall(s)) for p, s in source.items()}

    broken = []
    checked = 0

    for page in pages:
        text = source[page]
        for match in HREF.finditer(text):
            href = match.group(1).strip()
            if not href or href.startswith(EXTERNAL):
                continue

            checked += 1
            line = text.count("\n", 0, match.start()) + 1
            target, _, fragment = href.partition("#")
            target = unquote(target)
            fragment = unquote(fragment)

            if not target:
                if fragment and fragment not in ids[page]:
                    broken.append((page, line, href, "no such anchor on this page"))
                continue

            if target not in ids:
                if not os.path.exists(os.path.join(ROOT, target)):
                    broken.append((page, line, href, "no such file"))
                continue

            if fragment and fragment not in ids[target]:
                broken.append((page, line, href, f"no such anchor in {target}"))

    print(f"Checked {checked} internal link(s) across {len(pages)} page(s).")

    if broken:
        print(f"\n{len(broken)} dead internal link(s):\n")
        for page, line, href, why in broken:
            print(f"  {page}:{line}  {href}")
            print(f"      {why}")
        print("\nFix the link or restore the target before merging.")
        return 1

    print("No dead internal links.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
