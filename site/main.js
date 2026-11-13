// Mooser's website: the language switch, the hero mosaic, the live window (agent states and themes),
// the README contents, and download links to the latest release.
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

// ---------- hero mosaic: Mooser's own windows, on macOS and Windows ----------
{
  const shots = ["macos-workspace", "windows-usage", "macos-settings", "windows-workspace", "macos-explorer", "windows-welcome", "macos-usage", "windows-settings", "macos-welcome", "windows-explorer"];
  const plane = $("#mosaic");
  for (let c = 0; c < 4; c++) {
    const col = document.createElement("div"); col.className = "col";
    for (let r = 0; r < 4; r++) {
      const img = new Image(); img.src = `img/t-${shots[(c * 3 + r * 7) % shots.length]}.jpg`; img.alt = ""; img.width = 720; img.height = 450; img.decoding = "async";
      col.append(img);
    }
    plane.append(col);
  }
}

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
new IntersectionObserver(([e]) => play(e.isIntersecting), { threshold: 0.25 }).observe(mock);
still.addEventListener?.("change", () => { if (still.matches) { play(false); step = 2; paintMock(); } });

// Themes, as in Settings.
for (const b of $$("#themes button")) {
  b.addEventListener("click", () => {
    for (const x of $$("#themes button")) x.setAttribute("aria-selected", String(x === b));
    mock.dataset.theme = b.dataset.theme;
  });
}

// ---------- README contents: the section on screen ----------
{
  const links = new Map($$("#toc a").map((a) => [a.getAttribute("href").slice(1), a]));
  const seen = new Set();
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) e.isIntersecting ? seen.add(e.target.id) : seen.delete(e.target.id);
    const first = [...links.keys()].find((id) => seen.has(id));
    if (first) for (const [id, a] of links) a.classList.toggle("on", id === first);
  }, { rootMargin: "-20% 0px -55% 0px" });
  for (const id of links.keys()) io.observe(document.getElementById(id));
}

// ---------- downloads ----------
// A phone or tablet can't run Mooser (and an iPhone calls itself "Mac OS X"): no system is picked there.
const platform = navigator.userAgentData?.platform || navigator.platform || navigator.userAgent;
const mobile = navigator.userAgentData?.mobile || /iPhone|iPad|Android/i.test(navigator.userAgent) || (/Mac/.test(platform) && navigator.maxTouchPoints > 1);
const isMac = !mobile && /Mac/i.test(platform);
const isWin = !mobile && /Win/i.test(platform);
let release = null;

function showOs(os) {
  for (const b of $$("#os-tabs button")) b.setAttribute("aria-selected", String(b.dataset.os === os));
  for (const p of $$(".os-panel")) p.hidden = p.dataset.os !== os;
}
for (const b of $$("#os-tabs button")) b.addEventListener("click", () => showOs(b.dataset.os));
if (isWin) showOs("win");

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
  const v = $("#version");
  if (release) {
    const n = release.tag_name.replace(/^v/, "");
    const date = new Date(release.published_at).toLocaleDateString(lang(), { day: "numeric", month: "long", year: "numeric" });
    v.textContent = lang() === "es" ? `Versión ${n}, publicada el ${date}.` : `Version ${n}, released ${date}.`;
    v.hidden = false;
  }
}
paintRelease();
fetch("https://api.github.com/repos/davechbga/mooser/releases/latest")
  .then((r) => (r.ok ? r.json() : null))
  .then((r) => { if (r?.assets) { release = r; paintRelease(); } })
  .catch(() => { /* offline or rate-limited: the links keep pointing at the releases page */ });

// Copy the commands, without the "$" prompts.
for (const b of $$("[data-copy]")) {
  b.addEventListener("click", async () => {
    const text = document.getElementById(b.dataset.copy).textContent.replace(/^\$ /gm, "");
    try { await navigator.clipboard.writeText(text); } catch { return; }
    const es = $(".es", b), en = $(".en", b);
    es.textContent = "Copiado"; en.textContent = "Copied";
    setTimeout(() => { es.textContent = "Copiar"; en.textContent = "Copy"; }, 1600);
  });
}
