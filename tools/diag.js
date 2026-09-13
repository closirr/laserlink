/* diag: find unexpected navigation */
const path = require("path");
const { chromium } = require("C:/Users/closirr/AppData/Roaming/npm/node_modules/omniroute/node_modules/playwright");
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on("framenavigated", (f) => console.log("NAV:", f.url()));
  page.on("pageerror", (e) => console.log("PAGEERROR:", String(e).slice(0, 300)));
  page.on("console", (m) => console.log("CONSOLE", m.type(), m.text().slice(0, 300)));
  const url = "file:///" + path.resolve(__dirname, "..", "index.html").split(path.sep).join("/");
  console.log("goto:", url);
  await page.goto(url);
  console.log("after goto:", page.url());
  await page.waitForTimeout(1500);
  console.log("after wait:", page.url());
  try {
    const t = await page.evaluate(() => ({ title: document.title, hasLL: !!window.LL, mode: window.LL ? window.LL.App.state : null }));
    console.log("evaluate OK:", JSON.stringify(t));
  } catch (e) {
    console.log("evaluate FAILED:", e.message.slice(0, 200));
  }
  await browser.close();
})().catch((e) => { console.error("FATAL", e.message); process.exit(1); });
