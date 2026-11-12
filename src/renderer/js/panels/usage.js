// Uso de IA: your Claude plan's 5-hour session and week, a digital countdown to the session reset
// with an optional alert (notification and chime), and the agents open now.
import { h, icon, clear, toggle, chime, STATUS_WORD } from "../ui.js";

const EVERY = 5 * 60 * 1000;
const GREEN = "#7ed9b5";
const PLAN = { max: "Max", pro: "Pro", team: "Team", enterprise: "Enterprise", free: "Free" };
const DAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const pad = (n) => String(n).padStart(2, "0");
const hhmm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
function when(iso) {
  const d = new Date(iso), days = Math.round((new Date(d).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000);
  return `${days === 0 ? "hoy" : days === 1 ? "mañana" : `el ${DAYS[d.getDay()]}`} a las ${hhmm(d)}`;
}
function countdown(iso) {
  const s = Math.max(0, Math.floor((new Date(iso).getTime() - Date.now()) / 1000));
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}
function span(iso) {
  const m = Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 60000)), d = Math.floor(m / 1440), hh = Math.floor((m % 1440) / 60);
  return d ? `${d} d ${hh} h` : hh ? `${hh} h ${m % 60} min` : `${m} min`;
}
const level = (u) => (u >= 90 ? "var(--blocked)" : u >= 70 ? "var(--working)" : GREEN);

export class UsagePanel {
  constructor() { this.el = h("div.panel-body"); this.data = null; this.error = null; this.loading = false; this.alerted = null; }

  mount(ctx) {
    this.ctx = ctx;
    this.alertOn = localStorage.getItem("mooser.usageAlert") !== "0";
    this.load();
    setInterval(() => this.load(), EVERY);
    setInterval(() => this.tick(), 1000);
  }
  shown() { this.paint(); }

  async load() {
    if (this.loading) return;
    this.loading = true; this.paint();
    const r = await this.ctx.api.usage.claude();
    this.loading = false;
    if (r?.error) { this.error = r.error; this.plan = r.plan ?? this.plan; }
    else { this.data = r; this.plan = r.plan; this.error = null; const reset = r.five?.resets_at; if (this.alerted === null && reset && Date.now() >= new Date(reset).getTime()) this.alerted = reset; }
    this.ctx.setUsage(this.data);
    this.paint();
  }

  tick() {
    const reset = this.data?.five?.resets_at;
    if (reset && Date.now() >= new Date(reset).getTime() && this.alerted !== reset) {
      this.alerted = reset;
      if (this.alertOn) { chime("done"); this.ctx.api.app.notify({ title: "Sesión de Claude restablecida", body: "Vuelves a tener el 100% disponible." }); }
      setTimeout(() => this.load(), 20000);
    }
    if (!this.el.classList.contains("hidden") && this.clock && reset) this.clock.textContent = countdown(reset);
  }

  paint() {
    const el = clear(this.el), five = this.data?.five, week = this.data?.week;
    const tier = this.plan?.tier && /20x/.test(this.plan.tier) ? " 20×" : this.plan?.tier && /5x/.test(this.plan.tier) ? " 5×" : "";
    const plan = this.plan?.type ? `Plan ${PLAN[this.plan.type] ?? this.plan.type}${tier}` : "";
    const bar = (u) => h("div", { style: { height: "6px", borderRadius: "3px", background: "var(--raised)", overflow: "hidden" } },
      h("div", { style: { height: "100%", width: `${Math.max(0, Math.min(100, u))}%`, background: level(u), borderRadius: "3px", transition: "width .6s var(--ease)" } }));
    el.append(h("div.row", { style: { padding: "0 4px" } },
      h("div.col.grow", h("b", { style: { fontSize: "15px" } }, "Claude"), h("span.dim", { style: { fontSize: "11.5px" } }, [plan, this.data?.at ? `actualizado ${hhmm(new Date(this.data.at))}` : ""].filter(Boolean).join(" · "))),
      h("button.btn", { onclick: () => this.load(), disabled: this.loading, style: { background: `${GREEN}26`, color: GREEN, border: `1px solid ${GREEN}55` } }, icon("refresh"), this.loading ? "Leyendo…" : "Actualizar")));
    const body = h("div.scroll");
    el.append(body);
    if (this.error) body.append(h("div.card", h("span", { style: { color: "var(--blocked)", fontSize: "12px" } }, this.error)));
    this.clock = null;
    if (five) {
      const active = five.resets_at && new Date(five.resets_at).getTime() > Date.now();
      if (active) this.clock = h("div", { style: { fontFamily: "var(--mono)", fontSize: "44px", fontWeight: 600, letterSpacing: "1px" } }, countdown(five.resets_at));
      body.append(h("div.card",
        h("div.row", h("span.grow.muted", "Sesión de 5 horas"), h("b", { style: { color: level(five.utilization ?? 0), fontSize: "12.5px" } }, `${Math.round(five.utilization ?? 0)}% usado`)),
        bar(five.utilization ?? 0),
        active
          ? h("div.col", { style: { alignItems: "center", padding: "6px 0", gap: "2px" } }, h("span.dim", { style: { fontSize: "11.5px" } }, "Se restablece en"), this.clock, h("span.muted", { style: { fontSize: "12px" } }, when(five.resets_at)))
          : h("div.col", { style: { alignItems: "center", padding: "10px 0" } }, h("span", "Sin sesión en curso"), h("span.dim", { style: { fontSize: "11.5px" } }, "Empieza con tu próximo mensaje a Claude.")),
        h("div.row", { style: { padding: "8px 12px", borderRadius: "10px", background: this.alertOn ? `${GREEN}1f` : "var(--raised)" } },
          h("span.grow", { style: { fontSize: "12px" } }, "Avisarme con sonido al restablecerse"),
          (() => { const t = toggle(this.alertOn, () => { this.alertOn = !this.alertOn; localStorage.setItem("mooser.usageAlert", this.alertOn ? "1" : "0"); this.paint(); }); if (this.alertOn) { t.style.background = GREEN; t.style.borderColor = GREEN; } return t; })())));
    }
    if (week) body.append(h("div.card",
      h("div.row", h("span.grow.muted", "Semana"), h("b", { style: { color: level(week.utilization ?? 0), fontSize: "12.5px" } }, `${Math.round(week.utilization ?? 0)}% usado`)),
      bar(week.utilization ?? 0),
      week.resets_at ? h("span.dim", { style: { fontSize: "11.5px" } }, `Se restablece ${when(week.resets_at)} · en ${span(week.resets_at)}`) : null));
    const agents = this.ctx.WS.agents();
    body.append(h("div.muted", { style: { padding: "8px 4px 2px", fontSize: "12.5px" } }, agents.length ? `Agentes abiertos · ${agents.length}` : "Agentes abiertos"));
    body.append(...(agents.length ? agents.map((a) => h("div.agent", { onclick: () => this.ctx.WS.focusPane(a.pane.id) },
      h(`span.dot.${a.status}`), h("span.grow.trunc", a.agent), h("span.dim", { style: { fontSize: "11.5px" } }, `${this.ctx.WS.label(a.space)} · ${STATUS_WORD[a.status]}`)))
      : [h("div.dim", { style: { padding: "0 10px", fontSize: "12px" } }, "No hay agentes abiertos ahora.")]));
  }
  update() { if (!this.el.classList.contains("hidden")) this.paint(); }
}
