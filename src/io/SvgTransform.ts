import { Shape } from '../model/Shape.js';

/** Positive uniform scale + translation; composition follows SVG transform order. */
export class SvgTransform {
  constructor(readonly factor = 1, readonly dx = 0, readonly dy = 0) {}
  compose(local: SvgTransform): SvgTransform {
    return new SvgTransform(this.factor * local.factor, this.dx + this.factor * local.dx, this.dy + this.factor * local.dy);
  }
  static parse(value: string): SvgTransform {
    let result = new SvgTransform(); let remaining = value.trim();
    while (remaining) {
      const match = /^(translate|scale)\s*\(([^)]*)\)\s*,?\s*/.exec(remaining);
      if (!match) throw new Error('unsupported SVG transform: ' + value);
      const args = match[2]!.trim().split(/[\s,]+/).map(v => Shape.finite(v));
      if (args.length < 1 || args.length > 2) throw new Error('invalid SVG transform: ' + value);
      if (match[1] === 'translate') result = result.compose(new SvgTransform(1,args[0]!,args[1] ?? 0));
      else {
        const scale = args[0]!;
        if (scale <= 0 || (args[1] !== undefined && args[1] !== scale)) throw new Error('only positive uniform SVG scale is supported');
        result = result.compose(new SvgTransform(scale));
      }
      remaining = remaining.slice(match[0].length);
    }
    return result;
  }
  apply(shape: Shape, styles: Readonly<Record<string,string>>): void {
    shape.scale(this.factor); shape.move(this.dx,this.dy);
    if (this.factor !== 1) {
      shape.set('stroke-width',String(Shape.finite(styles['stroke-width'] ?? '1') * this.factor));
      if (shape.content !== undefined)
        shape.importAttribute('font-size',String(Shape.finite(styles['font-size'] ?? '16') * this.factor));
    }
  }
}
