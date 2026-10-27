import { Group } from './Group.js';
import { Shape } from './Shape.js';

export class Document {
  private tree = new Group('__canvas__');
  private canvasWidth: number;
  private canvasHeight: number;
  constructor(width = 800, height = 600) {
    this.canvasWidth = width; this.canvasHeight = height; this.resize(width, height);
  }
  get root(): Group { return this.tree; }
  get width(): number { return this.canvasWidth; }
  get height(): number { return this.canvasHeight; }
  resize(width: number, height: number): void {
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0)
      throw new Error('canvas dimensions must be positive');
    this.canvasWidth = width; this.canvasHeight = height;
  }
  all(): Shape[] {
    const result: Shape[] = [];
    const visit = (shape: Shape): void => { result.push(shape); shape.children.forEach(visit); };
    this.tree.children.forEach(visit); return result;
  }
  find(id: string): Shape | undefined { return this.all().find(shape => shape.id === id); }
  require(id: string): Shape {
    const shape = this.find(id); if (!shape) throw new Error('no such shape: ' + id); return shape;
  }
  container(id?: string): Group {
    if (id === undefined) return this.tree;
    const shape = this.find(id);
    if (!shape) throw new Error('no such container: ' + id);
    if (!(shape instanceof Group)) throw new Error('not a container: ' + id);
    return shape;
  }
  assertAvailable(id: string): void {
    if (this.find(id)) throw new Error('id already exists: ' + id);
  }
  add(shape: Shape, parent = this.tree): void {
    const ids = new Set(this.all().map(item => item.id));
    const visit = (item: Shape): void => {
      if (ids.has(item.id)) throw new Error('id already exists: ' + item.id);
      ids.add(item.id); item.children.forEach(visit);
    };
    visit(shape); parent.insert(shape);
  }
  clone(): Document {
    const copy = new Document(this.width, this.height); copy.tree = this.tree.clone(); return copy;
  }
}
