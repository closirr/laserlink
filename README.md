# LASERLINK — Defend the Core

A neon tower-defense web game with a unique twist: **chainable laser amplifiers**.
Place Prisms that beam energy into your Laser Turrets — each Prism in a chain multiplies
the laser's damage. Build Prism → Prism → Laser chains to forge piercing superweapons,
maze the swarm with walls, and expand your power grid to distant crystals.

Inspired by *Harvest: Massive Encounter* (energy economy + laser defenses) and classic
maze tower defense.

**Play:** https://laserlink-dev.itch.io/laserlink — or https://closirr.github.io/laserlink/

## Features
- 20 hand-crafted campaign levels + Endless Arena
- 7 buildings: Laser Turret, Prism, Wall, Extractor, Pylon, Frost Coil, Mortar
- Prism chain mechanic: up to ×6.6 damage, piercing beams at 3+ prisms
- 6 enemy types incl. armored Shells, swarms and bosses every 5th wave
- Energy economy: expand your power network with Pylons to reach rich crystals
- Star ratings, progress saving, 2× speed, mouse + touch, fullscreen, procedural sound

## Run / Test
```bash
node tools/server.js        # serve at http://localhost:8123
node tools/validate.js      # validate maps + print wave-budget table
node tools/balance.js 3     # autoplay-bot balance simulation (3 reps/level)
node tools/sim.js           # same, in headless chromium
```

## Tech
Vanilla JS + Canvas 2D, no build step, no external assets (procedural WebAudio sfx),
instant load — built for Poki/CrazyGames/itch.io HTML5 requirements. Test hooks:
`window.advanceTime(ms)`, `window.render_game_to_text()`, `?test=1` for deterministic
Playwright runs.

## Controls
Mouse/touch to build. Hotkeys 1-7 select buildings, Space calls the next wave / toggles
speed, Esc pauses, F fullscreen, S mutes sound.
