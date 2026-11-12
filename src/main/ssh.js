// SSH servers: saved hosts, status checks, remote folder listing, and the specs the renderer uses to
// open an ssh session or an scp transfer in a terminal.
//
// Passwords are kept only encrypted with Electron's safeStorage (DPAPI on Windows, the Keychain on
// macOS) in <userData>/ssh/hosts.json. ssh gets one through SSH_ASKPASS: a tiny helper asks this
// process over a local socket with a one-time token, and gets the password for the user@host ssh
// names in its prompt. The password never sits in an environment variable or a file in clear.
const { app, safeStorage } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const net = require("node:net");
const crypto = require("node:crypto");
const { execFile } = require("node:child_process");

const DIR = () => path.join(app.getPath("userData"), "ssh");
const HOSTS = () => path.join(DIR(), "hosts.json");
const GROUPS = () => path.join(DIR(), "groups.json");
const USER_CFG = path.join(os.homedir(), ".ssh", "config");
const isWin = process.platform === "win32";

const readJSON = (p, fb) => { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return fb; } };
const writeJSON = (p, v) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(v, null, 2)); };

// Git for Windows' ssh honours SSH_ASKPASS without a terminal; Windows' own ssh.exe does not do it
// reliably, so on Windows Git's is preferred when it is there.
function sshBin(name) {
  if (isWin) {
    const roots = [process.env.ProgramFiles, process.env["ProgramFiles(x86)"], path.join(os.homedir(), "AppData", "Local", "Programs")].filter(Boolean);
    for (const r of roots) { const p = path.join(r, "Git", "usr", "bin", `${name}.exe`); if (fs.existsSync(p)) return { file: p, askpass: true }; }
    return { file: `${name}.exe`, askpass: false };
  }
  return { file: name, askpass: true };
}

// ---------- askpass ----------
const tokens = new Map(); // token -> { entries: [{ match, password }], until }
let socketPath = null;

function startAskpass() {
  if (socketPath) return socketPath;
  socketPath = isWin ? `\\\\.\\pipe\\mooser-askpass-${crypto.randomBytes(6).toString("hex")}` : path.join(os.tmpdir(), `mooser-askpass-${process.pid}.sock`);
  if (!isWin) { try { fs.unlinkSync(socketPath); } catch { /* none */ } }
  net.createServer((c) => {
    let buf = "";
    c.on("data", (d) => {
      buf += d;
      if (!buf.includes("\n")) return;
      const [token, ...rest] = buf.split("\n")[0].split("\t");
      const prompt = rest.join("\t"), spec = tokens.get(token);
      let answer = "";
      if (spec && spec.until > Date.now() && /password/i.test(prompt)) {
        const e = spec.entries.find((x) => prompt.includes(x.match)) ?? (spec.entries.length === 1 ? spec.entries[0] : null);
        if (e) answer = e.password;
      }
      c.end(answer);
    });
    c.on("error", () => {});
  }).listen(socketPath);
  if (!isWin) app.on("will-quit", () => { try { fs.unlinkSync(socketPath); } catch { /* gone */ } });
  return socketPath;
}

// The helper ssh runs: a shell script that runs this app's own Node (ELECTRON_RUN_AS_NODE) on a
// small script. Both live in the data folder (outside the app archive) so ssh can execute them.
function askpassFiles() {
  const dir = DIR(); fs.mkdirSync(dir, { recursive: true });
  const js = path.join(dir, "askpass.js"), sh = path.join(dir, "askpass.sh");
  fs.writeFileSync(js, `const net = require("net");
const c = net.connect(process.env.MOOSER_ASKPASS_SOCK, () => c.write(process.env.MOOSER_ASKPASS_TOKEN + "\\t" + process.argv.slice(2).join(" ") + "\\n"));
let out = ""; c.on("data", (d) => (out += d)); c.on("end", () => { if (!out) process.exit(1); process.stdout.write(out + "\\n"); });
c.on("error", () => process.exit(1));
`);
  fs.writeFileSync(sh, `#!/bin/sh\nexec "$MOOSER_NODE" "$MOOSER_ASKPASS_JS" "$@"\n`);
  try { fs.chmodSync(sh, 0o755); } catch { /* windows */ }
  return { js, sh };
}

