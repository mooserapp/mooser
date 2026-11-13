// Mooser's window: the sidebar (spaces and agents), the tab bar, the panes, the side panel (AI kit,
// Explorer, Servers, AI usage and your plugins' panels), the status bar, the grips that resize, the
// keys, the command palette, Settings, and the alerts when an agent needs you or finishes.
import { h, icon, iconButton, clear, menu, toast, chime, STATUS_WORD } from "./ui.js";
import * as WS from "./workspace.js";
import { W } from "./workspace.js";
import * as Settings from "./settings.js";
import * as Plugins from "./plugins.js";
import { registry } from "./plugins.js";
import { openSettings } from "./settingsView.js";
import { setLanguage, startTranslator, tr } from "./i18n.js";
import { KitPanel } from "./panels/kit.js";
import { ExplorerPanel } from "./panels/explorer.js";
import { ServersPanel } from "./panels/servers.js";
import { UsagePanel } from "./panels/usage.js";

// What the panels get: the bridge, with dialog titles and notifications in the chosen language.
const bridge = window.mooser;
const api = {
  ...bridge,
  dialog: { folder: (title) => bridge.dialog.folder(tr(title)), files: (title) => bridge.dialog.files(tr(title)) },
  app: { ...bridge.app, notify: (n) => bridge.app.notify({ ...n, title: tr(n.title), body: tr(n.body) }) },
};
const $ = (id) => document.getElementById(id);
const info = await api.app.info();
W.mac = info.platform === "darwin"; W.home = info.home; window.mooserMac = W.mac;
document.body.classList.toggle("mac", W.mac);
await Settings.load();
setLanguage(Settings.get().language);
Settings.reloadCss();
const set = () => Settings.get();

// ---------- UI state (sizes, what is open): this window's, not a setting ----------
const UI_KEY = "mooser.ui";
const ui = Object.assign({ sidebar: 268, rail: false, panel: 400, panelOpen: true, panelTab: set().panel?.default ?? "kit" }, (() => { try { return JSON.parse(localStorage.getItem(UI_KEY)); } catch { return null; } })());
const saveUi = () => { try { localStorage.setItem(UI_KEY, JSON.stringify(ui)); } catch { /* private */ } };
const RAIL = 64;

// ---------- side panel ----------
const BUILTIN = [
  { id: "kit", label: "Kit de IA", icon: "sparkles", make: () => new KitPanel() },
  { id: "files", label: "Explorador", icon: "folder", make: () => new ExplorerPanel() },
  { id: "servers", label: "Servidores", icon: "server", make: () => new ServersPanel() },
  { id: "usage", label: "Uso de IA", icon: "gauge", make: () => new UsagePanel() },
];
// A plugin's panel: { id, label, icon, mount(el, mooser) }, wrapped like the built-in ones.
const fromPlugin = (p) => ({ id: p.id, label: p.label, icon: p.icon ?? "puzzle", make: () => {
  const el = h("div.panel-body");
  return { el, mount() { try { p.mount(el, p.api); } catch (e) { el.append(h("div.notice.error", `${p.plugin}: ${e.message}`)); } }, shown: () => p.shown?.(), update: () => p.update?.() };
} });
const PANELS = () => [...BUILTIN, ...registry.panels.map(fromPlugin)];
const panels = new Map();
const panelEl = $("panel"), panelHead = h("div.dock-head"), panelBody = h("div.col.grow");
panelEl.append(panelHead, panelBody);
const ctx = {
  api, W, WS, ui, version: info.version,
  openTerminal: (spec) => WS.newTab(spec),
  showPanel: (id) => showPanel(id),
  refresh: () => render(),
  openFolder: (f) => openFolder(f),
  openPalette: () => openPalette(),
  runInNewTab: (command, spec) => runInNewTab(command, spec),
};

