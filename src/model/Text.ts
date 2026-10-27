import { Shape } from './Shape.js';

export class Text extends Shape {
  private value: string;
  constructor(id: string, x: number, y: number, text: string) {
    super(id, 'text'); this.value = text; this.initialize({ x, y });
  }
  protected override get geometry(): readonly string[] { return ['x', 'y']; }
  override get content(): string { return this.value; }
  override set(name: string, value: string): void {
    if (name === 'text') this.value = value; else super.set(name, value);
  }
  override move(dx: number, dy: number): void { this.shift(['x'], ['y'], dx, dy); }
  override clone(): Text { return this.copyTo(new Text(this.id, 0, 0, this.value)); }
  override describe(): string { return super.describe() + ' ' + JSON.stringify(this.value); }
}
