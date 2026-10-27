import type { Group } from './Group.js';

/** Encapsulated, polymorphic component shared by leaves and containers. */
export abstract class Shape {
  private readonly values = new Map<string, string>();
  private owner: Group | undefined;
  protected constructor(private readonly identifier: string, readonly tag: string) {
    if (!identifier || /\s/.test(identifier)) throw new Error('invalid id: ' + identifier);
  }
  get id(): string { return this.identifier; }
  get parent(): Group | undefined { return this.owner; }
  /** Tree mutation is mediated by Group. */
  assignParent(parent: Group | undefined): void { this.owner = parent; }
  get attributes(): Readonly<Record<string, string>> { return Object.fromEntries(this.values); }
  get children(): readonly Shape[] { return []; }
  get content(): string | undefined { return undefined; }
  protected get geometry(): readonly string[] { return []; }
  protected get nonnegative(): readonly string[] { return []; }
  protected number(name: string): number { return Number(this.values.get(name)); }
  protected initialize(values: Record<string, number>): void {
    for (const [key, value] of Object.entries(values)) this.set(key, String(value));
  }
  set(name: string, value: string): void {
    if (this.geometry.includes(name) || name === 'stroke-width') {
      const number = Shape.finite(value);
      if ((this.nonnegative.includes(name) || name === 'stroke-width') && number < 0)
        throw new Error(name + ' must be non-negative');
      this.values.set(name, String(number));
    } else if (name === 'fill' || name === 'stroke') {
      if (!value.trim()) throw new Error(name + ' must not be empty');
      this.values.set(name, value);
    } else throw new Error('unknown attribute: ' + name);
  }
  /** Additional SVG presentation attributes are round-tripped, not CLI-settable. */
  importAttribute(name: string, value: string): void {
    if (['font-size', 'text-anchor', 'font-family', 'font-weight'].includes(name)) {
      if (name === 'font-size') {
        const size = Shape.finite(value.replace(/px$/, ''));
        if (size < 0) throw new Error('font-size must be non-negative');
        value = String(size);
      }
      this.values.set(name,value);
    } else this.set(name,value);
  }
  static finite(value: string): number {
    if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim()))
      throw new Error('invalid number: ' + value);
    const number = Number(value);
    if (!Number.isFinite(number)) throw new Error('invalid number: ' + value);
    return number;
  }
  protected shift(xKeys: readonly string[], yKeys: readonly string[], dx: number, dy: number): void {
    for (const key of xKeys) this.set(key, String(this.number(key) + dx));
    for (const key of yKeys) this.set(key, String(this.number(key) + dy));
  }
  scale(factor: number): void {
    if (!Number.isFinite(factor) || factor <= 0) throw new Error('scale factor must be positive');
    for (const key of this.geometry) this.set(key, String(this.number(key) * factor));
  }
  protected copyTo<T extends Shape>(target: T): T {
    for (const [key, value] of this.values) target.importAttribute(key, value);
    return target;
  }
  describe(): string {
    const attrs = Object.entries(this.attributes).map(([k,v]) => `${k}=${v}`).join(' ');
    return `${this.tag}#${this.id}${attrs ? '  ' + attrs : ''}`;
  }
  abstract move(dx: number, dy: number): void;
  abstract clone(): Shape;
}
