// The "same place, every variable" strip: open the Arctic mission, then switch variable from the strip.
// Usage: node system-shots.mjs [http://localhost:3000]
import { chromium } from "playwright";

const URL = process.argv[2] ?? "http://localhost:3000";
const b = await chromium.launch();
for (const [name, vp] of [["desktop", { width: 1366, height: 900 }], ["phone", { width: 390, height: 844 }]]) {
  const p = await b.newPage({ viewport: vp });
  await p.addInitScript(`localStorage.setItem("terra-tempo.prefs", JSON.stringify({ lang: "pt", audience: "explorador" }))`);
  await p.goto(URL + "/?v=temperature", { waitUntil: "networkidle" });
  await p.getByRole("button", { name: /Quanto aqueceu o Árctico/ }).click();
  const strip = p.locator(".system-strip");
  await strip.waitFor({ timeout: 60_000 });
  await p.waitForTimeout(2500);
  await strip.scrollIntoViewIfNeeded();
  await strip.screenshot({ path: `_system-${name}.png` });
  if (name === "desktop") {
    console.log((await strip.innerText()).replace(/\n+/g, " | ").slice(0, 900));
    await strip.locator('[data-var="sea_ice"]').click();
    await p.waitForURL(/v=sea_ice/);
    await p.locator(".place-card h3", { hasText: "Árctico" }).waitFor({ timeout: 30_000 });
    console.log("switched:", p.url(), await p.locator(".place-card h3").innerText());
  }
  await p.close();
}
await b.close();
