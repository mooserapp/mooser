// Mooser main process: the window, the terminals (node-pty), and the bridges the panels use
// (files, Claude Code's own configuration, SSH servers, plan usage). Everything the renderer can
// do goes through the IPC handlers below; the renderer has no Node access.
const { app, BrowserWindow, ipcMain, dialog, shell, Notification, nativeTheme } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");

const terminals = require("./terminals");
const files = require("./files");
const kit = require("./kit");
const ssh = require("./ssh");
const usage = require("./usage");
const store = require("./store");
const config = require("./config");

config.registerScheme();

const isMac = process.platform === "darwin";
// The few texts the main process shows itself (system dialogs), in the chosen language.
const english = () => { const l = config.read().settings.language; return l === "en" || (l !== "es" && !app.getLocale().toLowerCase().startsWith("es")); };
const say = (es, en) => (english() ? en : es);
let win = null;

function createWindow() {
  const bounds = store.get("window") ?? { width: 1440, height: 900 };
  win = new BrowserWindow({
    ...bounds,
    minWidth: 760, minHeight: 480,
    show: false,
    backgroundColor: "#0b1a30",
    title: "Mooser",
    icon: path.join(__dirname, "..", "..", "assets", "icon.png"),
    // The layout draws its own title bar: macOS keeps its traffic lights over it.
    frame: isMac,
    titleBarStyle: isMac ? "hiddenInset" : undefined,
    trafficLightPosition: isMac ? { x: 18, y: 20 } : undefined,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  if (bounds.maximized) win.maximize();
  win.once("ready-to-show", () => win.show());
  win.loadFile(path.join(__dirname, "..", "renderer", "index.html"));
  if (process.argv.includes("--dev")) win.webContents.openDevTools({ mode: "detach" });

  const saveBounds = () => { if (!win.isDestroyed()) store.set("window", { ...win.getNormalBounds(), maximized: win.isMaximized() }); };
  win.on("resize", saveBounds); win.on("move", saveBounds);
  win.on("maximize", () => win.webContents.send("window:state", { maximized: true }));
  win.on("unmaximize", () => win.webContents.send("window:state", { maximized: false }));
  win.on("focus", () => win.webContents.send("window:focus", true));
  win.on("blur", () => win.webContents.send("window:focus", false));
  // Links clicked in terminals open in the browser, never inside the app.
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/i.test(url)) shell.openExternal(url); return { action: "deny" }; });
  win.webContents.on("will-navigate", (e) => e.preventDefault());

  terminals.attach(win);

  // Development aid: MOOSER_SHOT=<file.png> saves a picture of the window a few seconds after start
  // and prints the page's console errors.
  if (process.env.MOOSER_SHOT) {
    win.webContents.on("render-process-gone", (_e, d) => console.log("[gone]", JSON.stringify(d)));
    win.webContents.on("did-start-navigation", (d) => console.log("[nav]", d.url));
    win.webContents.on("console-message", (e) => { console.log(`[page ${e.level}] ${e.message} (${e.sourceId}:${e.lineNumber})`); });
    if (process.env.MOOSER_JS) setTimeout(() => win.webContents.executeJavaScript(process.env.MOOSER_JS).catch((e) => console.log("js failed", e)), Number(process.env.MOOSER_JS_AT || 3000));
    setTimeout(async () => { const img = await win.webContents.capturePage(); fs.writeFileSync(process.env.MOOSER_SHOT, img.toPNG()); console.log("shot saved"); if (process.env.MOOSER_QUIT) app.quit(); }, Number(process.env.MOOSER_WAIT || 5000));
  }
}

app.setName("Mooser");
// One Mooser at a time: opening it again brings the open window forward.
if (!process.env.MOOSER_SHOT && !app.requestSingleInstanceLock()) app.quit();
app.on("second-instance", () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });

