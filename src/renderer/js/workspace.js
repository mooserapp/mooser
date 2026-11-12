// The workspace: spaces (a project folder each), their tabs, and each tab's panes split right and
// down. A pane shows one terminal (xterm.js on a node-pty process in the main process).
// The structure is saved and comes back on the next start; terminals start again in their folder.
import { Terminal } from "../../../node_modules/@xterm/xterm/lib/xterm.mjs";
import { FitAddon } from "../../../node_modules/@xterm/addon-fit/lib/addon-fit.mjs";
import { WebLinksAddon } from "../../../node_modules/@xterm/addon-web-links/lib/addon-web-links.mjs";
import { h, icon, iconButton, clear, STATUS_WORD } from "./ui.js";

const api = window.mooser;
const uid = (p) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const base = (p) => String(p ?? "").replace(/[\\/]+$/, "").split(/[\\/]/).pop() || p;

export const XTERM_THEME = {
  background: "#00000000", foreground: "#dce8f2", cursor: "#a9b8ff", cursorAccent: "#0f2236", selectionBackground: "#2a4466",
  black: "#1b3350", red: "#ff8a8a", green: "#7ed9b5", yellow: "#ffc98b", blue: "#8fb0ff", magenta: "#c9a8ff", cyan: "#6fd6e0", white: "#c8d6e6",
  brightBlack: "#4a6585", brightRed: "#ffa8a8", brightGreen: "#a2ebcd", brightYellow: "#ffddae", brightBlue: "#b5ccff", brightMagenta: "#dec6ff", brightCyan: "#9be6ee", brightWhite: "#f2f7fb",
};
export const TILE_COLORS = ["#a9b8ff", "#6fd6e0", "#7ed9b5", "#ffc98b", "#ff9ed2", "#c9a8ff", "#e8e07a", "#ff8a8a"];
const tileColor = (name) => { let n = 0; for (const c of String(name)) n = (n * 31 + c.charCodeAt(0)) >>> 0; return TILE_COLORS[n % TILE_COLORS.length]; };

export const W = {
  spaces: [], active: null,
  panes: new Map(), // paneId -> runtime { el, term, fit, termId, ended }
  status: new Map(), // termId -> { agent, status, title }
  focusedPane: null, zoomed: null,
  onChange: () => {},
};

// ---------- persistence ----------
const strip = (n) => (n.type === "split" ? { ...n, a: strip(n.a), b: strip(n.b) } : { type: "pane", id: n.id, cwd: n.cwd, argv: n.argv, name: n.name, keep: n.keep });
export function serialize() {
  return { active: W.active, spaces: W.spaces.map((s) => ({ ...s, tabs: s.tabs.map((t) => ({ ...t, root: strip(t.root) })) })) };
}
let saveTimer = null;
export function save() { clearTimeout(saveTimer); saveTimer = setTimeout(() => api.app.saveState(serialize()), 300); }
export function restore(data) {
  // Only plain shells come back: a command (ssh, scp) that ended is not run again.
  const clean = (n) => (n.type === "split" ? { ...n, a: clean(n.a), b: clean(n.b) } : { ...n, argv: n.keep ? n.argv : undefined, env: undefined });
  W.spaces = (data?.spaces ?? []).map((s) => ({ ...s, tabs: s.tabs.map((t) => ({ ...t, root: clean(t.root) })) }));
  W.active = W.spaces.some((s) => s.id === data?.active) ? data.active : W.spaces[0]?.id ?? null;
}

