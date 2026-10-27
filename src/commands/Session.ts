import { Document } from '../model/Document.js';
import { History } from './History.js';
import { EditCommand } from './EditCommand.js';

export class Session {
  private readonly history = new History();
  private current: Document | undefined;
  /** Readers receive snapshots so they cannot bypass commands or history. */
  get document(): Document { return this.requireCurrent().clone(); }
  private requireCurrent(): Document {
    if (!this.current) throw new Error("no document. use 'init' or 'read' first");
    return this.current;
  }
  replace(document: Document): void { this.current = document.clone(); this.history.barrier(); }
  ensureDocument(): void { void this.requireCurrent(); }
  barrier(): void { this.history.barrier(); }
  undo(): string {
    void this.requireCurrent();
    const result = this.history.undo(); this.current = result.document; return result.message;
  }
  redo(): string {
    void this.requireCurrent();
    const result = this.history.redo(); this.current = result.document; return result.message;
  }
  execute(command: EditCommand): string {
    const result = command.execute(this.requireCurrent()); this.current = result.document; this.history.record(command); return result.message;
  }
}
