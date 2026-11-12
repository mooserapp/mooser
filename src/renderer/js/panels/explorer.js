// Explorador: browse folders, open files with their app, open a folder as a space, and organize
// (new folder, rename, move or copy to a folder you pick, send to the trash). A click selects, a
// double click opens; the icon's color says what kind of file it is.
import { h, icon, clear, button, field, input, sizeText } from "../ui.js";

const AMBER = "#ffc98b";
const KINDS = [
  [/\.(js|mjs|cjs|ts|tsx|jsx|py|go|rs|java|kt|cs|cpp|c|h|php|rb|swift|vue|svelte|html|css|scss|sql|sh|ps1|lua|dart|json|ya?ml|toml|xml|ini|env)$/i, "fileCode", "#8fb0ff"],
  [/\.(png|jpe?g|gif|svg|webp|ico|bmp|avif|heic|psd|fig)$/i, "image", "#ff9ed2"],
  [/\.(pdf|docx?|xlsx?|pptx?|csv|txt|md|rtf|odt|pages|numbers|key)$/i, "fileText", "#7ed9b5"],
  [/\.(zip|rar|7z|tar|gz|tgz|bz2|xz|dmg|iso)$/i, "archive", "#c9a8ff"],
  [/\.(exe|msi|bat|cmd|lnk|appx|app|pkg|command)$/i, "app", "#ff8a8a"],
];
function kind(it) {
  if (it.dir) return { ic: it.git ? "git" : "folder", color: AMBER };
  const m = KINDS.find(([re]) => re.test(it.name));
  return m ? { ic: m[1], color: m[2] } : { ic: "file", color: "var(--dim)" };
}
const sep = (p) => (p.includes("\\") ? "\\" : "/");
const join = (d, n) => (d.endsWith(sep(d)) ? `${d}${n}` : `${d}${sep(d)}${n}`);

export class ExplorerPanel {
  constructor() { this.el = h("div.panel-body"); this.items = []; this.sel = new Set(); this.mode = null; this.q = ""; this.places = false; }
  mount(ctx) {
    this.ctx = ctx; this.fs = ctx.api.fs;
    this.hidden = localStorage.getItem("mooser.hidden") === "1";
    this.go(localStorage.getItem("mooser.path") || ctx.W.home);
    new ResizeObserver(() => { const c = this.el.offsetWidth < 360; if (c !== this.compact) { this.compact = c; this.paint(); } }).observe(this.el);
  }
  shown() { this.load(); }
  roots() {
    const home = this.ctx.W.home, s = sep(home);
    const list = [{ label: "Inicio", path: home }, { label: "Escritorio", path: `${home}${s}Desktop` }, { label: "Documentos", path: `${home}${s}Documents` }, { label: "Descargas", path: `${home}${s}Downloads` }];
    for (const sp of this.ctx.W.spaces) list.push({ label: this.ctx.WS.label(sp), path: sp.folder, space: true });
    return list;
  }
  go(path) { this.path = path; localStorage.setItem("mooser.path", path); this.q = ""; this.sel = new Set(); this.mode = null; this.places = false; this.load(); }
  async load() {
    const want = this.path;
    this.loading = true; this.paint();
    const r = await this.fs.list(want, this.hidden);
    if (want !== this.path) return;
    this.loading = false;
    if (r?.error) { this.error = r.error; this.items = []; }
    else { this.error = null; this.path = r.cwd; this.parent = r.parent; this.items = r.items; }
    for (const n of [...this.sel]) if (!this.items.some((i) => i.name === n)) this.sel.delete(n);
    this.paint();
  }
  say(text, kind = "ok") { this.notice = { text, kind }; clearTimeout(this.nt); this.nt = setTimeout(() => { this.notice = null; this.paint(); }, 6000); }
  async run(fn, done) { const r = await fn(); this.mode = null; if (r?.error) this.say(r.error, "error"); else { this.say(done); this.sel = new Set(); } this.load(); }
  open(path) { this.ctx.api.shell.open(path); }

