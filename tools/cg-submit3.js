/* CrazyGames: complete submission (node tools/cg-submit3.js) */
"use strict";
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const EMAIL = "lldev54380@uberip.com";
const PASS = "LaserLink2026xq";
const ROOT = path.resolve(__dirname, "..");

const DESCRIPTION =
  "LASERLINK is a neon tower-defense with a twist: your Prisms don't shoot - they beam power into your Lasers. " +
  "Each Prism in a chain multiplies the laser's damage, and a 4-prism superlaser pierces whole rows of monsters. " +
  "Maze the swarm with walls, expand your power grid with Pylons to harvest distant crystals, and survive 20 hand-crafted " +
  "campaign levels plus an endless arena. 7 buildings, 6 enemy types, bosses every 5th wave.";

(async () => {
  const browser = await chromium.launch({ headless: false, args: ["--disable-blink-features=AutomationControlled"] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  const log = (...a) => console.log(...a);

  await page.goto("https://developer.crazygames.com/login", { waitUntil: "domcontentloaded", timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(5000);
  await page.fill("input[type=text]", EMAIL);
  await page.fill("input[type=password]", PASS);
  await page.click('button:has-text("Log In")').catch(() => {});
  await page.waitForTimeout(8000);
  const item = await page.$("text=Submit a game");
  if (item) { await item.click().catch(() => {}); await page.waitForTimeout(8000); }

  await page.fill("input[type=text]", "LASERLINK");
  const sel = await page.$("div.MuiSelect-select, [role=combobox]");
  await sel.click();
  await page.waitForTimeout(1000);
  await page.click('li[role=option]:has-text("HTML5")');
  await page.waitForTimeout(1500);
  const radios = await page.$$("input[type=radio]");
  if (radios.length) await radios[0].check().catch(() => {});
  const boxes = await page.$$("input[type=checkbox]");
  if (boxes.length) await boxes[0].check().catch(() => {});
  await page.waitForTimeout(1200);
  const sels = await page.$$("div.MuiSelect-select, [role=combobox]");
  if (sels.length > 1) {
    await sels[1].click();
    await page.waitForTimeout(1000);
    await page.click('li[role=option]:has-text("LANDSCAPE"), li[role=option]:has-text("Landscape")').catch(() => {});
  }
  await page.waitForTimeout(1500);
  log("step1 fields filled");

  // attach the game folder (input is webkitdirectory)
  const zipInput = await page.$('input[type=file]');
  if (!zipInput) throw new Error("no file input");
  await zipInput.setInputFiles(path.join(ROOT, "dist"));
  log("folder attaching...");
  await page.waitForTimeout(25000);
  log("upload widget text:", (await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll("[class*=upload], [class*=drop]")).map((e) => e.innerText).find((t) => t && t.length > 5);
    return el ? el.replace(/\n+/g, " | ").slice(0, 200) : "(none)";
  })));

  // look for cover input (may appear after upload)
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1500);
  const fileInputs = await page.$$("input[type=file]");
  log("file inputs now:", fileInputs.length);
  if (fileInputs.length > 1) {
    await fileInputs[1].setInputFiles(path.join(ROOT, "output", "cover-wide.png"));
    log("cover attached");
    await page.waitForTimeout(8000);
  }

  await page.screenshot({ path: path.join(ROOT, "output", "cg-uploaded.png"), fullPage: true });

  // proceed: find the next/continue button
  const next = await page.$('button:has-text("Next"), button:has-text("Continue"), button:has-text("Proceed")');
  if (next) {
    await next.click().catch((e) => log("next err:", e.message.slice(0, 60)));
    await page.waitForTimeout(6000);
    log("after next:", page.url());
    log("step text:", (await page.evaluate(() => document.body.innerText.slice(0, 700))).replace(/\n+/g, " | "));
  } else log("no next button");

  await page.screenshot({ path: path.join(ROOT, "output", "cg-step2.png"), fullPage: true });
  await browser.close();
})().catch((e) => { console.error("FATAL", e.message); process.exit(1); });
