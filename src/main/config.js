// The person's own Mooser folder: ~/.mooser (or $MOOSER_HOME). Everything that makes Mooser yours
// lives here as plain files, so you, or Claude Code from any terminal, can change it:
//   settings.json   every setting (the Settings window writes the same file)
//   custom.css      your own styles, applied on top
//   plugins/<name>/main.js   your own features (commands, panels, status items...)
//   backgrounds/    images for the window background
//   AGENTS.md       how all of this works, written for coding agents
// The folder is watched: a saved change shows at once.
const { app, protocol, net } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { pathToFileURL } = require("node:url");

const DIR = process.env.MOOSER_HOME || path.join(os.homedir(), ".mooser");
const SETTINGS = path.join(DIR, "settings.json");

const DEFAULTS = {
  language: "auto",
  theme: "caustica",
  appearance: { accent: null, background: "preset", glass: 0.56, blur: 22, radius: 18, gap: 10, uiFontSize: 13, animations: true },
  terminal: { fontFamily: "", fontSize: 14, lineHeight: 1.15, cursorStyle: "block", cursorBlink: true, scrollback: 10000, shell: "", shellArgs: [], copyOnSelect: false },
  alerts: { sound: true, notifications: true, usageReset: true },
  agents: [
    { label: "Claude Code", command: "claude" },
    { label: "Codex", command: "codex" },
    { label: "Gemini CLI", command: "gemini" },
  ],
  panel: { default: "kit" },
  plugins: {},
};

const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);
function merge(base, over) {
  if (!isObj(base) || !isObj(over)) return over === undefined ? base : over;
  const out = { ...base };
  for (const [k, v] of Object.entries(over)) out[k] = isObj(v) && isObj(base[k]) ? merge(base[k], v) : v;
  return out;
}

function ensure() {
  fs.mkdirSync(path.join(DIR, "plugins"), { recursive: true });
  fs.mkdirSync(path.join(DIR, "backgrounds"), { recursive: true });
  if (!fs.existsSync(SETTINGS)) fs.writeFileSync(SETTINGS, JSON.stringify(DEFAULTS, null, 2) + "\n");
  const css = path.join(DIR, "custom.css");
  if (!fs.existsSync(css)) fs.writeFileSync(css, "/* Tus estilos para Mooser. Se aplican al guardar. Variables útiles en AGENTS.md. */\n");
  // The guide for agents is Mooser's: refreshed on every start so it matches this version.
  const guide = path.join(__dirname, "..", "..", "docs", "CUSTOMIZE.md");
  try { fs.writeFileSync(path.join(DIR, "AGENTS.md"), fs.readFileSync(guide, "utf8")); } catch { /* packaged without docs */ }
  const claude = path.join(DIR, "CLAUDE.md");
  if (!fs.existsSync(claude)) fs.writeFileSync(claude, "@AGENTS.md\n");
  const example = path.join(DIR, "plugins", "ejemplo");
  if (!fs.existsSync(example)) {
    fs.mkdirSync(example, { recursive: true });
    fs.writeFileSync(path.join(example, "main.js"), EXAMPLE);
  }
}

function read() {
  let user = {};
  try { user = JSON.parse(fs.readFileSync(SETTINGS, "utf8")); } catch (e) { return { settings: DEFAULTS, error: `settings.json no es JSON válido: ${e.message}` }; }
  return { settings: merge(DEFAULTS, user) };
}

// A change from the Settings window: merged into the file (keys you wrote by hand stay).
function update(patch) {
  let user = {};
  try { user = JSON.parse(fs.readFileSync(SETTINGS, "utf8")); } catch { /* start over */ }
  const next = merge(user, patch);
  fs.writeFileSync(SETTINGS, JSON.stringify(next, null, 2) + "\n");
  return read();
}

function plugins() {
  const dir = path.join(DIR, "plugins"), out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const main = path.join(dir, e.name, "main.js");
    if (!e.isDirectory() || !fs.existsSync(main)) continue;
    let about = "";
    try { about = (/^\/\/\s*(.+)$/m.exec(fs.readFileSync(main, "utf8"))?.[1] ?? "").trim(); } catch { /* unreadable */ }
    out.push({ name: e.name, about, mtime: fs.statSync(main).mtimeMs });
  }
  return out;
}

// Copies an image into backgrounds/ and returns its path inside the folder.
function importBackground(file) {
  const name = `${Date.now().toString(36)}${path.extname(file).toLowerCase()}`;
  fs.copyFileSync(file, path.join(DIR, "backgrounds", name));
  return `backgrounds/${name}`;
}

// mooser://config/<path> serves files from the folder (plugins, backgrounds, custom.css).
function registerScheme() {
  protocol.registerSchemesAsPrivileged([{ scheme: "mooser", privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }]);
}
function serve() {
  protocol.handle("mooser", (req) => {
    const u = new URL(req.url);
    const rel = decodeURIComponent(u.pathname).replace(/^\/+/, "");
    const full = path.resolve(DIR, rel);
    if (u.host !== "config" || !full.startsWith(path.resolve(DIR))) return new Response("no", { status: 403 });
    return net.fetch(pathToFileURL(full).toString());
  });
}

// Tells the window which files changed, a moment after the last change.
function watch(onChange) {
  let pending = new Set(), timer = null;
  try {
    fs.watch(DIR, { recursive: true }, (_ev, file) => {
      if (!file) return;
      pending.add(String(file).replace(/\\/g, "/"));
      clearTimeout(timer);
      timer = setTimeout(() => { const files = [...pending]; pending = new Set(); onChange(files); }, 150);
    });
  } catch { /* watching unsupported */ }
}

const EXAMPLE = `// Ejemplo: un comando en la paleta y un contador en la barra de estado.
// Actívalo en settings.json: "plugins": { "ejemplo": true }.
export default function activate(mooser) {
  mooser.commands.add({
    label: "Saludar desde un plugin",
    icon: "sparkles",
    run: () => mooser.ui.toast("Hola", "Este comando viene de ~/.mooser/plugins/ejemplo"),
  });
  mooser.statusBar.add(() => {
    const n = mooser.workspace.spaces().length;
    return mooser.ui.h("span", n === 1 ? "1 espacio" : n + " espacios");
  });
}
`;

module.exports = { DIR, DEFAULTS, ensure, read, update, plugins, importBackground, registerScheme, serve, watch };
