// Servidores: your SSH servers, grouped and colored by group. Connect in a new tab (it logs in with
// the saved password by itself), check which ones answer, and move files between this computer and
// any server, or server to server, in a two-sided file window.
import { h, icon, clear, button, field, input, menu } from "../ui.js";

const PALETTE = [["#6fd6e0", "Turquesa"], ["#8fb0ff", "Azul"], ["#c9a8ff", "Violeta"], ["#ff9ed2", "Rosa"], ["#ff8a8a", "Coral"], ["#ffc98b", "Ámbar"], ["#e8e07a", "Limón"], ["#7ed9b5", "Verde"]];
const TEAL = "#6fd6e0";
const autoColor = (name) => { let n = 0; for (const c of String(name)) n = (n * 31 + c.charCodeAt(0)) >>> 0; return PALETTE[n % PALETTE.length][0]; };
const STATE = { ok: "done", auth: "working", hostkey: "working", down: "blocked", checking: "idle" };
const target = (h) => (h.imported ? h.alias : `${h.user ? `${h.user}@` : ""}${h.host}${h.port && Number(h.port) !== 22 ? `:${h.port}` : ""}`);
const label = (h) => h.name || h.host || h.alias;
const teal = (b) => { b.style.background = TEAL; b.style.color = "var(--accent-ink)"; return b; };

export class ServersPanel {
  constructor() { this.el = h("div.panel-body"); this.hosts = []; this.imported = []; this.groups = {}; this.status = {}; this.view = "list"; this.q = ""; }
  mount(ctx) { this.ctx = ctx; this.ssh = ctx.api.ssh; this.load(); }
  shown() {}
  async load() {
    const r = await this.ssh.load();
    if (r?.error) { this.error = r.error; return this.paint(); }
    Object.assign(this, { hosts: r.hosts, imported: r.imported, groups: r.groups, askpass: r.askpass, encryption: r.encryption });
    this.paint();
  }
  groupOf(h) { return h.group || (h.imported ? "~/.ssh/config" : "Sin grupo"); }
  colorOf(g) { return this.groups[g] ?? autoColor(g); }
  async probe(h) { this.status[h.id] = { state: "checking" }; this.paint(); this.status[h.id] = await this.ssh.probe(h.id); this.paint(); }
  probeAll() { for (const h of [...this.hosts, ...this.imported]) this.probe(h); }
  async connect(h) {
    const spec = await this.ssh.connectSpec(h.id);
    if (spec?.error) return this.say(spec.error, "error");
    this.ctx.openTerminal({ argv: spec.argv, env: spec.env, name: spec.name, cwd: this.ctx.W.home });
  }
  say(text, kind = "ok") { this.notice = { text, kind }; this.paint(); }

  paint() { clear(this.el); if (this.view === "edit") this.form(); else this.list(); }

