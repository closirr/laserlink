/* CrazyGames: login + open submission form + dump (node tools/cg-session.js) */
"use strict";
const { chromium } = require("playwright");

const EMAIL = "lldev54380@uberip.com";
const PASS = "LaserLink2026xq";

async function cgLogin(page) {
  await page.goto("https://developer.crazygames.com/login", { waitUntil: "domcontentloaded", timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(5000);
  await page.fill('input[type=text]', EMAIL);
  await page.fill('input[type=password]', PASS);
  await page.click('button:has-text("Log In")').catch(() => {});
  await page.waitForTimeout(8000);
  // display-name picker may appear once
  if (/display-name/.test(page.url())) {
    await page.fill('input[type=text]', "Laserlink Dev").catch(() => {});
    const sel = await page.$("select");
    if (sel) await sel.selectOption({ index: 1 }).catch(() => {});
    await page.click('button:has-text("Continue")').catch(() => {});
    await page.waitForTimeout(8000);
  }
}

(async () => {
  const browser = await chromium.launch({ headless: false, args: ["--disable-blink-features=AutomationControlled"] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await cgLogin(page);
  console.log("on:", page.url());

  // click the Submit a game nav item
  const item = await page.$('text=Submit a game');
  if (item) { await item.click().catch((e) => console.log("click err:", e.message.slice(0, 60))); await page.waitForTimeout(8000); }
  console.log("after click:", page.url());

  const fields = await page.evaluate(() =>
    Array.from(document.querySelectorAll("input, textarea, select, button, [role=button], [class*=dropzone], [class*=upload]"))
      .map((i) => i.tagName + ":" + (i.type || "") + ":" + (i.name || i.id || "") + ":" + (i.placeholder || "").slice(0, 30) + ":" + (i.textContent || "").trim().slice(0, 30))
      .slice(0, 50)
  );
  console.log(JSON.stringify(fields, null, 1).slice(0, 4000));
  await page.screenshot({ path: "output/cg-submit.png", fullPage: true });
  await browser.close();
})().catch((e) => { console.error("FATAL", e.message); process.exit(1); });