function showPanel(id, open = true) { ui.panelTab = id; if (open) setPanelOpen(true); saveUi(); renderPanel(); }
function renderPanel() {
  const list = PANELS();
  if (!list.some((p) => p.id === ui.panelTab)) ui.panelTab = "kit";
  clear(panelHead).append(
    h("div.dock", list.map((p) => h(`button${ui.panelTab === p.id ? ".on" : ""}`, { title: p.label, onclick: () => showPanel(p.id) }, icon(p.icon), h("span", p.label)))),
    h("div.grow"),
    iconButton("x", "Ocultar panel", () => setPanelOpen(false)),
  );
  for (const p of list) {
    let inst = panels.get(p.id);
    if (p.id === ui.panelTab && !inst) { inst = p.make(); inst.mount(ctx); panels.set(p.id, inst); panelBody.append(inst.el); }
    if (inst) { inst.el.classList.toggle("hidden", p.id !== ui.panelTab); if (p.id === ui.panelTab) inst.shown?.(); }
  }
}
new ResizeObserver(() => panelEl.classList.toggle("narrow", panelEl.offsetWidth < 330)).observe(panelEl);

// ---------- sizes, with a slide when something opens or closes ----------
function animate(fn) {
  document.body.classList.add("animate"); fn();
  clearTimeout(animate.t); animate.t = setTimeout(() => document.body.classList.remove("animate"), 320);
}
function applySizes() {
  const sb = $("sidebar");
  sb.style.width = `${ui.rail ? RAIL : ui.sidebar}px`; sb.classList.toggle("rail", ui.rail);
  panelEl.style.width = `${ui.panel}px`; panelEl.classList.toggle("closed", !ui.panelOpen);
  $("grip-right").classList.toggle("off", !ui.panelOpen);
}
function setPanelOpen(open) { if (ui.panelOpen === open) return; animate(() => { ui.panelOpen = open; applySizes(); }); saveUi(); renderTabbar(); }
function setRail(rail) {
  if (ui.rail === rail) return;
  // Fold: draw the rail's content once the width has slid in, so nothing squeezes on the way.
  ui.rail = rail; saveUi();
  if (rail) { animate(() => { $("sidebar").style.width = `${RAIL}px`; }); setTimeout(() => { applySizes(); renderSidebar(); }, 200); }
  else { renderSidebar(); animate(applySizes); }
}

// The grips: drag with pointer capture, so the drag follows the pointer anywhere until release.
function grip(el, { get, set: setW, min, max, sign }) {
  el.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    e.preventDefault(); el.setPointerCapture(e.pointerId); el.classList.add("drag"); document.body.classList.add("dragging");
    const x0 = e.clientX, w0 = get();
    const move = (ev) => setW(Math.round(Math.max(min(), Math.min(max(), w0 + sign * (ev.clientX - x0)))));
    const up = () => { el.releasePointerCapture(e.pointerId); el.classList.remove("drag"); document.body.classList.remove("dragging"); el.removeEventListener("pointermove", move); el.removeEventListener("pointerup", up); el.removeEventListener("pointercancel", up); saveUi(); };
    el.addEventListener("pointermove", move); el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
  });
}
// Dragging the left grip under 150 px folds the sidebar into its rail; dragging out unfolds it.
grip($("grip-left"), {
  get: () => (ui.rail ? RAIL : ui.sidebar), min: () => RAIL, max: () => 480, sign: 1,
  set: (w) => {
    const rail = w < 150;
    if (rail !== ui.rail) { ui.rail = rail; renderSidebar(); }
    if (!rail) ui.sidebar = Math.max(180, w);
    applySizes();
  },
});
grip($("grip-right"), { get: () => ui.panel, min: () => 300, max: () => Math.min(900, innerWidth - 500), sign: -1, set: (w) => { ui.panel = w; applySizes(); } });

const spaceKeyLabel = (i) => (W.mac ? `⌘${i + 1}` : `Alt+${i + 1}`);

