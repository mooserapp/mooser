// Terminals: one node-pty process each, streamed to the renderer in small batches. Also watches each
// terminal for coding agents (Claude Code, Codex, Gemini, ...) and works out their status:
//   working  the agent printed something in the last moment
//   blocked  it is asking you something (a bell, or a question it is known to ask)
//   done     it stopped working while you were looking at another terminal
//   idle     waiting for your next message
const pty = require("node-pty");
const os = require("node:os");
const fs = require("node:fs");
const path = require("node:path");

// node-pty 1.1.0 ships spawn-helper without the execute bit ("posix_spawnp failed" on macOS and
// Linux). The install and packaging steps fix it; this is the last resort, for a copy that missed them.
if (process.platform !== "win32") {
  try {
    const base = path.dirname(require.resolve("node-pty/package.json")).replace("app.asar", "app.asar.unpacked");
    for (const d of ["build/Release", ...fs.readdirSync(path.join(base, "prebuilds")).map((x) => `prebuilds/${x}`)]) {
      const f = path.join(base, d, "spawn-helper");
      if (fs.existsSync(f) && !(fs.statSync(f).mode & 0o111)) fs.chmodSync(f, 0o755);
    }
  } catch { /* read-only or not there: the packaging step already did it */ }
}

const AGENTS = {
  claude: "Claude Code", codex: "Codex", gemini: "Gemini CLI", aider: "Aider", opencode: "OpenCode",
  "cursor-agent": "Cursor Agent", copilot: "Copilot CLI", amp: "Amp", goose: "Goose", qwen: "Qwen Code", kiro: "Kiro",
};
const ASKS = /(do you want to|would you like to|\(y\/n\)|\[y\/n\]|allow (this|once|always)|❯\s*1\.\s*yes|press enter to|approve|permission)/i;
const QUIET_MS = 1500;

const all = new Map();
let win = null, focusedId = null;

let settings = () => ({});
const HISTORY = 256 * 1024; // what a terminal keeps of its recent output, for a window reload

function defaultShell() {
  const own = settings()?.terminal;
  if (own?.shell) return { file: which(own.shell), args: own.shellArgs ?? [] };
  if (process.platform === "win32") {
    // PowerShell 7 when it is there (also the Microsoft Store one, an app alias), else Windows PowerShell.
    const dirs = [...(process.env.PATH ?? "").split(path.delimiter), path.join(process.env.ProgramFiles ?? "C:\\Program Files", "PowerShell", "7")];
    const pwsh = dirs.filter(Boolean).map((d) => path.join(d, "pwsh.exe")).find((p) => fs.existsSync(p));
    return { file: pwsh ?? "powershell.exe", args: ["-NoLogo"] };
  }
  return { file: process.env.SHELL || "/bin/zsh", args: ["-l"] };
}

// node-pty on Windows wants the program's full path: find "node", "ssh", ... on the PATH.
function which(file) {
  if (process.platform !== "win32" || path.isAbsolute(file)) return file;
  const exts = path.extname(file) ? [""] : (process.env.PATHEXT ?? ".EXE;.CMD;.BAT").split(";");
  for (const dir of (process.env.PATH ?? "").split(path.delimiter).filter(Boolean)) {
    for (const ext of exts) { const p = path.join(dir, file + ext.toLowerCase()); if (fs.existsSync(p)) return p; }
  }
  return file;
}

const send = (channel, ...args) => { if (win && !win.isDestroyed()) win.webContents.send(channel, ...args); };
const strip = (s) => s.replace(/\x1b\][^\x07\x1b]*(\x07|\x1b\\)/g, "").replace(/\x1b\[[0-9;?]*[ -/]*[@-~]/g, "").replace(/\x1b[@-_]/g, "");

function publish(t) {
  const info = { id: t.id, agent: t.agent, status: t.status, title: t.title, cwd: t.cwd, exited: t.exited };
  const key = JSON.stringify(info);
  if (key !== t.lastInfo) { t.lastInfo = key; send("term:status", info); }
}

function setStatus(t, status) { if (t.status !== status) { t.status = status; publish(t); } }

function onOutput(t, data) {
  t.buffer += data;
  t.history += data;
  if (t.history.length > HISTORY * 1.25) t.history = t.history.slice(-HISTORY);
  if (!t.flushing) { t.flushing = true; setTimeout(() => { t.flushing = false; const b = t.buffer; t.buffer = ""; if (b) send("term:data", t.id, b); }, 8); }

  // The window title programs set (OSC 0/2): agents name themselves there.
  for (const m of data.matchAll(/\x1b\][02];([^\x07\x1b]*)(?:\x07|\x1b\\)/g)) {
    t.title = m[1].replace(/^[^\p{L}\p{N}]+/u, "").trim() || t.title;
    const hit = Object.entries(AGENTS).find(([k, n]) => new RegExp(`\\b(${k}|${n})\\b`, "i").test(m[1]));
    if (hit && !t.agent) t.agent = hit[1];
    publish(t);
  }
  if (!t.agent) return;
  const text = strip(data);
  t.tail = (t.tail + text).slice(-600);
  const bell = /\x07/.test(data.replace(/\x1b\][^\x07\x1b]*\x07/g, ""));
  if (bell || ASKS.test(t.tail.slice(-300))) { setStatus(t, "blocked"); t.tail = ""; return; }
  if (text.trim().length > 0 && t.status !== "blocked") {
    t.lastWork = Date.now();
    setStatus(t, "working");
  }
}

