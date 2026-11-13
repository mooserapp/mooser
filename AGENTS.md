# Mooser: working on the app itself

Mooser is an Electron app (Windows and macOS) for terminals and AI coding agents. This file is for
changing Mooser's own code. To change one person's Mooser (theme, settings, styles, plugins) edit
their `~/.mooser` folder instead: see `docs/CUSTOMIZE.md`.

## Run

```sh
npm install
npm run dev      # opens DevTools; saving a file in src/renderer reloads the window
npm start
npm run dist:win # dist/Mooser Setup x.y.z.exe   (dist:mac on a Mac)
```

Terminals keep running across a window reload: each pane saves its terminal id, and the main process
hands back the terminal's recent output when the page asks for it again.

## Layout

| Path | What |
|---|---|
| `src/main/main.js` | the window, every IPC handler (the page's only way to the system) |
| `src/main/preload.js` | the `window.mooser` bridge: one entry per IPC handler |
| `src/main/terminals.js` | node-pty terminals, output batching, agent detection and status |
| `src/main/config.js` | `~/.mooser`: settings defaults and merging, file watching, the `mooser://config/` scheme |
| `src/main/kit.js` | Claude Code's skills, agents, MCP, plugins, model |
| `src/main/files.js`, `ssh.js`, `usage.js`, `store.js` | Explorer, SSH servers, Claude plan usage, window state |
| `src/renderer/js/app.js` | the window's parts: sidebar, tab bar, side panel, status bar, palette, keys, alerts |
| `src/renderer/js/workspace.js` | spaces, tabs, split panes, xterm.js terminals |
| `src/renderer/js/settings.js`, `settingsView.js` | applying settings and themes; the Settings window |
| `src/renderer/js/plugins.js` | the plugin loader and the `mooser` object plugins get |
| `src/renderer/js/panels/*.js` | the side panel sections |
| `src/renderer/js/ui.js` | `h()` element builder, icons, menus, toasts |
| `src/renderer/styles.css` | the look; variables at the top |

## Rules

- Commits: author `David Chiriboga <77027228+davechbga@users.noreply.github.com>`, and **no**
  `Co-Authored-By` lines or any Claude/AI attribution in commits, PRs, releases or docs.
- Current state, pending work and the owner's preferences: `docs/HANDOFF.md`.
- Every new UI string gets its English in `src/renderer/js/i18n.js`; the person's own content goes in
  elements with `translate="no"`.
- The page has no Node. A new system ability is an IPC handler in `main.js` plus its line in
  `preload.js`.
- A new setting gets its default in `config.js` `DEFAULTS`, a control in `settingsView.js`, and a line in
  `docs/CUSTOMIZE.md`.
- A new plugin ability goes in `plugins.js` `makeApi` and in `docs/CUSTOMIZE.md`'s table.
- UI text is written in Spanish (sentence case) and translated to English by `i18n.js`.
- Check a change by running the app. `MOOSER_SHOT=<file.png> MOOSER_QUIT=1 npx electron .` saves a
  picture of the window after 5 s (`MOOSER_WAIT` ms) and prints the page's console;
  `MOOSER_JS="..."` runs code in the page first (at `MOOSER_JS_AT` ms). Close other Mooser windows
  first: they hold the data folder.