// ---------- sidebar ----------
const STATUS_COLOR = { working: "var(--working)", blocked: "var(--blocked)", done: "var(--done)", idle: "var(--idle)" };
function renderSidebar() {
  const sb = clear($("sidebar")), rail = ui.rail;
  sb.append(h("div.brand",
    h("img", { src: "../../assets/icon.png", alt: "", title: "Mooser" }),
    h("b.grow.wide-only", "Mooser"),
    iconButton("search", W.mac ? "Comandos (⌘⇧P)" : "Comandos (Ctrl+Shift+P)", openPalette, "wide-only"),
    iconButton("sidebar", rail ? "Expandir barra" : "Plegar barra", () => setRail(!rail)),
  ));
  sb.append(h("div.section-head", h("span.grow.wide-only", "Espacios"), iconButton("plus", "Nuevo espacio", () => pickSpace())));
  sb.append(h("div.list", { style: { flex: "1 1 50%" } }, W.spaces.map((s, i) => {
    const st = WS.spaceStatus(s);
    return h(`div.space${s.id === W.active ? ".on" : ""}`, {
      title: `${WS.label(s)} — ${s.folder}${i < 9 ? ` (${spaceKeyLabel(i)})` : ""}`, onclick: () => WS.selectSpace(s.id),
      oncontextmenu: (e) => { e.preventDefault(); spaceMenu(s, { x: e.clientX, y: e.clientY }); },
    },
    h("div.tile", { style: { background: s.color } }, WS.label(s).slice(0, 1).toUpperCase()),
    rail ? null : h("div.grow.col", h("span.trunc", { translate: "no" }, WS.label(s)), h("span.meta.trunc", `${s.tabs.length} ${s.tabs.length === 1 ? "pestaña" : "pestañas"}${i < 9 ? ` · ${spaceKeyLabel(i)}` : ""}`)),
    st && st !== "idle" ? h(`span.dot.${st}`) : null);
  })));
  const list = WS.agents();
  sb.append(h("div.divider"), h("div.section-head", h("span.grow.wide-only", list.length ? `Agentes · ${list.length}` : "Agentes")));
  sb.append(h("div.list", { style: { flex: "1 1 50%" } },
    list.length ? list.map((a) => h("div.agent", { title: `${a.agent} en ${WS.label(a.space)} — ${STATUS_WORD[a.status]}`, onclick: () => WS.focusPane(a.pane.id) },
      rail ? [h("div.tile", { style: { background: a.space.color } }, a.agent.slice(0, 1)), h(`span.dot.badge.${a.status}`)]
        : [h(`span.dot.${a.status}`), h("div.grow.col", h("span.trunc", a.agent), h("span.sub.trunc", h("span", { translate: "no" }, WS.label(a.space)), " · ", h("span", { style: { color: STATUS_COLOR[a.status] } }, STATUS_WORD[a.status])))]))
      : rail ? [] : [h("div.dim", { style: { padding: "4px 10px", fontSize: "12px" } }, "Abre Claude Code, Codex o Gemini en una pestaña y aparecerá aquí con su estado.")]));
  sb.append(h("div.foot",
    h("div.foot-row", { title: W.mac ? "Configuración (⌘,)" : "Configuración (Ctrl+,)", onclick: () => openSettings(ctx) }, icon("cpu", 14), rail ? null : "Configuración")));
}

function spaceMenu(s, at) {
  menu([
    { label: "Nueva pestaña aquí", icon: "plus", run: () => WS.newTab({}, s) },
    { label: "Renombrar…", icon: "pencil", run: () => promptText("Nombre del espacio", WS.label(s), (v) => WS.renameSpace(s.id, v)) },
    { label: "Abrir carpeta", icon: "external", run: () => api.shell.open(s.folder) },
    "-",
    { label: "Cerrar espacio", icon: "x", run: () => WS.closeSpace(s.id) },
  ], at);
}
async function pickSpace() { const f = await api.dialog.folder("Carpeta del nuevo espacio"); if (f) openFolder(f); }
function openFolder(f) {
  const s = W.spaces.find((x) => x.folder.toLowerCase() === String(f).toLowerCase());
  if (s) WS.selectSpace(s.id); else WS.newSpace(f);
  return s ?? WS.space();
}
// A new tab that types a command in your shell (so it gets your PATH and stays open after).
function runInNewTab(command, spec = {}) {
  const t = WS.newTab(spec);
  if (command) sendLine(t, command);
  return t?.id;
}
function sendLine(t, text, tries = 0) {
  const p = WS.panesOf(t)[0], rt = p && W.panes.get(p.id);
  if (rt?.termId) setTimeout(() => api.term.write(rt.termId, `${text}\r`), 400);
  else if (tries < 40) setTimeout(() => sendLine(t, text, tries + 1), 150);
}

