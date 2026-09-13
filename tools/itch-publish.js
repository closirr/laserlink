/* LASERLINK — full itch.io publish flow v2 (node tools/itch-publish.js) */
"use strict";
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const OLD = JSON.parse(fs.readFileSync(__dirname + "/../output/itch-creds.json", "utf8"));
const ROOT = path.resolve(__dirname, "..");
const ZIP = path.join(ROOT, "laserlink-v1.0.zip");
const COVER = path.join(ROOT, "output", "cover.png");

const TITLE = "LASERLINK";
const TAGLINE = "Chain the beams. Break the swarm.";
const DESCRIPTION =
  "<p><b>LASERLINK</b> is a neon tower-defense with a twist: your Prisms don't shoot — they <b>beam power into your Lasers</b>. " +
  "Each Prism in a chain multiplies the laser's damage, and a 4-prism superlaser pierces whole rows of monsters.</p>" +
  "<ul><li>Chain Prisms → Prisms → Lasers to build piercing superweapons</li>" +
  "<li>Maze the swarm with walls — they chew through if you seal them in</li>" +
  "<li>Expand your power grid with Pylons to harvest distant crystals</li>" +
  "<li>7 buildings, 6 enemy types, bosses every 5th wave</li>" +
  "<li>20 hand-crafted campaign levels + endless arena</li></ul>" +
  '<p>Open source: <a href="https://github.com/closirr/laserlink" rel="nofollow">github.com/closirr/laserlink</a></p>';

async function login(page) {
  await page.goto("https://itch.io/login", { waitUntil: "domcontentloaded" });
  try { await page.waitForSelector('input[name="username"]', { timeout: 40000 }); } catch (e) {}
  await page.fill('input[name="username"]', OLD.USERNAME);
  await page.fill('input[name="password"]', OLD.PASSWORD);
  await page.click('.buttons .button, button:has-text("Log in")').catch(() => {});
  await page.waitForTimeout(3000);
}

