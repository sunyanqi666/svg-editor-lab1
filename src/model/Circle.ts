import { Shape } from './Shape.js';

export class Circle extends Shape {
  constructor(id: string, cx: number, cy: number, r: number) {
    super(id, 'circle'); this.initialize({ cx, cy, r });
  }
  protected override get geometry(): readonly string[] { return ['cx', 'cy', 'r']; }
  protected override get nonnegative(): readonly string[] { return ['r']; }
  override move(dx: number, dy: number): void { this.shift(['cx'], ['cy'], dx, dy); }
  override clone(): Circle { return this.copyTo(new Circle(this.id, 0, 0, 0)); }
}
