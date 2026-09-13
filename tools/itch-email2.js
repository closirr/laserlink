/* LASERLINK — change itch email to readable mailbox + verify (node tools/itch-email2.js) */
"use strict";
const { chromium } = require("playwright");
const fs = require("fs");

const NEW_EMAIL = "lldev54380@uberip.com";
const OLD = JSON.parse(fs.readFileSync("output/itch-creds.json", "utf8"));

(async () => {
  const browser = await chromium.launch({ headless: false, args: ["--disable-blink-features=AutomationControlled"] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  await page.goto("https://itch.io/login", { waitUntil: "domcontentloaded" });
  try { await page.waitForSelector('input[name="username"]', { timeout: 40000 }); } catch (e) {}
  await page.fill('input[name="username"]', OLD.USERNAME).catch(() => {});
  await page.fill('input[name="password"]', OLD.PASSWORD).catch(() => {});
  await page.click('.buttons .button, button:has-text("Log in")').catch(() => {});
  await page.waitForTimeout(3000);

  await page.goto("https://itch.io/user/settings/email-addresses", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  const inputs = await page.evaluate(() =>
    Array.from(document.querySelectorAll("input, button[type=submit], .buttons .button"))
      .map((i) => ({ type: i.type, name: i.name, text: (i.textContent || "").trim().slice(0, 25) }))
  );
  console.log("email page fields:", JSON.stringify(inputs));

  const emailInput = await page.$('input[name="email[email]"]');
  if (!emailInput) { console.log("no email input found"); await page.screenshot({ path: "output/itch-email2.png" }); await browser.close(); return; }
  await emailInput.fill(NEW_EMAIL);
  await page.fill('input[name="email[password]"]', OLD.PASSWORD).catch((e) => console.log("password field:", e.message.slice(0, 60)));
  await page.screenshot({ path: "output/itch-email-filled.png" });
  const submit = await page.$('button[type="submit"]:near(input[name="email[password]"])') || await page.$('button:has-text("Save")');
  if (submit) { await submit.click(); console.log("submitted email change"); }
  await page.waitForTimeout(3500);
  console.log("url:", page.url());
  const body = await page.evaluate(() => document.body.innerText.slice(0, 300).replace(/\n+/g, " | "));
  console.log("page:", body);
  await page.screenshot({ path: "output/itch-email-after.png" });
  await browser.close();
})().catch((e) => { console.error("FATAL", e.message); process.exit(1); });