function askpassEnv(hosts) {
  const entries = hosts.filter((h) => h && h !== "local" && h.secret).map((h) => ({ match: `${h.user ? `${h.user}@` : ""}${h.host}`, password: decrypt(h.secret) })).filter((e) => e.password);
  if (!entries.length) return {};
  const token = crypto.randomBytes(16).toString("hex");
  tokens.set(token, { entries, until: Date.now() + 10 * 60 * 1000 });
  const f = askpassFiles();
  return {
    SSH_ASKPASS: f.sh, SSH_ASKPASS_REQUIRE: "force", DISPLAY: process.env.DISPLAY || ":0",
    MOOSER_ASKPASS_SOCK: startAskpass(), MOOSER_ASKPASS_TOKEN: token, MOOSER_ASKPASS_JS: f.js,
    MOOSER_NODE: process.execPath, ELECTRON_RUN_AS_NODE: "1",
  };
}

const encrypt = (pw) => {
  if (!safeStorage.isEncryptionAvailable()) throw new Error("Este sistema no ofrece cifrado seguro para guardar contraseñas");
  return safeStorage.encryptString(pw).toString("base64");
};
const decrypt = (b64) => { try { return safeStorage.decryptString(Buffer.from(b64, "base64")); } catch { return null; } };

// ---------- hosts ----------
function imported() {
  let text = ""; try { text = fs.readFileSync(USER_CFG, "utf8"); } catch { return []; }
  const out = [];
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*Host\s+(.+)$/i.exec(line);
    if (m) for (const a of m[1].trim().split(/\s+/)) if (!/[*?!]/.test(a)) out.push({ id: `cfg-${a}`, alias: a, name: a, host: a, group: "~/.ssh/config", imported: true });
  }
  return out;
}
const hosts = () => readJSON(HOSTS(), []);
const byId = (id) => [...hosts(), ...imported()].find((h) => h.id === id);
const pub = (h) => { const { secret, ...rest } = h; return { ...rest, hasPassword: Boolean(secret) }; };

function load() {
  return { hosts: hosts().map(pub), imported: imported(), groups: readJSON(GROUPS(), {}), askpass: sshBin("ssh").askpass, encryption: safeStorage.isEncryptionAvailable() };
}

function save(h, password, forget) {
  const list = hosts(), i = list.findIndex((x) => x.id === h.id), old = i >= 0 ? list[i] : {};
  const next = {
    id: h.id || crypto.randomBytes(5).toString("hex"), name: (h.name || "").trim(), host: (h.host || "").trim(), port: Number(h.port) || 22,
    user: (h.user || "").trim(), group: (h.group || "").trim(), key: (h.key || "").trim(),
  };
  if (!next.host) throw new Error("Falta la dirección del servidor");
  if (password) next.secret = encrypt(password);
  else if (!forget && old.secret) next.secret = old.secret;
  if (i >= 0) list[i] = next; else list.push(next);
  writeJSON(HOSTS(), list);
  return pub(next);
}
function remove(id) { writeJSON(HOSTS(), hosts().filter((h) => h.id !== id)); return { ok: true }; }
function saveGroups(g) { writeJSON(GROUPS(), g); return { ok: true }; }

