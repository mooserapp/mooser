# Customizing Mooser

Mooser is a desktop app for terminals and AI coding agents (spaces per project folder, tabs, split
panes, agent status, side panels). **Everything that makes it the person's own is plain files in
their Mooser folder**, and Mooser applies a saved change at once. When someone asks you to change
how Mooser looks or works, do it by editing these files.

- Mooser folder: `~/.mooser` (Windows `C:\Users\<you>\.mooser`), or `$MOOSER_HOME` if set. Every
  terminal Mooser opens has `MOOSER_HOME` and `TERM_PROGRAM=Mooser` in its environment.
- This guide is rewritten by Mooser on every start (`~/.mooser/AGENTS.md`); don't edit it.

| File | What it decides | Applied |
|---|---|---|
| `settings.json` | theme, colors, background, glass, sizes, terminal, alerts, the + menu agents, plugins on/off | at once |
| `custom.css` | any style on top of Mooser's | at once |
| `plugins/<name>/main.js` | new features: commands, side panel sections, status bar items, reactions to agents | window reloads (terminals keep running) |
| `backgrounds/` | images for the window background | at once |

Check your work: a broken `settings.json` or a plugin that throws shows in red at the right of the
status bar; clicking it opens the file. Fix it there.

## settings.json

Write only the keys you change; Mooser fills the rest with defaults. Keep it valid JSON.

```json
{
  "theme": "caustica",
  "appearance": {
    "accent": null,
    "background": "preset",
    "glass": 0.56,
    "blur": 22,
    "radius": 18,
    "gap": 10,
    "uiFontSize": 13,
    "animations": true
  },
  "terminal": {
    "fontFamily": "",
    "fontSize": 14,
    "lineHeight": 1.15,
    "cursorStyle": "block",
    "cursorBlink": true,
    "scrollback": 10000,
    "shell": "",
    "shellArgs": [],
    "copyOnSelect": false
  },
  "alerts": { "sound": true, "notifications": true, "usageReset": true },
  "agents": [
    { "label": "Claude Code", "command": "claude" },
    { "label": "Codex", "command": "codex" },
    { "label": "Gemini CLI", "command": "gemini" }
  ],
  "panel": { "default": "kit" },
  "plugins": { "ejemplo": false }
}
```

- `theme`: the mood of the window. `caustica` (deep blue water and light caustics, periwinkle
  accent), `medianoche` (near-black navy, teal), `aurora` (teal and violet glows, green), `ambar`
  (warm brown, amber), `rosa` (plum, pink).
