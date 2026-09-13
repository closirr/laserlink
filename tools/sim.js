/* LASERLINK — run the autoplay bot across all levels in headless chromium (node tools/sim.js) */
"use strict";
const path = require("path");
const fs = require("fs");

function loadPlaywright() {
  const candidates = [
    "playwright",
    "C:/Users/closirr/AppData/Roaming/npm/node_modules/omniroute/node_modules/playwright",
    "C:/Users/closirr/AppData/Roaming/npm/node_modules/playwright",
  ];
  for (const c of candidates) {
    try { return require(c); } catch (e) { /* next */ }
  }
  throw new Error("playwright not found");
}

(async () => {
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

  const url = "file:///" + path.resolve(__dirname, "..", "index.html").replace(/\\/g, "/");
  await page.goto(url);
  await page.waitForTimeout(700);

  const res = [];
  const total = await page.evaluate(() => window.LL.LEVELS.length);
  for (let i = 0; i < total; i++) {
    const r = await page.evaluate((idx) => window.LL.Bot.play(idx), i);
    res.push(r);
    console.log(`sim L${i + 1}: ${r.outcome} wave ${r.wave} core ${r.corePct}%`);
  }
  res.push(await page.evaluate(() => window.LL.Bot.play(-1, { maxSim: 900 })));
  console.log("sim Endless done");

  console.log("lvl outcome  wave  corePct  kills  towers  simT   name");
  for (const r of res) {
    console.log(
      String(r.levelIdx === -1 ? "E" : r.levelIdx + 1).padStart(3) +
      "  " + String(r.outcome).padEnd(5) +
      "  " + String(r.wave).padStart(4) +
      "  " + String(r.corePct).padStart(5) + "% " +
      "  " + String(r.kills).padStart(5) +
      "  " + String(r.towers).padStart(5) +
      "  " + String(r.simT).padStart(5) + "s " +
      r.name
    );
  }
  fs.writeFileSync(path.join(__dirname, "sim-results.json"), JSON.stringify(res, null, 2));
  if (errors.length) {
    console.log("\nERRORS:");
    for (const e of errors.slice(0, 12)) console.log("  " + e);
  } else {
    console.log("\nno page errors");
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
