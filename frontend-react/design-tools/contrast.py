#!/usr/bin/env python3
"""WCAG 2.2 contrast checker for the DESIGN.md palette.

Usage
  python3 design-tools/contrast.py "#F5F5F7" "#000000"   # check one pair
  python3 design-tools/contrast.py --check                # check every documented pair

Keep the PALETTE below in sync with src/styles/tokens.css. Any new color pair
must pass here before it is used. Thresholds: text 4.5, large text and
non-text graphics 3.0.
"""
import sys


def _lin(c: float) -> float:
    c /= 255
    return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4


def _rgb(h: str):
    h = h.lstrip("#")
    return [int(h[i:i + 2], 16) for i in (0, 2, 4)]


def lum(h: str) -> float:
    r, g, b = _rgb(h)
    return 0.2126 * _lin(r) + 0.7152 * _lin(g) + 0.0722 * _lin(b)


def ratio(a: str, b: str) -> float:
    la, lb = lum(a), lum(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def mix(fg: str, bg: str, alpha: float) -> str:
    f, b = _rgb(fg), _rgb(bg)
    return "#%02X%02X%02X" % tuple(round(f[i] * alpha + b[i] * (1 - alpha)) for i in range(3))


D = dict(bg="#000000", s1="#0A0A0B", s2="#121214", s3="#1B1B1E",
         t1="#F5F5F7", t2="#A1A1A6", t3="#8A8A90",
         red="#FF5468", redfill="#C8102E", amber="#FFC700", blue="#5AA9FF", green="#34D27B",
         bar="#707076", hi="#F5F5F7")
L = dict(bg="#F6F4F1", s1="#FFFFFF", s2="#FBFAF8", s3="#EFEBE6",
         t1="#0B0B0C", t2="#55555B", t3="#64646A",
         red="#C8102E", amber="#A87500", amber_text="#8A6100", blue="#0A5BD3", green="#0B7A3E",
         bar="#85858B", hi="#0B0B0C")


def pairs():
    out = []  # (label, fg, bg, threshold)
    for s in ("bg", "s1", "s2", "s3"):
        for t in ("t1", "t2", "t3"):
            out.append((f"dark {t} on {s}", D[t], D[s], 4.5))
    for n in ("red", "blue", "green", "amber"):
        for s in ("s1", "s3"):
            out.append((f"dark {n} on {s}", D[n], D[s], 4.5))
    out.append(("white on red-fill (destructive button)", "#FFFFFF", D["redfill"], 4.5))
    out.append(("dark primary button text", "#000000", D["t1"], 4.5))
    for s in ("s1", "s2", "s3"):
        out.append((f"dark field-border (40% white) on {s}", mix("#FFFFFF", D[s], 0.40), D[s], 3.0))
    for s in ("bg", "s1"):
        out.append((f"dark chart bar on {s}", D["bar"], D[s], 3.0))
    out.append(("dark chart bar vs highlight", D["bar"], D["hi"], 3.0))
    for s in ("bg", "s1", "s2", "s3"):
        for t in ("t1", "t2", "t3"):
            out.append((f"light {t} on {s}", L[t], L[s], 4.5))
    for n in ("red", "blue", "green", "amber_text"):
        for s in ("bg", "s1", "s3"):
            out.append((f"light {n} on {s}", L[n], L[s], 4.5))
    for s in ("bg", "s1", "s3"):
        out.append((f"light amber (graphic) on {s}", L["amber"], L[s], 3.0))
    for s in ("bg", "s1", "s2"):
        out.append((f"light field-border (50% ink) on {s}", mix("#0B0B0C", L[s], 0.50), L[s], 3.0))
    for s in ("bg", "s1"):
        out.append((f"light chart bar on {s}", L["bar"], L[s], 3.0))
    out.append(("light chart bar vs highlight", L["bar"], L["hi"], 3.0))
    out.append(("light primary button text", "#FFFFFF", L["t1"], 4.5))
    # tinted status strips (srgb mix, matching color-mix(in srgb, ...))
    for name, fg, base, a in [("dark green", D["green"], D["s1"], .16), ("dark red", D["red"], D["s1"], .16),
                              ("dark amber", D["amber"], D["s1"], .16), ("dark blue", D["blue"], D["s1"], .16),
                              ("light green", L["green"], L["s1"], .12), ("light red", L["red"], L["s1"], .10),
                              ("light amber", L["amber_text"], L["s1"], .14), ("light blue", L["blue"], L["s1"], .10)]:
        out.append((f"{name} text on its tint", fg, mix(fg, base, a), 4.5))
    # glass worst cases
    out.append(("dark glass over bright backdrop: t1", D["t1"], mix("#121214", "#E6F0F5", .64), 4.5))
    out.append(("light glass over black backdrop: t1", L["t1"], mix("#FFFFFF", "#000000", .88), 4.5))
    # hero: display text must sit in the deep part of the sky (0-44%)
    for pos, c in [(0, "#03060C"), (16, "#04204A"), (30, "#002F6C"), (44, "#0E5FB0")]:
        out.append((f"hero white text at horizon stop {pos}%", "#FFFFFF", c, 4.5))
    return out


def main(argv):
    if len(argv) == 2 and argv[0].startswith("#") and argv[1].startswith("#"):
        r = ratio(argv[0], argv[1])
        print(f"{r:.2f}:1  text(4.5) {'PASS' if r >= 4.5 else 'FAIL'}  large/graphics(3.0) {'PASS' if r >= 3 else 'FAIL'}")
        return 0
    if argv == ["--check"]:
        bad = 0
        for label, fg, bg, need in pairs():
            r = ratio(fg, bg)
            ok = r >= need
            bad += 0 if ok else 1
            print(f"{'PASS' if ok else 'FAIL'}  {r:5.2f} (need {need})  {label}")
        print(f"\n{len(pairs()) - bad}/{len(pairs())} pairs pass")
        return 1 if bad else 0
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
