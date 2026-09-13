/* CrazyGames: finish submission on the draft page (node tools/cg-finish.js) */
"use strict";
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const EMAIL = "lldev54380@uberip.com";
const PASS = "LaserLink2026xq";
const ROOT = path.resolve(__dirname, "..");
const GAME_URL = "https://developer.crazygames.com/games/ee01e051-d436-4c07-b93a-1128e10d9e69";

const DESCRIPTION =
  "LASERLINK is a neon tower-defense with a twist: your Prisms don't shoot - they beam power into your Lasers. " +
  "Each Prism in a chain multiplies the laser's damage, and a 4-prism superlaser pierces whole rows of monsters. " +
  "Maze the swarm with walls, expand your power grid with Pylons to harvest distant crystals, and survive 20 " +
  "hand-crafted campaign levels plus an endless arena. 7 buildings, 6 enemy types, bosses every 5th wave.";

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

  await page.goto(GAME_URL, { waitUntil: "domcontentloaded", timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(6000);

  // name
  const nameInput = await page.$('input[type=text]');
  await nameInput.fill("LASERLINK");
  log("name set");

  // go to QA (buttons on this page are overlay-wrapped; click via JS)
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll("button")).find((x) => /go to qa/i.test(x.textContent));
    if (b) b.click();
  });
  log("clicked Go to QA (js)");
  await page.waitForTimeout(8000);
  log("url:", page.url());
  log("QA page:", (await page.evaluate(() => document.body.innerText.slice(0, 900))).replace(/\n+/g, " | ").slice(0, 850));
  await page.screenshot({ path: path.join(ROOT, "output", "cg-qa.png"), fullPage: true });

  // dump buttons on the QA step
  const btns = await page.evaluate(() => Array.from(document.querySelectorAll("button")).map((b) => b.textContent.trim().slice(0, 30)).filter(Boolean));
  log("buttons:", JSON.stringify(btns));
  await browser.close();
})().catch((e) => { console.error("FATAL", e.message); process.exit(1); });
