// Screenshots of the redesigned home: hero with the globe, cards, missions; desktop and phone.
// Usage: node redesign-shots.mjs [http://localhost:3000]
import { chromium } from "playwright";

const URL = process.argv[2] ?? "http://localhost:3000";
const b = await chromium.launch();
const prefs = (audience) =>
  `localStorage.setItem("terra-tempo.prefs", JSON.stringify({ lang: "pt", audience: "${audience}" }))`;
for (const [name, vp, audience] of [
  ["desktop", { width: 1366, height: 860 }, "explorador"],
  ["phone", { width: 390, height: 844 }, "explorador"],
  ["crianca", { width: 1366, height: 860 }, "crianca"],
]) {
  const p = await b.newPage({ viewport: vp, locale: "pt-PT" });
  await p.addInitScript(prefs(audience));
  await p.goto(URL + "/?v=temperature", { waitUntil: "networkidle" });
  await p.locator(".globe canvas").waitFor({ timeout: 60_000 });
  await p.waitForTimeout(2500);
  await p.screenshot({ path: `_redesign-${name}.png` });
  await p.screenshot({ path: `_redesign-${name}-full.png`, fullPage: true });
  if (name === "desktop") {
    // Globe hover + click opens the place card on the map
    const c = await p.locator(".globe canvas").boundingBox();
    await p.mouse.move(c.x + c.width * 0.5, c.y + c.height * 0.45);
    await p.waitForTimeout(400);
    console.log("tip:", await p.locator(".globe-tip").innerText().catch(() => "(none)"));
    await p.screenshot({ path: "_redesign-tip.png" });
    await p.mouse.click(c.x + c.width * 0.5, c.y + c.height * 0.45);
    await p.waitForTimeout(2500);
    console.log("card:", await p.locator(".place-card h3").innerText().catch(() => "(none)"));
    // Mission: switches variable and opens Brazil
    await p.getByRole("button", { name: /Chove mais ou menos no Brasil/ }).click();
    await p.locator(".place-card h3", { hasText: "Brasil" }).waitFor({ timeout: 30_000 });
    console.log("mission url:", p.url());
    await p.waitForTimeout(1500);
    await p.screenshot({ path: "_redesign-missao.png" });
  }
  await p.close();
}
await b.close();
