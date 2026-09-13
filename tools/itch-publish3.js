/* LASERLINK — set embed options + publish (node tools/itch-publish3.js) */
"use strict";
const { chromium } = require("playwright");
const fs = require("fs");

const OLD = JSON.parse(fs.readFileSync(__dirname + "/../output/itch-creds.json", "utf8"));

(async () => {
  const browser = await chromium.launch({ headless: false, args: ["--disable-blink-features=AutomationControlled"] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const log = (...a) => console.log(...a);

  await page.goto("https://itch.io/login", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('input[name="username"]', { timeout: 40000 });
  await page.fill('input[name="username"]', OLD.USERNAME);
  await page.fill('input[name="password"]', OLD.PASSWORD);
  await page.click('.buttons .button, button:has-text("Log in")').catch(() => {});
  await page.waitForTimeout(3500);

  await page.goto("https://itch.io/game/edit/5003791", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(6000);

  // probe all embed inputs
  const probe = await page.evaluate(() =>
    Array.from(document.querySelectorAll('input, select'))
      .filter((i) => /^embed\[/i.test(i.name || ""))
      .map((i) => i.tagName[0] + ":" + i.name + "=" + (i.value || "") + (i.type === "checkbox" ? "(cb)" : ""))
  );
  log("embed fields:", JSON.stringify(probe));

  const result = await page.evaluate(() => {
    const out = [];
    const setVal = (name, val) => {
      const el = document.querySelector(`input[name="${name}"]`);
      if (!el) return name + ":missing";
      el.value = val;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return name + ":ok";
    };
    out.push(setVal("embed[width]", "1152"));
    out.push(setVal("embed[height]", "672"));
    const check = (name) => {
      const el = document.querySelector(`input[name="${name}"]`);
      if (!el) return name + ":missing";
      if (!el.checked) el.click();
      return name + ":" + el.checked;
    };
    out.push(check("embed[fullscreen]"));
    out.push(check("embed[smartphone_friendly]"));
    // publish
    const pub = Array.from(document.querySelectorAll('input[type="radio"]')).find((r) => r.name === "game[published]" && r.value === "published");
    if (pub) { pub.click(); out.push("published:clicked"); } else out.push("published:missing");
    return out.join(" ");
  });
  log("apply:", result);
  await page.waitForTimeout(1000);

  await page.screenshot({ path: __dirname + "/../output/itch-prepublish.png", fullPage: true });

  // save
  await page.click('button:has-text("Save")').catch(async () => {
    await page.click('.buttons .button:has-text("Save")').catch(() => {});
  });
  await page.waitForTimeout(7000);
  log("after save url:", page.url());
  log("errors:", (await page.evaluate(() => {
    const els = document.querySelectorAll(".text_error, .form_errors, .banner_error");
    return els.length ? Array.from(els).map((e) => e.innerText.slice(0, 100)).join(" | ") : "(none)";
  })));

  // check public page
  const pub2 = await page.evaluate(() => {
    const r = Array.from(document.querySelectorAll('input[type="radio"][name="game[published]"]')).find((x) => x.checked);
    return r ? r.value : "?";
  });
  log("published state:", pub2);
  await page.screenshot({ path: __dirname + "/../output/itch-published.png", fullPage: true });
  await browser.close();
})().catch((e) => { console.error("FATAL", e.message); process.exit(1); });
