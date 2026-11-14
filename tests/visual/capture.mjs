// R0 (W41): capture the published prototype for reference.
// Usage: node capture.mjs [--out referencia] [--url https://terra-tempo.vercel.app] [--extract]
// --block-fonts aborts Google Fonts (sensitivity test); --extra-css "<css>" injects CSS (sensitivity test).
// --extract also writes network, computed-style and text inventories to ./extraido/.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => {
    if (a.startsWith("--")) acc.push([a.slice(2), all[i + 1]?.startsWith("--") || all[i + 1] === undefined ? true : all[i + 1]]);
    return acc;
  }, []),
);
const URL = args.url ?? "https://terra-tempo.vercel.app";
const OUT = path.resolve(args.out ?? "referencia");
const EXTRACT = Boolean(args.extract);
export const ANCHORS = ["abertura", "panorama", "o-que", "onde", "quando", "regioes", "significativo", "metodo"];
export const WIDTHS = [375, 768, 1280];

const FREEZE_CSS = `
*, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; scroll-behavior: auto !important; }
`;

async function waitForReady(page) {
  // Map and sections are drawn in the browser: wait for the loading messages to go.
  await page.waitForLoadState("networkidle", { timeout: 60_000 });
  await page.waitForFunction(
    () => {
      const t = document.body.innerText;
      return !t.includes("A preparar a cartografia") && !/carregar dados/i.test(t);
    },
    null,
    { timeout: 60_000 },
  );
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
}

fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const report = { url: URL, date: new Date().toISOString(), widths: {}, missing: [] };

