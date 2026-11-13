// electron-builder hook: after the app is assembled, make node-pty's spawn-helper executable inside
// it (app.asar.unpacked), so terminals start in the installed app on macOS and Linux.
const fs = require("node:fs");
const path = require("node:path");

exports.default = async function afterPack(context) {
  if (context.electronPlatformName === "win32") return;
  const resources = context.electronPlatformName === "darwin"
    ? path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`, "Contents", "Resources")
    : path.join(context.appOutDir, "resources");
  const base = path.join(resources, "app.asar.unpacked", "node_modules", "node-pty");
  const dirs = [path.join(base, "build", "Release")];
  try { for (const d of fs.readdirSync(path.join(base, "prebuilds"))) dirs.push(path.join(base, "prebuilds", d)); } catch { /* none */ }
  for (const d of dirs) {
    const f = path.join(d, "spawn-helper");
    if (fs.existsSync(f)) { fs.chmodSync(f, 0o755); console.log(`  • spawn-helper executable: ${path.relative(context.appOutDir, f)}`); }
  }
};
