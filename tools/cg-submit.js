/* CrazyGames: fill submission wizard step 1 (node tools/cg-submit.js) */
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

(async () => {
  const browser = await chromium.launch({ headless: false, args: ["--disable-blink-features=AutomationControlled"] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  const log = (...a) => console.log(...a);

  await cgLogin(page);
  const item = await page.$("text=Submit a game");
  if (item) { await item.click().catch(() => {}); await page.waitForTimeout(8000); }
  log("wizard at:", page.url());

  // game name
  await page.fill('input[type=text]', "LASERLINK");
  // engine select (custom) — dump options
  const eng = await page.$("select");
  if (eng) {
    const opts = await page.evaluate(() => {
      const s = document.querySelector("select");
      return s ? Array.from(s.options).map((o) => o.value + ":" + o.textContent.trim()) : [];
    });
    log("engine options:", JSON.stringify(opts));
    const html5 = opts.find((o) => /html/i.test(o));
    if (html5) {
      await page.evaluate((v) => {
        const s = document.querySelector("select");
        s.value = v.split(":")[0];
        s.dispatchEvent(new Event("change", { bubbles: true }));
      }, html5);
      log("engine set:", html5);
    }
  }
  await page.waitForTimeout(1500);

  // progress: No
  const radios = await page.$$('input[type=radio]');
  if (radios.length) { await radios[0].check().catch(() => {}); log("progress: no"); }

  // options: mobile friendly
  const boxes = await page.$$('input[type=checkbox]');
  if (boxes.length) { await boxes[0].check().catch(() => {}); log("mobile: checked"); }

  // scroll and find file inputs
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1500);
  const files = await page.evaluate(() =>
    Array.from(document.querySelectorAll('input[type=file], [class*=drop] , [class*=upload]')).map((i) =>
      i.tagName + ":" + (i.name || i.id || "") + ":" + (i.className || "").toString().slice(0, 40) + ":" + (i.accept || "")
    ).slice(0, 10)
  );
  log("upload areas:", JSON.stringify(files, null, 1));
  await page.screenshot({ path: path.join(ROOT, "output", "cg-step1-bottom.png"), fullPage: true });
  await browser.close();
})().catch((e) => { console.error("FATAL", e.message); process.exit(1); });
