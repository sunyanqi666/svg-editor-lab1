import { Document } from '../model/Document.js';
import { EditCommand } from './EditCommand.js';

export class DeleteCommand extends EditCommand {
  constructor(private readonly id: string) { super(); }
  protected override apply(doc: Document): string {
    const shape = doc.require(this.id); shape.parent!.remove(shape);
    return `${shape.tag}#${shape.id} deleted`;
  }
}
