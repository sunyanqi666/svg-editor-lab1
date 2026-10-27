import { Shape } from './Shape.js';

export class Group extends Shape {
  private readonly items: Shape[] = [];
  constructor(id: string, private readonly addressable = true) { super(id, 'g'); }
  override get children(): readonly Shape[] { return [...this.items]; }
  insert(shape: Shape, index = this.items.length): void {
    if (!Number.isInteger(index) || index < 0 || index > this.items.length)
      throw new Error('invalid child index: ' + index);
    if (shape instanceof Group && !shape.addressable) throw new Error('cannot insert canvas root');
    for (let cursor: Shape | undefined = this; cursor; cursor = cursor.parent)
      if (cursor === shape) throw new Error('cannot move a container into its own descendant: ' + shape.id);
    this.validateIds(shape);
    // All checks precede detachment, including when moving between different trees.
    shape.parent?.remove(shape);
    this.items.splice(Math.min(index, this.items.length), 0, shape);
    Group.assignParent(shape, this);
  }
  private validateIds(incoming: Shape): void {
    const members = new Set<Shape>();
    const ids = new Set<string>();
    const collect = (shape: Shape): void => {
      if (ids.has(shape.id)) throw new Error('id already exists: ' + shape.id);
      ids.add(shape.id); members.add(shape); shape.children.forEach(collect);
    };
    collect(incoming);
    let root: Shape = this;
    while (root.parent) root = root.parent;
    const check = (shape: Shape): void => {
      if (members.has(shape)) return;
      if (!(shape instanceof Group && !shape.addressable) && ids.has(shape.id))
        throw new Error('id already exists: ' + shape.id);
      shape.children.forEach(check);
    };
    check(root);
  }
  remove(shape: Shape): number {
    const index = this.items.indexOf(shape);
    if (index < 0) throw new Error('shape is not a child: ' + shape.id);
    this.items.splice(index, 1); Group.assignParent(shape, undefined); return index;
  }
  override move(dx: number, dy: number): void { for (const child of this.items) child.move(dx, dy); }
  override scale(factor: number): void {
    super.scale(factor); for (const child of this.items) child.scale(factor);
  }
  override clone(): Group {
    const copy = this.copyTo(new Group(this.id, this.addressable));
    // Cloning a validated tree needs no repeated whole-tree insertion checks.
    for (const child of this.items) {
      const cloned = child.clone(); copy.items.push(cloned); Group.assignParent(cloned, copy);
    }
    return copy;
  }
}
