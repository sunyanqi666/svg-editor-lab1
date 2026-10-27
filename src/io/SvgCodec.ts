import { DOMParser } from '@xmldom/xmldom';
import { Document } from '../model/Document.js';
import { Group } from '../model/Group.js';
import { Shape } from '../model/Shape.js';
import { ShapeFactory } from '../model/ShapeFactory.js';
import { SvgTransform } from './SvgTransform.js';

export class SvgCodec {
  private readonly factory = new ShapeFactory();
  private readonly namespace = 'http://www.w3.org/2000/svg';
  decode(source: string): { document: Document; warnings: string[] } {
    if (/<!DOCTYPE|<!ENTITY/i.test(source)) throw new Error('SVG document declarations are not supported');
    // xmldom discards some text before the root, so validate the XML prolog too.
    const afterProlog = source.replace(/^(?:\uFEFF|\s|<!--[\s\S]*?-->|<\?[\s\S]*?\?>)*/, '');
    if (!/^<[A-Za-z_:]/.test(afterProlog)) throw new Error('unexpected text before SVG root');
    const issues: string[] = [];
    const parsed = new DOMParser({ errorHandler: {
      warning: message => issues.push(String(message)), error: message => issues.push(String(message)),
      fatalError: message => issues.push(String(message)),
    } }).parseFromString(source,'image/svg+xml');
    if (issues.length) throw new Error('invalid SVG XML: ' + issues[0]);
    const root = parsed.documentElement;
    if (!root || root.localName !== 'svg' || (root.namespaceURI && root.namespaceURI !== this.namespace))
      throw new Error('expected SVG root element');
    const roots = Array.from(parsed.childNodes).filter(node => node.nodeType === 1);
    if (roots.length !== 1) throw new Error('SVG must have exactly one root element');
    if (Array.from(parsed.childNodes).some(node => (node.nodeType === 3 || node.nodeType === 4) && node.textContent?.trim()))
      throw new Error('unexpected text outside SVG root');
    const doc = new Document(this.dimension(root.getAttribute('width'),800), this.dimension(root.getAttribute('height'),600));
    const viewBox = root.getAttribute('viewBox');
    if (viewBox) {
      const box = viewBox.trim().split(/[\s,]+/).map(v => Shape.finite(v));
      if (box.length !== 4 || box[0] !== 0 || box[1] !== 0 || box[2] !== doc.width || box[3] !== doc.height)
        throw new Error('only viewBox="0 0 width height" is supported');
    }
    for (const attr of Array.from(root.attributes)) {
      if (['xmlns','width','height','viewBox','version'].includes(attr.name)) continue;
      doc.root.importAttribute(attr.name,attr.value);
    }
    const used = new Set<string>();
    // Reserve all explicit IDs before allocating any missing ones.
    const reserve = (element: Element): void => {
      if (element.hasAttribute('id')) {
        const id = element.getAttribute('id')!;
        if (!id || /\s/.test(id)) throw new Error('invalid id: ' + id);
        if (used.has(id)) throw new Error('id already exists: ' + id);
        used.add(id);
      }
      for (const child of Array.from(element.childNodes)) if (child.nodeType === 1) reserve(child as Element);
    };
    for (const child of Array.from(root.childNodes)) if (child.nodeType === 1) reserve(child as Element);
    const warnings: string[] = [];
    const visit = (element: Element, parent: Group, transform: SvgTransform, inherited: Readonly<Record<string,string>>): void => {
      if (element.namespaceURI && element.namespaceURI !== this.namespace) throw new Error('unsupported SVG namespace');
      const tag = element.localName;
      let id = element.getAttribute('id');
      if (!id) {
        let sequence = 1; while (used.has(tag + sequence)) sequence++;
        id = tag + sequence; used.add(id);
        warnings.push(`warning: assigned id ${id} to unnamed <${tag}>`);
      }
      const shape = this.factory.empty(tag,id);
      for (const attr of Array.from(element.attributes)) {
        if (attr.name === 'id' || attr.name === 'transform' || attr.name === 'xmlns') continue;
        shape.importAttribute(attr.name,attr.value);
      }
      const combined = transform.compose(SvgTransform.parse(element.getAttribute('transform') ?? ''));
      const styles = { ...inherited, ...shape.attributes };
      if (shape.content !== undefined) {
        if (Array.from(element.childNodes).some(node => node.nodeType === 1)) throw new Error('nested text markup is not supported');
        shape.set('text',element.textContent ?? '');
      }
      if (shape instanceof Group) {
        for (const child of Array.from(element.childNodes)) {
          if (child.nodeType === 1) visit(child as Element,shape,combined,styles);
          else if ((child.nodeType === 3 || child.nodeType === 4) && child.textContent?.trim()) throw new Error('unexpected text in container');
        }
      } else {
        if (shape.content === undefined && Array.from(element.childNodes).some(node => node.nodeType === 1 || ((node.nodeType === 3 || node.nodeType === 4) && node.textContent?.trim())))
          throw new Error('unexpected shape content');
        combined.apply(shape,styles);
      }
      // Detached subtrees are built through Composite; document root receives only validated trees.
      parent.insert(shape);
    };
    for (const child of Array.from(root.childNodes)) {
      if (child.nodeType === 1) visit(child as Element,doc.root,new SvgTransform(),doc.root.attributes);
      else if ((child.nodeType === 3 || child.nodeType === 4) && child.textContent?.trim()) throw new Error('unexpected text in SVG root');
    }
    return { document: doc, warnings };
  }
  private dimension(value: string | null, fallback: number): number {
    return value ? Shape.finite(value.replace(/px$/,'')) : fallback;
  }
  encode(doc: Document): string {
    const lines = ['<?xml version="1.0" encoding="UTF-8"?>',
      `<svg xmlns="${this.namespace}" width="${doc.width}" height="${doc.height}" viewBox="0 0 ${doc.width} ${doc.height}"${this.attributes(doc.root.attributes)}>`];
    const visit = (shape: Shape, depth: number): void => {
      const start = '  '.repeat(depth) + `<${shape.tag} id="${this.escape(shape.id)}"${this.attributes(shape.attributes)}`;
      if (shape instanceof Group) {
        lines.push(start + '>'); shape.children.forEach(child => visit(child,depth+1));
        lines.push('  '.repeat(depth) + '</g>');
      } else if (shape.content !== undefined) lines.push(start + '>' + this.escape(shape.content) + '</text>');
      else lines.push(start + '/>');
    };
    doc.root.children.forEach(shape => visit(shape,1)); lines.push('</svg>');
    return lines.join('\n') + '\n';
  }
  private attributes(values: Readonly<Record<string,string>>): string {
    return Object.entries(values).map(([key,value]) => ` ${key}="${this.escape(value)}"`).join('');
  }
  private escape(value: string): string {
    if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uD800-\uDFFF\uFFFE\uFFFF]/u.test(value)) throw new Error('invalid XML character');
    return value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
      .replace(/\r/g,'&#13;').replace(/\n/g,'&#10;').replace(/\t/g,'&#9;');
  }
}
