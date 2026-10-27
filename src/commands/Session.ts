import { Document } from '../model/Document.js';
import { EditCommand } from './EditCommand.js';

export class Session {
  private current: Document | undefined;
  get document(): Document {
    if (!this.current) throw new Error("no document. use 'init' or 'read' first");
    return this.current;
  }
  replace(document: Document): void { this.current = document; }
  execute(command: EditCommand): string {
    const result = command.execute(this.document); this.current = result.document; return result.message;
  }
}
