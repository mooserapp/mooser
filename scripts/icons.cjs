// Renders assets/logo.svg into the app icons with Electron itself (no extra tools):
//   build/icon.png (1024), build/icon.ico (Windows), build/icon.icns (macOS), assets/icon.png (256).
// Run: npx electron scripts/icons.cjs
const { app, BrowserWindow } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const svg = fs.readFileSync(path.join(ROOT, "assets", "logo.svg"), "utf8");

async function render(win, size) {
  const html = `<html><body style="margin:0;background:transparent">${svg.replace("<svg ", `<svg width="${size}" height="${size}" `)}</body></html>`;
  win.setContentSize(size, size);
  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  await new Promise((r) => setTimeout(r, 150));
  const img = await win.webContents.capturePage({ x: 0, y: 0, width: size, height: size });
  return img.resize({ width: size, height: size, quality: "best" }).toPNG();
}

function ico(pngs) {
  const head = Buffer.alloc(6 + 16 * pngs.length);
  head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(pngs.length, 4);
  let offset = head.length;
  pngs.forEach(([size, buf], i) => {
    const e = 6 + 16 * i;
    head.writeUInt8(size >= 256 ? 0 : size, e); head.writeUInt8(size >= 256 ? 0 : size, e + 1);
    head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6);
    head.writeUInt32LE(buf.length, e + 8); head.writeUInt32LE(offset, e + 12);
    offset += buf.length;
  });
  return Buffer.concat([head, ...pngs.map(([, b]) => b)]);
}

function icns(entries) {
  const chunks = entries.map(([type, buf]) => { const h = Buffer.alloc(8); h.write(type, 0, "ascii"); h.writeUInt32BE(buf.length + 8, 4); return Buffer.concat([h, buf]); });
  const body = Buffer.concat(chunks), h = Buffer.alloc(8);
  h.write("icns", 0, "ascii"); h.writeUInt32BE(body.length + 8, 4);
  return Buffer.concat([h, body]);
}

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, transparent: true, frame: false, useContentSize: true, webPreferences: { offscreen: true } });
  const sizes = [16, 24, 32, 48, 64, 128, 256, 512, 1024], png = {};
  for (const s of sizes) png[s] = await render(win, s);
  fs.mkdirSync(path.join(ROOT, "build"), { recursive: true });
  fs.writeFileSync(path.join(ROOT, "build", "icon.png"), png[1024]);
  fs.writeFileSync(path.join(ROOT, "assets", "icon.png"), png[256]);
  fs.writeFileSync(path.join(ROOT, "build", "icon.ico"), ico([16, 24, 32, 48, 64, 128, 256].map((s) => [s, png[s]])));
  fs.writeFileSync(path.join(ROOT, "build", "icon.icns"), icns([["icp4", png[16]], ["icp5", png[32]], ["icp6", png[64]], ["ic07", png[128]], ["ic08", png[256]], ["ic09", png[512]], ["ic10", png[1024]]]));
  console.log("icons written");
  app.quit();
}).catch((e) => { console.error("FAILED", e); app.exit(1); });
