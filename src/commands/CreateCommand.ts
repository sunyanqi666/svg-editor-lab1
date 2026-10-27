import { Document } from '../model/Document.js';
import { ShapeFactory } from '../model/ShapeFactory.js';
import { EditCommand } from './EditCommand.js';

export class CreateCommand extends EditCommand {
  constructor(private readonly factory: ShapeFactory, private readonly type: string,
    private readonly id: string, private readonly args: readonly string[], private readonly parentId?: string) { super(); }
  protected override apply(doc: Document): string {
    doc.assertAvailable(this.id);
    const parent = doc.container(this.parentId);
    const shape = this.factory.create(this.type, this.id, this.args);
    doc.add(shape, parent);
    return `${shape.tag}#${shape.id} created${this.parentId ? ' in g#' + this.parentId : ''}`;
  }
}
