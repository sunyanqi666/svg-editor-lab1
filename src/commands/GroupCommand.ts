import { Document } from '../model/Document.js';
import { Group } from '../model/Group.js';
import { Shape } from '../model/Shape.js';
import { EditCommand } from './EditCommand.js';

export class GroupCommand extends EditCommand {
  constructor(private readonly id: string, private readonly ids: readonly string[]) { super(); }
  protected override apply(doc: Document): string {
    doc.assertAvailable(this.id);
    if (!this.ids.length) throw new Error('group requires at least one shape');
    if (new Set(this.ids).size !== this.ids.length) throw new Error('duplicate group target');
    const selected = new Set(this.ids.map(id => doc.require(id)));
    for (const shape of selected) {
      for (let parent: Shape | undefined = shape.parent; parent && parent !== doc.root; parent = parent.parent)
        if (selected.has(parent)) throw new Error('cannot group a container into its own descendant: ' + parent.id);
    }
    const ordered = doc.all().filter(shape => selected.has(shape));
    const first = ordered[0]!; const parent = first.parent!;
    const group = new Group(this.id);
    parent.insert(group,parent.children.indexOf(first));
    for (const shape of ordered) group.insert(shape);
    return `g#${this.id} created with ${ordered.length} children`;
  }
}
