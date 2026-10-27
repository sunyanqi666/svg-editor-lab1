import { Shape } from './Shape.js';

export class Rect extends Shape {
  constructor(id: string, x: number, y: number, width: number, height: number) {
    super(id, 'rect'); this.initialize({ x, y, width, height });
  }
  protected override get geometry(): readonly string[] { return ['x', 'y', 'width', 'height']; }
  protected override get nonnegative(): readonly string[] { return ['width', 'height']; }
  override move(dx: number, dy: number): void { this.shift(['x'], ['y'], dx, dy); }
  override clone(): Rect { return this.copyTo(new Rect(this.id, 0, 0, 0, 0)); }
}
