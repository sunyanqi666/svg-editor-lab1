import test from 'node:test';
import assert from 'node:assert/strict';
import { CommandRouter } from '../dist/cli/CommandRouter.js';
const ok=(c,s)=>{const o=c.run(s);assert.ok(!o.startsWith('error:'),o);return o;};
test('every editing command restores the complete document in one undo unit',()=>{
 const c=new CommandRouter();
 for(const s of ['init','create g p','create g q in p','create rect r 1 2 3 4 in q','create text t 5 6 "原始文本" in p','create circle c 7 8 9'])ok(c,s);
 for(const edit of ['create ellipse e 1 2 3 4 in p','move p 3 4','scale p 2','set t text "new text"','group g r t','ungroup g','addto p c','front q','back q','delete p']){
   const before=ok(c,'tree');ok(c,edit);const after=ok(c,'tree');
   ok(c,'undo');assert.equal(ok(c,'tree'),before,edit);
   ok(c,'show c');ok(c,'redo');assert.equal(ok(c,'tree'),after,edit);
 }
});
test('new edit clears redo, failures preserve redo, init creates history barrier',()=>{
 const c=new CommandRouter();ok(c,'init');assert.match(c.run('undo'),/undo not allowed after io command/);
 ok(c,'create circle c 1 2 3');ok(c,'move c 10 0');ok(c,'undo');
 assert.match(c.run('scale c -1'),/^error:/);ok(c,'redo');assert.equal(c.session.document.require('c').attributes.cx,'11');
 ok(c,'undo');ok(c,'set c fill red');assert.match(c.run('redo'),/nothing to redo/);
 ok(c,'init 20 20');assert.match(c.run('redo'),/undo not allowed after io command/);
 ok(c,'create g a');ok(c,'undo');assert.equal(c.session.document.all().length,0);assert.match(c.run('undo'),/nothing to undo/);
});