// ---------- lookups ----------
export const space = (id = W.active) => W.spaces.find((s) => s.id === id);
export const tab = (s = space()) => s?.tabs.find((t) => t.id === s.activeTab) ?? s?.tabs[0];
function leaves(n, out = []) { if (!n) return out; if (n.type === "pane") out.push(n); else { leaves(n.a, out); leaves(n.b, out); } return out; }
export const panesOf = (t) => leaves(t?.root);
function findParent(n, id, parent = null) {
  if (!n) return null;
  if (n.type === "pane") return n.id === id ? { node: n, parent } : null;
  return findParent(n.a, id, n) ?? findParent(n.b, id, n);
}
export function locate(paneId) {
  for (const s of W.spaces) for (const t of s.tabs) { const f = findParent(t.root, paneId); if (f) return { space: s, tab: t, ...f }; }
  return null;
}
export function tabStatus(t) {
  const order = { blocked: 3, done: 2, working: 1, idle: 0 };
  let best = null;
  for (const p of panesOf(t)) { const st = W.status.get(W.panes.get(p.id)?.termId); if (st?.agent && (best == null || order[st.status] > order[best])) best = st.status; }
  return best;
}
export const spaceStatus = (s) => s.tabs.map(tabStatus).reduce((a, b) => ({ blocked: 3, done: 2, working: 1, idle: 0 }[b] > ({ blocked: 3, done: 2, working: 1, idle: 0 }[a] ?? -1) ? b : a), null);
export function agents() {
  const out = [];
  for (const s of W.spaces) for (const t of s.tabs) for (const p of panesOf(t)) {
    const rt = W.panes.get(p.id), st = rt && W.status.get(rt.termId);
    if (st?.agent) out.push({ space: s, tab: t, pane: p, ...st });
  }
  return out;
}

