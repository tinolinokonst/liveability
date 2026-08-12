#!/usr/bin/env python3
"""
Generate public/og.png — the 1200x630 Open Graph card used for link previews.

Run:  python3 scripts/generate-og-image.py

Why Python/Pillow rather than sharp or @vercel/og:
  - `sharp` ships native libvips binaries that carry open CVEs and require an
    install-script approval step; we deliberately do not add it as a direct
    dependency (see SECURITY_REVIEW.md, L-1).
  - `@vercel/og` renders per request at the edge; we want a static, committed
    asset so previews work even if the app is down.
Pillow needs no project dependency and produces a deterministic file.

The pin/house artwork is redrawn from the same geometry as the favicon
(public/android-chrome-512x512.png), so the OG card and the app icon match
exactly. Source paths are in a 512x512 coordinate space, scaled below.
"""

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

# ── Canvas / brand ───────────────────────────────────────────────────────────
W, H = 1200, 630
BG = (15, 15, 15)          # #0f0f0f
ORANGE = (249, 115, 22)    # #f97316
WHITE = (255, 255, 255)
MUTED = (160, 160, 160)    # #a0a0a0

FONT_PATH = "/System/Library/Fonts/Avenir Next.ttc"
FONT_HEAVY, FONT_MEDIUM, FONT_DEMI = 8, 5, 2  # face indices within the .ttc

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "og.png"

WORDMARK = "Liveability"
TAGLINE = "Real data on where you're moving in Switzerland"


def cubic(p0, p1, p2, p3, steps=120):
    """Flatten one cubic bezier into points (matches the SVG path exactly)."""
    out = []
    for i in range(steps + 1):
        t = i / steps
        u = 1 - t
        x = u**3 * p0[0] + 3 * u**2 * t * p1[0] + 3 * u * t**2 * p2[0] + t**3 * p3[0]
        y = u**3 * p0[1] + 3 * u**2 * t * p1[1] + 3 * u * t**2 * p2[1] + t**3 * p3[1]
        out.append((x, y))
    return out


def pin_outline():
    """The teardrop pin from liveability-icon.svg, in 512x512 space."""
    pts = []
    pts += cubic((256, 85), (196, 85), (148, 133), (148, 193))
    pts += cubic((148, 193), (148, 253), (256, 400), (256, 400))
    pts += cubic((256, 400), (256, 400), (364, 253), (364, 193))
    pts += cubic((364, 193), (364, 133), (316, 85), (256, 85))
    return pts


def radial_glow(size, center, radius, colour, peak_alpha):
    """Soft radial gradient, mirroring the landing page's orange accent."""
    w, h = size
    ys, xs = np.mgrid[0:h, 0:w]
    dist = np.sqrt((xs - center[0]) ** 2 + (ys - center[1]) ** 2) / radius
    # Smooth falloff to fully transparent at the edge
    alpha = np.clip(1.0 - dist, 0.0, 1.0) ** 2.2 * peak_alpha
    layer = np.zeros((h, w, 4), dtype=np.uint8)
    layer[..., 0], layer[..., 1], layer[..., 2] = colour
    layer[..., 3] = (alpha * 255).astype(np.uint8)
    return Image.fromarray(layer, "RGBA")


def draw_icon(canvas, size_px, top_left):
    """Render the pin+house icon at `size_px`, supersampled 4x for clean edges."""
    ss = 4
    n = size_px * ss
    icon = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    d = ImageDraw.Draw(icon)
    s = n / 512.0  # SVG space -> icon space

    def sc(pts):
        return [(x * s, y * s) for x, y in pts]

    # Soft halo behind the pin (circle r=138 @ 12% in the source icon)
    halo = radial_glow((n, n), (256 * s, 243 * s), 190 * s, ORANGE, 0.30)
    icon.alpha_composite(halo)

    # Pin body
    d.polygon(sc(pin_outline()), fill=ORANGE + (255,))

    # Dark circular cutout (cx 256, cy 193, r 55)
    cx, cy, r = 256 * s, 193 * s, 55 * s
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=BG + (255,))

    # House body + chimney
    house = [(228, 197), (228, 218), (253, 218), (253, 204), (259, 204),
             (259, 218), (284, 218), (284, 197), (256, 174)]
    d.polygon(sc(house), fill=ORANGE + (255,))
    chimney = [(243, 174), (243, 161), (230, 161), (230, 185)]
    d.polygon(sc(chimney), fill=ORANGE + (204,))  # 0.7 opacity in the source

    icon = icon.resize((size_px, size_px), Image.LANCZOS)
    canvas.alpha_composite(icon, top_left)


def text_width(draw, text, font):
    box = draw.textbbox((0, 0), text, font=font)
    return box[2] - box[0]


def wrap_to_width(draw, text, font, max_width):
    """Greedy word wrap so the tagline can never overflow the canvas."""
    words, lines, current = text.split(), [], ""
    for word in words:
        trial = f"{current} {word}".strip()
        if current and text_width(draw, trial, font) > max_width:
            lines.append(current)
            current = word
        else:
            current = trial
    if current:
        lines.append(current)
    return lines


