// Kit de IA: what Claude Code has at hand on this computer, read from its own folders and settings
// and changed through them or its CLI. Skills and agents (yours can be created, edited, turned off and
// on, or sent to the trash; those from claude.ai and plugins are read-only), MCP servers with their
// health, plugins (on/off, update, uninstall) and the default model.
import { h, icon, clear, button, toggle, field, input } from "../ui.js";

const SECTIONS = [
  { id: "skills", label: "Skills", icon: "sparkles" }, { id: "agents", label: "Agentes", icon: "bot" },
  { id: "mcp", label: "MCP", icon: "plug" }, { id: "plugins", label: "Plugins", icon: "puzzle" }, { id: "models", label: "Modelos", icon: "cpu" },
];
const MODELS = [
  { id: null, name: "Predeterminado", note: "El que Claude Code elige según tu plan." },
  { id: "claude-fable-5-2", name: "Fable 5.2", note: "El más capaz, para el trabajo más difícil." },
  { id: "claude-opus-5-5", name: "Opus 5.5", note: "Razonamiento profundo y tareas largas." },
  { id: "claude-sonnet-5-5", name: "Sonnet 5.5", note: "Equilibrio entre velocidad y capacidad." },
  { id: "claude-haiku-5-5", name: "Haiku 5.5", note: "El más rápido, para tareas sencillas." },
];
const MCP_STATUS = { ok: "Conectado", auth: "Requiere iniciar sesión", pending: "Pendiente de aprobar", down: "Sin conexión", unknown: "Sin comprobar" };
const MCP_DOT = { ok: "done", auth: "working", pending: "working", down: "blocked", unknown: "idle" };
const SOURCE = { personal: "Tuyos", "claude.ai": "De claude.ai", plugin: "Plugins", project: "De este proyecto" };
const words = (s) => (s.match(/"[^"]*"|'[^']*'|\S+/g) ?? []).map((w) => w.replace(/^(["'])(.*)\1$/, "$2"));

export class KitPanel {
  constructor() {
    this.el = h("div.panel-body");
    this.section = "skills"; this.data = null; this.mcp = null; this.open = {}; this.sel = null; this.mode = null; this.notice = null; this.busy = null; this.q = "";
  }
  mount(ctx) {
    this.ctx = ctx; this.api = ctx.api.kit;
    new ResizeObserver(() => { const c = this.el.offsetWidth < 400; if (c !== this.compact) { this.compact = c; this.paint(); } }).observe(this.el);
    this.load();
  }
  shown() { if (!this.data) this.load(); }

  async load() {
    this.loading = true; this.paint();
    const r = await this.api.scan();
    this.loading = false;
    if (r?.error) this.error = r.error; else { this.data = r; this.error = null; }
    this.paint();
  }
  async loadMcp() {
    if (this.mcpLoading) return;
    this.mcpLoading = true; this.paint();
    const r = await this.api.mcp();
    this.mcpLoading = false;
    if (r?.error) this.say(r.error, "error"); else this.mcp = r.servers;
    this.paint();
  }
  say(text, kind = "ok") { this.notice = { text, kind }; }
  async act(label, fn, done, { mcp = false } = {}) {
    this.busy = label; this.notice = null; this.paint();
    const r = await fn();
    this.busy = null; this.mode = null;
    if (r?.error) this.say(r.error, "error"); else { this.say(done); if (r?.file) this.ctx.api.shell.editor(r.file); }
    await this.load();
    if (mcp) this.loadMcp();
  }
  go(id) { this.section = id; this.sel = null; this.mode = null; this.notice = null; this.q = ""; if (id === "mcp" && !this.mcp) this.loadMcp(); this.paint(); }

  paint() {
    const el = clear(this.el), d = this.data;
    const on = (xs) => xs?.filter((x) => x.enabled && !(x.source === "personal" && x.name === "mooser")).length;
    const summary = d ? [`${on(d.skills)} skills`, `${on(d.agents)} agentes`, `${on(d.plugins)} plugins`, this.mcp ? `${this.mcp.length} MCP` : null].filter(Boolean).join(", ") : this.loading ? "Leyendo tu configuración…" : "";
    el.append(h("div.row", { style: { padding: "0 4px" } },
      h("div.col.grow", h("b", { style: { fontSize: "15px" } }, "Claude Code"), h("span.dim.trunc", { style: { fontSize: "11.5px" } }, summary)),
      h("button.icon-btn", { title: "Volver a leer", onclick: () => { this.load(); if (this.section === "mcp") this.loadMcp(); } }, icon("refresh"))));
    el.append(h(`div.seg${this.compact ? ".compact" : ""}`, SECTIONS.map((s) => h(`button${this.section === s.id ? ".on" : ""}`, { title: s.label, onclick: () => this.go(s.id) }, icon(s.icon, 14), h("span", s.label)))));
    if (!d) { el.append(h("div.notice", { className: `notice${this.error ? " error" : ""}` }, this.error ?? "Leyendo…")); return; }
    if (this.section === "skills") this.items("skill", el);
    else if (this.section === "agents") this.items("agent", el);
    else if (this.section === "mcp") this.mcpView(el);
    else if (this.section === "plugins") this.pluginsView(el);
    else this.modelsView(el);
    if (this.busy || this.notice) el.append(h(`div.notice${this.notice?.kind === "error" ? ".error" : ""}`, this.busy ?? this.notice.text));
  }

  search(extra) {
    const inp = input("Buscar", this.q, { oninput: (e) => { this.q = e.target.value.toLowerCase(); this.paintList?.(); } });
    return h("div.row", field(inp, "search"), extra);
  }
  group(key, title, count, rows, openByDefault) {
    const open = this.q ? true : (this.open[key] ?? openByDefault);
    return [h(`div.group-head${open ? ".open" : ""}`, { onclick: () => { this.open[key] = !open; this.paint(); } }, icon("chevron"), h("span.grow.trunc", title), h("span.dim", String(count))), ...(open ? rows : [])];
  }

  items(kind, el) {
    const word = kind === "skill" ? "skill" : "agente";
    const newBtn = button("Nuevo", () => { this.mode = this.mode === "new" ? null : "new"; this.paint(); }, { kind: "primary", ic: "plus" });
    el.append(this.search(newBtn));
    if (this.mode === "new") {
      const name = input("Nombre"), desc = input("Cuándo debe usarse");
      el.append(h("div.card", h("b", kind === "skill" ? "Nuevo skill" : "Nuevo agente"), field(name), field(desc),
        h("span.dim", { style: { fontSize: "11.5px" } }, "Se crea en tu carpeta de Claude Code y se abre en tu editor para que escribas sus instrucciones."),
        h("div.row", button("Crear y abrir", () => this.act("Creando…", () => this.api.create(kind, name.value.trim(), desc.value.trim()), "Creado. Edítalo en tu editor."), { kind: "primary" }), button("Cancelar", () => { this.mode = null; this.paint(); }))));
      setTimeout(() => name.focus(), 0);
    }
    const list = h("div.scroll"); el.append(list);
    this.paintList = () => {
      const all = ((kind === "skill" ? this.data.skills : this.data.agents) ?? []).filter((i) => !(kind === "skill" && i.source === "personal" && i.name === "mooser")), q = this.q;
      const shown = q ? all.filter((i) => `${i.name} ${i.description} ${i.plugin ?? ""}`.toLowerCase().includes(q)) : all;
      const groups = new Map();
      for (const it of shown) { const g = it.source === "plugin" ? `plugin:${it.plugin}` : it.source; if (!groups.has(g)) groups.set(g, []); groups.get(g).push(it); }
      const order = [...groups.keys()].sort((a, b) => (a === "personal" ? -1 : b === "personal" ? 1 : a === "claude.ai" ? -1 : b === "claude.ai" ? 1 : a.localeCompare(b)));
      clear(list);
      if (!groups.has("personal") && !q) list.append(h("div.dim", { style: { padding: "4px 6px", fontSize: "12px" } }, `No tienes ${word}s propios todavía. Crea uno con «Nuevo».`));
      if (!order.length && q) list.append(h("div.dim", { style: { padding: "10px", fontSize: "12px" } }, "Nada coincide con la búsqueda."));
      for (const g of order) list.append(...this.group(`${kind}-${g}`, g.startsWith("plugin:") ? `Plugin ${g.slice(7)}` : SOURCE[g] ?? g, groups.get(g).length, groups.get(g).map((it) => this.item(kind, it)), g === "personal"));
    };
    this.paintList();
  }
  item(kind, it) {
    const key = `${kind}:${it.file}`, on = this.sel === key, mine = it.source === "personal";
    const row = h(`div.item${on ? ".on" : ""}${it.enabled ? "" : ".off"}`, { onclick: () => { this.sel = on ? null : key; this.mode = null; this.paint(); } },
      h("div.row", h("div.col.grow", h("span.name.trunc", it.name), on ? null : h("span.desc.trunc", it.description || "Sin descripción")),
        it.enabled ? null : h("span.dim", { style: { fontSize: "11px" } }, mine ? "Desactivado" : "Plugin apagado")));
    if (!on) return row;
    const stop = (fn) => (e) => { e.stopPropagation(); fn(); };
    row.append(h("div.muted", { style: { fontSize: "12px", userSelect: "text" } }, it.description || "Sin descripción"));
    if (this.mode === "confirm") row.append(h("div.row", h("span.grow", `¿Enviar «${it.name}» a la papelera?`),
      button("Enviar a la papelera", stop(() => this.act("Enviando…", () => this.ctx.api.fs.trash([kind === "skill" ? it.dir : it.file]), "Enviado a la papelera.")), { kind: "danger" }),
      button("Cancelar", stop(() => { this.mode = null; this.paint(); }))));
    else row.append(h("div.row", { style: { flexWrap: "wrap" } },
      button(mine ? "Editar" : "Ver", stop(() => this.ctx.api.shell.editor(it.file)), { kind: mine ? "primary" : null, ic: "code" }),
      mine && !it.enabled ? button("Activar", stop(() => this.act("Activando…", () => this.api.toggle(kind, kind === "skill" ? it.dir : it.file), `«${it.name}» activado.`)), { ic: "check" }) : null,
      button("Abrir carpeta", stop(() => this.ctx.api.shell.open(it.dir)), { ic: "folder" }),
      h("span.grow"),
      mine ? button("Papelera", stop(() => { this.mode = "confirm"; this.paint(); }), { ic: "trash" }) : h("span.dim", { style: { fontSize: "11px" } }, it.source === "plugin" ? `Del plugin ${it.plugin}` : "Sincronizado desde claude.ai")));
    return row;
  }

  mcpView(el) {
    el.append(this.search(h("div.row", button(this.mcpLoading ? "Comprobando…" : "Comprobar", () => this.loadMcp(), { ic: "refresh", disabled: this.mcpLoading }),
      button("Añadir", () => { this.mode = this.mode === "new" ? null : "new"; this.paint(); }, { kind: "primary", ic: "plus" }))));
    if (this.mode === "new") {
      const name = input("Nombre"), target = input("URL o comando", "", { className: "mono" });
      el.append(h("div.card", h("b", "Añadir servidor MCP"), field(name), field(target),
        h("span.dim", { style: { fontSize: "11.5px" } }, "Una URL (https://…) para un servidor remoto, o el comando que lo arranca, por ejemplo: npx -y paquete-mcp"),
        h("div.row", button("Añadir", () => {
          const n = name.value.trim(), t = target.value.trim();
          if (!n || !t) { this.say("Escribe un nombre y una URL o comando.", "error"); return this.paint(); }
          const args = /^https?:\/\//i.test(t) ? ["mcp", "add", "-s", "user", "--transport", "http", n, t] : ["mcp", "add", "-s", "user", n, "--", ...words(t)];
          this.act("Añadiendo…", () => this.api.claude(args), `«${n}» añadido.`, { mcp: true });
        }, { kind: "primary" }), button("Cancelar", () => { this.mode = null; this.paint(); }))));
    }
    const list = h("div.scroll"); el.append(list);
    this.paintList = () => {
      clear(list);
      if (!this.mcp) { list.append(h("div.dim", { style: { padding: "10px", fontSize: "12px" } }, this.mcpLoading ? "Comprobando cada servidor, tarda unos segundos…" : "Pulsa Comprobar para ver tus servidores.")); return; }
      const q = this.q, shown = q ? this.mcp.filter((s) => `${s.label} ${s.target}`.toLowerCase().includes(q)) : this.mcp;
      for (const g of ["personal", "claude.ai", "plugin", "project"]) {
        const l = shown.filter((s) => s.source === g);
        if (l.length) list.append(...this.group(`mcp-${g}`, SOURCE[g], l.length, l.map((s) => this.mcpRow(s)), true));
      }
    };
    this.paintList();
  }
  mcpRow(s) {
    const key = `mcp:${s.name}`, on = this.sel === key;
    const row = h(`div.item${on ? ".on" : ""}`, { onclick: () => { this.sel = on ? null : key; this.mode = null; this.paint(); } },
      h("div.row", h(`span.dot.${MCP_DOT[s.state]}`), h("div.col.grow", h("span.name.trunc", s.label), h("span.desc.trunc.mono", s.target)),
        h("span", { style: { fontSize: "11.5px", color: s.state === "ok" ? "var(--dim)" : `var(--${MCP_DOT[s.state]})` } }, MCP_STATUS[s.state] ?? s.status)));
    if (!on) return row;
    const stop = (fn) => (e) => { e.stopPropagation(); fn(); };
    if (this.mode === "confirm") row.append(h("div.row", h("span.grow", `¿Quitar «${s.label}»?`), button("Quitar", stop(() => this.act("Quitando…", () => this.api.claude(["mcp", "remove", "-s", "user", s.name]), `«${s.label}» quitado.`, { mcp: true })), { kind: "danger" }), button("Cancelar", stop(() => { this.mode = null; this.paint(); }))));
    else if (s.removable) row.append(h("div.row", h("span.grow.dim", { style: { fontSize: "11.5px" } }, "Disponible en todos tus proyectos."), button("Quitar", stop(() => { this.mode = "confirm"; this.paint(); }), { ic: "trash" })));
    else row.append(h("span.dim", { style: { fontSize: "11.5px" } }, s.source === "claude.ai" ? "Conector de tu cuenta: se gestiona en claude.ai, Ajustes, Conectores." : s.source === "plugin" ? "Lo trae un plugin: apágalo desde Plugins." : "Definido en el .mcp.json del proyecto."));
    return row;
  }

  pluginsView(el) {
    el.append(this.search(null));
    const list = h("div.scroll"); el.append(list);
    const plural = (n, a, b) => `${n} ${n === 1 ? a : b}`;
    this.paintList = () => {
      clear(list);
      const q = this.q, all = this.data.plugins, shown = q ? all.filter((p) => `${p.name} ${p.description}`.toLowerCase().includes(q)) : all;
      for (const p of shown) {
        const key = `plugin:${p.id}`, on = this.sel === key;
        const parts = [p.skills && plural(p.skills, "skill", "skills"), p.agents && plural(p.agents, "agente", "agentes"), p.commands && plural(p.commands, "comando", "comandos"), p.mcp && `${p.mcp} MCP`, p.hooks && "hooks"].filter(Boolean);
        const row = h(`div.item${on ? ".on" : ""}${p.enabled ? "" : ".off"}`, { onclick: () => { this.sel = on ? null : key; this.mode = null; this.paint(); } },
          h("div.row", h("div.col.grow", h("span.name.trunc", p.name, h("span.dim", { style: { fontWeight: 400, fontSize: "11px", marginLeft: "6px" } }, p.version.split("-")[0])), h("span.desc.trunc", parts.join(", ") || "Sin componentes")),
            toggle(p.enabled, (e) => { e.stopPropagation(); this.act(p.enabled ? "Apagando…" : "Encendiendo…", () => this.api.claude(["plugin", p.enabled ? "disable" : "enable", p.id]), `${p.name} ${p.enabled ? "apagado" : "encendido"}. Se aplica en las sesiones nuevas de Claude Code.`); }, p.enabled ? "Apagar" : "Encender")));
        if (on) {
          const stop = (fn) => (e) => { e.stopPropagation(); fn(); };
          row.append(h("div.muted", { style: { fontSize: "12px" } }, p.description || "Sin descripción"), h("span.dim", { style: { fontSize: "11.5px" } }, `Tienda: ${p.marketplace}`));
          if (this.mode === "confirm") row.append(h("div.row", h("span.grow", `¿Desinstalar ${p.name}?`), button("Desinstalar", stop(() => this.act("Desinstalando…", () => this.api.claude(["plugin", "uninstall", p.id]), `${p.name} desinstalado.`)), { kind: "danger" }), button("Cancelar", stop(() => { this.mode = null; this.paint(); }))));
          else row.append(h("div.row", button("Actualizar", stop(() => this.act("Actualizando…", () => this.api.claude(["plugin", "update", p.id]), `${p.name} está al día.`)), { kind: "primary", ic: "refresh" }),
            button("Abrir carpeta", stop(() => this.ctx.api.shell.open(p.dir)), { ic: "folder" }), h("span.grow"), button("Desinstalar", stop(() => { this.mode = "confirm"; this.paint(); }), { ic: "trash" })));
        }
        list.append(row);
      }
      if (!shown.length) list.append(h("div.dim", { style: { padding: "10px", fontSize: "12px" } }, q ? "Nada coincide con la búsqueda." : "No tienes plugins instalados."));
      list.append(h("div.dim", { style: { padding: "8px 10px", fontSize: "11.5px" } }, "Para instalar más, escribe /plugin en Claude Code."));
    };
    this.paintList();
  }

  modelsView(el) {
    const cur = this.data.model ?? null, list = MODELS.some((m) => m.id === cur) ? MODELS : [...MODELS, { id: cur, name: cur, note: "Elegido a mano en settings.json." }];
    const box = h("div.scroll", { style: { gap: "8px" } }, h("div.muted", { style: { padding: "0 4px", fontSize: "12px" } }, "Modelo por defecto de Claude Code"));
    for (const m of list) {
      const on = m.id === cur;
      box.append(h("div.card", { style: { flexDirection: "row", alignItems: "center", padding: "10px 12px", cursor: on ? "default" : "pointer", borderColor: on ? "var(--accent)" : "", background: on ? "var(--selected)" : "" },
        onclick: on ? null : () => this.act("Cambiando el modelo…", () => this.api.set("model", m.id == null ? "-delete" : JSON.stringify(m.id)), `Modelo por defecto: ${m.name}. Se aplica en las sesiones nuevas.`) },
        h("span", { style: { width: "16px", height: "16px", borderRadius: "8px", border: `2px solid ${on ? "var(--accent)" : "var(--dim)"}`, padding: "3px", flex: "none" } }, on ? h("span", { style: { display: "block", width: "100%", height: "100%", borderRadius: "4px", background: "var(--accent)" } }) : null),
        h("div.col.grow", h("b", { style: { fontSize: "13px" } }, m.name), h("span.dim", { style: { fontSize: "11.5px" } }, m.note))));
    }
    const fast = this.data.fastMode;
    box.append(h("div.card", { style: { flexDirection: "row", alignItems: "center", marginTop: "6px" } }, icon("zap", 15),
      h("div.col.grow", h("b", { style: { fontSize: "13px" } }, "Modo rápido"), h("span.dim", { style: { fontSize: "11.5px" } }, "Respuestas más rápidas con el mismo modelo, cuando lo admite.")),
      toggle(fast, () => this.act("Guardando…", () => this.api.set("fastMode", fast ? "false" : "true"), fast ? "Modo rápido apagado." : "Modo rápido encendido."))));
    box.append(h("div.dim", { style: { padding: "4px", fontSize: "11.5px" } }, "Dentro de una sesión puedes cambiarlo con /model."));
    el.append(box);
  }
}
