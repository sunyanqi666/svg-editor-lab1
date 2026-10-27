import { createInterface } from 'node:readline';
import { CommandRouter } from './CommandRouter.js';

const router = new CommandRouter();
const interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY);
const terminal = createInterface({ input: process.stdin, output: process.stdout, terminal: interactive });
if (interactive) console.log("svg-editor 0.1 — type 'help' for commands");
terminal.setPrompt('svg> ');
if (interactive) terminal.prompt();
terminal.on('line', line => {
  const output = router.run(line); if (output) console.log(output);
  if (interactive) terminal.prompt();
});
