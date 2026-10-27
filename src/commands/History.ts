import { EditCommand } from './EditCommand.js';

export class History {
  private past: EditCommand[] = [];
  private future: EditCommand[] = [];
  private blocked = true;
  barrier(): void { this.past = []; this.future = []; this.blocked = true; }
  record(command: EditCommand): void { this.past.push(command); this.future = []; this.blocked = false; }
  undo(): ReturnType<EditCommand['undo']> {
    this.check(); const command = this.past.at(-1);
    if (!command) throw new Error('nothing to undo');
    const result = command.undo(); this.past.pop(); this.future.push(command); return result;
  }
  redo(): ReturnType<EditCommand['redo']> {
    this.check(); const command = this.future.at(-1);
    if (!command) throw new Error('nothing to redo');
    const result = command.redo(); this.future.pop(); this.past.push(command); return result;
  }
  private check(): void {
    if (this.blocked) throw new Error('undo not allowed after io command');
  }
}
