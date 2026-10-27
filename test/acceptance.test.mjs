import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { CommandRouter } from '../dist/cli/CommandRouter.js';
import { SvgCodec } from '../dist/io/SvgCodec.js';
const ok=(c,s)=>{const o=c.run(s);assert.ok(!o.startsWith('error:'),`${s}: ${o}`);return o;};

test('task 6 complete transcript preserves counts, undo, errors and missing-ID import',()=>{
 const c=new CommandRouter();
 for(const s of ['init 800 600','create rect bg 0 0 800 600 #ffffff','create text title 20 40 "My Diagram"','create circle c1 100 100 20 red','create rect box 200 80 60 60 #3366ff','group markers c1 box','move c1 30 0','undo','redo','set title text "My Diagram v2"','undo'])ok(c,s);
 assert.equal(c.session.document.require('c1').attributes.cx,'130');
 assert.equal(c.session.document.require('title').content,'My Diagram');
 assert.equal(c.run('group bad c1 markers'),'error: cannot group a container into its own descendant: markers');
 ok(c,'delete box');ok(c,'undo');assert.equal(c.session.document.require('box').parent.id,'markers');
 assert.equal(c.session.document.all().length,5);
 const output=ok(c,'read fixtures/other.svg');assert.match(output,/assigned id rect1/);assert.match(output,/7 elements/);
 assert.equal(c.session.document.width,400);assert.match(c.run('undo'),/undo not allowed/);
});
test('real CLI replays the full flowchart and produces a readable SVG',()=>{
 const directory=mkdtempSync(join(tmpdir(),'svg-acceptance-'));
 try{
  const script=readFileSync('fixtures/flowchart.commands','utf8').replace('save fixtures/flowchart.svg',`save "${join(directory,'flow.svg')}"`);
  const process=spawnSync(globalThis.process.execPath,[resolve('dist/cli/main.js')],{input:script,encoding:'utf8'});
  assert.equal(process.status,0);assert.equal(process.stderr,'');assert.doesNotMatch(process.stdout,/error:/);
  assert.match(process.stdout,/8 elements/);assert.match(process.stdout,/处理数据/);
  const doc=new SvgCodec().decode(readFileSync(join(directory,'flow.svg'),'utf8')).document;
  assert.equal(doc.require('process').attributes.y,'100');assert.equal(doc.require('process-label').content,'处理数据 v2');
  assert.equal(doc.require('node1').parent.id,'flowchart');assert.equal(doc.all().length,8);
 }finally{rmSync(directory,{recursive:true,force:true});}
});
test('CLI contains all 19 required commands and rejects extra arguments',()=>{
 const c=new CommandRouter();const help=ok(c,'help').split('\n').filter(line=>/^[a-z]+(?: |$)/.test(line));assert.equal(help.length,19);
 for(const name of ['init','read','save','canvas','create','delete','move','scale','set','group','ungroup','addto','front','back','tree','show','help','undo','redo'])assert.ok(help.some(line=>line.split(' ')[0]===name),name);
 ok(c,'init');for(const s of ['help extra','undo extra','redo extra','tree a b','show','canvas 1','init 1 2 3'])assert.match(c.run(s),/^error:/);
});