// ---------- tab bar ----------
function newTabMenu(at) {
  const agents = (set().agents ?? []).filter((a) => a.command);
  menu([
    { label: "Terminal", icon: "terminal", key: W.mac ? "⌘T" : "Ctrl+Shift+T", run: () => WS.newTab({}) },
    ...agents.map((a) => ({ label: a.label || a.command, icon: /claude/i.test(a.command) ? "sparkles" : "bot", run: () => runInNewTab(a.command) })),
    "-",
    { label: "Editar esta lista…", icon: "pencil", run: () => openSettings(ctx, "agents") },
  ], at);
}
function renderTabbar() {
  const bar = clear($("tabbar")), s = WS.space();
  bar.append(h("div#tabs", (s?.tabs ?? []).map((t, i) => {
    const st = WS.tabStatus(t);
    return h(`div.tab${t.id === s.activeTab ? ".on" : ""}`, {
      title: WS.tabLabel(t, i), onclick: () => WS.selectTab(t.id), ondblclick: () => promptText("Nombre de la pestaña", t.name ?? "", (v) => WS.renameTab(t.id, v)),
      onauxclick: (e) => { if (e.button === 1) WS.closeTab(t.id); },
    },
    st ? h(`span.dot.${st}`) : icon("terminal", 13),
    h("span.trunc", t.name ? { translate: "no" } : null, WS.tabLabel(t, i)),
    h("span.x", { title: "Cerrar pestaña", onclick: (e) => { e.stopPropagation(); WS.closeTab(t.id); } }, icon("x")));
  })));
  bar.append(iconButton("plus", "Nueva pestaña", (e) => (s ? newTabMenu(e.currentTarget) : pickSpace())));
  bar.append(h("div.drag-space"));
  bar.append(iconButton("panel", ui.panelOpen ? "Ocultar panel lateral" : "Mostrar panel lateral", () => setPanelOpen(!ui.panelOpen), ui.panelOpen ? "on" : ""));
  if (!W.mac) bar.append(
    h("button.win-btn", { title: "Minimizar", onclick: api.win.minimize }, icon("minus")),
    h("button.win-btn", { title: "Maximizar", onclick: api.win.maximize }, icon("square")),
    h("button.win-btn.close", { title: "Cerrar", onclick: api.win.close }, icon("x")));
}

// ---------- status bar ----------
let usageCache = null;
ctx.setUsage = (u) => { usageCache = u; renderStatus(); };
function renderStatus() {
  const bar = clear($("status")), list = WS.agents(), busy = list.filter((a) => a.status === "working").length, need = list.filter((a) => a.status === "blocked").length;
  bar.append(h("span.row", icon("app", 13), W.mac ? "Este Mac" : "Este equipo"));
  bar.append(h("span", list.length ? `${list.length} ${list.length === 1 ? "agente" : "agentes"}${busy ? `, ${busy} trabajando` : ""}${need ? `, ${need} te necesita${need > 1 ? "n" : ""}` : ""}` : "Sin agentes"));
  if (usageCache?.five) bar.append(h("span.meter", { title: "Ver uso de Claude", onclick: () => showPanel("usage") }, `Claude 5 h ${Math.round(usageCache.five.utilization ?? 0)}%`, usageCache.week ? ` · semana ${Math.round(usageCache.week.utilization ?? 0)}%` : ""));
  for (const it of registry.status) { try { const el = it.render(); if (el) bar.append(el); } catch (e) { console.error(`[plugin ${it.plugin}]`, e); } }
  bar.append(h("span.grow"));
  if (registry.errors.length) bar.append(h("span.meter", { style: { color: "var(--blocked)" }, title: registry.errors.map((e) => `${e.plugin}: ${e.error}`).join("\n"), onclick: () => api.shell.editor(`${Settings.S.dir}/plugins/${registry.errors[0].plugin}/main.js`) }, `${registry.errors.length} plugin con error`));
  if (Settings.S.error) bar.append(h("span.meter", { style: { color: "var(--blocked)" }, title: Settings.S.error, onclick: () => api.shell.editor(`${Settings.S.dir}/settings.json`) }, "settings.json con error"));
  bar.append(h("span.dim", W.mac ? "⌘⇧P comandos" : "Ctrl+Shift+P comandos"));
}