(async () => {
  const browser = await chromium.launch({ headless: false, args: ["--disable-blink-features=AutomationControlled"] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const log = (...a) => console.log(...a);

  await login(page);
  await page.goto("https://itch.io/game/new", { waitUntil: "networkidle" }).catch(() => {});
  await page.waitForTimeout(3000);

  // --- basics ---
  await page.fill('input[name="game[title]"]', TITLE);
  await page.fill('input[name="game[short_text]"]', TAGLINE).catch(() => log("tagline skip"));

  // --- upload zip FIRST (default kind binds the uploader reliably) ---
  const uploadBtn = await page.$('button:has-text("Upload files")');
  if (!uploadBtn) throw new Error("no upload button");
  const [c2] = await Promise.all([page.waitForEvent("filechooser", { timeout: 20000 }), uploadBtn.click()]);
  await c2.setFiles(ZIP);
  log("zip attaching...");
  await page.waitForFunction(() => /Success/i.test(document.body.innerText), null, { timeout: 240000 });
  log("zip uploaded (Success)");
  await page.waitForTimeout(2500);

  // --- kind of project: HTML via selectize (after upload; itch converts the row) ---
  await page.evaluate(() => {
    const el = document.querySelector('select[name="game[type]"]');
    const inst = el && (el.selectize || (window.jQuery && window.jQuery(el).data("selectize")));
    inst.setValue("html");
  });
  await page.waitForTimeout(2500);
  log("kind = html");

  // --- cover ---
  const coverBtn = await page.$('#cover_image_upload_widget button, button:has-text("Upload Cover Image")');
  if (coverBtn) {
    const [c1] = await Promise.all([page.waitForEvent("filechooser", { timeout: 15000 }), coverBtn.click()]);
    await c1.setFiles(COVER);
    log("cover set");
    await page.waitForTimeout(3000);
  }

  // --- HTML options ---
  const optLog = await page.evaluate(() => {
    const out = [];
    const set = (name, val) => {
      const el = document.querySelector(`input[name="${name}"]`);
      if (!el) return name + ":missing";
      el.value = val;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      return name + ":ok";
    };
    out.push(set("game[viewport_width]", "1152"));
    out.push(set("game[viewport_height]", "672"));
    const check = (name) => {
      const el = document.querySelector(`input[name="${name}"]`);
      if (!el) return name + ":missing";
      if (!el.checked) el.click();
      return name + ":" + el.checked;
    };
    out.push(check("game[fullscreen]"));
    out.push(check("game[smartphone_friendly]"));
    out.push(check("game[mobile_friendly]"));
    return out.join(" ");
  });
  log("html options:", optLog);

  // --- description ---
  await page.evaluate((d) => {
    const t = document.querySelector('textarea[name="game[description]"]');
    if (t) { t.value = d; t.dispatchEvent(new Event("input", { bubbles: true })); }
  }, DESCRIPTION);
  log("description set");

  // --- genre via selectize ---
  const genre = await page.evaluate(() => {
    const el = document.querySelector('select[name="game[genre]"]');
    const inst = el && (el.selectize || (window.jQuery && window.jQuery(el).data("selectize")));
    if (!inst) return "no-inst";
    const hit = Object.entries(inst.options).find(([k, v]) => /action/i.test(v.text || k));
    if (hit) { inst.setValue(hit[0]); return "set:" + hit[0]; }
    return "no-option";
  });
  log("genre:", genre);

  // --- tags ---
  const tagInput = await page.$('.tag_input, input[placeholder*="custom tag"]');
  if (tagInput) {
    for (const tag of ["tower defense", "lasers", "strategy", "waves"]) {
      await tagInput.type(tag);
      await page.keyboard.press("Enter");
      await page.waitForTimeout(350);
    }
    log("tags added");
  }

  // --- AI disclosure: No ---
  const ai = await page.evaluate(() => {
    const radios = Array.from(document.querySelectorAll('input[type="radio"]')).filter((r) => /ai|generative/i.test(r.name));
    if (!radios.length) return "none";
    const no = radios.find((r) => /no/i.test(r.value)) || radios[1] || radios[0];
    no.click();
    return "clicked " + no.name + "=" + no.value;
  });
  log("ai disclosure:", ai);

  // --- pricing: No payments ---
  const price = await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('input[type="radio"], input[type="checkbox"]')).find((i) => /payment/i.test(i.name) && /none|free/i.test(i.value));
    if (el) { el.click(); return "clicked " + el.name; }
    const lbl = Array.from(document.querySelectorAll("label")).find((l) => /no payments/i.test(l.textContent));
    if (lbl) { lbl.click(); return "label clicked"; }
    return "skip";
  });
  log("pricing:", price);

  await page.screenshot({ path: path.join(ROOT, "output", "itch-publish-filled.png"), fullPage: true });

  // --- save & view page ---
  await page.click('button:has-text("Save & view page")');
  await page.waitForTimeout(6000);
  log("after save url:", page.url());

  // --- publish draft ---
  const pub = await page.$('.publish_row a:has-text("Publish"), a:has-text("Publish"), button:has-text("Publish")');
  if (pub) {
    await pub.click().catch((e) => log("publish click:", e.message.slice(0, 60)));
    await page.waitForTimeout(3000);
    const confirm = await page.$('button:has-text("Yes, publish"), button:has-text("Publish")');
    if (confirm) { await confirm.click().catch(() => {}); await page.waitForTimeout(5000); }
    log("after publish url:", page.url());
  } else {
    log("no publish button found (maybe already public)");
  }

  log("final page:", (await page.evaluate(() => document.body.innerText.slice(0, 250))).replace(/\n+/g, " | "));
  await page.screenshot({ path: path.join(ROOT, "output", "itch-final.png"), fullPage: true });
  await browser.close();
})().catch((e) => { console.error("FATAL", e.message); process.exit(1); });
