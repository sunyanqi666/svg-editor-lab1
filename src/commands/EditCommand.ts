import { Document } from '../model/Document.js';

/** One editing action. Snapshots retain parent order, nested styles and text. */
export abstract class EditCommand {
  private before: Document | undefined;
  private after: Document | undefined;
  private summary = '';
  execute(document: Document): { document: Document; message: string } {
    if (this.before) throw new Error('command has already executed');
    const working = document.clone();
    const message = this.apply(working);
    this.before = document.clone(); this.after = working.clone(); this.summary = message;
    return { document: working, message };
  }
  undo(): { document: Document; message: string } {
    if (!this.before) throw new Error('command has not executed');
    return { document: this.before.clone(), message: 'undone: ' + this.summary };
  }
  redo(): { document: Document; message: string } {
    if (!this.after) throw new Error('command has not executed');
    return { document: this.after.clone(), message: 'redone: ' + this.summary };
  }
  protected abstract apply(document: Document): string;
}