  list() {
    const el = this.el, all = [...this.hosts, ...this.imported], q = this.q;
    const shown = q ? all.filter((x) => `${label(x)} ${target(x)} ${x.group ?? ""}`.toLowerCase().includes(q)) : all;
    el.append(h("div.row", { style: { padding: "0 4px" } },
      h("div.col.grow", h("b", { style: { fontSize: "15px" } }, "Servidores"), h("span.dim", { style: { fontSize: "11.5px" } }, all.length ? `${all.length} guardados` : "Guarda tus servidores SSH para conectarte con un clic")),
      h("button.icon-btn", { title: "Comprobar todos", onclick: () => this.probeAll() }, icon("refresh")),
      teal(button("Nuevo", () => this.edit({}), { ic: "plus" }))));
    el.append(h("div.row", field(input("Buscar servidor", q, { oninput: (e) => { this.q = e.target.value.toLowerCase(); this.paint(); this.el.querySelector("input")?.focus(); } }), "search"),
      button("Archivos", () => this.files(), { ic: "transfer", title: "Mover archivos entre este equipo y tus servidores" })));
    if (!this.askpass) el.append(h("div.notice", "En Windows instala Git for Windows para que Mooser escriba tus contraseñas guardadas. Sin él, ssh te la pedirá en la terminal."));
    const list = h("div.scroll"); el.append(list);
    const groups = new Map();
    for (const x of shown) { const g = this.groupOf(x); if (!groups.has(g)) groups.set(g, []); groups.get(g).push(x); }
    for (const [g, hs] of groups) {
      const c = this.colorOf(g);
      list.append(h("div", { style: { padding: "10px 4px 4px" } }, h("span.chip", { style: { background: `${c}22`, color: c, border: `1px solid ${c}44` } }, h("span.dot", { style: { background: c } }), g, h("span.dim", { style: { fontWeight: 400 } }, String(hs.length)))));
      for (const x of hs) list.append(this.row(x, c));
    }
    if (!all.length) list.append(h("div.dim", { style: { padding: "16px", textAlign: "center", fontSize: "12px" } }, "Aún no hay servidores. Pulsa «Nuevo» para añadir el primero."));
    if (this.notice) el.append(h(`div.notice${this.notice.kind === "error" ? ".error" : ""}`, this.notice.text));
  }
  row(x, c) {
    const st = this.status[x.id], dot = STATE[st?.state] ?? "idle";
    const detail = st?.detail && st.state !== "ok" ? st.detail : target(x);
    return h("div.item", { ondblclick: () => this.connect(x) },
      h("div.row", { style: { gap: "10px" } },
        h("div", { style: { width: "32px", height: "32px", borderRadius: "9px", background: `${c}26`, border: `1px solid ${c}55`, display: "flex", alignItems: "center", justifyContent: "center", color: c, flex: "none" } }, icon("server", 15)),
        h("div.col.grow", h("div.row", { style: { gap: "7px" } }, h("span.name.trunc", label(x)), h(`span.dot.${dot}`, { style: { width: "7px", height: "7px" } })),
          h("span.desc.trunc", { style: { color: st?.detail && st.state !== "ok" ? `var(--${dot})` : "" } }, detail)),
        x.imported ? null : h("button.icon-btn", { title: "Editar", onclick: (e) => { e.stopPropagation(); this.edit(x); } }, icon("pencil", 13))),
      h("div.row", { style: { paddingLeft: "42px", gap: "6px" } },
        teal(button("Conectar", () => this.connect(x), { ic: "terminal" })),
        button("Archivos", () => this.files(x.id), { ic: "folder" }),
        st?.state === "auth" && !x.imported ? button("Contraseña", () => this.edit(x)) : null));
  }

