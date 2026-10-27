import { Document } from '../model/Document.js';
import { EditCommand } from './EditCommand.js';

export class UngroupCommand extends EditCommand {
  constructor(private readonly id: string) { super(); }
  protected override apply(doc: Document): string {
    const group = doc.container(this.id); const parent = group.parent!;
    if (parent === doc.root) throw new Error('cannot ungroup top-level container: ' + this.id);
    const index = parent.children.indexOf(group); const children = group.children;
    // Preserve inherited style when removing the group boundary.
    for (const child of children) {
      for (const [key,value] of Object.entries(group.attributes))
        if (child.attributes[key] === undefined) child.set(key,value);
    }
    parent.remove(group);
    children.forEach((child,i) => parent.insert(child,index+i));
    return `g#${this.id} ungrouped (${children.length} children)`;
  }
}
