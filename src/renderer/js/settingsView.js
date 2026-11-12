// The Settings window: every setting in one place, written to ~/.mooser/settings.json.
import { h, icon, clear, button, toggle } from "./ui.js";
import * as Settings from "./settings.js";
import { PRESETS } from "./settings.js";

const api = window.mooser;
const SECTIONS = [
  { id: "look", label: "Apariencia", icon: "sparkles" },
  { id: "terminal", label: "Terminal", icon: "terminal" },
  { id: "alerts", label: "Avisos", icon: "zap" },
  { id: "agents", label: "Agentes", icon: "bot" },
  { id: "about", label: "Acerca de", icon: "app" },
];

let section = "look";
export function openSettings(ctx, at = section) {
  section = at;
  document.querySelector(".settings-overlay")?.remove();
  const nav = h("nav.settings-nav"), body = h("div.settings-body");
  const ov = h("div.overlay.settings-overlay", { onmousedown: (e) => { if (e.target === ov) close(); } },
    h("div.modal.settings", h("div.row.settings-head", icon("cpu"), h("b.grow", "Configuración"), h("span.dim.trunc", { style: { fontSize: "11.5px" } }, Settings.S.dir + "/settings.json"), h("button.icon-btn", { title: "Cerrar", onclick: () => close() }, icon("x"))),
      h("div.settings-main", nav, body)));
  const close = () => { off(); ov.remove(); removeEventListener("keydown", esc); };
  const esc = (e) => { if (e.key === "Escape") close(); };
  addEventListener("keydown", esc);
  const paint = () => {
    clear(nav).append(...SECTIONS.map((s) => h(`button.opt${section === s.id ? ".on" : ""}`, { onclick: () => { section = s.id; paint(); } }, icon(s.icon, 14), h("span", s.label))));
    const keep = body.scrollTop;
    clear(body).append(...render(ctx, section, paint));
    body.scrollTop = keep;
  };
  // A change to the file from anywhere (Claude, by hand) shows here too, unless you are typing.
  const off = Settings.onChange(() => { if (!body.contains(document.activeElement) || document.activeElement.type === "range") paint(); });
  document.body.append(ov); paint();
}

