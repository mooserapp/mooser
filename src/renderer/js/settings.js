// Settings: read from ~/.mooser/settings.json (through the main process), applied to the page as CSS
// variables and terminal options, and live: a change to the file (from the Settings window, a
// plugin, you or Claude) shows at once. Also the theme presets (the "mood" of the window).
const api = window.mooser;

export const PRESETS = {
  caustica: { name: "Cáustica", accent: "#a9b8ff", tint: "#0e1f3a", bg: "image", image: "../../assets/background.jpg", base: "#0b1a30" },
  medianoche: { name: "Medianoche", accent: "#6fd6e0", tint: "#0b1220", bg: "linear-gradient(160deg, #0a1322 0%, #070b14 55%, #111a2e 100%)", base: "#070b14" },
  aurora: { name: "Aurora", accent: "#7ed9b5", tint: "#0c1f22", bg: "radial-gradient(1200px 700px at 15% 10%, #1d5a52 0%, transparent 60%), radial-gradient(900px 600px at 85% 90%, #3b2a6b 0%, transparent 60%), #0a1416", base: "#0a1416" },
  ambar: { name: "Ámbar", accent: "#ffc98b", tint: "#1a140e", bg: "radial-gradient(1000px 700px at 80% 0%, #5a3a17 0%, transparent 60%), linear-gradient(160deg, #1d140c, #0f1218)", base: "#120f0c" },
  rosa: { name: "Coral", accent: "#ff9ed2", tint: "#21121c", bg: "radial-gradient(1000px 700px at 10% 100%, #5b1f45 0%, transparent 60%), linear-gradient(200deg, #1b1022, #0d0c16)", base: "#120c14" },
};

export const S = { settings: null, dir: "", plugins: [], defaults: null, error: null, listeners: new Set() };

export async function load() {
  const r = await api.config.get();
  Object.assign(S, { settings: r.settings, dir: r.dir, plugins: r.plugins ?? [], defaults: r.defaults, error: r.error ?? null });
  apply();
  return S;
}
export async function set(patch) {
  const r = await api.config.set(patch);
  if (r?.settings) { S.settings = r.settings; S.error = r.error ?? null; apply(); }
}
export const onChange = (fn) => { S.listeners.add(fn); return () => S.listeners.delete(fn); };
export const get = () => S.settings;

const alpha = (hex, a) => `${hex}${Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, "0")}`;

export function preset() { return PRESETS[S.settings?.theme] ?? PRESETS.caustica; }

export function apply() {
  const s = S.settings; if (!s) return;
  const p = preset(), a = s.appearance ?? {}, root = document.documentElement.style;
  const accent = a.accent || p.accent;
  root.setProperty("--accent", accent);
  root.setProperty("--glass", alpha(p.tint, a.glass ?? 0.56));
  root.setProperty("--blur", `${a.blur ?? 22}px`);
  root.setProperty("--radius", `${a.radius ?? 18}px`);
  root.setProperty("--gap", `${a.gap ?? 10}px`);
  root.setProperty("--bg", p.base);
  document.body.style.fontSize = `${a.uiFontSize ?? 13}px`;
  const bg = a.background && a.background !== "preset"
    ? (a.background === "none" ? p.base : `${p.base} url("mooser://config/${a.background}") center / cover no-repeat`)
    : p.bg === "image" ? `${p.base} url("${p.image}") center / cover no-repeat` : p.bg;
  document.body.style.background = bg;
  document.body.classList.toggle("no-motion", a.animations === false);
  for (const fn of S.listeners) fn(s);
}

// Your custom.css, reloaded when it changes.
export function reloadCss() {
  let link = document.getElementById("custom-css");
  if (!link) { link = document.createElement("link"); link.id = "custom-css"; link.rel = "stylesheet"; document.head.append(link); }
  link.href = `mooser://config/custom.css?v=${Date.now()}`;
}