// ---------- the empty window ----------
W.emptyView = () => h("div.empty",
  h("img", { src: "../../assets/icon.png", alt: "" }),
  h("h2", "Bienvenido a Mooser"),
  h("span", "Abre una carpeta de proyecto para empezar. Cada carpeta es un espacio con sus pestañas y agentes."),
  h("div.row", { style: { gap: "8px", marginTop: "6px" } },
    h("button.btn.primary", { onclick: pickSpace }, icon("folder"), "Abrir carpeta"),
    h("button.btn", { onclick: () => openFolder(W.home) }, icon("home"), "Empezar en tu carpeta personal")));

// ---------- alerts ----------
let windowFocused = document.hasFocus();
api.win.onFocus((f) => { windowFocused = f; });
W.onStatus = (now, prev) => {
  Plugins.emitAgentStatus(now);
  if (!now.agent || !prev || prev.status === now.status) return;
  const pane = [...W.panes].find(([, r]) => r.termId === now.id)?.[0];
  if (windowFocused && pane === W.focusedPane) return;
  const at = pane && WS.locate(pane), where = at ? WS.label(at.space) : "";
  if (now.status === "blocked") alertUser(`${now.agent} te necesita`, where, "blocked", pane);
  else if (now.status === "done") alertUser(`${now.agent} terminó`, where, "done", pane);
};
function alertUser(title, body, kind, pane) {
  const a = set().alerts ?? {};
  if (a.sound !== false) chime(kind);
  if (windowFocused) toast(title, body, () => pane && WS.focusPane(pane));
  else if (a.notifications !== false) api.app.notify({ title, body, silent: true });
}

