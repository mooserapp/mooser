// Copies the screenshots and artwork the website uses into site/img, as JPEG so the page stays light.
// The feature pictures are crops of the macOS screenshots (2880×1694): just the panel each text is
// about, so it can be read.
// macOS only (uses sips). Run after npm run screenshots: npm run site:images
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "site", "img");
fs.mkdirSync(OUT, { recursive: true });
const sips = (...args) => execFileSync("sips", args, { stdio: "ignore" });

function jpeg(from, to, width, crop) {
  let src = path.join(ROOT, from);
  if (crop) {
    const [x, y, w, h] = crop, tmp = path.join(os.tmpdir(), `mooser-site-${to}.png`);
    sips("-c", String(h), String(w), "--cropOffset", String(y), String(x), src, "--out", tmp);
    src = tmp;
  }
  sips("-s", "format", "jpeg", "-s", "formatOptions", "82", "--resampleWidth", String(width), src, "--out", path.join(OUT, to));
  console.log(`site/img/${to}  ${Math.round(fs.statSync(path.join(OUT, to)).size / 1024)} KB`);
}

const SHOTS = "docs/images/macos";
jpeg(`${SHOTS}/workspace.png`, "workspace.jpg", 1800); // link previews
// [x, y, width, height] of the side panel, or of the Settings window below its title bar (which
// shows the screenshot's temporary folder). Each in Spanish and English.
for (const sfx of ["", "-en"]) {
  jpeg(`${SHOTS}/usage${sfx}.png`, `usage${sfx}.jpg`, 820, [2054, 134, 820, 1000]);
  jpeg(`${SHOTS}/workspace${sfx}.png`, `kit${sfx}.jpg`, 820, [2054, 134, 820, 1300]);
  jpeg(`${SHOTS}/explorer${sfx}.png`, `explorer${sfx}.jpg`, 820, [2054, 134, 820, 1300]);
  jpeg(`${SHOTS}/settings${sfx}.png`, `settings${sfx}.jpg`, 1400, [540, 285, 1800, 1200]);
}
jpeg("assets/background.jpg", "background.jpg", 1920);
fs.copyFileSync(path.join(ROOT, "assets", "icon.png"), path.join(OUT, "icon.png"));
console.log("site/img/icon.png");
