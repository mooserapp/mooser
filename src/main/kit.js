// AI kit: reads and changes Claude Code's own configuration for the panel.
//   scan()                       skills, agents, plugins and the model settings
//   mcp()                        MCP servers with their health (runs `claude mcp list`)
//   set(key, json | "-delete")   changes one top-level key of ~/.claude/settings.json
//   toggle(kind, path)           moves a personal skill or agent between on and off folders
//   create(kind, name, desc)     creates one from a template, returns its file
//   claude(args)                 runs the claude CLI (plugin enable/disable/update/uninstall, mcp add/remove)
//
// A personal skill or agent is turned off by moving it to ~/.claude/skills-off or agents-off: Claude
// Code only reads ~/.claude/skills and ~/.claude/agents, and moving it back turns it on again.
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { execFile } = require("node:child_process");

const HOME = os.homedir();
const C = path.join(HOME, ".claude");
const SETTINGS = path.join(C, "settings.json");
const DIRS = {
  skill: [path.join(C, "skills"), path.join(C, "skills-off")],
  agent: [path.join(C, "agents"), path.join(C, "agents-off")],
};
const CLAUDE = [path.join(HOME, ".local", "bin", "claude.exe"), path.join(HOME, ".local", "bin", "claude"), "/opt/homebrew/bin/claude", "/usr/local/bin/claude"].find((p) => fs.existsSync(p)) ?? "claude";
const fwd = (p) => p.replace(/\\/g, "/");
const readJSON = (p, fb) => { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return fb; } };
const ls = (d) => { try { return fs.readdirSync(d, { withFileTypes: true }); } catch { return []; } };

