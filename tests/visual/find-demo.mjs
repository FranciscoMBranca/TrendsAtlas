// Finds every visible "demo" wording on a deployed page, per audience. Usage: node find-demo.mjs <url>
import { chromium } from "playwright";
const URL = process.argv[2] ?? "https://trends-atlas.vercel.app";
const b = await chromium.launch();
for (const audience of ["crianca", "explorador", "cientista"]) {
  for (const v of ["temperature", "sea_level", "vegetation"]) {
    const p = await b.newPage({ viewport: { width: 1366, height: 900 } });
    await p.addInitScript(`localStorage.setItem("terra-tempo.prefs", JSON.stringify({ lang: "pt", audience: "${audience}" }))`);
    await p.goto(`${URL}/?v=${v}`, { waitUntil: "networkidle" });
    await p.waitForTimeout(3000);
    const hits = await p.evaluate(() => {
      const out = [];
      const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      while (walk.nextNode()) {
        const t = walk.currentNode.textContent.trim();
        if (/demonstra|\bdemo\b|exemplo|sintétic|synthetic/i.test(t)) {
          const el = walk.currentNode.parentElement;
          out.push(`${el.tagName.toLowerCase()}.${el.className}`.slice(0, 60) + " :: " + t.slice(0, 120));
        }
      }
      return out;
    });
    console.log(`[${audience} / ${v}] ${hits.length}`);
    hits.slice(0, 12).forEach((h) => console.log("   ", h));
    await p.close();
  }
}
await b.close();