// ---------- palette ----------
const commands = () => [
  { label: "Nuevo espacio (abrir carpeta)…", icon: "folder", key: W.mac ? "⌘⇧N" : "Ctrl+Shift+N", run: pickSpace },
  { label: "Nueva pestaña", icon: "plus", key: W.mac ? "⌘T" : "Ctrl+Shift+T", run: () => WS.newTab({}) },
  ...(set().agents ?? []).filter((a) => a.command).map((a) => ({ label: `Nueva pestaña con ${a.label || a.command}`, icon: "sparkles", run: () => runInNewTab(a.command) })),
  { label: "Dividir a la derecha", icon: "splitRight", key: W.mac ? "⌘D" : "Ctrl+Shift+D", run: () => WS.split("row") },
  { label: "Dividir hacia abajo", icon: "splitDown", key: W.mac ? "⌘⇧D" : "Ctrl+Shift+E", run: () => WS.split("col") },
  { label: "Ampliar o restaurar panel", icon: "maximize", key: W.mac ? "⌘⇧Enter" : "Ctrl+Shift+Z", run: WS.toggleZoom },
  { label: "Cerrar panel", icon: "x", key: W.mac ? "⌘W" : "Ctrl+Shift+W", run: () => WS.closePane() },
  { label: ui.panelOpen ? "Ocultar panel lateral" : "Mostrar panel lateral", icon: "panel", key: W.mac ? "⌘J" : "Ctrl+Shift+J", run: () => setPanelOpen(!ui.panelOpen) },
  { label: ui.rail ? "Expandir barra lateral" : "Plegar barra lateral", icon: "sidebar", key: W.mac ? "⌘B" : "Ctrl+Shift+B", run: () => setRail(!ui.rail) },
  ...PANELS().map((p) => ({ label: `Abrir ${p.label}`, icon: p.icon, run: () => showPanel(p.id) })),
  { label: "Configuración", icon: "cpu", key: W.mac ? "⌘," : "Ctrl+,", run: () => openSettings(ctx) },
  { label: "Cambiar tema…", icon: "sparkles", run: () => openSettings(ctx, "look") },
  { label: "Recargar ventana", icon: "refresh", run: () => api.config.reload() },
  { label: "Texto más grande", icon: "plus", key: W.mac ? "⌘+" : "Ctrl+=", run: () => zoom(1) },
  { label: "Texto más pequeño", icon: "minus", key: W.mac ? "⌘-" : "Ctrl+-", run: () => zoom(-1) },
  { label: "Atajos de teclado", icon: "keyboard", run: showKeys },
  ...registry.commands.map((c) => ({ ...c, run: () => { try { c.run(); } catch (e) { toast(`Error en ${c.plugin}`, e.message); } } })),
  ...W.spaces.map((s) => ({ label: `Ir a ${WS.label(s)}`, icon: "folder", run: () => WS.selectSpace(s.id) })),
  ...WS.agents().map((a) => ({ label: `Agente: ${a.agent} en ${WS.label(a.space)} (${STATUS_WORD[a.status]})`, icon: "bot", run: () => WS.focusPane(a.pane.id) })),
];
function openPalette() {
  if (document.querySelector(".palette")) return;
  const all = commands();
  let sel = 0, shown = all;
  const inp = h("input", { placeholder: "Escribe un comando o un espacio…", spellcheck: false });
  const opts = h("div.opts");
  const ov = h("div.overlay", { onmousedown: (e) => { if (e.target === ov) close(); } }, h("div.modal.palette", inp, opts));
  const close = () => { ov.remove(); WS.focusPane(W.focusedPane); };
  const paint = () => { clear(opts).append(...shown.map((c, i) => h(`div.opt${i === sel ? ".on" : ""}`, { onmouseenter: () => { sel = i; paint(); }, onclick: () => { close(); c.run(); } }, icon(c.icon), h("span.trunc", c.label), c.key ? h("span.key", c.key) : null))); opts.children[sel]?.scrollIntoView({ block: "nearest" }); };
  inp.addEventListener("input", () => { const q = inp.value.toLowerCase().trim(); shown = q ? all.filter((c) => q.split(/\s+/).every((w) => c.label.toLowerCase().includes(w))) : all; sel = 0; paint(); });
  inp.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { sel = Math.min(shown.length - 1, sel + 1); paint(); e.preventDefault(); }
    else if (e.key === "ArrowUp") { sel = Math.max(0, sel - 1); paint(); e.preventDefault(); }
    else if (e.key === "Enter") { const c = shown[sel]; close(); c?.run(); }
    else if (e.key === "Escape") close();
  });
  document.body.append(ov); paint(); inp.focus();
}
function showKeys() {
  const rows = commands().filter((c) => c.key).concat([
    { label: "Ir al espacio 1…9", key: W.mac ? "⌘1…9" : "Alt+1…9" }, { label: "Pestaña siguiente / anterior", key: W.mac ? "⌘⇧] / ⌘⇧[" : "Ctrl+Tab / Ctrl+Shift+Tab" },
    { label: "Moverse entre paneles", key: W.mac ? "⌘⌥flechas" : "Alt+flechas" }, { label: "Copiar / pegar en la terminal", key: W.mac ? "⌘C / ⌘V" : "Ctrl+Shift+C / V" },
  ]);
  const ov = h("div.overlay", { onmousedown: (e) => { if (e.target === ov) ov.remove(); } },
    h("div.modal", h("div.palette", h("div.opts", h("div", { style: { padding: "8px 10px", fontWeight: 600 } }, "Atajos de teclado"),
      rows.map((r) => h("div.opt", h("span.grow.trunc", r.label), h("span.key", r.key)))))));
  addEventListener("keydown", function esc(e) { if (e.key === "Escape") { ov.remove(); removeEventListener("keydown", esc); } });
  document.body.append(ov);
}
function promptText(title, value, done) {
  const inp = h("input", { value, spellcheck: false, style: { height: "44px", padding: "0 14px", fontSize: "14px" } });
  const ov = h("div.overlay", { onmousedown: (e) => { if (e.target === ov) ov.remove(); } }, h("div.modal", h("div", { style: { padding: "12px 14px 0", color: "var(--muted)", fontSize: "12px" } }, title), inp));
  inp.addEventListener("keydown", (e) => { if (e.key === "Enter") { ov.remove(); done(inp.value.trim()); } else if (e.key === "Escape") ov.remove(); });
  document.body.append(ov); inp.focus(); inp.select();
}
ctx.promptText = promptText;
function zoom(step) { const size = Math.max(9, Math.min(28, (set().terminal?.fontSize ?? 14) + step)); Settings.set({ terminal: { fontSize: size } }); }

