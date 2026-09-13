/* LASERLINK — create itch.io project and upload the game (node tools/itch-upload.js) */
"use strict";
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const OLD = JSON.parse(fs.readFileSync(__dirname + "/../output/itch-creds.json", "utf8"));
const ROOT = path.resolve(__dirname, "..");
const ZIP = path.join(ROOT, "laserlink-v1.0.zip");
const COVER = path.join(ROOT, "output", "cover.png");

const TITLE = "LASERLINK";
const SLUG = "laserlink";
const TAGLINE = "Chain the beams. Break the swarm.";
const DESCRIPTION = `<p><b>LASERLINK</b> is a neon tower-defense with a twist: your Prisms don't shoot — they <b>beam power into your Lasers</b>. Each Prism in a chain multiplies the laser's damage, and a 4-prism superlaser pierces whole columns of monsters.</p>
<ul>
<li>Chain Prisms → Prisms → Lasers to build piercing superweapons</li>
<li>Maze the swarm with walls — they chew through if you seal them in</li>
<li>Expand your power grid with Pylons to harvest distant crystals</li>
<li>7 buildings, 6 enemy types, bosses every 5th wave</li>
<li>20 hand-crafted campaign levels + endless arena</li>
</ul>
<p>Also playable at <a href="https://closirr.github.io/laserlink/" rel="nofollow">closirr.github.io/laserlink</a>. Open source: <a href="https://github.com/closirr/laserlink" rel="nofollow">github.com/closirr/laserlink</a></p>`;

(async () => {
  const browser = await chromium.launch({ headless: false, args: ["--disable-blink-features=AutomationControlled"] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  await page.goto("https://itch.io/login", { waitUntil: "domcontentloaded" });
  try { await page.waitForSelector('input[name="username"]', { timeout: 40000 }); } catch (e) {}
  await page.fill('input[name="username"]', OLD.USERNAME).catch(() => {});
  await page.fill('input[name="password"]', OLD.PASSWORD).catch(() => {});
  await page.click('.buttons .button, button:has-text("Log in")').catch(() => {});
  await page.waitForTimeout(3000);

  await page.goto("https://itch.io/game/new", { waitUntil: "domcontentloaded" });
  try { await page.waitForSelector('input[name="game[title]"]', { timeout: 40000 }); } catch (e) {}
  await page.waitForTimeout(1000);

  // basics
  await page.fill('input[name="game[title]"]', TITLE);
  await page.fill('input[name="game[url]"]', SLUG).catch(() => console.log("url field skip"));
  await page.fill('input[name="game[short_text]"]', TAGLINE).catch(() => console.log("tagline skip"));

  // kind of project → HTML
  const kindSel = await page.$('select[name="game[kind]"]');
  if (kindSel) {
    await page.selectOption('select[name="game[kind]"]', "html");
    console.log("kind: html");
    await page.waitForTimeout(1500); // let the html options render
  }

  // cover image
  const coverBtn = await page.$('button:has-text("Upload Cover Image"), .upload_cover_image_widget .button');
  if (coverBtn) {
    const [chooser] = await Promise.all([
      page.waitForEvent("filechooser", { timeout: 10000 }),
      coverBtn.click(),
    ]).catch((e) => [null]) || [];
    if (chooser) { await chooser.setFiles(COVER); console.log("cover set"); await page.waitForTimeout(2500); }
  }

  // upload zip
  const uploadBtn = await page.$('button:has-text("Upload files")');
  if (!uploadBtn) { console.log("NO upload button!"); }
  const [chooser2] = await Promise.all([
    page.waitForEvent("filechooser", { timeout: 15000 }),
    uploadBtn.click(),
  ]);
  await chooser2.setFiles(ZIP);
  console.log("zip attached, uploading...");
  // wait for the upload to finish: the widget shows the file name when done
  await page.waitForSelector('.upload_widget .file_name, .uploads .upload .name', { timeout: 120000 }).catch(() => {});
  await page.waitForTimeout(4000);
  console.log("upload widget state:", (await page.evaluate(() => {
    const w = document.querySelector(".upload_widget, .uploads");
    return w ? w.innerText.replace(/\n+/g, " | ").slice(0, 200) : "not found";
  })));

  await page.screenshot({ path: "output/itch-upload-1.png", fullPage: true });
  console.log("STAGE1 DONE (zip attached, pre-fill)");
  fs.writeFileSync(__dirname + "/../output/itch-upload-stage.json", JSON.stringify({ stage: 1 }));
  await browser.close();
})().catch((e) => { console.error("FATAL", e.message); process.exit(1); });
