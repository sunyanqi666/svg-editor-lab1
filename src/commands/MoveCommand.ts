import { Document } from '../model/Document.js';
import { EditCommand } from './EditCommand.js';

export class MoveCommand extends EditCommand {
  constructor(private readonly id: string, private readonly dx: number, private readonly dy: number) { super(); }
  protected override apply(doc: Document): string {
    if (!Number.isFinite(this.dx) || !Number.isFinite(this.dy)) throw new Error('invalid movement');
    const shape = doc.require(this.id); shape.move(this.dx, this.dy);
    return `${shape.tag}#${shape.id} moved by (${this.dx},${this.dy})`;
  }
}
