// Mooser's website: the language switch, the live agent list, and download links to the latest release.
const root = document.documentElement;
const lang = () => root.dataset.lang;

// ---------- language ----------
document.getElementById("lang").addEventListener("click", () => {
  const next = lang() === "es" ? "en" : "es";
  root.dataset.lang = next; root.lang = next;
  try { localStorage.setItem("mooser.site.lang", next); } catch { /* private window */ }
  paintDemo(); paintRelease();
});

// ---------- the agent list: the same states Mooser shows ----------
const LABEL = {
  es: { working: "Trabajando", blocked: "Te necesita", done: "Terminó", idle: "Esperando" },
  en: { working: "Working", blocked: "Needs you", done: "Done", idle: "Idle" },
};
// Each step: the three agents' states, and whether the "needs you" alert shows.
const STEPS = [
  { s: ["working", "working", "idle"], toast: false },
  { s: ["blocked", "working", "idle"], toast: true },
  { s: ["blocked", "done", "working"], toast: true },
  { s: ["working", "done", "working"], toast: false },
  { s: ["working", "idle", "done"], toast: false },
];
const rows = [...document.querySelectorAll(".demo-list li")];
const toast = document.getElementById("toast");
const still = matchMedia("(prefers-reduced-motion: reduce)");
let step = still.matches ? 2 : 0, timer = null;

function paintDemo() {
  const { s, toast: show } = STEPS[step];
  rows.forEach((li, i) => { li.dataset.s = s[i]; li.querySelector("em").textContent = LABEL[lang()][s[i]]; });
  toast.classList.toggle("show", show);
}
function play(on) {
  clearInterval(timer); timer = null;
  if (on && !still.matches) timer = setInterval(() => { step = (step + 1) % STEPS.length; paintDemo(); }, 2600);
}
paintDemo();
// Only moves while it's on screen.
new IntersectionObserver(([e]) => play(e.isIntersecting), { threshold: 0.3 }).observe(document.getElementById("demo"));
still.addEventListener?.("change", () => { if (still.matches) { play(false); step = 2; paintDemo(); } });

// ---------- downloads ----------
// A phone or tablet can't run Mooser (and an iPhone calls itself "Mac OS X"): no system is picked there.
const platform = navigator.userAgentData?.platform || navigator.platform || navigator.userAgent;
const mobile = navigator.userAgentData?.mobile || /iPhone|iPad|Android/i.test(navigator.userAgent) || (/Mac/.test(platform) && navigator.maxTouchPoints > 1);
const isMac = !mobile && /Mac/i.test(platform);
const isWin = !mobile && /Win/i.test(platform);
let release = null;

function paintRelease() {
  const mine = isMac ? "mac-arm64.dmg" : isWin ? "x64.exe" : null;
  for (const a of document.querySelectorAll("[data-asset]")) {
    a.classList.toggle("mine", a.dataset.asset === mine);
    const asset = release?.assets.find((x) => x.name.endsWith(a.dataset.asset));
    if (!asset) continue;
    a.href = asset.browser_download_url;
    a.querySelector("small").textContent = `${asset.name}, ${Math.round(asset.size / 1048576)} MB`;
  }
  const cta = document.querySelector("[data-download]");
  const best = release?.assets.find((x) => mine && x.name.endsWith(mine));
  cta.href = best ? best.browser_download_url : "#descargar";
  cta.querySelector(".es").textContent = isMac ? "Descargar para macOS" : isWin ? "Descargar para Windows" : "Descargar";
  cta.querySelector(".en").textContent = isMac ? "Download for macOS" : isWin ? "Download for Windows" : "Download";
  const v = document.getElementById("version");
  if (release) {
    const date = new Date(release.published_at).toLocaleDateString(lang() === "es" ? "es" : "en", { day: "numeric", month: "long", year: "numeric" });
    v.textContent = lang() === "es" ? `Versión ${release.tag_name.replace(/^v/, "")}, publicada el ${date}.` : `Version ${release.tag_name.replace(/^v/, "")}, released ${date}.`;
    v.hidden = false;
  }
}
paintRelease();
fetch("https://api.github.com/repos/davechbga/mooser/releases/latest")
  .then((r) => (r.ok ? r.json() : null))
  .then((r) => { if (r?.assets) { release = r; paintRelease(); } })
  .catch(() => { /* offline or rate-limited: the links keep pointing at the releases page */ });
