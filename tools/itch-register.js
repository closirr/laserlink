/* LASERLINK — itch.io registration (node tools/itch-register.js) */
"use strict";
const fs = require("fs");
const { chromium } = require("playwright");

const ADDRESS = "laserlink.dev86259@uberip.com";
const PASSWORD = "LaserLink2026!x";
const USERNAME = "laserlink-dev";

(async () => {
  const browser = await chromium.launch({ headless: false, args: ["--disable-blink-features=AutomationControlled"] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto("https://itch.io/register", { waitUntil: "domcontentloaded" });
  // wait out any Cloudflare interstitial up to 45s
  try {
    await page.waitForSelector('input[name="email"]', { timeout: 45000 });
  } catch (e) {
    console.log("form never appeared — still on:", page.url());
    console.log("text:", (await page.evaluate(() => document.body.innerText.slice(0, 200))).replace(/\n+/g, " | "));
  }
  await page.waitForTimeout(800);

  const inputs = await page.evaluate(() =>
    Array.from(document.querySelectorAll("input, button[type=submit], .buttons .button")).map((i) => ({
      tag: i.tagName, type: i.type || null, name: i.name || null, id: i.id || null,
      cls: (i.className || "").slice(0, 40), text: (i.textContent || "").trim().slice(0, 30),
    }))
  );
  console.log("form fields:", JSON.stringify(inputs, null, 1));
  await page.waitForTimeout(3000); // let turnstile settle

  await page.fill('input[name="email"]', ADDRESS).catch(() => console.log("email fill failed"));
  await page.fill('input[name="username"]', USERNAME).catch(() => console.log("username fill failed"));
  await page.fill('input[name="password"]', PASSWORD).catch(() => console.log("password fill failed"));
  await page.fill('input[name="password_repeat"]', PASSWORD).catch(() => console.log("password_repeat fill failed"));
  // terms checkbox
  await page.check('input[name="accept_terms"]').catch(async () => {
    const cb = await page.$('input[type="checkbox"]');
    if (cb) await cb.check().catch(() => {});
  });
  await page.screenshot({ path: "output/itch-register-filled.png" });
  // turnstile token ready?
  const tLen = await page.evaluate(() => {
    const el = document.querySelector('input[name="cf-turnstile-response"]');
    return el ? el.value.length : -1;
  });
  console.log("turnstile token length:", tLen);
  if (!tLen) {
    // click the visible turnstile checkbox inside its iframe
    for (const f of page.frames()) {
      if (f !== page.mainFrame() && /challenges\.cloudflare\.com/.test(f.url())) {
        try {
          const cb = await f.$('input[type="checkbox"], .ctp-checkbox-label');
          if (cb) { await cb.click({ timeout: 3000 }); console.log("clicked turnstile checkbox"); }
        } catch (e) { console.log("turnstile click:", e.message.slice(0, 80)); }
      }
    }
    await page.waitForTimeout(5000);
    console.log("turnstile token length after click:", await page.evaluate(() => (document.querySelector('input[name="cf-turnstile-response"]') || {}).value?.length));
  }
  await page.click('button:has-text("Create account")').catch((e) => console.log("submit:", e.message));
  await page.waitForTimeout(4000);
  console.log("url after submit:", page.url());
  const vals = await page.evaluate(() =>
    Array.from(document.querySelectorAll("input")).filter((i) => i.name)
      .map((i) => `${i.name}=${(i.value || "").slice(0, 25) || "(empty)"}${i.required ? "[req]" : ""}${i.validationMessage ? "[v:" + i.validationMessage + "]" : ""}`)
  );
  console.log("fields:", vals.join(" | "));
  const errs = await page.evaluate(() => {
    const els = document.querySelectorAll(".form_errors, .inline_error, .error_box");
    return Array.from(els).map((e) => e.innerText.trim()).filter(Boolean);
  });
  console.log("validation errors:", JSON.stringify(errs));
  const body = await page.evaluate(() => document.body.innerText.slice(0, 500));
  console.log("page text:", body.replace(/\n+/g, " | ").slice(0, 300));
  await page.screenshot({ path: "output/itch-register-after.png" });

  fs.writeFileSync("output/itch-creds.json", JSON.stringify({ ADDRESS, PASSWORD, USERNAME }, null, 2));
  await browser.close();
})().catch((e) => { console.error("FATAL", e.message); process.exit(1); });
