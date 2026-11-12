// Plugins: your own features, as files in ~/.mooser/plugins/<name>/main.js. Each one is an ES
// module whose default export gets the `mooser` object below. Turn one on with
// "plugins": { "<name>": true } in settings.json. Saving a plugin reloads the window; terminals
// keep running and come back as they were.
//
// Plugins are your own code and run with the app's rights: they can run programs (mooser.exec).
import { h, icon, toast, menu, button, toggle, field, input, chime, iconButton } from "./ui.js";
import * as WS from "./workspace.js";
import { W } from "./workspace.js";
import * as Settings from "./settings.js";

const api = window.mooser;
export const registry = { commands: [], panels: [], status: [], errors: [], agentListeners: new Set(), loaded: [] };

function makeApi(name, ctx) {
  const self = {
    name, version: ctx.version, dir: `${Settings.S.dir}/plugins/${name}`,
    settings: { get: () => Settings.get(), set: (patch) => Settings.set(patch), onChange: (fn) => Settings.onChange(fn) },
    commands: { add: (c) => registry.commands.push({ icon: "sparkles", ...c, plugin: name }) },
    panels: {
      // { id, label, icon, mount(el, mooser), shown?(), update?() }: a section of the side panel.
      add: (p) => registry.panels.push({ ...p, plugin: name, api: self }),
      show: (id) => ctx.showPanel(id),
    },
    statusBar: { add: (render) => registry.status.push({ render, plugin: name }) },
    agents: {
      list: () => WS.agents().map((a) => ({ agent: a.agent, status: a.status, space: WS.label(a.space), pane: a.pane.id })),
      onStatus: (fn) => { registry.agentListeners.add(fn); return () => registry.agentListeners.delete(fn); },
    },
    workspace: {
      spaces: () => W.spaces.map((s) => ({ id: s.id, name: WS.label(s), folder: s.folder, tabs: s.tabs.length, active: s.id === W.active })),
      openFolder: (folder) => ctx.openFolder(folder),
      newTab: (spec = {}) => WS.newTab(spec)?.id,
      split: (dir = "row", spec = {}) => WS.split(dir, W.focusedPane, spec),
      focusedPane: () => W.focusedPane,
      // Types text in a pane's terminal (default: the focused one). "\r" presses Enter.
      sendText: (text, pane = W.focusedPane) => { const rt = W.panes.get(pane); if (rt?.termId) api.term.write(rt.termId, text); },
      run: (command, spec = {}) => ctx.runInNewTab(command, spec),
    },
    ui: { h, icon, toast, menu, button, toggle, field, input, chime, iconButton, palette: () => ctx.openPalette() },
    exec: (cmd, args = [], opts = {}) => api.plugin.exec(cmd, args, opts),
    notify: (title, body) => api.app.notify({ title, body }),
    shell: { open: api.shell.open, external: api.shell.external, editor: api.shell.editor },
    dialog: api.dialog,
    fs: api.fs,
  };
  return self;
}

export async function loadAll(ctx) {
  const on = Settings.get()?.plugins ?? {};
  for (const p of Settings.S.plugins) {
    if (!on[p.name]) continue;
    try {
      const mod = await import(`mooser://config/plugins/${encodeURIComponent(p.name)}/main.js?v=${Math.round(p.mtime)}`);
      const fn = mod.default ?? mod.activate;
      if (typeof fn !== "function") throw new Error("main.js no exporta una función por defecto");
      await fn(makeApi(p.name, ctx));
      registry.loaded.push(p.name);
    } catch (e) {
      registry.errors.push({ plugin: p.name, error: String(e?.message ?? e) });
      console.error(`[plugin ${p.name}]`, e);
    }
  }
}

export function emitAgentStatus(info) { for (const fn of registry.agentListeners) { try { fn(info); } catch (e) { console.error(e); } } }
