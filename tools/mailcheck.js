/* mail.tm inbox reader (node tools/mailcheck.js) — reads output/mail-creds.json */
"use strict";
const fs = require("fs");
const CREDS = JSON.parse(fs.readFileSync(__dirname + "/../output/mail-creds.json", "utf8"));

(async () => {
  const t = await (await fetch("https://api.mail.tm/token", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address: CREDS.address, password: CREDS.password }),
  })).json();
  console.log("token ok:", !!t.token);
  if (!t.token) process.exit(1);
  const msgs = await (await fetch("https://api.mail.tm/messages?page=1", {
    headers: { Authorization: "Bearer " + t.token },
  })).json();
  const list = msgs["hydra:member"] || [];
  console.log("messages:", list.length);
  for (const m of list) {
    console.log("-", m.from.address, "|", m.subject);
    const full = await (await fetch("https://api.mail.tm/messages/" + m.id, {
      headers: { Authorization: "Bearer " + t.token },
    })).json();
    const links = ((full.text || "") + (full.html || "")).match(/https:\/\/itch\.io[^ \r\n"<>]+/g) || [];
    if (links.length) console.log("LINKS:", links.join("\n"));
  }
})();
