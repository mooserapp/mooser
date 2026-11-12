// Small DOM helpers shared by every part of the page: an element builder, the icon set, menus,
// toasts and a chime.

// h("div.row.grow", { onclick, title }, child, ...): tag with optional .classes; props become
// properties (on* handlers, className, value...) or attributes (data-*, aria-*).
export function h(spec, props, ...children) {
  const [head, ...cls] = spec.split(".");
  const [tag, id] = head.split("#");
  const el = document.createElement(tag || "div");
  if (id) el.id = id;
  if (cls.length) el.className = cls.join(" ");
  if (props && (typeof props !== "object" || props instanceof Node || Array.isArray(props))) { children.unshift(props); props = null; }
  for (const [k, v] of Object.entries(props ?? {})) {
    if (v == null || v === false) continue;
    if (k === "style" && typeof v === "object") Object.assign(el.style, v);
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else if (k in el && !k.includes("-")) el[k] = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children.flat(Infinity)) if (c != null && c !== false) el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return el;
}
export const clear = (el) => { while (el.firstChild) el.firstChild.remove(); return el; };

const P = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  sidebar: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/>',
  panel: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M15 3v18"/>',
  splitRight: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 3v18"/>',
  splitDown: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 12h18"/>',
  maximize: '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>',
  folder: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
  git: '<circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M6 21V9a9 9 0 0 0 9 9"/>',
  file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/>',
  fileCode: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="m10 13-2 2 2 2"/><path d="m14 17 2-2-2-2"/>',
  fileText: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M16 13H8M16 17H8M10 9H8"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
  archive: '<rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8M10 12h4"/>',
  app: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="m6 10 3 2-3 2M12 14h4"/>',
  up: '<path d="m18 15-6-6-6 6"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-9-9c2.5 0 4.9 1 6.7 2.7L21 8"/><path d="M21 3v5h-5"/>',
  home: '<path d="M3 10a2 2 0 0 1 .7-1.5l7-6a2 2 0 0 1 2.6 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M15 21v-8H9v8"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M10.7 5.1A10.7 10.7 0 0 1 22 12a14 14 0 0 1-1.5 2.5M14.1 14.2a3 3 0 0 1-4.2-4.2M17.5 17.5A10.7 10.7 0 0 1 2 12a14 14 0 0 1 4.5-5.1M2 2l20 20"/>',
  pencil: '<path d="M21.2 6.8a1 1 0 0 0-4-4L3.8 16.2a2 2 0 0 0-.5.8l-1.3 4.4a.5.5 0 0 0 .6.6l4.4-1.3a2 2 0 0 0 .8-.5z"/>',
  move: '<path d="M2 9V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.7.9l.8 1.2a2 2 0 0 0 1.7.9H20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-1M2 13h10M9 16l3-3-3-3"/>',
  copy: '<rect x="8" y="8" width="14" height="14" rx="2"/><path d="M4 16a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2"/>',
  trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  external: '<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  rocket: '<path d="M4.5 16.5c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.8.7-2.1-.1-2.9a2.2 2.2 0 0 0-2.9-.1z"/><path d="m12 15-3-3a22 22 0 0 1 2-4A12.9 12.9 0 0 1 22 2c0 2.7-.8 7.5-6 11a22.4 22.4 0 0 1-4 2z"/><path d="M9 12H4s.6-3 2-4c1.6-1.1 5 0 5 0M12 15v5s3-.6 4-2c1.1-1.6 0-5 0-5"/>',
  sparkles: '<path d="M9.9 15.5a2 2 0 0 0-1.4-1.4l-6.1-1.6a.5.5 0 0 1 0-1l6.1-1.6a2 2 0 0 0 1.4-1.4l1.6-6.1a.5.5 0 0 1 1 0l1.6 6.1a2 2 0 0 0 1.4 1.4l6.1 1.6a.5.5 0 0 1 0 1l-6.1 1.6a2 2 0 0 0-1.4 1.4l-1.6 6.1a.5.5 0 0 1-1 0z"/><path d="M20 3v4M22 5h-4"/>',
  bot: '<path d="M12 8V4H8"/><rect x="4" y="8" width="16" height="12" rx="2"/><path d="M2 14h2M20 14h2M15 13v2M9 13v2"/>',
  plug: '<path d="M12 22v-5M9 8V2M15 8V2M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z"/>',
  puzzle: '<path d="M15.4 7.4a1 1 0 0 0 1.2.9 2.5 2.5 0 1 1 1.6 3.3 1 1 0 0 0-1.2.9V17a1 1 0 0 1-1 1h-4.6a1 1 0 0 1-.9-1.2 2.5 2.5 0 1 0-3.3 1.6 1 1 0 0 1 .9 1.2V21H3a1 1 0 0 1-1-1v-4.6a1 1 0 0 1 1.2-1 2.5 2.5 0 1 0 0-4.8 1 1 0 0 1-1.2-1V4a1 1 0 0 1 1-1h4.6a1 1 0 0 1 1 1.2 2.5 2.5 0 1 0 4.8 0 1 1 0 0 1 1-1.2H17a1 1 0 0 1 1 1z"/>',
  cpu: '<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6" rx="1"/><path d="M15 2v2M15 20v2M2 15h2M2 9h2M20 15h2M20 9h2M9 2v2M9 20v2"/>',
  server: '<rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 7.5h.01M7 16.5h.01"/>',
  gauge: '<path d="m12 14 4-4"/><path d="M3.3 19a10 10 0 1 1 17.3 0"/>',
  terminal: '<path d="m4 17 6-6-6-6M12 19h8"/>',
  transfer: '<path d="M16 3l4 4-4 4M20 7H4M8 21l-4-4 4-4M4 17h16"/>',
  keyboard: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10"/>',
  zap: '<path d="M4 14a1 1 0 0 1-.8-1.6l9.9-10.2a.5.5 0 0 1 .9.5l-1.9 6A1 1 0 0 0 13 10h7a1 1 0 0 1 .8 1.6l-9.9 10.2a.5.5 0 0 1-.9-.5l1.9-6A1 1 0 0 0 11 14z"/>',
  code: '<path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  minus: '<path d="M5 12h14"/>',
  square: '<rect x="5" y="5" width="14" height="14" rx="1.5"/>',
  key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/>',
};
export function icon(name, size) {
  const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("class", "i");
  if (size) { s.style.width = `${size}px`; s.style.height = `${size}px`; }
  s.innerHTML = P[name] ?? P.file;
  return s;
}