def balanced_wrap(draw, text, font, max_width):
    """
    Wrap into the same number of lines greedy would use, but choose the break
    points that make the lines most even — so we get
    "Real data on where you're / moving in Switzerland" rather than orphaning
    a single word like "Switzerland" on its own line.
    """
    words = text.split()
    target_lines = len(wrap_to_width(draw, text, font, max_width))
    if target_lines <= 1:
        return [text]

    best = None
    # Enumerate every way to cut `words` into exactly `target_lines` chunks.
    def search(start, remaining, acc):
        nonlocal best
        if remaining == 1:
            line = " ".join(words[start:])
            w = text_width(draw, line, font)
            if w > max_width:
                return
            widths = [text_width(draw, l, font) for l in acc] + [w]
            cost = max(widths) - min(widths)   # evenness
            if best is None or cost < best[0]:
                best = (cost, acc + [line])
            return
        for end in range(start + 1, len(words) - remaining + 2):
            line = " ".join(words[start:end])
            if text_width(draw, line, font) > max_width:
                break
            search(end, remaining - 1, acc + [line])

    search(0, target_lines, [])
    return best[1] if best else wrap_to_width(draw, text, font, max_width)


def draw_line(draw, x, baseline_y, text, font, fill):
    """Draw `text` with its ink box starting exactly at (x, baseline_y)."""
    box = draw.textbbox((0, 0), text, font=font)
    draw.text((x - box[0], baseline_y - box[1]), text, font=font, fill=fill)
    return box[3] - box[1]


def main():
    canvas = Image.new("RGBA", (W, H), BG + (255,))

    # Ambient brand glow, echoing the landing page's radial accents. Kept tight
    # and low-alpha so the corners stay true #0f0f0f rather than muddy.
    canvas.alpha_composite(radial_glow((W, H), (232, 300), 400, ORANGE, 0.13))
    canvas.alpha_composite(radial_glow((W, H), (1140, 40), 380, ORANGE, 0.09))

    # Icon, vertically centred on the left
    icon_size = 268
    icon_x = 92
    draw_icon(canvas, icon_size, (icon_x, (H - icon_size) // 2))

    d = ImageDraw.Draw(canvas)
    f_word = ImageFont.truetype(FONT_PATH, 118, index=FONT_HEAVY)
    f_tag = ImageFont.truetype(FONT_PATH, 38, index=FONT_MEDIUM)
    f_domain = ImageFont.truetype(FONT_PATH, 29, index=FONT_DEMI)

    text_x = icon_x + icon_size + 66      # 426
    max_text_w = W - text_x - 72          # right margin

    # Fail loudly rather than shipping a clipped wordmark
    word_w = text_width(d, WORDMARK, f_word)
    if word_w > max_text_w:
        raise SystemExit(f"wordmark overflows: {word_w}px > {max_text_w}px")

    tag_lines = balanced_wrap(d, TAGLINE, f_tag, max_text_w)
    domain = "liveability.live"

    # Measure the whole block first so it can be centred as a unit
    word_h = d.textbbox((0, 0), WORDMARK, font=f_word)[3] - d.textbbox((0, 0), WORDMARK, font=f_word)[1]
    tag_line_h = d.textbbox((0, 0), "Ay", font=f_tag)[3] - d.textbbox((0, 0), "Ay", font=f_tag)[1]
    tag_leading = 14
    tag_block_h = len(tag_lines) * tag_line_h + (len(tag_lines) - 1) * tag_leading
    dom_h = d.textbbox((0, 0), domain, font=f_domain)[3] - d.textbbox((0, 0), domain, font=f_domain)[1]

    gap_word_tag, gap_tag_dom = 38, 34
    block_h = word_h + gap_word_tag + tag_block_h + gap_tag_dom + dom_h
    y = (H - block_h) // 2

    draw_line(d, text_x, y, WORDMARK, f_word, WHITE)
    y += word_h + gap_word_tag

    for i, line in enumerate(tag_lines):
        draw_line(d, text_x, y, line, f_tag, MUTED)
        y += tag_line_h + (tag_leading if i < len(tag_lines) - 1 else 0)
    y += gap_tag_dom

    # Small orange domain marker with a short rule for structure
    draw_line(d, text_x, y, domain, f_domain, ORANGE)
    dom_w = text_width(d, domain, f_domain)
    rule_y = y + dom_h // 2
    d.rectangle([text_x + dom_w + 22, rule_y - 1, text_x + dom_w + 96, rule_y + 1], fill=ORANGE + (120,))

    OUT.parent.mkdir(parents=True, exist_ok=True)
    canvas.convert("RGB").save(OUT, "PNG", optimize=True)
    print(f"wrote {OUT} ({OUT.stat().st_size:,} bytes, {W}x{H}) — tagline on {len(tag_lines)} line(s)")


if __name__ == "__main__":
    main()
