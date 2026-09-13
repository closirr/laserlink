/* LASERLINK — replace zip on itch draft + verify playable (node tools/itch-replace.js) */
"use strict";
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const OLD = JSON.parse(fs.readFileSync(__dirname + "/../output/itch-creds.json", "utf8"));
const ROOT = path.resolve(__dirname, "..");

(async () => {
  const browser = await chromium.launch({ headless: false, args: ["--disable-blink-features=AutomationControlled"] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const log = (...a) => console.log(...a);

  await page.goto("https://itch.io/login", { waitUntil: "domcontentloaded" });
  try { await page.waitForSelector('input[name="username"]', { timeout: 40000 }); } catch (e) {
    await page.goto("https://itch.io/login", { waitUntil: "domcontentloaded" });
    await page.waitForSelector('input[name="username"]', { timeout: 40000 });
  }
  await page.fill('input[name="username"]', OLD.USERNAME);
  await page.fill('input[name="password"]', OLD.PASSWORD);
  await page.click('.buttons .button, button:has-text("Log in")').catch(() => {});
  await page.waitForTimeout(3500);

  await page.goto("https://itch.io/game/edit/5003791", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(5000);

  // delete old file
  const del = await page.$('a:has-text("Delete file"), .delete_file_btn');
  if (del) {
    await del.click();
    await page.waitForTimeout(1500);
    const confirm = await page.$('button:has-text("Yes, delete"), .buttons .button:has-text("delete")');
    if (confirm) { await confirm.click().catch(() => {}); log("old file deleted"); }
    await page.waitForTimeout(2500);
  } else log("no delete link");

  // upload new zip
  const uploadBtn = await page.$('button:has-text("Upload files")');
  const [c] = await Promise.all([page.waitForEvent("filechooser", { timeout: 20000 }), uploadBtn.click()]);
  await c.setFiles(path.join(ROOT, "laserlink-v1.0.zip"));
  log("new zip attaching...");
  await page.waitForFunction(() => /Success/i.test(document.body.innerText), null, { timeout: 240000 });
  log("new zip uploaded");
  await page.waitForTimeout(2500);

  // save
  await page.click('button:has-text("Save")').catch(() => {});
  await page.waitForTimeout(6000);
  log("saved; errors:", await page.evaluate(() => {
    const e = document.querySelectorAll(".text_error, .form_errors");
    return e.length ? e[0].innerText.slice(0, 100) : "(none)";
  }));

  // verify on the live page
  await page.goto("https://laserlink-dev.itch.io/laserlink", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  const run = await page.$('.button:has-text("Run game")');
  if (run) {
    await run.click();
    log("Run game clicked");
    await page.waitForTimeout(18000);
    for (const f of page.frames()) {
      if (f !== page.mainFrame()) {
        const info = await f.evaluate(() => ({
          ready: document.readyState,
          canvas: !!document.querySelector("canvas"),
          hook: typeof render_game_to_text === "function",
          state: (typeof render_game_to_text === "function") ? render_game_to_text().slice(0, 170) : null,
        })).catch((e) => "err: " + e.message.slice(0, 80));
        log("GAME:", JSON.stringify(info));
      }
    }
  }
  await page.screenshot({ path: path.join(ROOT, "output", "itch-live-final.png") });
  await browser.close();
})().catch((e) => { console.error("FATAL", e.message); process.exit(1); });