- `appearance.accent`: `"#rrggbb"` for buttons, selection and focus; `null` uses the theme's.
- `appearance.background`: `"preset"` (the theme's), `"none"` (a plain color), or a path inside the
  Mooser folder such as `"backgrounds/forest.jpg"` (copy the image there first).
- `appearance.glass`: 0.2–1, how opaque the frosted panels are. `blur`: px of frosting (0–40).
  `radius`: px of corner rounding. `gap`: px between panels. `uiFontSize`: px of the interface text.
- `terminal.shell`: a program path or name (`"bash"`, `"C:\\Program Files\\Git\\bin\\bash.exe"`);
  empty picks PowerShell 7 / Windows PowerShell on Windows and `$SHELL` on macOS. New terminals only.
- `agents`: the + menu of the tab bar. `command` is typed into a new terminal.
- `panel.default`: the side panel section open first: `kit`, `files`, `servers`, `usage`, or a
  plugin panel's id.
- `plugins`: `{ "<folder name>": true }` turns a plugin on.

## custom.css

Plain CSS loaded after Mooser's. Useful variables (set them on `:root`):

`--accent` · `--glass` (panel color with alpha) · `--blur` · `--radius` · `--gap` · `--fg` ·
`--muted` · `--dim` · `--border` · `--surface` · `--raised` · `--hover` · `--selected` ·
`--working` · `--blocked` · `--done` · `--idle` · `--ui` (interface font) · `--mono`.

Regions and pieces you can target:

| Selector | What |
|---|---|
| `#sidebar`, `#sidebar.rail` | the left bar (spaces, agents), and its folded rail |
| `#tabbar`, `.tab`, `.tab.on` | the tab bar and its tabs |
| `#tabhost`, `.pane`, `.pane.focused`, `.pane-head`, `.term` | the panes and terminals |
| `#panel`, `.dock`, `.panel-body` | the side panel |
| `#status` | the status bar |
| `.glass` | every frosted panel |
| `.grip` | the three-dot handles that resize |
| `.btn`, `.btn.primary`, `.switch`, `.field`, `.card`, `.item` | controls |
| `.dot.working`, `.dot.blocked`, `.dot.done` | agent status dots |

Example: a sharper, quieter window.

```css
:root { --radius: 8px; --gap: 6px; }
#status { display: none; }
.pane-head { height: 26px; }
```

Layout changes are CSS too, e.g. the side panel on the left: `#body { flex-direction: row-reverse; }`.

## Plugins

A plugin is a folder with `main.js`, an ES module (no Node: it runs in the window). Its first line
comment is its description in Settings. The default export gets the `mooser` object:

```js
// Shows how many agents are working, and a command to open the project's README.
export default function activate(mooser) {
  mooser.statusBar.add(() => {
    const busy = mooser.agents.list().filter((a) => a.status === "working").length;
    return busy ? mooser.ui.h("span", `${busy} trabajando`) : null;
  });
  mooser.commands.add({ label: "Abrir README", icon: "fileText", run: () => mooser.shell.editor("README.md") });
}
```

Then turn it on: `"plugins": { "<folder name>": true }` in settings.json.

### The `mooser` object

| Member | What it does |
|---|---|
| `commands.add({ label, icon?, run })` | a command in the palette (Ctrl+Shift+P / ⌘⇧P) |
| `panels.add({ id, label, icon?, mount(el, mooser), shown?(), update?() })` | a section of the side panel; draw into `el` (a flex column). `update` runs when the workspace changes |
| `panels.show(id)` | opens a side panel section |
| `statusBar.add(() => element \| null)` | an item in the status bar, redrawn with the window |
| `agents.list()` | `[{ agent, status, space, pane }]`; status is `working`, `blocked`, `done` or `idle` |
| `agents.onStatus(fn)` | `fn({ id, agent, status, title, cwd })` whenever a terminal's status changes |
| `workspace.spaces()` | `[{ id, name, folder, tabs, active }]` |
| `workspace.openFolder(path)` | opens (or goes to) a space for a folder |
| `workspace.newTab({ cwd?, name?, argv? })` | a new terminal tab in the current space |
| `workspace.run(command, { cwd?, name? })` | a new tab that types `command` in your shell |
| `workspace.split("row" \| "col", spec?)` | splits the focused pane |
| `workspace.sendText(text, pane?)` | types into a terminal (`"\r"` is Enter) |
| `exec(cmd, args, { cwd?, timeout? })` | runs a program: `{ code, stdout, stderr }` |
| `notify(title, body)` | a system notification |
| `settings.get()`, `settings.set(patch)`, `settings.onChange(fn)` | read and change settings |
| `ui.h(spec, props, ...children)` | builds elements: `h("div.row.grow", { onclick }, "text", child)` |
| `ui.icon(name, size?)` | an icon (below) |
| `ui.button(text, onclick, { kind: "primary" \| "danger", ic })`, `ui.toggle(on, onclick)`, `ui.input(placeholder)`, `ui.field(input, icon)` | controls in Mooser's style |
| `ui.toast(title, body)`, `ui.menu(items, at)`, `ui.chime("done" \| "blocked")`, `ui.palette()` | feedback |
| `shell.open(path)`, `shell.external(url)`, `shell.editor(path)` | open things |
| `fs.list(dir)`, `fs.mkdir(dir, name)`, `fs.rename(path, name)`, `fs.trash([paths])` | files |
| `dialog.folder(title)`, `dialog.files(title)` | pickers |

Icons: `plus x search sidebar panel splitRight splitDown maximize folder git file fileCode fileText
image archive app up chevron refresh home eye eyeOff pencil move copy trash external rocket sparkles
bot plug puzzle cpu server gauge terminal transfer keyboard zap code check minus square key`.

A panel example:

```js
// Notes: a scratchpad in the side panel, kept on this computer.
export default function activate(mooser) {
  mooser.panels.add({
    id: "notas", label: "Notas", icon: "pencil",
    mount(el) {
      const area = mooser.ui.h("textarea", { value: localStorage.getItem("notas") ?? "", style: { flex: "1", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "12px", resize: "none" } });
      area.addEventListener("input", () => localStorage.setItem("notas", area.value));
      el.append(mooser.ui.h("b", "Notas"), area);
    },
  });
}
```

Plugins are the person's own code and run with the app's rights (`exec` runs programs). Write only
what was asked, and say so when a plugin runs programs or reaches the network.

## Deeper changes: Mooser's own code

What files can't do (a new built-in panel, a change to how terminals or agents work) is a change to
Mooser's source, an Electron app: `src/main` (window, terminals with node-pty, files, SSH, Claude
Code kit) and `src/renderer` (the page, plain JavaScript modules and CSS). Its repository has its
own `AGENTS.md`. Run it with `npm run dev`: saving a file under `src/renderer` reloads the window.
