/* LASERLINK — debug frozen enemies on L3 (node tools/debug2.js) */
"use strict";
const fs = require("fs");
const vm = require("vm");

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
    const g = new Game(2);
    g.onWin = () => {}; g.onLose = () => {};
    let simT = 0; const dt = 1 / 60; let buildTick = 0;
    while (simT < 600 && g.state !== "won" && g.state !== "lost") {
      if (++buildTick % 30 === 0) Bot.spend(g);
      if (g.state === "build" && g.breakT < 4) g.callWave(true);
      g.update(dt);
      simT += dt;
    }
    console.log("state:", g.state, "wave:", g.wave, "kills:", g.kills, "simT:", simT.toFixed(0));
    console.log("towers:", g.towerList.map(t => t.key + "@" + t.c + "," + t.r + " hp" + Math.round(t.hp)).join(" | "));
    console.log("pending:", g.pending.length, "enemies:", g.enemies.length);
    for (const e of g.enemies) {
      const c = Math.floor(e.x / CELL), r = Math.floor(e.y / CELL);
      console.log("enemy", e.key, "pos", e.x.toFixed(1), e.y.toFixed(1), "cell", c, r,
        "fd", g.flow.at(c, r), "hp", e.hp.toFixed(0), "face", (e.face || 0).toFixed(2));
      // dump flow around
      let row = "";
      for (let dr = -1; dr <= 1; dr++) {
        row = "";
        for (let dc = -1; dc <= 1; dc++) {
          row += String(g.flow.at(c + dc, r + dr)).padStart(4);
        }
        console.log("   flow:", row);
      }
    }
  })()
`, ctx);
