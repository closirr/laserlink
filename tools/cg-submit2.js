/* CrazyGames: full game submission (node tools/cg-submit2.js) */
"use strict";
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const EMAIL = "lldev54380@uberip.com";
const PASS = "LaserLink2026xq";
const ROOT = path.resolve(__dirname, "..");

async function cgLogin(page) {
  await page.goto("https://developer.crazygames.com/login", { waitUntil: "domcontentloaded", timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(5000);
  await page.fill("input[type=text]", EMAIL);
  await page.fill("input[type=password]", PASS);
  await page.click('button:has-text("Log In")').catch(() => {});
  await page.waitForTimeout(8000);
  if (/display-name/.test(page.url())) {
    await page.fill("input[type=text]", "Laserlink Dev").catch(() => {});
    const sel = await page.$("select");
    if (sel) await sel.selectOption({ index: 1 }).catch(() => {});
    await page.click('button:has-text("Continue")').catch(() => {});
    await page.waitForTimeout(8000);
  }
}

/* pick an option in an MUI select by visible label */
async function muiPick(page, muiIndex, label) {
  // MUI renders a hidden native select; set value then fire change
  const ok = await page.evaluate(({ idx, label }) => {
    const sels = Array.from(document.querySelectorAll("select"));
    const s = sels[idx];
    if (!s) return "no select " + idx;
    const opt = Array.from(s.options).find((o) => new RegExp(label, "i").test(o.textContent));
    if (!opt) return "no option like " + label + " in " + sels.map((x) => x.name || x.id).join(",");
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set;
    setter.call(s, opt.value);
    s.dispatchEvent(new Event("change", { bubbles: true }));
    return "set " + opt.value;
  }, { idx: muiIndex, label });
  return ok;
}

(async () => {
  const browser = await chromium.launch({ headless: false, args: ["--disable-blink-features=AutomationControlled"] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  const log = (...a) => console.log(...a);

  await cgLogin(page);
  const item = await page.$("text=Submit a game");
  if (item) { await item.click().catch(() => {}); await page.waitForTimeout(8000); }
  log("wizard at:", page.url());

  await page.fill("input[type=text]", "LASERLINK");

  // engine: HTML5 — the MUI select (first select on page)
  log("engine:", await muiPick(page, 0, "^HTML5$|HTML5"));
  await page.waitForTimeout(2000);

  // progress: No
  const radios = await page.$$("input[type=radio]");
  if (radios.length) await radios[0].check().catch(() => {});

  // mobile friendly → orientation LANDSCAPE (second select appears)
  const boxes = await page.$$(":scope input[type=checkbox], input[type=checkbox]");
  if (boxes.length) await boxes[0].check().catch(() => {});
  await page.waitForTimeout(1200);
  log("orientation:", await muiPick(page, 1, "landscape"));

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1500);
  const files = await page.evaluate(() =>
    Array.from(document.querySelectorAll('input[type=file]')).map((i) => i.name + ":" + i.id + ":" + (i.accept || ""))
  );
  log("file inputs:", JSON.stringify(files));
  await page.screenshot({ path: path.join(ROOT, "output", "cg-step1b.png"), fullPage: true });
  await browser.close();
})().catch((e) => { console.error("FATAL", e.message); process.exit(1); });
