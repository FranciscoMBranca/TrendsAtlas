# tests/visual

R0 (W41): reference captures of the published prototype and the scripts that produce them. No product code lives here.

| File | What it does |
| --- | --- |
| `capture.mjs` | Opens the prototype with Playwright, waits until "A preparar a cartografia…" and "carregar dados" are gone, freezes animations, captures the header and the 8 anchors at 375, 768 and 1280 px. `--extract` also writes network, computed styles, texts, ids and interactive elements to `extraido/`. `--block-fonts` and `--extra-css` exist only for the sensitivity test. |
| `measure.mjs` | Compares two capture folders with `pixelmatch` and prints the % of differing pixels per file. |
| `contrast.py` | WCAG contrast of the prototype's OKLCH colour tokens. |
| `textos.py` | Turns `extraido/textos.json` into the captured-text list used in `docs/design/textos-pt.md`. |
| `referencia/` | Reference PNGs: `<anchor>-<width>.png` and `cabecalho-<width>.png`, plus `_relatorio.json`. |
| `extraido/` | Raw inventories (JSON) and measurement results. |

```bash
cd tests/visual
npm install
npx playwright install chromium
node capture.mjs --out referencia --extract
node capture.mjs --out _run2
node measure.mjs referencia _run2
```

References were made on Windows 10. Regenerate them in the same environment that runs the visual test (see `docs/design/limiar-visual.md`).