// The YAML front matter's name and description (plain, quoted, or a > / | block).
function front(file) {
  let text; try { text = fs.readFileSync(file, "utf8"); } catch { return {}; }
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!m) return {};
  const lines = m[1].split(/\r?\n/), res = {};
  for (let i = 0; i < lines.length; i++) {
    const k = /^([A-Za-z_-]+):\s*(.*)$/.exec(lines[i]);
    if (!k) continue;
    let v = k[2].trim();
    if (/^[>|][-+]?$/.test(v)) {
      const block = [];
      while (i + 1 < lines.length && (/^\s+/.test(lines[i + 1]) || lines[i + 1] === "")) block.push(lines[++i].trim());
      v = block.join(" ").trim();
    } else if (/^["'].*["']$/.test(v)) v = v.slice(1, -1);
    res[k[1]] = v;
  }
  return res;
}

function skillsIn(dir, extra) {
  const res = [];
  for (const e of ls(dir)) {
    const d = path.join(dir, e.name), f = path.join(d, "SKILL.md");
    if (!(e.isDirectory() || e.isSymbolicLink()) || !fs.existsSync(f)) continue;
    const fm = front(f);
    res.push({ name: fm.name || e.name, description: fm.description || "", dir: fwd(d), file: fwd(f), ...extra });
  }
  return res;
}
function agentsIn(dir, extra) {
  return ls(dir).filter((e) => e.isFile() && e.name.endsWith(".md")).map((e) => {
    const f = path.join(dir, e.name), fm = front(f);
    return { name: fm.name || e.name.replace(/\.md$/, ""), description: fm.description || "", model: fm.model || "", dir: fwd(dir), file: fwd(f), ...extra };
  });
}

function plugins(settings) {
  const installed = readJSON(path.join(C, "plugins", "installed_plugins.json"), {}).plugins ?? {};
  const on = settings.enabledPlugins ?? {};
  return Object.entries(installed).map(([id, entries]) => {
    const e = entries?.[0] ?? {}, root = e.installPath ?? "";
    const manifest = readJSON(path.join(root, ".claude-plugin", "plugin.json"), {});
    const mcp = { ...(readJSON(path.join(root, ".mcp.json"), {}).mcpServers ?? readJSON(path.join(root, ".mcp.json"), {})), ...(typeof manifest.mcpServers === "object" ? manifest.mcpServers : {}) };
    const name = id.split("@")[0];
    return {
      id, name, marketplace: id.split("@")[1] ?? "", version: e.version ?? "", dir: fwd(root),
      description: manifest.description ?? "", enabled: on[id] === true,
      skills: skillsIn(path.join(root, "skills"), { source: "plugin", plugin: name, readonly: true }),
      agents: agentsIn(path.join(root, "agents"), { source: "plugin", plugin: name, readonly: true }),
      commands: ls(path.join(root, "commands")).filter((x) => x.name.endsWith(".md")).length,
      mcp: Object.keys(mcp).length,
      hooks: Boolean(manifest.hooks) || fs.existsSync(path.join(root, "hooks", "hooks.json")),
    };
  }).sort((a, b) => a.name.localeCompare(b.name));
}

function scan() {
  const settings = readJSON(SETTINGS, {});
  const ps = plugins(settings);
  const synced = ls(path.join(C, "skills", "synced")).filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .flatMap((e) => skillsIn(path.join(C, "skills", "synced", e.name), { source: "claude.ai", readonly: true }));
  const skills = [
    ...skillsIn(DIRS.skill[0], { source: "personal", enabled: true }).filter((s) => !/\/synced$/.test(s.dir)),
    ...skillsIn(DIRS.skill[1], { source: "personal", enabled: false }),
    ...synced.map((s) => ({ ...s, enabled: true })),
    ...ps.flatMap((p) => p.skills.map((s) => ({ ...s, enabled: p.enabled }))),
  ];
  const agents = [
    ...agentsIn(DIRS.agent[0], { source: "personal", enabled: true }),
    ...agentsIn(DIRS.agent[1], { source: "personal", enabled: false }),
    ...ps.flatMap((p) => p.agents.map((a) => ({ ...a, enabled: p.enabled }))),
  ];
  return {
    skills, agents,
    plugins: ps.map(({ skills, agents, ...p }) => ({ ...p, skills: skills.length, agents: agents.length })),
    model: settings.model ?? null, fastMode: settings.fastMode === true, effort: settings.effortLevel ?? null,
  };
}

function run(args, timeout = 120000) {
  return new Promise((resolve) => execFile(CLAUDE, args, { timeout, windowsHide: true, maxBuffer: 8 << 20 }, (err, stdout, stderr) =>
    resolve({ code: err ? (typeof err.code === "number" ? err.code : 1) : 0, stdout: String(stdout), stderr: String(stderr) })));
}

// `claude mcp list` lines: "<name>: <command or url> - <status>". The user's own servers come
// from ~/.claude.json; claude.ai connectors and plugin servers are named by their prefix.
async function mcp() {
  const user = readJSON(path.join(HOME, ".claude.json"), {}).mcpServers ?? {};
  const r = await run(["mcp", "list"], 90000);
  const servers = [];
  for (const line of r.stdout.split(/\r?\n/)) {
    const m = /^(.+?): (.*) - (.+)$/.exec(line.trim());
    if (!m) continue;
    const [, name, target, raw] = m;
    const state = /connected/i.test(raw) ? "ok" : /auth/i.test(raw) ? "auth" : /pending/i.test(raw) ? "pending" : "down";
    const source = name.startsWith("claude.ai ") ? "claude.ai" : name.startsWith("plugin:") ? "plugin" : user[name] ? "personal" : "project";
    const label = source === "claude.ai" ? name.slice(10) : source === "plugin" ? name.split(":").slice(1).join(":") : name;
    servers.push({ name, label, target, state, status: raw.replace(/^[^A-Za-z]+/, ""), source, removable: source === "personal" });
  }
  // A personal server that `claude mcp list` left out (it was still starting) is still yours.
  for (const [name, cfg] of Object.entries(user)) if (!servers.some((s) => s.name === name))
    servers.push({ name, label: name, target: cfg.url ?? [cfg.command, ...(cfg.args ?? [])].join(" "), state: "unknown", status: "Sin comprobar", source: "personal", removable: true });
  return r.code !== 0 && !servers.length ? { error: (r.stderr || "No se pudo leer la lista de MCP").trim().split("\n").pop() } : { servers };
}

function set(key, value) {
  const s = readJSON(SETTINGS, null);
  if (!s) return { error: "No pude leer ~/.claude/settings.json" };
  if (value === "-delete") delete s[key]; else s[key] = JSON.parse(value);
  fs.writeFileSync(SETTINGS, JSON.stringify(s, null, 2) + "\n");
  return { ok: true };
}

function toggle(kind, p) {
  const [on, off] = DIRS[kind] ?? [];
  if (!on) return { error: "Tipo desconocido" };
  const src = path.resolve(p), base = path.basename(src), inOn = path.dirname(src) === path.resolve(on);
  const dest = path.join(inOn ? off : on, base);
  if (!inOn && path.dirname(src) !== path.resolve(off)) return { error: "Solo se activan o desactivan los tuyos" };
  if (fs.existsSync(dest)) return { error: `Ya existe ${base} en ${fwd(path.dirname(dest))}` };
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.renameSync(src, dest);
  return { ok: true, enabled: !inOn };
}

const slug = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
function create(kind, name, description) {
  const id = slug(name);
  if (!id) return { error: "Escribe un nombre" };
  const desc = (description || "Describe cuándo debe usarse.").replace(/\s+/g, " ").trim();
  const yamlDesc = JSON.stringify(desc);
  if (kind === "skill") {
    const dir = path.join(DIRS.skill[0], id), file = path.join(dir, "SKILL.md");
    if (fs.existsSync(dir) || fs.existsSync(path.join(DIRS.skill[1], id))) return { error: `Ya tienes un skill llamado ${id}` };
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, `---\nname: ${id}\ndescription: ${yamlDesc}\n---\n\n# ${name}\n\nInstrucciones que Claude sigue cuando usa este skill.\n`);
    return { ok: true, file: fwd(file) };
  }
  const file = path.join(DIRS.agent[0], `${id}.md`);
  if (fs.existsSync(file) || fs.existsSync(path.join(DIRS.agent[1], `${id}.md`))) return { error: `Ya tienes un agente llamado ${id}` };
  fs.mkdirSync(DIRS.agent[0], { recursive: true });
  fs.writeFileSync(file, `---\nname: ${id}\ndescription: ${yamlDesc}\n---\n\nEres un agente especializado. Describe aquí su rol, cómo trabaja y qué devuelve.\n`);
  return { ok: true, file: fwd(file) };
}

async function claude(args) {
  const r = await run(args);
  if (r.code === 0) return { ok: true, text: r.stdout.trim() };
  const lines = (r.stderr || r.stdout || "Claude Code devolvió un error").trim().split(/\r?\n/).filter(Boolean);
  return { error: lines.pop() };
}

module.exports = { scan, mcp, set: (k, v) => set(k, v), toggle, create, claude };
