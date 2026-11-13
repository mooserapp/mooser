// Mooser's website: the language switch, the live window (agent states and themes), the side panel's
// sections, and download links to the latest release.
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const root = document.documentElement;
const lang = () => root.dataset.lang;
const still = matchMedia("(prefers-reduced-motion: reduce)");

// ---------- language ----------
$("#lang").addEventListener("click", () => {
  const next = lang() === "es" ? "en" : "es";
  root.dataset.lang = next; root.lang = next;
  try { localStorage.setItem("mooser.site.lang", next); } catch { /* private window */ }
  paintMock(); paintRelease();
});

// ---------- the window: the same states Mooser shows ----------
const LABEL = {
  es: { working: "Trabajando", blocked: "Te necesita", done: "Terminó", idle: "Esperando", count: (n, w, b) => `${n} agentes, ${w} trabajando${b ? `, ${b} te necesita` : ""}` },
  en: { working: "Working", blocked: "Needs you", done: "Done", idle: "Idle", count: (n, w, b) => `${n} agents, ${w} working${b ? `, ${b} needs you` : ""}` },
};
// Each step: Claude Code (api), Codex (web) and Gemini CLI (docs).
const STEPS = [
  ["working", "working", "idle"],
  ["blocked", "working", "idle"],
  ["blocked", "done", "working"],
  ["working", "done", "working"],
  ["working", "idle", "done"],
];
const mock = $("#mock");
let step = still.matches ? 2 : 0, timer = null;

function paintMock() {
  const s = STEPS[step], L = LABEL[lang()];
  s.forEach((state, i) => {
    mock.dataset[`a${i}`] = state;
    const row = $(`.m-agent[data-agent="${i}"]`, mock);
    row.dataset.s = state; $("em", row).textContent = L[state];
    $(`.m-space[data-space="${i}"] .m-dot`, mock).dataset.s = state === "idle" ? "" : state;
    for (const d of $$(`[data-dot="${i}"]`, mock)) d.dataset.s = state;
  });
  $("#m-count").textContent = L.count(3, s.filter((x) => x === "working").length, s.filter((x) => x === "blocked").length);
  $("#m-toast").classList.toggle("show", s[0] === "blocked");
}
function play(on) {
  clearInterval(timer); timer = null;
  if (on && !still.matches) timer = setInterval(() => { step = (step + 1) % STEPS.length; paintMock(); }, 2600);
}
paintMock();
// Only moves while it's on screen.
new IntersectionObserver(([e]) => play(e.isIntersecting), { threshold: 0.25 }).observe(mock);
still.addEventListener?.("change", () => { if (still.matches) { play(false); step = 2; paintMock(); } });

// Themes, picked like in Settings.
for (const b of $$("#themes button")) {
  b.addEventListener("click", () => {
    for (const x of $$("#themes button")) x.setAttribute("aria-checked", String(x === b));
    mock.dataset.theme = b.dataset.theme;
  });
}

// ---------- the side panel's sections ----------
for (const b of $$("#dock button")) {
  b.addEventListener("click", () => {
    for (const x of $$("#dock button")) x.setAttribute("aria-selected", String(x === b));
    for (const s of $$(".sheet")) s.hidden = s.dataset.tab !== b.dataset.tab;
  });
}

// ---------- downloads ----------
// A phone or tablet can't run Mooser (and an iPhone calls itself "Mac OS X"): no system is picked there.
const platform = navigator.userAgentData?.platform || navigator.platform || navigator.userAgent;
const mobile = navigator.userAgentData?.mobile || /iPhone|iPad|Android/i.test(navigator.userAgent) || (/Mac/.test(platform) && navigator.maxTouchPoints > 1);
const isMac = !mobile && /Mac/i.test(platform);
const isWin = !mobile && /Win/i.test(platform);
let release = null;

function paintRelease() {
  const mine = isMac ? "mac-arm64.dmg" : isWin ? "x64.exe" : null;
  for (const a of $$("[data-asset]")) {
    a.classList.toggle("mine", a.dataset.asset === mine);
    const asset = release?.assets.find((x) => x.name.endsWith(a.dataset.asset));
    if (!asset) continue;
    a.href = asset.browser_download_url;
    a.title = `${asset.name}, ${Math.round(asset.size / 1048576)} MB`;
  }
  const best = release?.assets.find((x) => mine && x.name.endsWith(mine));
  for (const cta of $$("[data-download]")) {
    if (best) cta.href = best.browser_download_url;
    $(".es", cta).textContent = isMac ? "Descargar para Mac" : isWin ? "Descargar para Windows" : "Descargar Mooser";
    $(".en", cta).textContent = isMac ? "Download for Mac" : isWin ? "Download for Windows" : "Download Mooser";
  }
  if (release) {
    const n = release.tag_name.replace(/^v/, "");
    const date = (l) => new Date(release.published_at).toLocaleDateString(l, { day: "numeric", month: "long", year: "numeric" });
    $("#version .es").textContent = `Versión ${n}, del ${date("es")}. Gratis, para macOS y Windows.`;
    $("#version .en").textContent = `Version ${n}, from ${date("en")}. Free, for macOS and Windows.`;
  }
}
paintRelease();
fetch("https://api.github.com/repos/davechbga/mooser/releases/latest")
  .then((r) => (r.ok ? r.json() : null))
  .then((r) => { if (r?.assets) { release = r; paintRelease(); } })
  .catch(() => { /* offline or rate-limited: the links keep pointing at the releases page */ });

// Copy the commands.
for (const b of $$("[data-copy]")) {
  b.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(document.getElementById(b.dataset.copy).textContent); } catch { return; }
    const es = $(".es", b), en = $(".en", b);
    es.textContent = "Copiado"; en.textContent = "Copied";
    setTimeout(() => { es.textContent = "Copiar"; en.textContent = "Copy"; }, 1600);
  });
}
