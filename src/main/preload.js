// The only bridge between the page and the system: a fixed list of calls, no Node in the page.
const { contextBridge, ipcRenderer } = require("electron");

const call = (name) => (...args) => ipcRenderer.invoke(name, ...args);
const on = (channel) => (fn) => {
  const h = (_e, ...args) => fn(...args);
  ipcRenderer.on(channel, h);
  return () => ipcRenderer.removeListener(channel, h);
};

contextBridge.exposeInMainWorld("mooser", {
  app: { info: call("app:info"), notify: call("notify"), loadState: call("state:load"), saveState: call("state:save") },
  win: { minimize: call("window:minimize"), maximize: call("window:maximize"), close: call("window:close"), onState: on("window:state"), onFocus: on("window:focus") },
  dialog: { folder: call("dialog:folder"), files: call("dialog:files") },
  shell: { open: call("shell:open"), reveal: call("shell:reveal"), external: call("shell:external"), editor: call("shell:editor") },
  term: {
    create: call("term:create"), write: call("term:write"), resize: call("term:resize"), kill: call("term:kill"), list: call("term:list"), focus: call("term:focus"),
    onData: on("term:data"), onExit: on("term:exit"), onStatus: on("term:status"),
  },
  fs: { list: call("fs:list"), mkdir: call("fs:mkdir"), rename: call("fs:rename"), transfer: call("fs:transfer"), trash: call("fs:trash") },
  kit: { scan: call("kit:scan"), mcp: call("kit:mcp"), set: call("kit:set"), toggle: call("kit:toggle"), create: call("kit:create"), claude: call("kit:claude") },
  ssh: {
    load: call("ssh:load"), save: call("ssh:save"), remove: call("ssh:remove"), groups: call("ssh:groups"), probe: call("ssh:probe"), list: call("ssh:list"),
    connectSpec: call("ssh:connectSpec"), transferSpec: call("ssh:transferSpec"),
  },
  usage: { claude: call("usage:claude") },
});