// ssh arguments that reach a host.
const OPTS = ["-o", "StrictHostKeyChecking=accept-new", "-o", "NumberOfPasswordPrompts=1"];
const dest = (h) => (h.imported ? h.alias : `${h.user ? `${h.user}@` : ""}${h.host}`);
const sshArgs = (h) => [...OPTS, ...(h.imported ? [] : ["-p", String(h.port || 22)]), ...(h.key ? ["-i", h.key, "-o", "IdentitiesOnly=yes"] : [])];
const q = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`;

function runSsh(h, cmd, timeout = 25000) {
  const bin = sshBin("ssh");
  return new Promise((resolve) => execFile(bin.file, [...sshArgs(h), "-o", "ConnectTimeout=8", ...(h.secret ? [] : ["-o", "BatchMode=yes"]), dest(h), cmd],
    { timeout, windowsHide: true, env: { ...process.env, ...(bin.askpass ? askpassEnv([h]) : {}) } },
    (err, stdout, stderr) => resolve({ code: err ? (typeof err.code === "number" ? err.code : 255) : 0, stdout: String(stdout), stderr: String(stderr) })));
}

const authError = (h, e) => (/permission denied|too many authentication/i.test(e)
  ? (h.secret ? "Contraseña incorrecta: edítala en el servidor." : "El servidor pide contraseña: guárdala al editar el servidor.") : null);
const changedKey = (e) => (/remote host identification has changed|host key verification failed/i.test(e)
  ? "La huella del servidor cambió. Si es esperado, quita su línea de ~/.ssh/known_hosts." : null);
const lastLine = (e, fb) => (e || "").trim().split(/\r?\n/).pop() || fb;

async function probe(id) {
  const h = byId(id); if (!h) return { state: "down", detail: "No existe" };
  const r = await runSsh(h, "echo ok", 20000);
  if (r.code === 0) return { state: "ok" };
  const a = authError(h, r.stderr); if (a) return { state: "auth", detail: a };
  const k = changedKey(r.stderr); if (k) return { state: "hostkey", detail: k };
  return { state: "down", detail: lastLine(r.stderr, "Sin respuesta").replace(/^ssh: /, "") };
}

async function list(id, dir) {
  const h = byId(id); if (!h) return { error: "No existe" };
  const cd = dir ? `cd -- ${q(dir)} 2>/dev/null || cd` : "cd";
  const r = await runSsh(h, `${cd}; pwd; LC_ALL=C ls -1Ap`);
  if (r.code !== 0) return { error: authError(h, r.stderr) || changedKey(r.stderr) || lastLine(r.stderr, "No se pudo leer la carpeta") };
  const [cwd, ...rest] = r.stdout.split(/\r?\n/);
  const items = rest.filter((n) => n && n !== "./" && n !== "../").map((n) => ({ name: n.replace(/\/$/, ""), dir: n.endsWith("/") }))
    .sort((a, b) => (a.dir === b.dir ? a.name.localeCompare(b.name) : a.dir ? -1 : 1));
  return { cwd: cwd.trim(), items };
}

// What a terminal runs to log in: { argv, env }.
function connectSpec(id) {
  const h = byId(id); if (!h) return { error: "No existe" };
  const bin = sshBin("ssh");
  return { argv: [bin.file, "-o", "StrictHostKeyChecking=accept-new", ...(h.imported ? [] : ["-p", String(h.port || 22)]), ...(h.key ? ["-i", h.key] : []), dest(h)],
    env: bin.askpass ? askpassEnv([h]) : {}, name: h.name || h.host };
}

// An scp run that copies paths (on `from`) into the folder dir (on `to`); "local" is this computer.
// Server to server goes through this computer (-3).
function transferSpec(fromId, paths, toId, dir) {
  const from = fromId === "local" ? "local" : byId(fromId), to = toId === "local" ? "local" : byId(toId);
  if (!from || !to) return { error: "Servidor no encontrado" };
  const bin = sshBin("scp"), remote = [from, to].find((h) => h !== "local");
  const local = (p) => (isWin && bin.askpass ? p.replace(/\\/g, "/").replace(/^([A-Za-z]):/, (_m, d) => `/${d.toLowerCase()}`) : p);
  const spec = (h, p) => (h === "local" ? local(p) : `${dest(h)}:${p}`);
  const port = remote && !remote.imported ? ["-P", String(remote.port || 22)] : [];
  const argv = [bin.file, ...OPTS, ...port, ...(from !== "local" && to !== "local" ? ["-3"] : []), "-r", ...paths.map((p) => spec(from, p)), to === "local" ? local(dir) : `${dest(to)}:${dir.replace(/\/?$/, "/")}`];
  const label = (h) => (h === "local" ? "Este equipo" : h.name || h.host);
  return { argv, env: bin.askpass ? askpassEnv([from, to]) : {}, name: `${label(from)} → ${label(to)}` };
}

module.exports = { load, save, remove, saveGroups, probe, list, connectSpec, transferSpec };