// ---------- controls ----------
const debounce = (fn, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const save = debounce((patch) => Settings.set(patch));
function row(title, hint, control) {
  return h("div.set-row", h("div.col.grow", h("span.set-title", title), hint ? h("span.set-hint", hint) : null), control);
}
function sw(on, patch) { return toggle(on, () => Settings.set(patch(!on))); }
function slider(value, min, max, step, onInput, fmt = (v) => v) {
  const out = h("span.set-val", fmt(value));
  const r = h("input", { type: "range", min, max, step, value, oninput: (e) => { out.textContent = fmt(Number(e.target.value)); onInput(Number(e.target.value)); } });
  return h("div.row.set-slider", r, out);
}
function text(value, placeholder, onChange, props = {}) {
  return h("label.field", { style: { width: props.width ?? "240px" } }, h("input", { value: value ?? "", placeholder, spellcheck: false, ...props, oninput: (e) => onChange(e.target.value) }));
}
function select(value, options, onChange) {
  return h("select.set-select", { onchange: (e) => onChange(e.target.value) }, options.map(([v, l]) => h("option", { value: v, selected: v === value }, l)));
}

function render(ctx, id, repaint) {
  const s = Settings.get(), a = s.appearance, t = s.terminal, al = s.alerts;
  if (id === "look") {
    const p = Settings.preset();
    return [
      row("Idioma", "Cambiar el idioma recarga la ventana; tus terminales siguen abiertas.", select(s.language ?? "auto", [["auto", "Automático (el del sistema)"], ["es", "Español"], ["en", "English"]],
        (v) => Settings.set({ language: v }).then(() => api.config.reload()))),
      h("h3", "Tema"),
      h("div.presets", Object.entries(PRESETS).map(([key, pr]) => h(`button.preset${s.theme === key ? ".on" : ""}`, { onclick: () => Settings.set({ theme: key, appearance: { accent: null } }) },
        h("span.preset-swatch", { style: { background: pr.bg === "image" ? `url("${pr.image}") center / cover` : pr.bg } }, h("i", { style: { background: pr.accent } })),
        h("span", pr.name)))),
      row("Color de acento", "Botones, selección y foco. Vacío: el del tema.", h("div.row",
        h("input.set-color", { type: "color", value: a.accent || p.accent, oninput: (e) => save({ appearance: { accent: e.target.value } }) }),
        a.accent ? button("Usar el del tema", () => Settings.set({ appearance: { accent: null } })) : null)),
      row("Fondo", a.background && a.background !== "preset" && a.background !== "none" ? a.background : null, h("div.row",
        select(a.background === "none" ? "none" : a.background && a.background !== "preset" ? "custom" : "preset", [["preset", "El del tema"], ["none", "Color liso"], ["custom", "Imagen propia"]], async (v) => {
          if (v === "custom") { const f = await api.config.background(); if (f) Settings.set({ appearance: { background: f } }); else repaint(); }
          else Settings.set({ appearance: { background: v } });
        }))),
      row("Opacidad del cristal", "Cuánto tapan los paneles el fondo.", slider(a.glass, 0.2, 1, 0.02, (v) => save({ appearance: { glass: v } }), (v) => `${Math.round(v * 100)}%`)),
      row("Desenfoque", null, slider(a.blur, 0, 40, 1, (v) => save({ appearance: { blur: v } }), (v) => `${v}px`)),
      row("Esquinas", null, slider(a.radius, 0, 28, 1, (v) => save({ appearance: { radius: v } }), (v) => `${v}px`)),
      row("Separación", "Entre paneles y bordes.", slider(a.gap, 4, 20, 1, (v) => save({ appearance: { gap: v } }), (v) => `${v}px`)),
      row("Tamaño del texto de la interfaz", null, slider(a.uiFontSize, 11, 16, 0.5, (v) => save({ appearance: { uiFontSize: v } }), (v) => `${v}px`)),
      row("Animaciones", "Deslizar al plegar o abrir paneles.", sw(a.animations !== false, (v) => ({ appearance: { animations: v } }))),
    ];
  }
  if (id === "terminal") return [
    h("h3", "Terminal"),
    row("Fuente", "Vacío: Cascadia Code, SF Mono, Menlo o Consolas.", text(t.fontFamily, "Cascadia Code", (v) => save({ terminal: { fontFamily: v } }))),
    row("Tamaño", W_KEYS(), slider(t.fontSize, 9, 28, 1, (v) => save({ terminal: { fontSize: v } }), (v) => `${v}px`)),
    row("Interlineado", null, slider(t.lineHeight, 1, 1.6, 0.05, (v) => save({ terminal: { lineHeight: v } }), (v) => v.toFixed(2))),
    row("Cursor", null, select(t.cursorStyle, [["block", "Bloque"], ["bar", "Barra"], ["underline", "Subrayado"]], (v) => Settings.set({ terminal: { cursorStyle: v } }))),
    row("Cursor parpadeante", null, sw(t.cursorBlink, (v) => ({ terminal: { cursorBlink: v } }))),
    row("Copiar al seleccionar", "Copia el texto en cuanto lo seleccionas.", sw(t.copyOnSelect, (v) => ({ terminal: { copyOnSelect: v } }))),
    row("Historial", "Líneas que guarda cada terminal.", select(String(t.scrollback), [["1000", "1 000"], ["5000", "5 000"], ["10000", "10 000"], ["50000", "50 000"]], (v) => Settings.set({ terminal: { scrollback: Number(v) } }))),
    row("Shell", "Vacío: automático (PowerShell 7 o Windows PowerShell en Windows; tu $SHELL en macOS). Se aplica a las terminales nuevas.", text(t.shell, "Automático", (v) => save({ terminal: { shell: v } }), { width: "280px" })),
  ];
  if (id === "alerts") return [
    h("h3", "Avisos"),
    row("Sonido", "Un sonido suave cuando un agente te necesita o termina y no lo estás mirando.", sw(al.sound, (v) => ({ alerts: { sound: v } }))),
    row("Notificaciones del sistema", "Cuando Mooser no es la ventana activa.", sw(al.notifications, (v) => ({ alerts: { notifications: v } }))),
    row("Restablecimiento de Claude", "Avisar cuando se restablece tu sesión de 5 horas.", sw(al.usageReset, (v) => ({ alerts: { usageReset: v } }))),
  ];
  if (id === "agents") {
    const list = s.agents ?? [];
    const update = (i, k, v) => { const next = list.map((x, j) => (j === i ? { ...x, [k]: v } : x)); save({ agents: next }); };
    return [
      h("h3", "Agentes del botón +"),
      h("span.set-hint", "Lo que aparece al pulsar + en la barra de pestañas. El comando se escribe en una terminal nueva, así usa tu PATH."),
      ...list.map((x, i) => h("div.row", { style: { gap: "8px" } },
        text(x.label, "Nombre", (v) => update(i, "label", v), { width: "180px" }),
        text(x.command, "Comando", (v) => update(i, "command", v), { width: "260px", className: "mono" }),
        h("button.icon-btn", { title: "Quitar", onclick: () => Settings.set({ agents: list.filter((_, j) => j !== i) }) }, icon("trash", 14)))),
      h("div", button("Añadir agente", () => Settings.set({ agents: [...list, { label: "Nuevo agente", command: "" }] }), { ic: "plus" })),
    ];
  }
  return [
    h("div.col", { style: { alignItems: "center", gap: "10px", padding: "20px 0" } },
      h("img", { src: "../../assets/icon.png", style: { width: "88px", height: "88px", borderRadius: "22px" } }),
      h("b", { style: { fontSize: "18px" } }, "Mooser"),
      h("span.dim", `Versión ${ctx.version}`),
      h("span.set-hint", { style: { textAlign: "center", maxWidth: "420px" } }, "Un hogar tranquilo para tus terminales y tus agentes de IA. Código abierto con licencia MIT.")),
  ];
}
const W_KEYS = () => (window.mooserMac ? "También con ⌘+ y ⌘-." : "También con Ctrl+= y Ctrl+-.");
