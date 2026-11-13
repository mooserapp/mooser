// A stand-in coding agent for screenshots: it names itself "Claude Code" in the window title, works
// for a while, then asks a question, so Mooser shows "working" and then "needs you".
// Usage: node scripts/demo-agent.cjs [ask-after-ms]
const askAfter = Number(process.argv[2] ?? 4000);
process.stdout.write("\x1b]0;✳ Claude Code\x07");
const lines = [
  "\x1b[38;5;147m●\x1b[0m Reading src/renderer/js/workspace.js",
  "\x1b[38;5;147m●\x1b[0m Reading src/main/terminals.js",
  "\x1b[38;5;114m●\x1b[0m Update(src/renderer/styles.css)",
  "  ⎿  Updated with 4 additions and 1 removal",
];
let i = 0;
const spin = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const t = setInterval(() => {
  if (i < lines.length && i % 2 === 0) process.stdout.write(`\r${lines[i / 2 | 0] ?? ""}\r\n`);
  process.stdout.write(`\r\x1b[38;5;216m${spin[i % spin.length]} Thinking…\x1b[0m ${(i * 0.2).toFixed(1)}s `);
  i++;
}, 200);
setTimeout(() => {
  clearInterval(t);
  process.stdout.write("\r\x1b[K\r\n\x1b[1mDo you want to make this edit to styles.css?\x1b[0m\r\n\x1b[38;5;147m❯ 1. Yes\x1b[0m\r\n  2. No, and tell Claude what to do differently\r\n");
  setInterval(() => {}, 60000);
}, askAfter);
