import { Shape } from './Shape.js';

export class Ellipse extends Shape {
  constructor(id: string, cx: number, cy: number, rx: number, ry: number) {
    super(id, 'ellipse'); this.initialize({ cx, cy, rx, ry });
  }
  protected override get geometry(): readonly string[] { return ['cx', 'cy', 'rx', 'ry']; }
  protected override get nonnegative(): readonly string[] { return ['rx', 'ry']; }
  override move(dx: number, dy: number): void { this.shift(['cx'], ['cy'], dx, dy); }
  override clone(): Ellipse { return this.copyTo(new Ellipse(this.id, 0, 0, 0, 0)); }
}
