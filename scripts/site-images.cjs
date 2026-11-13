// Copies the screenshots and artwork the website uses into site/img, as JPEG so the page stays light.
// The hero mosaic uses whole windows from both systems; the feature pictures are crops of the macOS
// screenshots (2880×1694), just the panel each text is about, so it can be read.
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
// [x, y, width, height] of the side panel or the Settings window.
jpeg(`${SHOTS}/usage.png`, "usage.jpg", 820, [2054, 134, 820, 1000]);
jpeg(`${SHOTS}/workspace.png`, "kit.jpg", 820, [2054, 134, 820, 1300]);
jpeg(`${SHOTS}/explorer.png`, "explorer.jpg", 820, [2054, 134, 820, 1300]);
jpeg(`${SHOTS}/settings.png`, "settings.jpg", 1400, [540, 205, 1800, 1280]);
// The hero's mosaic: whole windows, small.
for (const sys of ["macos", "windows"]) for (const name of ["workspace", "usage", "explorer", "settings", "welcome"]) jpeg(`docs/images/${sys}/${name}.png`, `t-${sys}-${name}.jpg`, 720);
jpeg("assets/background.jpg", "background.jpg", 1920);
fs.copyFileSync(path.join(ROOT, "assets", "icon.png"), path.join(OUT, "icon.png"));
console.log("site/img/icon.png");
