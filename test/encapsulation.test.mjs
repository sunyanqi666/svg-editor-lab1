import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { Document } from '../dist/model/Document.js';
import { Group } from '../dist/model/Group.js';
import { Rect } from '../dist/model/Rect.js';
import { Session } from '../dist/commands/Session.js';
import { MoveCommand } from '../dist/commands/MoveCommand.js';

test('public TypeScript API prevents assigning parents directly',()=>{
 const source=`import { Group } from './dist/model/Group.js';
 import { Rect } from './dist/model/Rect.js';
 const g = new Group('g'); const r = new Rect('r',0,0,1,1);
 // @ts-expect-error Parent reassignment is not a public shape operation.
 r.assignParent(g);
 // @ts-expect-error Internal Composite operation is protected.
 Group.assignParent(r,g);
 g.insert(r);`;
 const file='encapsulation-probe.ts';
 const options={strict:true,noEmit:true,skipLibCheck:true,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.NodeNext,moduleResolution:ts.ModuleResolutionKind.NodeNext};
 const host=ts.createCompilerHost(options);const original=host.getSourceFile.bind(host);
 host.getSourceFile=(name,version,...rest)=>name===file?ts.createSourceFile(name,source,version,true):original(name,version,...rest);
 const program=ts.createProgram([file],options,host);
 assert.deepEqual(ts.getPreEmitDiagnostics(program).map(d=>ts.flattenDiagnosticMessageText(d.messageText,'\n')),[]);
});
test('container insertion rejects duplicate IDs and bad indexes before detaching',()=>{
 const doc=new Document();const a=new Group('a');const b=new Group('b');doc.add(a);doc.add(b);
 const original=new Rect('r',0,0,1,1);doc.add(original,a);
 const other=new Group('other');const duplicate=new Rect('r',2,2,3,3);other.insert(duplicate);
 assert.throws(()=>b.insert(duplicate),/id already exists: r/);
 assert.equal(duplicate.parent,other);assert.deepEqual(b.children,[]);
 assert.throws(()=>a.insert(new Group('a')),/id already exists: a/);
 for(const index of [-1,0.5,NaN,Infinity,9])assert.throws(()=>b.insert(original,index),/invalid child index/);
 assert.equal(original.parent,a);assert.deepEqual(a.children,[original]);
 const exposed=a.children;exposed.length=0;assert.equal(a.children.length,1);
 const attrs=original.attributes;attrs.x='999';assert.equal(original.attributes.x,'0');
 assert.throws(()=>doc.add(new Group('new'),other),/does not belong/);
 assert.equal(doc.find('new'),undefined);
 // The internal root marker does not reserve a valid user-facing ID.
 doc.add(new Group('__canvas__'));assert.equal(doc.require('__canvas__').id,'__canvas__');
});
test('session input and read snapshots cannot mutate live state or command history',()=>{
 const doc=new Document();doc.add(new Rect('r',1,2,3,4));const session=new Session();session.replace(doc);
 doc.require('r').move(100,0);assert.equal(session.document.require('r').attributes.x,'1');
 const snapshot=session.document;snapshot.require('r').move(50,0);snapshot.resize(1,1);
 assert.equal(session.document.require('r').attributes.x,'1');assert.equal(session.document.width,800);
 const move=new MoveCommand('r',10,0);session.execute(move);
 assert.throws(()=>session.execute(move),/already executed/);
 assert.equal(session.document.require('r').attributes.x,'11');
 session.undo();assert.equal(session.document.require('r').attributes.x,'1');
 session.redo();assert.equal(session.document.require('r').attributes.x,'11');
});
