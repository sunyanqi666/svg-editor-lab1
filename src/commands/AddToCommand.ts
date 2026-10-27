import { Document } from '../model/Document.js';
import { EditCommand } from './EditCommand.js';

export class AddToCommand extends EditCommand {
  constructor(private readonly groupId: string, private readonly id: string) { super(); }
  protected override apply(doc: Document): string {
    const group = doc.container(this.groupId); const shape = doc.require(this.id);
    group.insert(shape);
    return `${shape.tag}#${shape.id} moved into g#${group.id}`;
  }
}
