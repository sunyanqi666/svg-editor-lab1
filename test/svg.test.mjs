import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SvgCodec } from '../dist/io/SvgCodec.js';
import { CommandRouter } from '../dist/cli/CommandRouter.js';

const codec=new SvgCodec();
const svg=body=>`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">${body}</svg>`;
const ok=(c,s)=>{const o=c.run(s);assert.ok(!o.startsWith('error:'),o);return o;};
test('SVG reserves explicit IDs before assigning unnamed elements',()=>{
 const result=codec.decode(svg('<rect/><g><rect id="rect1"/><circle/></g>'));
 assert.deepEqual(result.document.all().map(s=>s.id),['rect2','g1','rect1','circle1']);
 assert.deepEqual(result.warnings,['warning: assigned id rect2 to unnamed <rect>','warning: assigned id g1 to unnamed <g>','warning: assigned id circle1 to unnamed <circle>']);
});
test('SVG round trip preserves all shapes, styles, hierarchy and escaped text',()=>{
 const c=new CommandRouter();
 for(const s of ['init 400 300','create g g','set g fill red','create rect r 1 2 3 4 in g','create circle c 1 2 3 in g','create ellipse e 1 2 3 4','create line l 1 2 3 4 black','create text t 1 2 "<开始> & \\"结束\\""','set l stroke-width 2'])ok(c,s);
 const encoded=codec.encode(c.session.document);assert.match(encoded,/&lt;开始&gt; &amp; &quot;结束&quot;/);
 const decoded=codec.decode(encoded);assert.equal(codec.encode(decoded.document),encoded);
 assert.equal(decoded.warnings.length,0);
});
test('external translate and scale preserve nested geometry and text presentation',()=>{
 const doc=codec.decode(svg('<g id="g" transform="translate(60,40)" fill="red"><g id="n" transform="translate(200,0) scale(0.8)"><rect id="r" width="120" height="60"/><text id="t" x="60" y="38" text-anchor="middle" font-size="16">End</text></g></g>')).document;
 assert.equal(doc.require('r').attributes.x,'260');assert.equal(doc.require('r').attributes.width,'96');
 assert.equal(doc.require('t').attributes.x,'308');assert.equal(doc.require('t').attributes['font-size'],'12.8');
 assert.equal(doc.require('t').attributes['text-anchor'],'middle');
 assert.equal(codec.encode(codec.decode(codec.encode(doc)).document),codec.encode(doc));
});
test('malformed XML, duplicate IDs, unknown features and invalid values fail',()=>{
 for(const source of [svg('<rect id="r"/><circle id="r"/>'),svg('<rect id="r" width="-1"/>'),svg('<path id="p"/>'),svg('<rect id="r" style="fill:red"/>'),'<svg><g></svg>', '<svg/>junk', 'junk<svg/>', '<!DOCTYPE svg><svg/>',svg('<g transform="rotate(30)"/>'),svg('<g transform="scale(1,2)"/>'),svg('<text><tspan>no</tspan></text>')])assert.throws(()=>codec.decode(source),undefined,source);
});
test('file commands are atomic and establish history barriers only on success',()=>{
 const directory=mkdtempSync(join(tmpdir(),'svg-editor-'));
 try {
  const c=new CommandRouter();ok(c,'init');ok(c,'create rect r 1 2 3 4');
  assert.match(c.run('save'),/no file path/);ok(c,'undo');ok(c,'redo');
  const file=join(directory,'drawing with spaces.svg');ok(c,`save "${file}"`);
  assert.match(c.run('undo'),/undo not allowed after io command/);
  ok(c,'move r 10 0');ok(c,'canvas');ok(c,'undo');ok(c,'redo');
  const before=ok(c,'tree');
  writeFileSync(join(directory,'bad.svg'),'<svg><g></svg>');
  for(const line of [`read "${join(directory,'missing.svg')}"`,`read "${join(directory,'bad.svg')}"`,`save "${directory}/missing/x.svg"`,'canvas 0 10']){
   assert.match(c.run(line),/^error:/);assert.equal(ok(c,'tree'),before);
  }
  ok(c,'undo');ok(c,'redo');ok(c,'save');assert.match(readFileSync(file,'utf8'),/x="11"/);
  assert.deepEqual(readdirSync(directory).sort(),['bad.svg','drawing with spaces.svg']);
  ok(c,`read "${file}"`);assert.equal(ok(c,'tree'),before);assert.match(c.run('redo'),/undo not allowed/);
  ok(c,'set r fill blue');ok(c,'canvas 100 100');assert.match(c.run('undo'),/undo not allowed/);
  ok(c,'move r 1 0');ok(c,'undo');assert.equal(c.session.document.width,100);
  ok(c,'init');ok(c,'create g g');assert.match(c.run('save'),/no file path/);
 } finally {rmSync(directory,{recursive:true,force:true});}
});
