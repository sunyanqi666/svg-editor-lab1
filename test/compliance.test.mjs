import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CommandRouter } from '../dist/cli/CommandRouter.js';
import { SvgCodec } from '../dist/io/SvgCodec.js';

const ok=(c,s)=>{const o=c.run(s);assert.ok(!o.startsWith('error:'),`${s}: ${o}`);return o;};
const snapshot=c=>new SvgCodec().encode(c.session.document);

test('all document-dependent routes return the prescribed no-document error',()=>{
 const c=new CommandRouter();
 for(const command of ['save','canvas','create rect r 0 0 1 1','delete r','move r 1 2','scale r 2','set r fill red','group g a b','ungroup g','addto g a','front a','back a','tree','show a','undo','redo','move r bad 2','set'])
  assert.equal(c.run(command),"error: no document. use 'init' or 'read' first",command);
 assert.match(ok(c,'help'),/create rect/);assert.equal(c.run(' # comment'),'');
});
test('applicable task error messages match the specification exactly and preserve state',()=>{
 const c=new CommandRouter();for(const s of ['init','create rect r1 0 0 1 1','create g scene','create g g1 in scene','create circle c1 1 2 3 in g1'])ok(c,s);
 const before=snapshot(c);
 const cases=[
  ['create circle r1 1 2 3','error: id already exists: r1'],
  ['delete r9','error: no such shape: r9'],
  ['create g child in node9','error: no such container: node9'],
  ['create g child in r1','error: not a container: r1'],
  ['create hexagon h','error: unknown shape type: hexagon (is the plugin loaded?)'],
  ['create box b','error: unknown shape type: box (is the plugin loaded?)'],
  ['group bad c1 g1','error: cannot group a container into its own descendant: g1'],
  ['ungroup scene','error: cannot ungroup top-level container: scene'],
  ['scale c1 0','error: scale factor must be positive'],
  ['scale c1 -0.5','error: scale factor must be positive'],
  ['set c1 font-size 12','error: unknown attribute: font-size'],
  ['set r1 id other','error: unknown attribute: id'],
 ];
 for(const [command,expected] of cases){assert.equal(c.run(command),expected,command);assert.equal(snapshot(c),before);}
 const dir=mkdtempSync(join(tmpdir(),'svg-error-contract-'));
 try{
  const absent=join(dir,'missing.svg'),unwritable=join(dir,'absent','out.svg');
  assert.equal(c.run(`read "${absent}"`),`error: cannot read file: ${absent}`);
  assert.equal(c.run(`save "${unwritable}"`),`error: cannot write file: ${unwritable}`);
  assert.equal(snapshot(c),before);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('all six types support in, IDs are case-sensitive and absent styles stay absent',()=>{
 const c=new CommandRouter();ok(c,'init');ok(c,'create g scene');
 for(const command of ['create rect r 1 2 3 4','create circle c 1 2 3','create ellipse e 1 2 3 4','create line l 1 2 3 4','create text t 1 2 "text"','create g g'])ok(c,command+' in scene');
 ok(c,'create rect R 10 20 30 40');
 const doc=c.session.document;
 for(const id of ['r','c','e','l','t','g']){
  assert.equal(doc.require(id).parent.id,'scene');
  assert.equal(doc.require(id).attributes.fill,undefined);assert.equal(doc.require(id).attributes.stroke,undefined);
 }
 assert.equal(doc.require('r').attributes.x,'1');assert.equal(doc.require('R').attributes.x,'10');
 assert.doesNotMatch(snapshot(c),/\s(?:fill|stroke)=/);
});
test('set whitelist applies to every geometry and rejects cross-type attributes',()=>{
 const c=new CommandRouter();ok(c,'init');
 const cases=[['rect','r','1 2 3 4',['x','y','width','height']],['circle','c','1 2 3',['cx','cy','r']],['ellipse','e','1 2 3 4',['cx','cy','rx','ry']],['line','l','1 2 3 4',['x1','y1','x2','y2']],['text','t','1 2 "old"',['x','y']],['g','g','',[]]];
 for(const [type,id,params,geometry] of cases){
  ok(c,`create ${type} ${id} ${params}`);
  for(const attr of geometry){ok(c,`set ${id} ${attr} 12.5`);assert.equal(c.session.document.require(id).attributes[attr],'12.5');}
  for(const [attr,value] of [['fill','#abc'],['stroke','blue'],['stroke-width','2.5']]){ok(c,`set ${id} ${attr} ${value}`);assert.equal(c.session.document.require(id).attributes[attr],value);}
  assert.equal(c.run(`set ${id} cxOrOther 1`),'error: unknown attribute: cxOrOther');
 }
 ok(c,'set t text ""');assert.equal(c.session.document.require('t').content,'');
 assert.equal(c.run('set r text "no"'),'error: unknown attribute: text');
 assert.equal(c.run('set g x 1'),'error: unknown attribute: x');
});
test('deep Composite movement and scaling affect each descendant exactly once',()=>{
 const c=new CommandRouter();ok(c,'init');ok(c,'create g level0');
 for(let i=1;i<48;i++)ok(c,`create g level${i} in level${i-1}`);
 ok(c,'create rect r 1 2 3 4 in level47');ok(c,'create text t 5 6 "deep" in level47');
 ok(c,'set level0 stroke-width 2');const before=snapshot(c);
 ok(c,'move level0 10 20');ok(c,'scale level0 2');
 assert.deepEqual(c.session.document.require('r').attributes,{x:'22',y:'44',width:'6',height:'8'});
 assert.equal(c.session.document.require('t').attributes.x,'30');assert.equal(c.session.document.require('t').attributes.y,'52');
 assert.equal(c.session.document.require('level0').attributes['stroke-width'],'2');
 ok(c,'undo');ok(c,'undo');assert.equal(snapshot(c),before);ok(c,'redo');ok(c,'redo');
 const transformed=snapshot(c);ok(c,'delete level0');assert.equal(c.session.document.all().length,0);
 ok(c,'undo');assert.equal(snapshot(c),transformed);
});
test('multi-step undo and redo restore exact XML including cross-parent group order and inherited styles',()=>{
 const c=new CommandRouter();
 for(const s of ['init','create g p','create g q','create g inner in p','create rect a 1 2 3 4 in inner','create text t 5 6 "原文" in q','create circle c 7 8 9 in p'])ok(c,s);
 const states=[snapshot(c)];
 for(const s of ['move p 2 3','scale p 1.5','set t text "新 文本"','group assembled t a','set assembled fill red','ungroup assembled','addto q c','front a','back a','create ellipse e 1 2 3 4','delete inner']){ok(c,s);states.push(snapshot(c));}
 for(let i=states.length-2;i>=0;i--){ok(c,'undo');assert.equal(snapshot(c),states[i]);ok(c,'tree q');ok(c,'help');assert.match(c.run('set c unknown 1'),/^error:/);}
 for(let i=1;i<states.length;i++){ok(c,'redo');assert.equal(snapshot(c),states[i]);}
 ok(c,'undo');ok(c,'set c fill blue');assert.equal(c.run('redo'),'error: nothing to redo');
});
test('late geometry overflow leaves all siblings and history unchanged',()=>{
 const c=new CommandRouter();for(const s of ['init','create g g','create rect a 1 2 3 4 in g','create circle z 1e308 0 1 in g','move a 1 0','undo'])ok(c,s);
 const before=snapshot(c);assert.match(c.run('scale g 2'),/^error:/);assert.equal(snapshot(c),before);
 assert.match(c.run('move g 1e308 0'),/^error:/);assert.equal(snapshot(c),before);
 ok(c,'redo');assert.equal(c.session.document.require('a').attributes.x,'2');
});
test('argument errors provide precise usage while preserving mandated semantic errors',()=>{
 const c=new CommandRouter();ok(c,'init');ok(c,'create rect r 1 2 3 4');const before=snapshot(c);
 for(const [command,usage] of [['move r 1','move <id> <dx> <dy>'],['canvas 100','canvas [w] [h]'],['create rect x 1 2','create rect <id> <x> <y> <w> <h> [fill]'],['create text t 0 0','create text <id> <x> <y> "content"'],['undo extra','undo']]){
  assert.ok(c.run(command).includes('usage: '+usage),command);assert.equal(snapshot(c),before);
 }
 assert.match(c.run('move r bad 1'),/^error: invalid number: bad; usage: move/);
 assert.equal(c.run('scale r 0'),'error: scale factor must be positive');
 const help=ok(c,'help');for(const type of ['rect','circle','ellipse','line','text','g'])assert.ok(help.includes('  create '+type+' <id>'));
});
test('quoted text, one-line error formatting and subtree queries preserve history',()=>{
 const c=new CommandRouter();for(const s of ['init','create g g','create text t .5 -2.5 "content in container" in g','create text marker 0 0 "in"','move t 1e1 .5','undo'])ok(c,s);
 const before=snapshot(c);assert.match(ok(c,'tree g'),/^g#g\n└── text#t/);assert.doesNotMatch(ok(c,'tree g'),/marker/);
 assert.match(ok(c,'show t'),/parent=g#g/);
 const error=c.run('delete "missing\nname"');assert.match(error,/^error:/);assert.equal(error.includes('\n'),false);
 assert.equal(snapshot(c),before);ok(c,'redo');assert.equal(c.session.document.require('t').attributes.x,'10.5');
});