app.whenReady().then(() => {
  nativeTheme.themeSource = "dark";
  config.ensure();
  config.serve();
  if (fs.existsSync(path.join(os.homedir(), ".claude"))) { try { installSkill(); } catch { /* not writable */ } }
  terminals.configure(() => config.read().settings);
  config.watch((changed) => win?.webContents.send("config:changed", changed));
  // npm run dev: saving the app's own page code reloads the window (terminals keep running).
  if (process.argv.includes("--dev")) {
    let t = null;
    fs.watch(path.join(__dirname, "..", "renderer"), { recursive: true }, () => { clearTimeout(t); t = setTimeout(() => win?.webContents.reloadIgnoringCache(), 200); });
  }
  createWindow();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on("window-all-closed", () => { terminals.killAll(); if (!isMac) app.quit(); });
app.on("before-quit", () => terminals.killAll());

// ---------- IPC ----------
const handle = (name, fn) => ipcMain.handle(name, async (_e, ...args) => {
  try { return await fn(...args); } catch (err) { return { error: String(err?.message ?? err) }; }
});

// App and window
handle("app:info", () => ({ platform: process.platform, home: os.homedir(), version: app.getVersion(), userData: app.getPath("userData") }));
handle("window:minimize", () => win?.minimize());
handle("window:maximize", () => (win?.isMaximized() ? win.unmaximize() : win?.maximize()));
handle("window:close", () => win?.close());
handle("state:load", () => store.get("workspace"));
handle("state:save", (data) => { store.set("workspace", data); return true; });
handle("notify", ({ title, body, silent }) => {
  if (!Notification.isSupported()) return false;
  const n = new Notification({ title, body, silent: Boolean(silent), icon: path.join(__dirname, "..", "..", "assets", "icon.png") });
  n.on("click", () => { win?.show(); win?.focus(); });
  n.show();
  return true;
});
handle("dialog:folder", async (title) => {
  const r = await dialog.showOpenDialog(win, { title: title || say("Elige una carpeta", "Choose a folder"), properties: ["openDirectory", "createDirectory"] });
  return r.canceled ? null : r.filePaths[0];
});
handle("dialog:files", async (title) => {
  const r = await dialog.showOpenDialog(win, { title: title || say("Elige archivos", "Choose files"), properties: ["openFile", "multiSelections"] });
  return r.canceled ? [] : r.filePaths;
});
handle("shell:open", (p) => shell.openPath(p));
handle("shell:reveal", (p) => { shell.showItemInFolder(p); return true; });
handle("shell:external", (url) => (/^https?:/i.test(url) ? shell.openExternal(url) : null));
handle("shell:editor", (p) => files.openInEditor(p));

// Terminals
handle("term:create", (opts) => terminals.create(opts));
handle("term:write", (id, data) => terminals.write(id, data));
handle("term:resize", (id, cols, rows) => terminals.resize(id, cols, rows));
handle("term:kill", (id) => terminals.kill(id));
handle("term:list", () => terminals.list());
handle("term:focus", (id) => terminals.setFocused(id));

// Files
handle("fs:list", (dir, hidden) => files.list(dir, hidden));
handle("fs:mkdir", (dir, name) => files.mkdir(dir, name));
handle("fs:rename", (from, name) => files.rename(from, name));
handle("fs:transfer", (op, paths, dest) => files.transfer(op, paths, dest));
handle("fs:trash", (paths) => files.trash(paths));

// Claude Code kit
handle("kit:scan", () => kit.scan());
handle("kit:mcp", () => kit.mcp());
handle("kit:set", (key, value) => kit.set(key, value));
handle("kit:toggle", (kind, p) => kit.toggle(kind, p));
handle("kit:create", (kind, name, description) => kit.create(kind, name, description));
handle("kit:claude", (args) => kit.claude(args));

// SSH servers
handle("ssh:load", () => ssh.load());
handle("ssh:save", (host, password, forget) => ssh.save(host, password, forget));
handle("ssh:remove", (id) => ssh.remove(id));
handle("ssh:groups", (groups) => ssh.saveGroups(groups));
handle("ssh:probe", (id) => ssh.probe(id));
handle("ssh:list", (id, dir) => ssh.list(id, dir));
handle("ssh:connectSpec", (id) => ssh.connectSpec(id));
handle("ssh:transferSpec", (from, paths, to, dir) => ssh.transferSpec(from, paths, to, dir));

// Plan usage
handle("usage:claude", () => usage.claude());

// Your Mooser folder: settings, custom.css, plugins
handle("config:get", () => ({ ...config.read(), dir: config.DIR, defaults: config.DEFAULTS, plugins: config.plugins() }));
handle("config:set", (patch) => config.update(patch));
handle("config:open", () => shell.openPath(config.DIR));
handle("config:background", async () => {
  const r = await dialog.showOpenDialog(win, { title: say("Imagen de fondo", "Background image"), properties: ["openFile"], filters: [{ name: say("Imágenes", "Images"), extensions: ["jpg", "jpeg", "png", "webp", "gif"] }] });
  return r.canceled ? null : config.importBackground(r.filePaths[0]);
});
handle("config:reload", () => { win?.webContents.reloadIgnoringCache(); return true; });
// The "mooser" skill for Claude Code: teaches any Claude Code session how to change Mooser.
const SKILL_DIR = path.join(os.homedir(), ".claude", "skills", "mooser");
handle("config:skillInstalled", () => fs.existsSync(path.join(SKILL_DIR, "SKILL.md")));
handle("config:installSkill", () => installSkill());
function installSkill() {
  fs.mkdirSync(SKILL_DIR, { recursive: true });
  const guide = fs.readFileSync(path.join(__dirname, "..", "..", "docs", "CUSTOMIZE.md"), "utf8").replace(/^#.*\r?\n/, "");
  fs.writeFileSync(path.join(SKILL_DIR, "SKILL.md"), `---
name: mooser
description: "Customize the Mooser app (terminals and AI agents workspace): its theme, colors, layout, settings, styles and features via plugins. Use when the user asks to change how Mooser looks or works, add a Mooser feature, panel, command or status item, or when running inside Mooser (TERM_PROGRAM=Mooser)."
---

# Mooser
${guide}`);
  return { ok: true };
}
// Plugins run a program and get its output (plugins are your own trusted code).
handle("plugin:exec", (cmd, args = [], opts = {}) => new Promise((resolve) => {
  require("node:child_process").execFile(cmd, args, { cwd: opts.cwd || os.homedir(), timeout: Math.min(opts.timeout ?? 30000, 600000), windowsHide: true, shell: process.platform === "win32" && !/\.exe$/i.test(cmd) },
    (err, stdout, stderr) => resolve({ code: err ? (typeof err.code === "number" ? err.code : 1) : 0, stdout: String(stdout), stderr: String(stderr) }));
}));