  edit(x) { this.editing = { ...x }; this.pick = x.id ? this.groups[this.groupOf(x)] ?? null : null; this.view = "edit"; this.notice = null; this.paint(); }
  form() {
    const x = this.editing, el = this.el, f = {};
    const row = (key, ph, props = {}) => { f[key] = input(ph, x[key] ?? "", props); return h("div.col", { style: { gap: "4px" } }, h("span.label", ph), field(f[key])); };
    el.append(h("div.row", { style: { padding: "0 4px" } }, h("b.grow", { style: { fontSize: "15px" } }, x.id ? `Editar ${label(x)}` : "Nuevo servidor"), h("button.icon-btn", { title: "Volver", onclick: () => { this.view = "list"; this.paint(); } }, icon("x"))));
    const pw = input(x.hasPassword ? "Guardada: déjala vacía para mantenerla" : "Contraseña del servidor", "", { type: "password", autocomplete: "new-password" });
    let forget = false;
    const swatches = h("div.row", { style: { gap: "8px", flexWrap: "wrap" } });
    const paintSw = () => {
      const current = this.pick ?? this.colorOf(f.group.value.trim() || "Sin grupo");
      clear(swatches).append(...PALETTE.map(([hex, name]) => h("button", { title: name, onclick: () => { this.pick = hex; paintSw(); }, style: { width: "26px", height: "26px", borderRadius: "13px", background: hex, border: `2px solid ${current === hex ? "var(--fg)" : "transparent"}` } })));
    };
    const body = h("div.scroll", { style: { gap: "10px" } },
      row("name", "Nombre (opcional)"), row("host", "Dirección (IP o dominio)"),
      h("div.row", { style: { alignItems: "flex-end" } }, h("div.grow", row("user", "Usuario")), h("div", { style: { width: "90px" } }, row("port", "Puerto", { value: x.port ?? 22 }))),
      row("group", "Grupo (p. ej. Producción)", { oninput: () => paintSw() }),
      h("div.col", { style: { gap: "4px" } }, h("span.label", "Contraseña (se guarda cifrada en este equipo)"), field(pw, "key")),
      x.hasPassword ? h("label.row", { style: { fontSize: "12px", color: "var(--muted)", cursor: "pointer" } }, h("input", { type: "checkbox", onchange: (e) => { forget = e.target.checked; } }), "Olvidar la contraseña guardada") : null,
      row("key", "Llave privada (opcional, ruta al archivo)"),
      h("div.col", { style: { gap: "6px" } }, h("span.label", "Color del grupo (lo comparten todos sus servidores)"), swatches));
    el.append(body); paintSw();
    if (this.notice) el.append(h(`div.notice${this.notice.kind === "error" ? ".error" : ""}`, this.notice.text));
    el.append(h("div.row",
      teal(button("Guardar", async () => {
        const next = { id: x.id, name: f.name.value, host: f.host.value, user: f.user.value, port: f.port.value, group: f.group.value, key: f.key.value };
        const r = await this.ssh.save(next, pw.value, forget);
        if (r?.error) return this.say(r.error, "error");
        if (this.pick) { this.groups = { ...this.groups, [next.group.trim() || "Sin grupo"]: this.pick }; await this.ssh.groups(this.groups); }
        this.view = "list"; this.notice = { text: "Guardado.", kind: "ok" }; await this.load(); this.probe(r);
      }, { ic: "check" })),
      button("Cancelar", () => { this.view = "list"; this.paint(); }),
      h("span.grow"),
      x.id ? button("Eliminar", async () => { await this.ssh.remove(x.id); this.view = "list"; await this.load(); }, { ic: "trash" }) : null));
    setTimeout(() => f.host.focus(), 0);
  }