  paint() {
    const el = clear(this.el), compact = this.compact;
    const shown = this.items.filter((i) => !this.q || i.name.toLowerCase().includes(this.q));
    const sel = [...this.sel], one = sel.length === 1 ? this.items.find((i) => i.name === sel[0]) : null;
    const ib = (ic, title, onclick, color) => { const b = h("button.icon-btn", { title, onclick }, icon(ic, 14)); if (color) b.style.color = color; return b; };

    // Where you are: up, the last two folders (clickable), places, reload.
    const parts = this.path.split(/[\\/]/).filter(Boolean), s = sep(this.path);
    const crumbs = parts.slice(-2), skipped = parts.length - crumbs.length;
    el.append(h("div.row", { style: { gap: "4px" } },
      ib("up", "Carpeta superior", () => this.parent && this.go(this.parent)),
      h("div.row.grow", { style: { gap: "2px" } }, skipped ? h("span.dim", "… ›") : null,
        crumbs.map((c, i) => {
          const last = i === crumbs.length - 1, to = (this.path.startsWith(s) ? s : "") + parts.slice(0, skipped + i + 1).join(s) + (/^[A-Za-z]:$/.test(parts[0]) && skipped + i === 0 ? s : "");
          return [i ? h("span.dim", "›") : null, h("span.trunc", { translate: "no", style: { padding: "2px 4px", borderRadius: "6px", fontWeight: last ? 600 : 400, color: last ? "var(--fg)" : "var(--muted)", cursor: last ? "default" : "pointer", flex: last ? "1" : "none", maxWidth: last ? "" : "140px" }, onclick: last ? null : () => this.go(to) }, c)];
        })),
      h(`button.icon-btn${this.places ? ".on" : ""}`, { title: "Lugares", style: { width: compact ? "28px" : "auto", padding: compact ? "0" : "0 9px", gap: "6px" }, onclick: () => { this.places = !this.places; this.paint(); } }, icon("home", 14), compact ? null : h("span", { style: { fontSize: "12px" } }, "Lugares")),
      ib("refresh", "Volver a leer", () => this.load())));

    if (this.places) el.append(h("div.card", { style: { padding: "4px", gap: "1px" } },
      this.roots().map((r) => h("div.opt", { onclick: () => this.go(r.path) }, icon(r.space ? "rocket" : "folder", 14), h("span.grow.trunc", r.space ? { translate: "no" } : null, r.label))),
      h("div.opt", { onclick: async () => { const f = await this.ctx.api.dialog.folder("Elige una carpeta"); if (f) this.go(f); } }, icon("search", 14), "Elegir otra carpeta…")));

    const q = input("Filtrar en esta carpeta", this.q, { oninput: (e) => { this.q = e.target.value.toLowerCase(); this.paintList(list); } });
    el.append(field(q, "search"));
    const eye = h("button.icon-btn", { title: this.hidden ? "Ocultar archivos ocultos" : "Mostrar archivos ocultos", style: { width: "22px", height: "22px", color: this.hidden ? AMBER : "" }, onclick: (e) => { e.preventDefault(); this.hidden = !this.hidden; localStorage.setItem("mooser.hidden", this.hidden ? "1" : "0"); this.load(); } }, icon(this.hidden ? "eye" : "eyeOff", 13));
    el.lastChild.append(eye);

    const list = h("div.scroll"); el.append(list); this.paintList(list, shown);
    if (this.notice) el.append(h(`div.notice${this.notice.kind === "error" ? ".error" : ""}`, this.notice.text));
    el.append(h("div.divider", { style: { margin: "0" } }));

    // The bottom bar: what you can do now.
    const nameField = (value, ok) => {
      const inp = input("Nombre", value);
      inp.addEventListener("keydown", (e) => { if (e.key === "Enter") ok(inp.value.trim()); if (e.key === "Escape") { this.mode = null; this.paint(); } });
      setTimeout(() => { inp.focus(); inp.select(); }, 0);
      return h("div.row", h("label.field.grow", { style: { borderColor: `${AMBER}88` } }, inp), button("Guardar", () => ok(inp.value.trim()), { kind: "primary" }), ib("x", "Cancelar", () => { this.mode = null; this.paint(); }));
    };
    const primary = (b) => { b.style.background = AMBER; b.style.color = "var(--accent-ink)"; return b; };
    if (this.mode === "mkdir") el.append(nameField("", (n) => n && this.run(() => this.fs.mkdir(this.path, n), `Carpeta creada: ${n}`)));
    else if (this.mode === "rename" && one) el.append(nameField(one.name, (n) => n && n !== one.name ? this.run(() => this.fs.rename(join(this.path, one.name), n), `Renombrado a ${n}`) : (this.mode = null, this.paint())));
    else if (this.mode === "trash") el.append(h("div.col", { style: { gap: "6px" } }, h("span", `¿Enviar ${one ? `«${one.name}»` : `${sel.length} elementos`} a la papelera?`),
      h("div.row", button("Enviar a la papelera", () => this.run(() => this.fs.trash(sel.map((n) => join(this.path, n))), "Enviado a la papelera."), { kind: "danger" }), button("Cancelar", () => { this.mode = null; this.paint(); }))));
    else if (sel.length) {
      const transfer = async (op) => { const d = await this.ctx.api.dialog.folder(op === "move" ? "Mover a…" : "Copiar a…"); if (d) this.run(() => this.fs.transfer(op, sel.map((n) => join(this.path, n)), d), `${op === "move" ? "Movido" : "Copiado"} a ${d}`); };
      el.append(h("div.col", { style: { gap: "6px" } },
        h("div.row", h("span.grow.trunc.muted", { style: { fontSize: "12px" } }, one ? `«${one.name}»` : `${sel.length} seleccionados`), ib("x", "Quitar selección", () => { this.sel = new Set(); this.paint(); })),
        h("div.row", { style: { gap: "4px" } },
          one?.dir ? primary(button("Abrir como espacio", () => this.ctx.openFolder(join(this.path, one.name)), { ic: "rocket" })) : primary(button("Abrir", () => sel.forEach((n) => this.open(join(this.path, n))), { ic: "external" })),
          h("span.grow"),
          one ? ib("pencil", "Renombrar", () => { this.mode = "rename"; this.paint(); }) : null,
          ib("move", "Mover a…", () => transfer("move")), ib("copy", "Copiar a…", () => transfer("copy")),
          one ? ib("external", "Mostrar en el sistema", () => this.ctx.api.shell.reveal(join(this.path, one.name))) : null,
          ib("trash", "Enviar a la papelera", () => { this.mode = "trash"; this.paint(); }, "var(--blocked)"))));
    } else el.append(h("div.row", { style: { gap: "4px" } },
      compact ? ib("plus", "Nueva carpeta", () => { this.mode = "mkdir"; this.paint(); }) : button("Nueva carpeta", () => { this.mode = "mkdir"; this.paint(); }, { ic: "plus" }),
      ib("external", "Abrir esta carpeta en el sistema", () => this.open(this.path)),
      h("span.grow"),
      primary(button(compact ? "Abrir espacio" : "Abrir como espacio", () => this.ctx.openFolder(this.path), { ic: "rocket" }))));
  }

