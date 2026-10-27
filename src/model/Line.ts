import { Shape } from './Shape.js';

export class Line extends Shape {
  constructor(id: string, x1: number, y1: number, x2: number, y2: number) {
    super(id, 'line'); this.initialize({ x1, y1, x2, y2 });
  }
  protected override get geometry(): readonly string[] { return ['x1', 'y1', 'x2', 'y2']; }
  protected override get nonnegative(): readonly string[] { return []; }
  override move(dx: number, dy: number): void { this.shift(['x1', 'x2'], ['y1', 'y2'], dx, dy); }
  override clone(): Line { return this.copyTo(new Line(this.id, 0, 0, 0, 0)); }
}
