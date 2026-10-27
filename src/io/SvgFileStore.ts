import { readFileSync, writeFileSync, renameSync, unlinkSync } from 'node:fs';
import { dirname, basename, join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Document } from '../model/Document.js';
import { SvgCodec } from './SvgCodec.js';

export class SvgFileStore {
  private readonly codec = new SvgCodec();
  private sourcePath: string | undefined;
  forget(): void { this.sourcePath = undefined; }
  read(path: string): ReturnType<SvgCodec['decode']> {
    let source: string;
    try { source = readFileSync(path,'utf8'); } catch { throw new Error('cannot read file: ' + path); }
    const result = this.codec.decode(source);
    this.sourcePath = resolve(path); return result;
  }
  save(document: Document, path?: string): string {
    const target = path === undefined ? this.sourcePath : resolve(path);
    if (!target) throw new Error('no file path. use save <file.svg>');
    const source = this.codec.encode(document);
    const temporary = join(dirname(target),'.' + basename(target) + '.' + randomUUID() + '.tmp');
    try {
      writeFileSync(temporary,source,{encoding:'utf8',flag:'wx'});
      renameSync(temporary,target);
    } catch {
      try { unlinkSync(temporary); } catch { /* No temporary file left to clean. */ }
      throw new Error('cannot write file: ' + (path ?? target));
    }
    this.sourcePath = target; return path ?? target;
  }
}
