import { Document } from '../model/Document.js';
import { EditCommand } from './EditCommand.js';

export class ScaleCommand extends EditCommand {
  constructor(private readonly id: string, private readonly factor: number) { super(); }
  protected override apply(doc: Document): string {
    const shape = doc.require(this.id); shape.scale(this.factor);
    return `${shape.tag}#${shape.id} scaled by ${this.factor}`;
  }
}
