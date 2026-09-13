/* LASERLINK — change itch.io account email to the readable mailbox (node tools/itch-email.js) */
"use strict";
const { chromium } = require("playwright");
const fs = require("fs");

const NEW_EMAIL = "lldev54380@uberip.com";
const OLD = JSON.parse(fs.readFileSync("output/itch-creds.json", "utf8"));

(async () => {
  const browser = await chromium.launch({ headless: false, args: ["--disable-blink-features=AutomationControlled"] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  // log in (session may persist in new context? no — fresh context, so log in)
  await page.goto("https://itch.io/login", { waitUntil: "domcontentloaded" });
  try {
    await page.waitForSelector('input[name="username"]', { timeout: 45000 });
  } catch (e) { /* maybe already logged in */ }
  await page.fill('input[name="username"]', OLD.USERNAME).catch(() => {});
  await page.fill('input[name="password"]', OLD.PASSWORD).catch(() => {});
  await page.click('.buttons .button, button:has-text("Log in")').catch(() => {});
  await page.waitForTimeout(3500);
  console.log("after login url:", page.url());

  await page.goto("https://itch.io/user/settings/email", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  const inputs = await page.evaluate(() =>
    Array.from(document.querySelectorAll("input, button[type=submit], .buttons .button"))
      .map((i) => ({ type: i.type || null, name: i.name || null, text: (i.textContent || "").trim().slice(0, 25) }))
  );
  console.log("email settings fields:", JSON.stringify(inputs));
  await page.screenshot({ path: "output/itch-email-settings.png" });
  await browser.close();
})().catch((e) => { console.error("FATAL", e.message); process.exit(1); });
