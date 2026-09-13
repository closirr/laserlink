/* CrazyGames: single-session complete flow (node tools/cg-one-session.js) */
"use strict";
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const EMAIL = "lldev54380@uberip.com";
const PASS = "LaserLink2026xq";
const ROOT = path.resolve(__dirname, "..");
const GAME_URL = "https://developer.crazygames.com/games/ee01e051-d436-4c07-b93a-1128e10d9e69";

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
  await page.fill("input[type=text]", "LASERLINK");
  log("name set");
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll("button")).find((x) => /go to qa/i.test(x.textContent));
    if (b) b.click();
  });
  await page.waitForTimeout(20000);

  // click PLAY inside the game embed
  await page.mouse.click(455, 305);
  await page.waitForTimeout(6000);
  // click visible Continue
  const cb = await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll("button")).filter((x) => /^continue$/i.test(x.textContent.trim()) && x.offsetParent);
    if (!b.length) return null;
    const r = b[b.length - 1].getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  log("continue at:", JSON.stringify(cb));
  if (cb) await page.mouse.click(cb.x, cb.y);
  await page.waitForTimeout(12000);
  log("url now:", page.url().slice(0, 90));
  log("page:", (await page.evaluate(() => document.body.innerText.slice(0, 900))).replace(/\n+/g, " | ").slice(0, 850));
  await page.screenshot({ path: path.join(ROOT, "output", "cg-one-session.png"), fullPage: true });

  // dump any form controls for the next step
  const ctrls = await page.evaluate(() =>
    Array.from(document.querySelectorAll("input, textarea, select")).map((i) => i.tagName + ":" + i.type + ":" + (i.name || "") + ":" + (i.placeholder || "").slice(0, 30))
  );
  log("controls:", JSON.stringify(ctrls.slice(0, 20)));
  const btns = await page.evaluate(() => Array.from(document.querySelectorAll("button")).map((b) => b.textContent.trim().slice(0, 30)).filter(Boolean));
  log("buttons:", JSON.stringify(btns.slice(0, 20)));
  await browser.close();
})().catch((e) => { console.error("FATAL", e.message); process.exit(1); });