// ---------- structure changes ----------
export function newSpace(folder, { name, argv } = {}) {
  const pane = { type: "pane", id: uid("p"), cwd: folder, argv };
  const t = { id: uid("tab"), name: null, root: pane, focus: pane.id };
  const s = { id: uid("s"), name: name || null, folder, tabs: [t], activeTab: t.id, color: tileColor(folder) };
  W.spaces.push(s); W.active = s.id; W.focusedPane = pane.id;
  changed();
  return s;
}
export function newTab({ argv, env, name, cwd, keep } = {}, s = space()) {
  if (!s) return newSpace(cwd || W.home, { argv });
  const pane = { type: "pane", id: uid("p"), cwd: cwd || currentCwd(s), argv, env, name, keep };
  const t = { id: uid("tab"), name: name || null, root: pane, focus: pane.id };
  s.tabs.push(t); s.activeTab = t.id; W.focusedPane = pane.id; W.zoomed = null;
  changed();
  return t;
}
function currentCwd(s) { const p = W.focusedPane && locate(W.focusedPane); return (p?.space === s && W.status.get(W.panes.get(p.node.id)?.termId)?.cwd) || p?.node.cwd || s.folder; }
export function split(dir, paneId = W.focusedPane, opts = {}) {
  const at = paneId && locate(paneId);
  if (!at) return newTab(opts);
  const pane = { type: "pane", id: uid("p"), cwd: opts.cwd || at.node.cwd, argv: opts.argv, env: opts.env, name: opts.name };
  const node = { type: "split", dir, ratio: 0.5, a: { ...at.node }, b: pane };
  replace(at.tab, at.node, node);
  W.focusedPane = pane.id; W.zoomed = null;
  changed();
}
function replace(t, old, next) {
  if (t.root === old) { t.root = next; return; }
  const walk = (n) => { if (n.type !== "split") return; if (n.a === old) n.a = next; else if (n.b === old) n.b = next; else { walk(n.a); walk(n.b); } };
  walk(t.root);
}
export function closePane(paneId = W.focusedPane) {
  const at = paneId && locate(paneId);
  if (!at) return;
  dispose(paneId);
  if (!at.parent) closeTab(at.tab.id, at.space, true);
  else {
    const other = at.parent.a === at.node ? at.parent.b : at.parent.a;
    replace(at.tab, at.parent, other);
    const next = panesOf(at.tab)[0]; at.tab.focus = next?.id; W.focusedPane = next?.id;
  }
  W.zoomed = null;
  changed();
}
export function closeTab(tabId, s = space(), already = false) {
  const t = s?.tabs.find((x) => x.id === tabId);
  if (!t) return;
  if (!already) for (const p of panesOf(t)) dispose(p.id);
  const i = s.tabs.indexOf(t);
  s.tabs.splice(i, 1);
  if (!s.tabs.length) { W.spaces = W.spaces.filter((x) => x !== s); W.active = W.spaces[Math.max(0, W.spaces.findIndex(() => true))]?.id ?? null; }
  else if (s.activeTab === tabId) s.activeTab = s.tabs[Math.min(i, s.tabs.length - 1)].id;
  W.focusedPane = tab()?.focus ?? null;
  changed();
}
export function closeSpace(id) { const s = space(id); if (!s) return; for (const t of [...s.tabs]) closeTab(t.id, s); }
export function selectSpace(id) { if (!space(id)) return; W.active = id; W.focusedPane = tab()?.focus ?? panesOf(tab())[0]?.id; W.zoomed = null; changed(); }
export function selectTab(id, s = space()) { if (!s) return; s.activeTab = id; W.focusedPane = tab(s)?.focus ?? panesOf(tab(s))[0]?.id; W.zoomed = null; changed(); }
export function cycleTab(step) { const s = space(); if (!s?.tabs.length) return; const i = s.tabs.findIndex((t) => t.id === s.activeTab); selectTab(s.tabs[(i + step + s.tabs.length) % s.tabs.length].id); }
export function renameTab(id, name, s = space()) { const t = s?.tabs.find((x) => x.id === id); if (t) { t.name = name || null; changed(); } }
export function renameSpace(id, name) { const s = space(id); if (s) { s.name = name || null; changed(); } }
export function toggleZoom() { W.zoomed = W.zoomed ? null : W.focusedPane; changed(); }
export function focusPane(id, { term = true } = {}) {
  const at = locate(id); if (!at) return;
  if (W.active !== at.space.id) W.active = at.space.id;
  if (at.space.activeTab !== at.tab.id) at.space.activeTab = at.tab.id;
  at.tab.focus = id; W.focusedPane = id;
  const rt = W.panes.get(id);
  if (rt?.termId) api.term.focus(rt.termId);
  for (const [pid, r] of W.panes) r.el?.classList.toggle("focused", pid === id);
  if (term) rt?.term?.focus();
  changed(false);
}
// Alt+arrows: the nearest pane in that direction.
export function moveFocus(dir) {
  const cur = W.panes.get(W.focusedPane)?.el; if (!cur) return;
  const a = cur.getBoundingClientRect(), cx = a.left + a.width / 2, cy = a.top + a.height / 2;
  let best = null, bestD = Infinity;
  for (const p of panesOf(tab())) {
    if (p.id === W.focusedPane) continue;
    const b = W.panes.get(p.id)?.el?.getBoundingClientRect(); if (!b) continue;
    const dx = b.left + b.width / 2 - cx, dy = b.top + b.height / 2 - cy;
    const ok = dir === "left" ? dx < -10 : dir === "right" ? dx > 10 : dir === "up" ? dy < -10 : dy > 10;
    const d = Math.abs(dx) + Math.abs(dy);
    if (ok && d < bestD) { best = p.id; bestD = d; }
  }
  if (best) focusPane(best);
}

function changed(persist = true) { if (persist) save(); W.onChange(); }

// ---------- terminals ----------
function dispose(paneId) {
  const rt = W.panes.get(paneId); if (!rt) return;
  if (rt.termId && !rt.ended) api.term.kill(rt.termId);
  rt.unsub?.(); rt.term?.dispose(); rt.el?.remove(); rt.ro?.disconnect();
  W.status.delete(rt.termId); W.panes.delete(paneId);
}

const byTerm = new Map(); // termId -> paneId
api.term.onData((id, data) => { const p = byTerm.get(id); W.panes.get(p)?.term?.write(data); });
api.term.onExit((id, code) => {
  const p = byTerm.get(id), rt = W.panes.get(p);
  if (!rt) return;
  rt.ended = true;
  const at = locate(p);
  // A shell that ends closes its pane; a command (ssh, scp) leaves its output on screen.
  if (!at?.node.argv) { closePane(p); return; }
  rt.body.append(h("div.ended", icon("check"), h("span.grow", code === 0 ? "Terminó." : `Terminó con código ${code}.`), h("span.dim", "Enter cierra")));
  rt.term.onKey(({ domEvent }) => { if (domEvent.key === "Enter") closePane(p); });
});
api.term.onStatus((info) => {
  const prev = W.status.get(info.id);
  W.status.set(info.id, info);
  W.onStatus?.(info, prev);
  const p = byTerm.get(info.id), rt = W.panes.get(p);
  if (rt) paintHead(p);
  W.onChange();
});

