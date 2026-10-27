import { Shape } from './Shape.js';

export class Group extends Shape {
  private readonly items: Shape[] = [];
  constructor(id: string) { super(id, 'g'); }
  override get children(): readonly Shape[] { return [...this.items]; }
  insert(shape: Shape, index = this.items.length): void {
    for (let cursor: Shape | undefined = this; cursor; cursor = cursor.parent)
      if (cursor === shape) throw new Error('cannot move a container into its own descendant: ' + shape.id);
    shape.parent?.remove(shape);
    this.items.splice(Math.max(0, Math.min(index, this.items.length)), 0, shape);
    shape.assignParent(this);
  }
  remove(shape: Shape): number {
    const index = this.items.indexOf(shape);
    if (index < 0) throw new Error('shape is not a child: ' + shape.id);
    this.items.splice(index, 1); shape.assignParent(undefined); return index;
  }
  override move(dx: number, dy: number): void { for (const child of this.items) child.move(dx, dy); }
  override scale(factor: number): void {
    super.scale(factor); for (const child of this.items) child.scale(factor);
  }
  override clone(): Group {
    const copy = this.copyTo(new Group(this.id));
    for (const child of this.items) copy.insert(child.clone());
    return copy;
  }
}
