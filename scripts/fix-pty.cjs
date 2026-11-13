// node-pty 1.1.0 ships its macOS and Linux "spawn-helper" without the execute bit, so every
// terminal fails with "posix_spawnp failed". Runs after npm install / npm ci and makes it
// executable. Harmless on Windows (there is nothing to fix there).
const fs = require("node:fs");
const path = require("node:path");

function fix(root) {
  const base = path.join(root, "node_modules", "node-pty");
  const dirs = [path.join(base, "build", "Release")];
  try { for (const d of fs.readdirSync(path.join(base, "prebuilds"))) dirs.push(path.join(base, "prebuilds", d)); } catch { /* no prebuilds */ }
  let n = 0;
  for (const d of dirs) {
    const f = path.join(d, "spawn-helper");
    if (fs.existsSync(f)) { fs.chmodSync(f, 0o755); n++; }
  }
  return n;
}

module.exports = { fix };
if (require.main === module) {
  if (process.platform !== "win32") console.log(`node-pty: ${fix(path.join(__dirname, ".."))} spawn-helper made executable`);
}