function makePane(node) {
  let rt = W.panes.get(node.id);
  if (rt) return rt;
  const term = new Terminal({
    fontFamily: '"Cascadia Code", "SF Mono", Menlo, Consolas, monospace', fontSize: W.fontSize ?? 14, lineHeight: 1.15,
    theme: XTERM_THEME, allowTransparency: true, cursorBlink: true, scrollback: 10000, macOptionIsMeta: false, allowProposedApi: true,
  });
  const fit = new FitAddon();
  term.loadAddon(fit);
  term.loadAddon(new WebLinksAddon((_e, url) => api.shell.external(url)));
  const head = h("div.pane-head"), body = h("div.term");
  const el = h("div.pane", { onmousedown: () => { if (W.focusedPane !== node.id) focusPane(node.id); } }, head, body);
  rt = { el, head, body, term, fit, termId: null, ended: false };
  W.panes.set(node.id, rt);
  term.open(body);

  // Copy and paste: Ctrl+Shift+C / Ctrl+Shift+V (Cmd+C / Cmd+V on macOS), and copy on select.
  term.attachCustomKeyEventHandler((e) => {
    if (e.type !== "keydown") return true;
    const mod = W.mac ? e.metaKey : e.ctrlKey && e.shiftKey;
    if (mod && e.code === "KeyC" && term.hasSelection()) { navigator.clipboard.writeText(term.getSelection()); return false; }
    if (mod && e.code === "KeyV") { navigator.clipboard.readText().then((t) => t && api.term.write(rt.termId, t)); return false; }
    if (W.isAppShortcut?.(e)) return false;
    return true;
  });
  term.onData((d) => rt.termId && api.term.write(rt.termId, d));

  const resize = () => {
    if (!el.isConnected || el.offsetParent === null) return;
    try { fit.fit(); } catch { return; }
    if (rt.termId) api.term.resize(rt.termId, term.cols, term.rows);
  };
  rt.ro = new ResizeObserver(() => requestAnimationFrame(resize));
  rt.ro.observe(body);

  requestAnimationFrame(async () => {
    resize();
    const info = await api.term.create({ cwd: node.cwd, argv: node.argv, env: node.env, name: node.name, cols: term.cols || 100, rows: term.rows || 30 });
    if (info?.error) { term.write(`\r\n\x1b[31m${info.error}\x1b[0m\r\n`); return; }
    rt.termId = info.id; byTerm.set(info.id, node.id);
    W.status.set(info.id, info);
    if (W.focusedPane === node.id) { api.term.focus(info.id); term.focus(); }
    paintHead(node.id);
    resize();
  });
  paintHead(node.id);
  return rt;
}

function paintHead(paneId) {
  const rt = W.panes.get(paneId), at = locate(paneId);
  if (!rt || !at) return;
  const st = W.status.get(rt.termId) ?? {};
  // Shells set their title to their own path ("C:\...\pwsh.exe"): show the program's name instead.
  const raw = st.title && /[\\/]/.test(st.title) ? st.title.split(/[\\/]/).pop().replace(/\.exe$/i, "") : st.title;
  const title = st.agent || at.node.name || ({ pwsh: "PowerShell", powershell: "PowerShell", cmd: "Símbolo del sistema" }[String(raw).toLowerCase()] ?? raw) || "Terminal";
  const folder = base(st.cwd || at.node.cwd);
  clear(rt.head).append(
    st.agent ? h(`span.dot.${st.status}`, { title: STATUS_WORD[st.status] }) : icon("terminal", 13),
    h("span.title.trunc", title),
    h("span.trunc.dim.grow", folder),
    iconButton("splitRight", "Dividir a la derecha", (e) => { e.stopPropagation(); split("row", paneId); }),
    iconButton("splitDown", "Dividir hacia abajo", (e) => { e.stopPropagation(); split("col", paneId); }),
    iconButton("maximize", W.zoomed === paneId ? "Restaurar" : "Ampliar", (e) => { e.stopPropagation(); focusPane(paneId); toggleZoom(); }),
    iconButton("x", "Cerrar panel", (e) => { e.stopPropagation(); closePane(paneId); }),
  );
}

