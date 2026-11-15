// Screenshots of the audience-driven home page (welcome, explorer with a place, child, chat).
// Usage: node home-shots.mjs [http://localhost:3000]
import { chromium } from "playwright";

const URL = process.argv[2] ?? "http://localhost:3000";
const b = await chromium.launch();
const ready = async (p) => {
  await p.waitForLoadState("networkidle");
  await p.waitForFunction(() => !document.body.innerText.includes("A preparar a cartografia"), null, { timeout: 60_000 });
};

// 1. First visit: welcome screen
let p = await b.newPage({ viewport: { width: 1280, height: 860 }, locale: "pt-PT" });
await p.goto(URL + "/?v=temperature", { waitUntil: "domcontentloaded" });
await p.getByRole("dialog").waitFor({ timeout: 60_000 });
await p.screenshot({ path: "_home-welcome.png" });

// 2. Explorer, Portuguese, Angola picked from the search
await p.getByLabel(/Adulto/).check({ force: true });
await p.getByLabel("Português").check({ force: true });
await p.getByRole("button", { name: /Começar/ }).click();
await ready(p);
const search = p.getByRole("combobox", { name: /Procurar/ });
await search.fill("Angola");
await search.press("Enter");
await p.getByRole("complementary", { name: "Angola" }).waitFor();
await p.waitForTimeout(2500);
await p.screenshot({ path: "_home-explorador.png" });
console.log("cartão:", (await p.getByRole("complementary", { name: "Angola" }).innerText()).slice(0, 220).replace(/\n+/g, " | "));

// 3. Click a cell on the map (hover name + card)
const map = p.locator(".explore-map .world-map");
const box = await map.boundingBox();
await p.getByRole("button", { name: "Fechar" }).first().click();
await p.mouse.move(box.x + box.width * 0.53, box.y + box.height * 0.3);
console.log("hover:", await p.locator(".explore-hover").innerText());
await p.mouse.click(box.x + box.width * 0.53, box.y + box.height * 0.3);
await p.waitForTimeout(1500);
console.log("célula:", await p.locator(".place-card h3").innerText());

// 4. Child, English
await p.goto(URL + "/?v=temperature&p=crianca&l=en");
await ready(p);
await p.screenshot({ path: "_home-crianca.png" });

// 5. Chat open (scientist, Spanish)
await p.goto(URL + "/?v=precipitation&p=cientista&l=es");
await ready(p);
await p.getByRole("button", { name: "Abrir el asistente" }).click();
await p.screenshot({ path: "_home-chat.png" });
await b.close();