  paintList(list, shown = this.items.filter((i) => !this.q || i.name.toLowerCase().includes(this.q))) {
    clear(list);
    if (this.error) { list.append(h("div.notice.error", this.error)); return; }
    if (!shown.length) { list.append(h("div.dim", { style: { padding: "16px", textAlign: "center" } }, this.loading ? "Leyendo…" : this.q ? "Nada coincide con el filtro." : "Esta carpeta está vacía.")); return; }
    for (const it of shown) {
      const k = kind(it), on = this.sel.has(it.name), full = join(this.path, it.name);
      list.append(h("div.row", {
        style: { height: "34px", padding: "0 4px 0 8px", gap: "10px", borderRadius: "9px", flex: "none", cursor: "default", background: on ? `${AMBER}26` : "" },
        onmouseenter: (e) => { if (!on) e.currentTarget.style.background = "var(--hover)"; }, onmouseleave: (e) => { if (!on) e.currentTarget.style.background = ""; },
        onclick: () => { if (on) this.sel.delete(it.name); else this.sel.add(it.name); this.mode = null; this.paint(); },
        ondblclick: () => (it.dir ? this.go(full) : this.open(full)),
      },
      (() => { const i = icon(k.ic, 15); i.style.color = k.color; return i; })(),
      h("span.grow.trunc", { translate: "no" }, it.name),
      it.git && !this.compact ? h("span.chip", { style: { background: `${AMBER}22`, color: AMBER, height: "18px", fontSize: "10.5px" } }, "proyecto") : null,
      it.dir ? h("button.icon-btn", { title: "Entrar", style: { width: "24px", height: "24px" }, onclick: (e) => { e.stopPropagation(); this.go(full); } }, icon("chevron", 12))
        : h("span.dim", { style: { fontSize: "11px" } }, sizeText(it.size))));
    }
  }
}
