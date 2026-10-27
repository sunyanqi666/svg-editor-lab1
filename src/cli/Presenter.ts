import { Document } from '../model/Document.js';
import { Shape } from '../model/Shape.js';

export class Presenter {
  tree(doc: Document, id?: string): string {
    const lines: string[] = [];
    const visit = (shape: Shape, prefix: string, last: boolean): void => {
      lines.push(prefix + (last ? '└── ' : '├── ') + shape.describe());
      shape.children.forEach((child, i, all) => visit(child, prefix + (last ? '    ' : '│   '), i === all.length - 1));
    };
    if (id !== undefined) {
      const shape = doc.require(id); lines.push(shape.describe());
      shape.children.forEach((child,i,all) => visit(child,'',i === all.length - 1));
    } else {
      lines.push(`svg (${doc.width}x${doc.height})`);
      doc.root.children.forEach((child,i,all) => visit(child,'',i === all.length - 1));
    }
    return lines.join('\n');
  }
  show(doc: Document, id: string): string {
    const shape = doc.require(id);
    const parent = shape.parent === doc.root ? 'svg' : 'g#' + shape.parent!.id;
    const attrs = Object.entries(shape.attributes).map(([key,value]) => `  ${key}=${value}`);
    if (shape.content !== undefined) attrs.push('  text=' + JSON.stringify(shape.content));
    return [`${shape.tag}#${shape.id}  parent=${parent}`, ...attrs].join('\n');
  }
}
