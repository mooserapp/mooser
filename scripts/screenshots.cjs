// Takes the README screenshots on this system: docs/images/<windows|macos>/*.png.
// Uses a separate data folder and settings folder, so your own Mooser is never touched.
// Run: npm run screenshots   (close Mooser first). Only some: npm run screenshots usage settings
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const electron = require("electron");

const ROOT = path.join(__dirname, "..");
const PLATFORM = process.platform === "darwin" ? "macos" : process.platform === "win32" ? "windows" : "linux";
const OUT = path.join(ROOT, "docs", "images", PLATFORM);
const AGENT = path.join(__dirname, "demo-agent.cjs");
const HOME = os.homedir();
fs.mkdirSync(OUT, { recursive: true });

const pane = (id, cwd, extra = {}) => ({ type: "pane", id, cwd, ...extra });
const agent = (id, cwd, ask) => pane(id, cwd, { argv: ["node", AGENT, String(ask)], keep: true });
const DEMO = {
  active: "s1",
  spaces: [
    { id: "s1", name: null, folder: ROOT, color: "#a9b8ff", activeTab: "t1", tabs: [
      { id: "t1", name: null, focus: "p1", root: { type: "split", dir: "row", ratio: 0.5, a: pane("p1", ROOT), b: agent("p2", ROOT, 60000) } },
      { id: "t2", name: null, focus: "p3", root: agent("p3", ROOT, 2500) },
    ] },
    { id: "s2", name: "docs", folder: path.join(ROOT, "docs"), color: "#7ed9b5", activeTab: "t3", tabs: [{ id: "t3", name: null, focus: "p4", root: pane("p4", path.join(ROOT, "docs")) }] },
    { id: "s3", name: "scripts", folder: path.join(ROOT, "scripts"), color: "#ffc98b", activeTab: "t4", tabs: [{ id: "t4", name: null, focus: "p5", root: pane("p5", path.join(ROOT, "scripts")) }] },
  ],
};

// An example Claude Code folder, so the AI kit shows sample skills and agents, not yours.
const SKILLS = {
  "api-docs": "Writes and updates the API reference from the route handlers and their types.",
  "changelog": "Turns the commits since the last tag into a short changelog grouped by area.",
  "code-review": "Reviews the current diff for bugs, missing tests and unclear names before you commit.",
  "db-migrations": "Plans a database migration, writes it and the rollback, and checks it on a copy.",
  "release": "Bumps the version, tags the release and drafts the notes from the changelog.",
  "test-writer": "Adds focused tests for the code you changed, following the project's test style.",
  "ui-polish": "Checks spacing, contrast and focus states in the changed screens and fixes them.",
};
const AGENTS = { reviewer: "A careful second pair of eyes for pull requests.", explorer: "Finds where things live in a large codebase and reports back." };
function demoClaude(dir) {
  for (const [name, description] of Object.entries(SKILLS)) {
    fs.mkdirSync(path.join(dir, "skills", name), { recursive: true });
    fs.writeFileSync(path.join(dir, "skills", name, "SKILL.md"), `---\nname: ${name}\ndescription: ${description}\n---\n`);
  }
  fs.mkdirSync(path.join(dir, "agents"), { recursive: true });
  for (const [name, description] of Object.entries(AGENTS)) fs.writeFileSync(path.join(dir, "agents", `${name}.md`), `---\nname: ${name}\ndescription: ${description}\n---\n`);
  fs.writeFileSync(path.join(dir, "settings.json"), JSON.stringify({ model: "opus" }));
}

const click = (sel, i = 0) => `document.querySelectorAll(${JSON.stringify(sel)})[${i}]?.click();`;
const SHOTS = [
  { name: "workspace", state: DEMO, js: click(".dock button", 0), wait: 9000 },
  { name: "usage", state: DEMO, js: click(".dock button", 3), wait: 9000 },
  { name: "explorer", state: DEMO, js: `localStorage.setItem("mooser.path", ${JSON.stringify(ROOT)});` + click(".dock button", 1), wait: 8000 },
  { name: "settings", state: DEMO, js: `[...document.querySelectorAll(".foot-row")].pop()?.click();`, wait: 8000 },
  { name: "welcome", state: { spaces: [] }, js: "", wait: 6000 },
  { name: "workspace-en", state: DEMO, js: click(".dock button", 0), wait: 9000, settings: { language: "en" } },
  { name: "usage-en", state: DEMO, js: click(".dock button", 3), wait: 9000, settings: { language: "en" } },
  { name: "explorer-en", state: DEMO, js: `localStorage.setItem("mooser.path", ${JSON.stringify(ROOT)});` + click(".dock button", 1), wait: 8000, settings: { language: "en" } },
  { name: "settings-en", state: DEMO, js: `[...document.querySelectorAll(".foot-row")].pop()?.click();`, wait: 8000, settings: { language: "en" } },
];

const only = process.argv.slice(2);
for (const s of SHOTS.filter((x) => !only.length || only.includes(x.name))) {
  const tmp = fs.mkdtempSync(path.join(HOME, ".mooser-demo-"));
  const data = path.join(tmp, "data"), home = tmp;
  fs.mkdirSync(data);
  demoClaude(path.join(tmp, "claude"));
  fs.writeFileSync(path.join(data, "state.json"), JSON.stringify({ window: { width: 1440, height: 900 }, workspace: s.state }));
  fs.writeFileSync(path.join(home, "settings.json"), JSON.stringify({ language: "es", ...(s.settings ?? {}) }));
  const file = path.join(OUT, `${s.name}.png`);
  const r = spawnSync(electron, [ROOT], {
    env: { ...process.env, MOOSER_USER_DATA: data, MOOSER_HOME: home, MOOSER_CLAUDE_DIR: path.join(tmp, "claude"), MOOSER_SHOT: file, MOOSER_QUIT: "1", MOOSER_WAIT: String(s.wait), MOOSER_JS_AT: String(s.wait - 2500), MOOSER_JS: s.js || "0" },
    encoding: "utf8", timeout: 90000,
  });
  const errors = (r.stdout ?? "").split("\n").filter((l) => /page error|js failed/.test(l));
  console.log(`${fs.existsSync(file) ? "✓" : "✗"} ${path.relative(ROOT, file)}${errors.length ? `\n  ${errors.join("\n  ")}` : ""}`);
  fs.rmSync(tmp, { recursive: true, force: true });
}
