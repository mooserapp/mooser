// A tiny JSON store in the app's data folder (state.json). Writes are atomic: a temp file, then a
// rename, so a crash never leaves half a file.
const { app } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

let cache = null;
const file = () => path.join(app.getPath("userData"), "state.json");

function read() {
  if (cache) return cache;
  try { cache = JSON.parse(fs.readFileSync(file(), "utf8")); } catch { cache = {}; }
  return cache;
}

let timer = null;
function flush() {
  timer = null;
  fs.mkdirSync(path.dirname(file()), { recursive: true });
  const tmp = `${file()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(cache, null, 2));
  fs.renameSync(tmp, file());
}

module.exports = {
  get: (key) => read()[key],
  set: (key, value) => {
    read()[key] = value;
    if (!timer) timer = setTimeout(flush, 250);
  },
  flush: () => { if (timer) { clearTimeout(timer); flush(); } },
};
app.on("before-quit", () => module.exports.flush());
