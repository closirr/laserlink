/* LASERLINK — minimal node harness to debug combat (node tools/debug1.js) */
"use strict";
const fs = require("fs");
const vm = require("vm");

const sandbox = {
  console, Math, JSON, performance: { now: () => Date.now() },
  setTimeout, clearTimeout, setInterval, clearInterval,
  document: undefined, window: undefined,
  localStorage: { getItem: () => null, setItem: () => {} },
};
const ctx = vm.createContext(sandbox);
// stubs the game code expects
vm.runInContext(`
  var Snd = { init(){}, resume(){}, setMuted(){}, laser(){}, tone(){}, noise(){}, click(){}, place(){}, sell(){}, upgrade(){}, boost(){}, error(){}, boom(){}, coreHit(){}, horn(){}, win(){}, lose(){} };
  var UI = { toast(){}, refreshPalette(){}, refreshTowerPanel(){}, updateHUD(){} };
  var Save = { data:{}, completeLevel(){}, setEndlessBest(){}, starsFor(){ return 0; } };
`, ctx);
for (const f of ["js/util.js", "js/data.js", "js/flowfield.js", "js/entities.js", "js/game.js"]) {
  vm.runInContext(fs.readFileSync(f, "utf8"), ctx, { filename: f });
}

const out = vm.runInContext(`
  (function () {
    const g = new Game(0);
    // place two lasers near the path manually
    const spots = [];
    for (let r = 0; r < CFG.ROWS; r++) for (let c = 0; c < CFG.COLS; c++) {
      const fd = g.flow.at(c, r);
      if (fd >= 1 && fd <= 4 && g.canPlace("laser", c, r)) spots.push({ c, r, fd });
    }
    spots.sort((a, b) => a.fd - b.fd);
    console.log("laser spots:", JSON.stringify(spots.slice(0, 6)));
    g.place("laser", spots[0].c, spots[0].r);
    g.place("laser", spots[1].c, spots[1].r);
    g.energy = 99999;
    g.callWave(true);
    let simT = 0; const dt = 1 / 60;
    let lastLog = 0;
    while (simT < 180 && g.state === "wave") {
      g.update(dt);
      simT += dt;
      if (simT - lastLog > 10) {
        lastLog = simT;
        const e0 = g.enemies[0];
        console.log(
          "t=" + simT.toFixed(0) +
          " enemies=" + g.enemies.length +
          " pending=" + g.pending.length +
          (e0 ? " e0=(" + e0.x.toFixed(0) + "," + e0.y.toFixed(0) + ") hp=" + e0.hp.toFixed(0) + " flow=" + g.flow.at(Math.floor(e0.x / CELL), Math.floor(e0.y / CELL)) : "") +
          " kills=" + g.kills + " core=" + g.coreHp
        );
      }
    }
    return JSON.stringify({ state: g.state, wave: g.wave, kills: g.kills, coreHp: g.coreHp, simT: simT.toFixed(0) });
  })()
`, ctx);
console.log("RESULT:", out);
