/* LASERLINK — debug stuck level from argv (node tools/debug3.js <levelIdx>) */
"use strict";
const fs = require("fs");
const vm = require("vm");

const levelIdx = parseInt(process.argv[2] || "10", 10);
const sandbox = {
  console, Math, JSON, performance: { now: () => Date.now() },
  setTimeout, clearTimeout, setInterval, clearInterval,
  localStorage: { getItem: () => null, setItem: () => {} },
};
const ctx = vm.createContext(sandbox);
vm.runInContext(`
  var Snd = { init(){}, resume(){}, setMuted(){}, laser(){}, tone(){}, noise(){}, click(){}, place(){}, sell(){}, upgrade(){}, boost(){}, error(){}, boom(){}, coreHit(){}, horn(){}, win(){}, lose(){} };
  var UI = { toast(){}, refreshPalette(){}, refreshTowerPanel(){}, updateHUD(){} };
  var Save = { data:{}, completeLevel(){}, setEndlessBest(){}, starsFor(){ return 0; } };
`, ctx);
for (const f of ["js/util.js", "js/data.js", "js/flowfield.js", "js/entities.js", "js/game.js", "js/bot.js"]) {
  vm.runInContext(fs.readFileSync(f, "utf8"), ctx, { filename: f });
}

vm.runInContext(`
  (function () {
    const g = new Game(${levelIdx});
    g.onWin = () => {}; g.onLose = () => {};
    let simT = 0; const dt = 1 / 60; let buildTick = 0;
    let lastProgress = 0, lastKills = 0;
    while (simT < 700 && g.state !== "won" && g.state !== "lost") {
      if (++buildTick % 30 === 0) Bot.spend(g);
      if (g.state === "build" && g.breakT < 4) g.callWave(true);
      g.update(dt);
      simT += dt;
      if (g.kills !== lastKills) { lastKills = g.kills; lastProgress = simT; }
    }
    console.log("state:", g.state, "wave:", g.wave, "kills:", g.kills, "simT:", simT.toFixed(0),
      "lastProgress@", lastProgress.toFixed(0));
    console.log("enemies alive:", g.enemies.length, "pending:", g.pending.length);
    for (const e of g.enemies) {
      const c = Math.floor(e.x / CELL), r = Math.floor(e.y / CELL);
      console.log("enemy", e.key, "pos", e.x.toFixed(1), e.y.toFixed(1), "cell", c, r,
        "fd", g.flow.at(c, r), "hp", e.hp.toFixed(0), "face", (e.face || 0).toFixed(2),
        "slow", e.slowF.toFixed(2));
      for (let dr = -1; dr <= 1; dr++) {
        let row = "";
        for (let dc = -1; dc <= 1; dc++) row += String(g.flow.at(c + dc, r + dr)).padStart(4);
        console.log("   flow:", row);
      }
    }
    // nearest towers to first enemy
    const e0 = g.enemies[0];
    if (e0) {
      const near = g.towerList.map(t => ({ t, d: Math.hypot(t.x - e0.x, t.y - e0.y) }))
        .sort((a, b) => a.d - b.d).slice(0, 3);
      console.log("nearest towers to e0:", near.map(n => n.t.key + "@" + n.t.c + "," + n.t.r + " d=" + n.d.toFixed(0)).join(" | "));
    }
  })()
`, ctx);
