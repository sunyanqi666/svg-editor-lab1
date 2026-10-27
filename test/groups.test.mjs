import test from 'node:test';
import assert from 'node:assert/strict';
import { CommandRouter } from '../dist/cli/CommandRouter.js';
const ok=(c,s)=>{const o=c.run(s);assert.ok(!o.startsWith('error:'),o);return o;};
test('group preserves document order across parents and nested ungroup preserves slot',()=>{
 const c=new CommandRouter();
 for(const s of ['init','create g p','create rect a 0 0 1 1 in p','create circle b 0 0 1 in p','create g q','create text t 0 0 "T" in q','group g t b'])ok(c,s);
 assert.deepEqual(c.session.document.require('g').children.map(x=>x.id),['b','t']);
 assert.equal(c.session.document.require('g').parent.id,'p');
 ok(c,'set g fill red');ok(c,'ungroup g');
 assert.deepEqual(c.session.document.require('p').children.map(x=>x.id),['a','b','t']);
 assert.equal(c.session.document.require('b').attributes.fill,'red');
 ok(c,'front a');assert.deepEqual(c.session.document.require('p').children.map(x=>x.id),['b','t','a']);
 ok(c,'back a');assert.equal(c.session.document.require('p').children[0].id,'a');
 ok(c,'addto q a');assert.equal(c.session.document.require('a').parent.id,'q');
});
test('cycle, ancestor grouping and root ungroup errors are atomic',()=>{
 const c=new CommandRouter();for(const s of ['init','create g p','create g q in p','create rect a 0 0 1 1 in q'])ok(c,s);
 const before=ok(c,'tree');
 for(const s of ['group bad p a','addto q p','addto p p','ungroup p','group bad a a','ungroup a','group bad a missing']){
  assert.match(c.run(s),/^error:/,s);assert.equal(ok(c,'tree'),before);
 }
});
