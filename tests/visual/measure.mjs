// R0 (W41): measure pixel differences between two capture runs of the same page.
// Usage: node measure.mjs referencia _run2 [--threshold 0.1]
// Prints, per anchor and width, the % of differing pixels (pixelmatch) and size mismatches.
import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

const [a = "referencia", b = "_run2"] = process.argv.slice(2).filter((x) => !x.startsWith("--"));
const tIdx = process.argv.indexOf("--threshold");
const threshold = tIdx > 0 ? Number(process.argv[tIdx + 1]) : 0.1;
const files = fs.readdirSync(a).filter((f) => f.endsWith(".png")).sort();
const rows = [];
for (const f of files) {
  const pb = path.join(b, f);
  if (!fs.existsSync(pb)) {
    rows.push({ file: f, note: "em falta na 2.ª captura" });
    continue;
  }
  const A = PNG.sync.read(fs.readFileSync(path.join(a, f)));
  const B = PNG.sync.read(fs.readFileSync(pb));
  if (A.width !== B.width || A.height !== B.height) {
    rows.push({ file: f, note: `tamanho diferente ${A.width}x${A.height} vs ${B.width}x${B.height}` });
    continue;
  }
  const diff = pixelmatch(A.data, B.data, null, A.width, A.height, { threshold, includeAA: false });
  rows.push({ file: f, size: `${A.width}x${A.height}`, diffPx: diff, diffPct: +((100 * diff) / (A.width * A.height)).toFixed(4) });
}
console.log(JSON.stringify({ a, b, threshold, rows }, null, 2));