// ---------- rendering ----------
const roots = new Map(); // tabId -> element
export function renderPanes(host) {
  const alive = new Set();
  for (const s of W.spaces) for (const t of s.tabs) {
    alive.add(t.id);
    let root = roots.get(t.id);
    if (!root) { root = h("div.tabroot"); roots.set(t.id, root); host.append(root); }
    const shown = s.id === W.active && t.id === s.activeTab;
    root.classList.toggle("hidden", !shown);
    root.classList.toggle("zoomed", shown && Boolean(W.zoomed));
    const sig = JSON.stringify(strip(t.root)) + (shown ? W.zoomed : "");
    if (root.dataset.sig !== sig) { root.dataset.sig = sig; clear(root).append(build(t.root, t)); }
    if (shown) for (const p of panesOf(t)) { const rt = W.panes.get(p.id); rt?.el.classList.toggle("focused", p.id === W.focusedPane); rt?.el.classList.toggle("zoom-target", p.id === W.zoomed); }
  }
  for (const [id, el] of roots) if (!alive.has(id)) { el.remove(); roots.delete(id); }
  const empty = host.querySelector(".empty");
  if (!W.spaces.length && !empty) host.append(W.emptyView());
  if (W.spaces.length && empty) empty.remove();
  requestAnimationFrame(() => { const rt = W.panes.get(W.focusedPane); if (rt && document.activeElement?.closest?.(".pane") !== rt.el && !document.activeElement?.matches?.("input,textarea")) rt.term.focus(); });
}

function build(n, t) {
  if (n.type === "pane") { const rt = makePane(n); return rt.el; }
  const a = build(n.a, t), b = build(n.b, t);
  a.style.flex = `${n.ratio} 1 0`; b.style.flex = `${1 - n.ratio} 1 0`;
  const grip = h(`div.grip.inner${n.dir === "col" ? ".h" : ""}`, h("span", h("i"), h("i"), h("i")));
  const box = h(`div.split${n.dir === "col" ? ".col" : ""}`, a, grip, b);
  grip.addEventListener("pointerdown", (e) => {
    e.preventDefault(); grip.setPointerCapture(e.pointerId); grip.classList.add("drag"); document.body.classList.add("dragging");
    const r = box.getBoundingClientRect();
    const move = (ev) => {
      const k = n.dir === "col" ? (ev.clientY - r.top) / r.height : (ev.clientX - r.left) / r.width;
      n.ratio = Math.min(0.9, Math.max(0.1, k));
      a.style.flex = `${n.ratio} 1 0`; b.style.flex = `${1 - n.ratio} 1 0`;
    };
    const up = () => { grip.releasePointerCapture(e.pointerId); grip.classList.remove("drag"); document.body.classList.remove("dragging"); grip.removeEventListener("pointermove", move); grip.removeEventListener("pointerup", up); save(); };
    grip.addEventListener("pointermove", move); grip.addEventListener("pointerup", up);
  });
  return box;
}

export function setFontSize(px) {
  W.fontSize = Math.max(9, Math.min(28, px));
  for (const rt of W.panes.values()) { rt.term.options.fontSize = W.fontSize; try { rt.fit.fit(); if (rt.termId) api.term.resize(rt.termId, rt.term.cols, rt.term.rows); } catch { /* hidden */ } }
}
export const label = (s) => s.name || base(s.folder) || "~";
export const tabLabel = (t, i) => {
  if (t.name) return t.name;
  const p = panesOf(t)[0], st = p && W.status.get(W.panes.get(p.id)?.termId);
  return st?.agent || p?.name || String(i + 1);
};
