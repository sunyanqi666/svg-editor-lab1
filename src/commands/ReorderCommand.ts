import { Document } from '../model/Document.js';
import { EditCommand } from './EditCommand.js';

export class ReorderCommand extends EditCommand {
  constructor(private readonly id: string, private readonly front: boolean) { super(); }
  protected override apply(doc: Document): string {
    const shape = doc.require(this.id); const parent = shape.parent!;
    parent.remove(shape); parent.insert(shape,this.front ? parent.children.length : 0);
    return `${shape.tag}#${shape.id} moved to ${this.front ? 'front' : 'back'}`;
  }
}