// Every half second: an agent that went quiet is idle (or done, if you weren't looking).
setInterval(() => {
  for (const t of all.values()) {
    if (!t.agent || t.status !== "working") continue;
    if (Date.now() - t.lastWork > QUIET_MS) setStatus(t, t.id === focusedId ? "idle" : "done");
  }
}, 500);

module.exports = {
  attach(w) { win = w; },
  configure(get) { settings = get; },

  create({ id, cwd, argv, name, env: extra, cols = 100, rows = 30 } = {}) {
    // Already running (the window was reloaded): hand back its recent output to draw again.
    if (id && all.has(id)) { const t = all.get(id); try { t.proc.resize(cols, rows); } catch { /* exited */ } return { ...module.exports.info(id), history: t.history }; }
    const sh = defaultShell();
    let dir = cwd && fs.existsSync(cwd) ? cwd : os.homedir();
    const file = argv?.length ? which(argv[0]) : sh.file, args = argv?.length ? argv.slice(1) : sh.args;
    const env = { ...process.env, TERM: "xterm-256color", COLORTERM: "truecolor", TERM_PROGRAM: "Mooser", MOOSER_HOME: require("./config").DIR, ...(extra ?? {}) };
    const proc = pty.spawn(file, args, { name: "xterm-256color", cols, rows, cwd: dir, env, useConpty: true });
    const t = {
      id: id ?? `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, proc, cwd: dir, title: name || path.basename(file),
      agent: argv?.length ? AGENTS[path.basename(argv[0]).replace(/\.(exe|cmd)$/i, "")] ?? null : null,
      status: "idle", lastWork: 0, tail: "", buffer: "", history: "", flushing: false, input: "", exited: false, lastInfo: "",
    };
    all.set(t.id, t);
    proc.onData((d) => onOutput(t, d));
    proc.onExit(({ exitCode }) => { t.exited = true; send("term:exit", t.id, exitCode); all.delete(t.id); });
    publish(t);
    return module.exports.info(t.id);
  },

  info(id) { const t = all.get(id); return t ? { id: t.id, agent: t.agent, status: t.status, title: t.title, cwd: t.cwd } : null; },
  list() { return [...all.keys()].map(module.exports.info); },

  write(id, data) {
    const t = all.get(id);
    if (!t) return false;
    t.proc.write(data);
    // What you type tells which agent you started ("claude", "codex ...").
    for (const ch of data) {
      if (ch === "\r") {
        const word = t.input.trim().split(/\s+/)[0]?.replace(/\.(exe|cmd)$/i, "");
        if (word && AGENTS[word]) { t.agent = AGENTS[word]; publish(t); }
        t.input = "";
      } else if (ch === "\x7f" || ch === "\b") t.input = t.input.slice(0, -1);
      else if (ch >= " ") t.input += ch;
    }
    // Answering an agent's question puts it back to work.
    if (t.status === "blocked" || t.status === "done") setStatus(t, "idle");
    return true;
  },

  resize(id, cols, rows) { const t = all.get(id); if (t && cols > 0 && rows > 0) { try { t.proc.resize(cols, rows); } catch { /* exited */ } } return true; },
  kill(id) { const t = all.get(id); if (t) { try { t.proc.kill(); } catch { /* gone */ } all.delete(id); } return true; },
  killAll() { for (const id of [...all.keys()]) module.exports.kill(id); },

  setFocused(id) {
    focusedId = id;
    const t = all.get(id);
    if (t && t.status === "done") setStatus(t, "idle");
    return true;
  },
};
