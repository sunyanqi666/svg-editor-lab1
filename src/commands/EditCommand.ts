import { Document } from '../model/Document.js';

/** One editing action; snapshots also retain parent order and nested styles. */
export abstract class EditCommand {
  execute(document: Document): { document: Document; message: string } {
    const working = document.clone();
    const message = this.apply(working);
    return { document: working, message };
  }
  protected abstract apply(document: Document): string;
}