for (const width of WIDTHS) {
  const context = await browser.newContext({
    viewport: { width, height: 900 },
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
    locale: "pt-PT",
  });
  if (args["block-fonts"]) await context.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const page = await context.newPage();
  const requests = [];
  if (EXTRACT && width === 1280) {
    page.on("response", async (res) => {
      const req = res.request();
      let size = null;
      try {
        size = (await res.body()).length;
      } catch {
        /* redirects or opaque bodies */
      }
      requests.push({
        url: res.url(),
        method: req.method(),
        type: req.resourceType(),
        status: res.status(),
        contentType: res.headers()["content-type"] ?? null,
        bytes: size,
      });
    });
  }
  const t0 = Date.now();
  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await waitForReady(page);
  await page.addStyleTag({ content: FREEZE_CSS + (typeof args["extra-css"] === "string" ? args["extra-css"] : "") });
  report.widths[width] = { readyMs: Date.now() - t0, anchors: {} };

  // The sticky header is captured on its own, then made static so it does not
  // cover the stitched screenshots of tall sections.
  const header = page.locator("header").first();
  if ((await header.count()) > 0) {
    await header.screenshot({ path: path.join(OUT, `cabecalho-${width}.png`), animations: "disabled", caret: "hide" });
  }
  await page.addStyleTag({ content: "header, [class*='header'], .variable-rail { position: static !important; }" });

  for (const id of ANCHORS) {
    const loc = page.locator(`#${id}`);
    if ((await loc.count()) === 0) {
      report.missing.push({ width, id });
      continue;
    }
    const box = await loc.first().boundingBox();
    const file = path.join(OUT, `${id}-${width}.png`);
    await loc.first().screenshot({ path: file, animations: "disabled", caret: "hide" });
    report.widths[width].anchors[id] = { height: Math.round(box?.height ?? 0) };
  }

  if (EXTRACT && width === 1280) {
    const dir = path.resolve("extraido");
    fs.mkdirSync(dir, { recursive: true });
    const styles = await page.evaluate(extractStyles);
    fs.writeFileSync(path.join(dir, "estilos.json"), JSON.stringify(styles, null, 2));
    const texts = await page.evaluate(extractTexts, ANCHORS);
    fs.writeFileSync(path.join(dir, "textos.json"), JSON.stringify(texts, null, 2));
    const nav = await page.evaluate(() =>
      [...document.querySelectorAll("header a, header button, nav a, nav button")].map((e) => ({
        tag: e.tagName.toLowerCase(),
        text: e.textContent.trim(),
        href: e.getAttribute("href"),
        aria: e.getAttribute("aria-label"),
      })),
    );
    fs.writeFileSync(path.join(dir, "navegacao.json"), JSON.stringify(nav, null, 2));
    const interactive = await page.evaluate(() =>
      [...document.querySelectorAll("button, a[href], input, select, [role=button], [role=tab], [role=radio], [tabindex]")].map((e) => ({
        section: e.closest("section[id]")?.id ?? e.closest("[id]")?.id ?? null,
        tag: e.tagName.toLowerCase(),
        role: e.getAttribute("role"),
        text: (e.textContent || e.getAttribute("aria-label") || "").trim().slice(0, 80),
        aria: e.getAttribute("aria-label"),
        pressed: e.getAttribute("aria-pressed") ?? e.getAttribute("aria-selected") ?? e.getAttribute("aria-checked"),
      })),
    );
    fs.writeFileSync(path.join(dir, "interactivos.json"), JSON.stringify(interactive, null, 2));
    const sections = await page.evaluate(() =>
      [...document.querySelectorAll("[id]")].filter((e) => e.offsetHeight > 0).map((e) => ({ id: e.id, tag: e.tagName.toLowerCase(), top: Math.round(e.getBoundingClientRect().top + scrollY) })),
    );
    fs.writeFileSync(path.join(dir, "ids.json"), JSON.stringify(sections, null, 2));
    fs.writeFileSync(path.join(dir, "rede.json"), JSON.stringify(requests, null, 2));
  }
  await context.close();
}
await browser.close();
fs.writeFileSync(path.join(OUT, "_relatorio.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));

// ---- run inside the page ----
function extractStyles() {
  const props = [
    "color", "backgroundColor", "borderTopColor", "fontFamily", "fontSize", "fontWeight", "lineHeight",
    "letterSpacing", "textTransform", "borderRadius", "boxShadow", "maxWidth", "paddingTop", "paddingLeft",
    "marginTop", "marginBottom", "rowGap", "columnGap",
  ];
  const tally = Object.fromEntries(props.map((p) => [p, {}]));
  const pathOf = (e) => {
    const sec = e.closest("section[id]")?.id ?? "header/footer";
    const cls = typeof e.className === "string" && e.className ? "." + e.className.trim().split(/\s+/).slice(0, 2).join(".") : "";
    return `${sec} ${e.tagName.toLowerCase()}${cls}`;
  };
  for (const e of document.querySelectorAll("body *")) {
    if (!(e instanceof HTMLElement) && !(e instanceof SVGElement)) continue;
    const r = e.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    const cs = getComputedStyle(e);
    const hasText = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    for (const p of props) {
      const v = cs[p];
      if (!v || v === "none" || v === "normal" || v === "0px" || v === "rgba(0, 0, 0, 0)" || v === "auto") continue;
      if (["fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "textTransform", "color"].includes(p) && !hasText) continue;
      const slot = (tally[p][v] ??= { count: 0, examples: [] });
      slot.count++;
      if (slot.examples.length < 3) slot.examples.push(pathOf(e));
    }
  }
  // CSS custom properties and media queries from same-origin stylesheets
  const vars = {};
  const media = new Set();
  const fontFaces = [];
  const walk = (rules, sheetHref) => {
    for (const rule of rules) {
      if (rule instanceof CSSStyleRule) {
        for (let i = 0; i < rule.style.length; i++) {
          const name = rule.style[i];
          if (name.startsWith("--")) {
            (vars[rule.selectorText] ??= {})[name] = rule.style.getPropertyValue(name).trim();
          }
        }
      } else if (rule instanceof CSSMediaRule) {
        media.add(rule.conditionText);
        walk(rule.cssRules, sheetHref);
      } else if (rule instanceof CSSFontFaceRule) {
        fontFaces.push(rule.cssText.slice(0, 300));
      } else if (rule.cssRules) {
        walk(rule.cssRules, sheetHref);
      }
    }
  };
  const sheets = [];
  for (const s of document.styleSheets) {
    sheets.push(s.href);
    try {
      walk(s.cssRules, s.href);
    } catch {
      /* cross-origin sheet */
    }
  }
  const root = getComputedStyle(document.documentElement);
  const rootVars = {};
  for (const sel of Object.values(vars)) for (const k of Object.keys(sel)) rootVars[k] = root.getPropertyValue(k).trim();
  return { sheets, computedRootVars: rootVars, declaredVars: vars, media: [...media], fontFaces, tally, htmlAttrs: { lang: document.documentElement.lang, dataset: { ...document.documentElement.dataset } } };
}

function extractTexts(anchors) {
  const out = {};
  const grab = (root) => {
    const items = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      const t = n.textContent.replace(/\s+/g, " ").trim();
      if (!t) continue;
      const el = n.parentElement;
      if (!el || el.closest("script,style")) continue;
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") continue;
      items.push({ tag: el.tagName.toLowerCase(), text: t });
    }
    // aria labels and titles are texts too
    for (const e of root.querySelectorAll("[aria-label],[title],[alt]")) {
      for (const a of ["aria-label", "title", "alt"]) {
        const v = e.getAttribute(a);
        if (v) items.push({ tag: `${e.tagName.toLowerCase()}@${a}`, text: v });
      }
    }
    return items;
  };
  const header = document.querySelector("header");
  if (header) out["_cabecalho"] = grab(header);
  for (const id of anchors) {
    const el = document.getElementById(id);
    if (el) out[id] = grab(el);
  }
  const footer = document.querySelector("footer");
  if (footer) out["_rodape"] = grab(footer);
  out["_title"] = [{ tag: "title", text: document.title }];
  const desc = document.querySelector('meta[name="description"]');
  if (desc) out["_meta"] = [{ tag: "meta", text: desc.getAttribute("content") }];
  return out;
}
