// Files for the Explorer panel: list, create, rename, move or copy (never overwriting) and send to
// the Recycle Bin / Trash. Everything goes through Node and Electron, so it is the same on Windows
// and macOS.
const fs = require("node:fs/promises");
const fss = require("node:fs");
const path = require("node:path");
const { shell } = require("electron");
const { execFile } = require("node:child_process");

const BAD = /[\\/:*?"<>|]/;

async function list(dir, hidden = false) {
  const real = path.resolve(dir);
  const entries = await fs.readdir(real, { withFileTypes: true });
  const items = [];
  for (const e of entries) {
    if (!hidden && e.name.startsWith(".")) continue;
    const full = path.join(real, e.name);
    let dirLike = e.isDirectory(), size = 0;
    if (e.isSymbolicLink()) { try { dirLike = (await fs.stat(full)).isDirectory(); } catch { /* broken link */ } }
    if (!dirLike) { try { size = (await fs.stat(full)).size; } catch { /* unreadable */ } }
    items.push({ name: e.name, dir: dirLike, size, git: dirLike && fss.existsSync(path.join(full, ".git")) });
  }
  items.sort((a, b) => (a.dir !== b.dir ? (a.dir ? -1 : 1) : a.git !== b.git ? (a.git ? -1 : 1) : a.name.localeCompare(b.name, undefined, { sensitivity: "base" })));
  return { cwd: real, parent: path.dirname(real) === real ? null : path.dirname(real), items };
}

async function mkdir(dir, name) {
  if (!name || BAD.test(name)) throw new Error('El nombre no puede llevar \\ / : * ? " < > |');
  const p = path.join(dir, name);
  if (fss.existsSync(p)) throw new Error("Ya existe algo con ese nombre");
  await fs.mkdir(p);
  return { ok: true, path: p };
}

async function rename(from, name) {
  if (!name || BAD.test(name)) throw new Error('El nombre no puede llevar \\ / : * ? " < > |');
  const to = path.join(path.dirname(from), name);
  if (fss.existsSync(to)) throw new Error("Ya existe algo con ese nombre");
  await fs.rename(from, to);
  return { ok: true, path: to };
}

async function transfer(op, paths, dest) {
  for (const p of paths) if (fss.existsSync(path.join(dest, path.basename(p)))) throw new Error(`Ya existe en el destino: ${path.basename(p)}`);
  for (const p of paths) {
    const to = path.join(dest, path.basename(p));
    if (op === "move") { try { await fs.rename(p, to); } catch { await fs.cp(p, to, { recursive: true }); await fs.rm(p, { recursive: true, force: true }); } }
    else await fs.cp(p, to, { recursive: true, errorOnExist: true, force: false });
  }
  return { ok: true };
}

async function trash(paths) { for (const p of paths) await shell.trashItem(p); return { ok: true }; }

// VS Code when it is installed, else the system's default app.
function openInEditor(p) {
  return new Promise((resolve) => {
    const cmd = process.platform === "win32" ? "code.cmd" : "code";
    execFile(cmd, [p], { shell: process.platform === "win32", windowsHide: true }, (err) => {
      if (err) shell.openPath(p).then(() => resolve({ ok: true, app: "system" }));
      else resolve({ ok: true, app: "code" });
    });
  });
}

module.exports = { list, mkdir, rename, transfer, trash, openInEditor };
