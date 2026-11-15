// First screen of each audience after the entry animations; checks motion is off with reduced motion.
// Usage: node audience-shots.mjs [http://localhost:3000]
import { chromium } from "playwright";
const URL = process.argv[2] ?? "http://localhost:3000";
const b = await chromium.launch();
for (const audience of ["crianca", "explorador", "cientista"]) {
  for (const reduced of [false, true]) {
    const p = await b.newPage({ viewport: { width: 1366, height: 900 }, reducedMotion: reduced ? "reduce" : "no-preference" });
    await p.addInitScript(`localStorage.setItem("terra-tempo.prefs", JSON.stringify({ lang: "pt", audience: "${audience}" }))`);
    await p.goto(URL + "/?v=temperature", { waitUntil: "domcontentloaded", timeout: 120_000 });
    await p.locator(".globe canvas").waitFor({ timeout: 60_000 });
    const anim = await p.evaluate(() => getComputedStyle(document.querySelector(".home-hero h1")).animationName);
    const cards = await p.evaluate(() => getComputedStyle(document.querySelector(".var-card")).animationName);
    console.log(audience, reduced ? "reduced" : "motion", "| h1:", anim, "| card:", cards);
    if (!reduced) {
      await p.waitForTimeout(2000);
      await p.screenshot({ path: `_aud-${audience}.png` });
      await p.locator(".var-cards").scrollIntoViewIfNeeded();
      await p.waitForTimeout(1200);
      await p.screenshot({ path: `_aud-${audience}-cards.png` });
    }
    await p.close();
  }
}
await b.close();
