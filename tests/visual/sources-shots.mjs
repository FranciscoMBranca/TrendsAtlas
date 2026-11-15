// The data sources section, explorer on desktop and phone.
// Usage: node sources-shots.mjs [http://localhost:3000]
import { chromium } from "playwright";

const URL = process.argv[2] ?? "http://localhost:3000";
const b = await chromium.launch();
for (const [name, vp, audience] of [
  ["explorador", { width: 1366, height: 900 }, "explorador"],
  ["phone", { width: 390, height: 844 }, "explorador"],
]) {
  const p = await b.newPage({ viewport: vp });
  await p.addInitScript(`localStorage.setItem("terra-tempo.prefs", JSON.stringify({ lang: "pt", audience: "${audience}" }))`);
  await p.goto(URL + "/?v=temperature", { waitUntil: "networkidle" });
  const sec = p.locator("#fontes-dados");
  await sec.waitFor({ timeout: 60_000 });
  await sec.scrollIntoViewIfNeeded();
  await p.waitForTimeout(800);
  await sec.screenshot({ path: `_sources-${name}.png` });
  await p.close();
}
await b.close();
