/* mail.tm full cycle test (node tools/mailtest2.js) */
"use strict";
(async () => {
  const domains = await (await fetch("https://api.mail.tm/domains")).json();
  const d = domains["hydra:member"][0].domain;
  const addr = "laserlink.dev" + Math.floor(Math.random() * 100000) + "@" + d;
  const password = "LaserLink2026xq";
  const r = await fetch("https://api.mail.tm/accounts", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address: addr, password }),
  });
  console.log("create:", r.status, addr);
  const t = await (await fetch("https://api.mail.tm/token", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address: addr, password }),
  })).json();
  console.log("login ok:", !!t.token);
  if (t.token) console.log("WORKS. addr=" + addr + " pass=" + password);
})();
