"""R0 (W41): WCAG contrast of the prototype's colour tokens (src/styles/tokens.css).

Converts OKLCH to sRGB (Björn Ottosson's matrices) and prints contrast ratios.
Usage: python -I contrast.py
"""

import math

TOKENS = {
    "background": (0.965, 0.01, 87),
    "foreground": (0.237, 0.009, 248),
    "muted-foreground": (0.504, 0.022, 238),
    "border": (0.871, 0.018, 88),
    "primary": (0.386, 0.062, 220),
    "secondary": (0.928, 0.013, 85),
    "map-ink": (0.25, 0.025, 190),
    "temperature.down": (0.47, 0.1, 250),
    "temperature.up": (0.52, 0.15, 35),
    "precipitation.down": (0.491, 0.112, 66),
    "precipitation.up": (0.457, 0.079, 184),
    "vegetation.down": (0.49, 0.11, 55),
    "vegetation.up": (0.46, 0.11, 145),
    "sea_ice.down": (0.5, 0.13, 50),
    "sea_ice.up": (0.45, 0.1, 245),
    "aerosols.down": (0.46, 0.07, 225),
    "aerosols.up": (0.45, 0.12, 330),
    "sea_level.down": (0.5, 0.1, 90),
    "sea_level.up": (0.4, 0.11, 255),
}


def oklch_to_linear_srgb(L, C, h):
    a, b = C * math.cos(math.radians(h)), C * math.sin(math.radians(h))
    l_ = L + 0.3963377774 * a + 0.2158037573 * b
    m_ = L - 0.1055613458 * a - 0.0638541728 * b
    s_ = L - 0.0894841775 * a - 1.2914855480 * b
    l, m, s = l_**3, m_**3, s_**3
    rgb = (
        4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
        -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
        -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
    )
    return [min(1.0, max(0.0, x)) for x in rgb]


def luminance(c):
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]


def to_hex(c):
    enc = lambda x: 12.92 * x if x <= 0.0031308 else 1.055 * x ** (1 / 2.4) - 0.055
    return "#" + "".join(f"{round(255 * enc(x)):02x}" for x in c)


def ratio(a, b):
    hi, lo = sorted([luminance(a), luminance(b)], reverse=True)
    return (hi + 0.05) / (lo + 0.05)


lin = {k: oklch_to_linear_srgb(*v) for k, v in TOKENS.items()}
print("| Token | OKLCH | sRGB aprox. | sobre background | sobre secondary | AA texto normal (4,5) |")
print("| --- | --- | --- | --- | --- | --- |")
for k, v in TOKENS.items():
    if k == "background":
        print(f"| {k} | oklch{v} | {to_hex(lin[k])} | — | — | — |")
        continue
    rb, rs = ratio(lin[k], lin["background"]), ratio(lin[k], lin["secondary"])
    ok = "sim" if min(rb, rs) >= 4.5 else ("só texto grande (3)" if min(rb, rs) >= 3 else "não")
    print(f"| {k} | oklch{v} | {to_hex(lin[k])} | {rb:.2f}:1 | {rs:.2f}:1 | {ok} |")
print(f"\nbackground sobre primary (botão activo): {ratio(lin['background'], lin['primary']):.2f}:1")
