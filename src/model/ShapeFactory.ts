import { Shape } from './Shape.js';
import { Rect } from './Rect.js';
import { Circle } from './Circle.js';
import { Ellipse } from './Ellipse.js';
import { Line } from './Line.js';
import { Text } from './Text.js';
import { Group } from './Group.js';

/** The single shape-type dispatch point; replace with providers in a later phase. */
export class ShapeFactory {
  private readonly creators = new Map<string, { create: (id: string, args: readonly string[]) => Shape; defaults: string[]; syntax: string }>([
    ['rect', { create: (id, a) => { this.count(a, 4, 5); const s = new Rect(id, this.n(a,0), this.n(a,1), this.n(a,2), this.n(a,3)); if (a[4] !== undefined) s.set('fill', a[4]); return s; }, defaults: ["0", "0", "0", "0"], syntax: "create rect <id> <x> <y> <w> <h> [fill]" }],
    ['circle', { create: (id, a) => { this.count(a, 3, 4); const s = new Circle(id, this.n(a,0), this.n(a,1), this.n(a,2)); if (a[3] !== undefined) s.set('fill', a[3]); return s; }, defaults: ["0", "0", "0"], syntax: "create circle <id> <cx> <cy> <r> [fill]" }],
    ['ellipse', { create: (id, a) => { this.count(a, 4, 5); const s = new Ellipse(id, this.n(a,0), this.n(a,1), this.n(a,2), this.n(a,3)); if (a[4] !== undefined) s.set('fill', a[4]); return s; }, defaults: ["0", "0", "0", "0"], syntax: "create ellipse <id> <cx> <cy> <rx> <ry> [fill]" }],
    ['line', { create: (id, a) => { this.count(a, 4, 5); const s = new Line(id, this.n(a,0), this.n(a,1), this.n(a,2), this.n(a,3)); if (a[4] !== undefined) s.set('stroke', a[4]); return s; }, defaults: ["0", "0", "0", "0"], syntax: "create line <id> <x1> <y1> <x2> <y2> [stroke]" }],
    ['text', { create: (id, a) => { this.count(a, 3, 3); return new Text(id, this.n(a,0), this.n(a,1), a[2]!); }, defaults: ["0", "0", ""], syntax: "create text <id> <x> <y> \"content\"" }],
    ['g', { create: (id, a) => { this.count(a, 0, 0); return new Group(id); }, defaults: [], syntax: "create g <id>" }],
  ]);
  private n(args: readonly string[], index: number): number { return Shape.finite(args[index]!); }
  private count(args: readonly string[], min: number, max: number): void {
    if (args.length < min || args.length > max) throw new Error(`expected ${min === max ? min : min + '..' + max} shape parameters`);
  }
  create(type: string, id: string, args: readonly string[]): Shape {
    const creator = this.provider(type);
    try { return creator.create(id, args); }
    catch (error) {
      if (error instanceof Error && error.message.startsWith('expected '))
        throw new Error('usage: ' + creator.syntax + ' [in <containerId>]');
      throw error;
    }
  }
  usage(): string[] { return [...this.creators.values()].map(provider => '  ' + provider.syntax); }
  /** XML creation uses the same registry and polymorphic attribute validation. */
  empty(type: string, id: string): Shape {
    const provider = this.provider(type);
    return provider.create(id,provider.defaults);
  }
  private provider(type: string) {
    const provider = this.creators.get(type);
    if (!provider) throw new Error('unknown shape type: ' + type + ' (is the plugin loaded?)');
    return provider;
  }
}
