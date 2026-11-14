// Smoke test of the "Investigue" section (SPEC-101/102) against a running site + API.
// Usage: node investigar.mjs [http://localhost:3000]
import { chromium } from "playwright";

const URL = process.argv[2] ?? "http://localhost:3000";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const fail = (msg) => {
  console.error("FALHOU:", msg);
  process.exitCode = 1;
};

await page.goto(`${URL}/?v=aerosols`, { waitUntil: "networkidle" });
const section = page.locator("#investigar");
await section.waitFor({ timeout: 60_000 });
await section.getByRole("radio", { name: "Região do atlas" }).click();
await section.getByRole("radio", { name: "Jun–Jul–Ago" }).click();
await section.getByRole("button", { name: "Analisar" }).click();
const sentence = section.locator(".result .sentence");
await sentence.waitFor({ timeout: 30_000 });
console.log("Frase:", await sentence.innerText());
console.log("Selo:", await section.locator(".result .seal strong").innerText());
if (!(await section.getByText("DEMONSTRAÇÃO").count())) fail("sem rótulo DEMONSTRAÇÃO");
if (!(await section.getByText(/Valor-p abaixo de 0,05/).count())) fail("sem regra do valor-p");
if (!/Jun, Jul, Ago/.test(await sentence.innerText())) fail("a frase não nomeia os meses");

// English without reload
await section.getByRole("radio", { name: "EN" }).click();
console.log("EN:", await section.locator(".result .sentence").innerText());

// Short period -> clear error, button disabled
await section.getByRole("radio", { name: "PT" }).click();
await section.locator("select").nth(1).selectOption("2020");
if (!(await section.getByText("pelo menos 10 anos").count())) fail("sem erro de período curto");
if (!(await section.getByRole("button", { name: "Analisar" }).isDisabled())) fail("botão activo com período curto");

// Variable without API support
await page.goto(`${URL}/?v=sea_ice`, { waitUntil: "networkidle" });
await page.locator("#investigar").waitFor();
if (!(await page.locator("#investigar").getByText("ainda não existe para esta variável").count())) fail("sem aviso de variável indisponível");

await page.screenshot({ path: "_investigar.png", fullPage: false });
await browser.close();
console.log(process.exitCode ? "Com falhas" : "OK");
