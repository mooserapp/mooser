// How much of your Claude plan you have used (the 5-hour session and the week), as Claude Code's
// /usage shows it. Uses the session Claude Code keeps on this computer: ~/.claude/.credentials.json,
// or on macOS the Keychain item "Claude Code-credentials". The token is read here, sent only to
// api.anthropic.com, and never stored or refreshed by Mooser: renewing it would rotate Claude Code's
// own session. When it has expired, open Claude Code once and it renews it.
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { execFile } = require("node:child_process");

const URL = "https://api.anthropic.com/api/oauth/usage";

function keychain() {
  if (process.platform !== "darwin") return Promise.resolve(null);
  return new Promise((resolve) => execFile("security", ["find-generic-password", "-s", "Claude Code-credentials", "-w"], { timeout: 8000 },
    (err, stdout) => resolve(err ? null : String(stdout).trim())));
}

async function credentials() {
  let text = null;
  try { text = fs.readFileSync(path.join(os.homedir(), ".claude", ".credentials.json"), "utf8"); } catch { text = await keychain(); }
  try { return JSON.parse(text ?? "null")?.claudeAiOauth ?? null; } catch { return null; }
}

async function claude() {
  const oauth = await credentials();
  if (!oauth?.accessToken) return { error: "No encontré una sesión de Claude Code en este equipo. Inicia sesión en Claude Code." };
  const plan = { type: oauth.subscriptionType ?? null, tier: oauth.rateLimitTier ?? null };
  if (oauth.expiresAt && oauth.expiresAt < Date.now()) return { plan, error: "La sesión de Claude Code caducó. Abre Claude Code para renovarla y pulsa Actualizar." };
  const res = await fetch(URL, { headers: { Authorization: `Bearer ${oauth.accessToken}`, "anthropic-beta": "oauth-2025-04-20", "User-Agent": "mooser" } });
  if (res.status === 401) return { plan, error: "Claude no aceptó la sesión. Abre Claude Code para renovarla y pulsa Actualizar." };
  if (!res.ok) return { plan, error: `Claude respondió ${res.status}. Prueba de nuevo en un rato.` };
  const data = await res.json();
  return { plan, five: data.five_hour ?? null, week: data.seven_day ?? null, at: Date.now() };
}

module.exports = { claude };
