import { Document } from '../model/Document.js';
import { EditCommand } from './EditCommand.js';

export class SetCommand extends EditCommand {
  constructor(private readonly id: string, private readonly attr: string, private readonly value: string) { super(); }
  protected override apply(doc: Document): string {
    const shape = doc.require(this.id); shape.set(this.attr, this.value);
    return `${shape.tag}#${shape.id} updated: ${this.attr}=${JSON.stringify(this.value)}`;
  }
}
