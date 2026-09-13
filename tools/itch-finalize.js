/* LASERLINK — finalize + publish the existing itch draft 5003791 (node tools/itch-finalize.js) */
"use strict";
const { chromium } = require("playwright");
const fs = require("fs");

const OLD = JSON.parse(fs.readFileSync(__dirname + "/../output/itch-creds.json", "utf8"));
const DESCRIPTION =
  "<p><b>LASERLINK</b> is a neon tower-defense with a twist: your Prisms don't shoot — they <b>beam power into your Lasers</b>. " +
  "Each Prism in a chain multiplies the laser's damage, and a 4-prism superlaser pierces whole rows of monsters.</p>" +
  "<ul><li>Chain Prisms → Prisms → Lasers to build piercing superweapons</li>" +
  "<li>Maze the swarm with walls — they chew through if you seal them in</li>" +
  "<li>Expand your power grid with Pylons to harvest distant crystals</li>" +
  "<li>7 buildings, 6 enemy types, bosses every 5th wave</li>" +
  "<li>20 hand-crafted campaign levels + endless arena</li></ul>" +
  '<p>Open source: <a href="https://github.com/closirr/laserlink" rel="nofollow">github.com/closirr/laserlink</a></p>';

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

  // --- kind = html ---
  await page.evaluate(() => {
    const el = document.querySelector('select[name="game[type]"]');
    const inst = el && (el.selectize || (window.jQuery && window.jQuery(el).data("selectize")));
    inst.setValue("html");
  });
  await page.waitForTimeout(2500);
  log("kind = html");

  // --- html options (viewport etc.) ---
  const optLog = await page.evaluate(() => {
    const out = [];
    const set = (sel, val) => {
      const el = document.querySelector(sel);
      if (!el) return sel + ":missing";
      el.value = val;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return sel.match(/\[([a-z_]+)\]/)[1] + ":ok";
    };
    out.push(set('input[name="game[viewport_width]"]', "1152"));
    out.push(set('input[name="game[viewport_height]"]', "672"));
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
  log("genre:", await page.evaluate(() => {
    const el = document.querySelector('select[name="game[genre]"]');
    const inst = el && (el.selectize || (window.jQuery && window.jQuery(el).data("selectize")));
    if (!inst) return "no-inst";
    const hit = Object.entries(inst.options).find(([k, v]) => /action/i.test(v.text || k));
    if (hit) { inst.setValue(hit[0]); return "set:" + hit[0]; }
    return "no-option:" + Object.keys(inst.options).join(",");
  }));

  // --- tags ---
  const tagInput = await page.$('input.tag_input, input[placeholder*="custom tag"]');
  if (tagInput) {
    for (const tag of ["tower defense", "lasers", "strategy", "waves"]) {
      await tagInput.type(tag);
      await page.keyboard.press("Enter");
      await page.waitForTimeout(400);
    }
    log("tags added");
  }

  // --- AI disclosure: No ---
  log("ai:", await page.evaluate(() => {
    const radios = Array.from(document.querySelectorAll('input[type="radio"]')).filter((r) => /ai|generative/i.test(r.name || ""));
    if (!radios.length) return "none";
    const no = radios.find((r) => /(^|_)no$/i.test(r.value) || /no/i.test(r.value)) || radios[1] || radios[0];
    no.click();
    return "clicked " + (no.name || "?") + "=" + no.value;
  }));

  // --- pricing: No payments ---
  log("pricing:", await page.evaluate(() => {
    const lbl = Array.from(document.querySelectorAll("label")).find((l) => /no payments/i.test(l.textContent));
    if (lbl) { lbl.click(); return "label clicked"; }
    return "skip";
  }));

  // --- community: comments (default) ---

  // --- save ---
  await page.click('button:has-text("Save")').catch(async () => {
    await page.click('.buttons .button:has-text("Save")').catch(() => {});
  });
  await page.waitForTimeout(6000);
  log("after save url:", page.url());
  log("save banner:", (await page.evaluate(() => {
    const b = document.querySelector(".text_error, .banner_error, .flash_box");
    return b ? b.innerText.slice(0, 120) : "(no errors)";
  })).replace(/\n+/g, " | "));

  // --- publish ---
  const pubLink = await page.$('a:has-text("Publish"), button:has-text("Publish")');
  if (pubLink) {
    await pubLink.click().catch((e) => log("publish click err:", e.message.slice(0, 60)));
    await page.waitForTimeout(3000);
    const confirm = await page.$('button:has-text("Yes, publish"), .buttons .button:has-text("publish")');
    if (confirm) { await confirm.click().catch(() => {}); await page.waitForTimeout(5000); }
    log("after publish url:", page.url());
  } else {
    log("no publish button — checking visibility radios");
  }
  log("final:", (await page.evaluate(() => document.body.innerText.slice(0, 200))).replace(/\n+/g, " | "));
  await page.screenshot({ path: __dirname + "/../output/itch-final.png", fullPage: true });
  await browser.close();
})().catch((e) => { console.error("FATAL", e.message); process.exit(1); });