// ---------- keys ----------
// Ctrl+Shift+<key> on Windows (plain Ctrl stays the terminal's), ⌘ on macOS.
function shortcut(e) {
  const k = e.code;
  // Spaces and panes: Alt+1…9 and Alt+arrows; on macOS ⌘1…9 and ⌘⌥arrows, so Option stays the
  // terminal's (⌥← / ⌥→ move by word).
  const spaceKey = W.mac ? e.metaKey && !e.altKey && !e.ctrlKey && !e.shiftKey : e.altKey && !e.ctrlKey && !e.metaKey;
  const paneKey = W.mac ? e.metaKey && e.altKey && !e.ctrlKey : e.altKey && !e.ctrlKey && !e.metaKey;
  if (spaceKey && /^Digit[1-9]$/.test(k)) { const s = W.spaces[Number(k.slice(5)) - 1]; if (s) WS.selectSpace(s.id); return true; }
  const dir = paneKey && { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" }[e.key];
  if (dir) { WS.moveFocus(dir); return true; }
  if (!W.mac && e.altKey && !e.ctrlKey && !e.metaKey) return false;
  if (W.mac && e.metaKey && e.shiftKey && (k === "BracketLeft" || k === "BracketRight")) { WS.cycleTab(k === "BracketLeft" ? -1 : 1); return true; }
  if (e.ctrlKey && e.key === "Tab") { WS.cycleTab(e.shiftKey ? -1 : 1); return true; }
  if ((W.mac ? e.metaKey : e.ctrlKey) && !e.shiftKey && k === "Comma") { openSettings(ctx); return true; }
  const mod = W.mac ? e.metaKey : e.ctrlKey && e.shiftKey;
  if (!mod) {
    if (!W.mac && e.ctrlKey && !e.shiftKey && (e.key === "=" || e.key === "+")) { zoom(1); return true; }
    if (!W.mac && e.ctrlKey && !e.shiftKey && e.key === "-") { zoom(-1); return true; }
    return false;
  }
  const map = W.mac
    ? { KeyT: () => WS.newTab({}), KeyW: () => WS.closePane(), KeyD: () => WS.split(e.shiftKey ? "col" : "row"), KeyN: e.shiftKey ? pickSpace : null, KeyP: e.shiftKey ? openPalette : null, KeyJ: () => setPanelOpen(!ui.panelOpen), KeyB: () => setRail(!ui.rail), Enter: e.shiftKey ? WS.toggleZoom : null, Equal: () => zoom(1), Minus: () => zoom(-1) }
    : { KeyT: () => WS.newTab({}), KeyW: () => WS.closePane(), KeyD: () => WS.split("row"), KeyE: () => WS.split("col"), KeyN: pickSpace, KeyP: openPalette, KeyJ: () => setPanelOpen(!ui.panelOpen), KeyB: () => setRail(!ui.rail), KeyZ: WS.toggleZoom };
  const fn = map[k];
  if (fn) { fn(); return true; }
  return false;
}
W.isAppShortcut = (e) => { if (shortcut(e)) { e.preventDefault(); return true; } return false; };
addEventListener("keydown", (e) => { if (e.target.closest?.(".xterm")) return; if (shortcut(e)) e.preventDefault(); });

// ---------- live changes to ~/.mooser ----------
api.config.onChange(async (files) => {
  if (files.some((f) => f.startsWith("plugins/") && f.endsWith(".js"))) { await Settings.load(); if (Object.values(set().plugins ?? {}).some(Boolean)) api.config.reload(); return; }
  if (files.some((f) => f === "custom.css")) Settings.reloadCss();
  if (files.some((f) => f === "settings.json" || f.startsWith("backgrounds/"))) {
    const before = JSON.stringify(set().plugins ?? {});
    await Settings.load();
    if (JSON.stringify(set().plugins ?? {}) !== before) api.config.reload();
    render();
  }
});

// ---------- render loop ----------
let frame = 0;
function render() {
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    renderSidebar(); renderTabbar(); renderStatus(); WS.renderPanes($("tabhost"));
    panels.get(ui.panelTab)?.update?.();
  });
}
W.onChange = render;
Settings.onChange(() => render());

WS.restore(await api.app.loadState());
await Plugins.loadAll(ctx);
startTranslator();
applySizes(); renderPanel(); render();
// The usage meter in the status bar reads the usage panel, even before that panel is opened.
if (!panels.has("usage")) { const u = BUILTIN.find((p) => p.id === "usage").make(); u.mount(ctx); u.el.classList.add("hidden"); panelBody.append(u.el); panels.set("usage", u); }
