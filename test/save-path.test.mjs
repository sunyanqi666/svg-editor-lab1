import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CommandRouter } from '../dist/cli/CommandRouter.js';
import { SvgCodec } from '../dist/io/SvgCodec.js';

const ok=(c,s)=>{const o=c.run(s);assert.ok(!o.startsWith('error:'),`${s}: ${o}`);return o;};
const x=path=>new SvgCodec().decode(readFileSync(path,'utf8')).document.require('r').attributes.x;
test('save without a path always targets the last successful read, even after save-as',()=>{
 const dir=mkdtempSync(join(tmpdir(),'svg-save-path-'));
 try{
  const a=join(dir,'A.svg'),b=join(dir,'B.svg');const c=new CommandRouter();
  ok(c,'init');ok(c,'create rect r 1 2 3 4');ok(c,`save "${a}"`);
  assert.match(c.run('save'),/^error: no file path/);
  ok(c,`read "${a}"`);ok(c,'move r 10 0');ok(c,`save "${b}"`);
  assert.equal(x(a),'1');assert.equal(x(b),'11');
  ok(c,'move r 20 0');ok(c,'save');assert.equal(x(a),'31');assert.equal(x(b),'11');
  ok(c,'move r 1 0');assert.match(c.run(`read "${join(dir,'missing.svg')}"`),/^error:/);
  assert.match(c.run(`save "${dir}/missing/C.svg"`),/^error:/);
  ok(c,'undo');ok(c,'redo');ok(c,'save');assert.equal(x(a),'32');
  ok(c,`read "${b}"`);ok(c,'move r 2 0');ok(c,'save');assert.equal(x(b),'13');
  ok(c,'init');assert.match(c.run('save'),/^error: no file path/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
