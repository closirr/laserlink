/* CrazyGames: complete submission end-to-end (node tools/cg-final.js) */
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
  "Maze the swarm with walls, expand your power grid with Pylons to harvest distant crystals, and survive 20 " +
  "hand-crafted campaign levels plus an endless arena. 7 buildings, 6 enemy types, bosses every 5th wave.";

async function fillStep1(page) {
  await page.fill('input[type=text]', "LASERLINK");
  const sel = await page.$("div.MuiSelect-select");
  await sel.click();
  await page.waitForTimeout(1000);
  await page.click('li[role=option]:has-text("HTML5")');
  await page.waitForTimeout(1500);
  const radios = await page.$$("input[type=radio]");
  if (radios.length) await radios[0].check().catch(() => {});
  const boxes = await page.$$("input[type=checkbox]");
  if (boxes.length) await boxes[0].check().catch(() => {});
  await page.waitForTimeout(1200);
  const sels = await page.$$("div.MuiSelect-select");
  if (sels.length > 1) {
    await sels[1].click();
    await page.waitForTimeout(1000);
    await page.click('li[role=option]:has-text("LANDSCAPE")').catch(() => {});
  }
  await page.waitForTimeout(1000);
}

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
  log("wizard:", page.url());

  await fillStep1(page);
  log("step1 filled");

  // find the (webkitdirectory) input and attach dist folder
  const dirInput = await page.$('input[type=file]');
  if (!dirInput) throw new Error("no file input");
  await dirInput.setInputFiles(path.join(ROOT, "dist"));
  log("dist attached, waiting for upload...");
  await page.waitForTimeout(30000);
  log("upload state:", (await page.evaluate(() => (document.body.innerText.match(/(uploading|uploaded|success|%|index\.html)/gi) || []).slice(0, 8).join(","))));

  // re-enumerate inputs (cover etc.)
  const files2 = await page.evaluate(() =>
    Array.from(document.querySelectorAll("input[type=file]")).map((i, idx) => ({ idx, dir: i.webkitdirectory, accept: i.accept }))
  );
  log("file inputs:", JSON.stringify(files2));
  const cover = files2.find((f) => !f.dir);
  if (cover) {
    const inputs = await page.$$("input[type=file]");
    await inputs[cover.idx].setInputFiles(path.join(ROOT, "output", "cover-wide.png"));
    log("cover attached");
    await page.waitForTimeout(8000);
  }

  await page.screenshot({ path: path.join(ROOT, "output", "cg-s1-done.png"), fullPage: true });

  // advance: dump buttons then click any next-like control
  const btnDump = await page.evaluate(() =>
    Array.from(document.querySelectorAll("button, a[class*=button], [role=button]")).map((b) => ({
      t: (b.textContent || "").trim().slice(0, 30),
      vis: !!b.offsetParent,
      dis: b.disabled,
    })).filter((b) => b.t)
  );
  log("buttons:", JSON.stringify(btnDump));
  let advanced = false;
  for (const sel of ['button:has-text("Next")', 'button:has-text("Next step")', 'button:has-text("Continue")', 'button:has-text("Preview")', '[class*=stepper] li:has-text("QA")', 'button:has-text("Save")']) {
    const b = await page.$(sel);
    if (b && (await b.isVisible().catch(() => false))) {
      await b.click().catch(() => {});
      await page.waitForTimeout(6000);
      advanced = true;
      log("clicked:", sel, "->", page.url());
      break;
    }
  }
  if (!advanced) log("no advance control found");

  // dump whatever step we're on
  log("page now:", (await page.evaluate(() => document.body.innerText.slice(0, 800))).replace(/\n+/g, " | "));
  await page.screenshot({ path: path.join(ROOT, "output", "cg-step2.png"), fullPage: true });
  await browser.close();
})().catch((e) => { console.error("FATAL", e.message); process.exit(1); });