export const button = (text, onclick, { kind, ic, title, disabled } = {}) =>
  h(`button.btn${kind ? `.${kind}` : ""}`, { onclick, title, disabled }, ic ? icon(ic) : null, text);
export const iconButton = (ic, title, onclick, cls = "") => h(`button.icon-btn${cls ? `.${cls}` : ""}`, { title, "aria-label": title, onclick }, icon(ic));
export const toggle = (on, onclick, title) => h(`button.switch${on ? ".on" : ""}`, { onclick, title, role: "switch", "aria-checked": String(on) }, h("i"));
export const field = (input, ic) => h("label.field", ic ? icon(ic) : null, input);
export const input = (placeholder, value = "", props = {}) => h("input", { placeholder, value, spellcheck: false, ...props });

// A popup menu at the pointer (or under an element): [{ label, icon, run, key }].
let openMenu = null;
export function menu(items, at) {
  closeMenu();
  const el = h("div.menu", items.map((it) => it === "-" ? h("div.divider") : h("div.opt", { onclick: () => { closeMenu(); it.run(); } }, it.icon ? icon(it.icon) : null, h("span.trunc", it.label), it.key ? h("span.key", it.key) : null)));
  document.body.append(el);
  const r = at instanceof Element ? at.getBoundingClientRect() : { left: at.x, bottom: at.y, right: at.x };
  const w = el.offsetWidth, hgt = el.offsetHeight;
  el.style.left = `${Math.min(r.left, innerWidth - w - 8)}px`;
  el.style.top = `${Math.min(r.bottom + 6, innerHeight - hgt - 8)}px`;
  openMenu = el;
  setTimeout(() => addEventListener("mousedown", onAway, true), 0);
}
function onAway(e) { if (openMenu && !openMenu.contains(e.target)) closeMenu(); }
export function closeMenu() { openMenu?.remove(); openMenu = null; removeEventListener("mousedown", onAway, true); }

export function toast(title, body, onclick) {
  const el = h("div.toast", { onclick: () => { el.remove(); onclick?.(); } }, h("b", title), body ? h("span", body) : null);
  document.getElementById("toasts").append(el);
  setTimeout(() => el.remove(), 6000);
}

// A soft two-note chime (no audio files needed).
let audio = null;
export function chime(kind = "done") {
  try {
    audio ??= new AudioContext();
    const notes = kind === "blocked" ? [660, 520] : [523.25, 783.99];
    notes.forEach((f, i) => {
      const o = audio.createOscillator(), g = audio.createGain(), t = audio.currentTime + i * 0.14;
      o.type = "sine"; o.frequency.value = f;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.12, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      o.connect(g).connect(audio.destination); o.start(t); o.stop(t + 0.55);
    });
  } catch { /* no audio */ }
}

export const sizeText = (n) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(0)} KB` : n < 1073741824 ? `${(n / 1048576).toFixed(1)} MB` : `${(n / 1073741824).toFixed(1)} GB`);
export const STATUS_WORD = { working: "Trabajando", blocked: "Te necesita", done: "Terminó", idle: "En espera" };