  // ---------- the file window: two sides, this computer or any server on each ----------
  files(remoteId) {
    const sources = [{ id: "local", name: this.ctx.W.mac ? "Este Mac" : "Este equipo" }, ...[...this.hosts, ...this.imported].map((x) => ({ id: x.id, name: label(x), host: x }))];
    const sides = [{ src: "local", path: this.ctx.W.home, items: [], sel: new Set() }, { src: remoteId ?? sources[1]?.id ?? "local", path: "", items: [], sel: new Set() }];
    const panes = [h("div.col.grow"), h("div.col.grow")];
    const close = () => ov.remove();
    const ov = h("div.overlay", { style: { paddingTop: "8vh" }, onmousedown: (e) => { if (e.target === ov) close(); } },
      h("div.modal.wide", h("div.row", { style: { padding: "12px 14px", borderBottom: "1px solid var(--border-soft)" } }, icon("transfer"), h("b.grow", "Archivos"), h("span.dim", { style: { fontSize: "12px" } }, "Selecciona y pulsa la flecha para copiar al otro lado"), h("button.icon-btn", { onclick: close }, icon("x"))),
        h("div.row", { style: { flex: "1", alignItems: "stretch", gap: "12px", padding: "12px", minHeight: "0" } }, panes[0], panes[1])));
    const load = async (i) => {
      const s = sides[i]; s.loading = true; paint(i);
      const r = s.src === "local" ? await this.ctx.api.fs.list(s.path || this.ctx.W.home, false) : await this.ssh.list(s.src, s.path);
      s.loading = false;
      if (r?.error) { s.error = r.error; s.items = []; } else { s.error = null; s.path = r.cwd; s.items = r.items; s.parentPath = r.parent ?? (r.cwd === "/" ? null : r.cwd.replace(/\/[^/]+\/?$/, "") || "/"); }
      s.sel = new Set(); paint(i);
    };
    const joinP = (s, n) => (s.src === "local" ? (s.path.endsWith("\\") || s.path.endsWith("/") ? s.path + n : `${s.path}${s.path.includes("\\") ? "\\" : "/"}${n}`) : `${s.path.replace(/\/$/, "")}/${n}`);
    const paint = (i) => {
      const s = sides[i], o = sides[1 - i], el = clear(panes[i]);
      el.style.gap = "8px"; el.style.minWidth = "0";
      el.append(h("div.row", { style: { gap: "4px", flexWrap: "wrap" } }, sources.map((src) => {
        const c = src.host ? this.colorOf(this.groupOf(src.host)) : "var(--accent)", on = s.src === src.id;
        return h("button.chip", { style: { background: on ? "var(--selected)" : "var(--surface)", border: "1px solid var(--border)", color: on ? "var(--fg)" : "var(--muted)", fontWeight: on ? 600 : 400 }, onclick: () => { s.src = src.id; s.path = src.id === "local" ? this.ctx.W.home : ""; load(i); } }, h("span.dot", { style: { background: c, width: "7px", height: "7px" } }), src.name);
      })));
      el.append(h("div.row", h("button.icon-btn", { title: "Subir", onclick: () => { if (s.parentPath) { s.path = s.parentPath; load(i); } } }, icon("up", 14)), h("span.trunc.grow.muted", { style: { fontSize: "12px" } }, s.path),
        s.src === "local" ? h("button.icon-btn", { title: "Elegir carpeta", onclick: async () => { const f = await this.ctx.api.dialog.folder(); if (f) { s.path = f; load(i); } } }, icon("folder", 14)) : null,
        h("button.icon-btn", { title: "Volver a leer", onclick: () => load(i) }, icon("refresh", 14))));
      const list = h("div.scroll", { style: { border: "1px solid var(--border-soft)", borderRadius: "10px", padding: "4px" } });
      if (s.error) list.append(h("div.notice.error", s.error));
      else if (s.loading) list.append(h("div.dim", { style: { padding: "12px" } }, "Leyendo…"));
      else for (const it of s.items) {
        const on = s.sel.has(it.name);
        list.append(h("div.row", { style: { height: "30px", padding: "0 8px", borderRadius: "8px", flex: "none", background: on ? "var(--selected)" : "" },
          onclick: () => { if (on) s.sel.delete(it.name); else s.sel.add(it.name); paint(i); },
          ondblclick: () => { if (it.dir) { s.path = joinP(s, it.name); load(i); } } },
        (() => { const ic = icon(it.dir ? "folder" : "file", 14); ic.style.color = it.dir ? "#ffc98b" : "var(--dim)"; return ic; })(), h("span.grow.trunc", it.name)));
      }
      el.append(list);
      const n = s.sel.size;
      el.append(h("div.row", h("span.grow.dim", { style: { fontSize: "12px" } }, n ? `${n} seleccionado${n > 1 ? "s" : ""}` : "Doble clic para entrar"),
        teal(button(i === 0 ? "Copiar a la derecha" : "Copiar a la izquierda", async () => {
          if (!n || !o.path) return;
          const spec = await this.ssh.transferSpec(s.src, [...s.sel].map((x) => joinP(s, x)), o.src, o.path);
          if (spec?.error) return;
          close();
          this.ctx.openTerminal({ argv: spec.argv, env: spec.env, name: spec.name, cwd: this.ctx.W.home });
        }, { ic: i === 0 ? "chevron" : "up", disabled: !n }))));
    };
    document.body.append(ov);
    load(0); load(1);
  }
}
