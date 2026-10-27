import test from 'node:test';
import assert from 'node:assert/strict';
import { Document } from '../dist/model/Document.js';
import { ShapeFactory } from '../dist/model/ShapeFactory.js';

const factory = new ShapeFactory();
test('all six polymorphic shapes, nested movement, scaling and cloning', () => {
  const doc = new Document();
  const g = factory.create('g', 'g1', []); doc.add(g);
  const r = factory.create('rect', 'r', ['10','20','30','40','red']); doc.add(r,g);
  for (const [type,args] of [['circle',['1','2','3']], ['ellipse',['1','2','3','4']], ['line',['1','2','3','4']], ['text',['1','2','hello']]]) doc.add(factory.create(type,type,args),g);
  g.move(5,10); g.scale(2);
  assert.deepEqual(r.attributes, {x:'30', y:'60', width:'60', height:'80', fill:'red'});
  const copy = doc.clone(); copy.require('r').move(10,0);
  assert.equal(doc.require('r').attributes.x,'30'); assert.equal(copy.require('r').attributes.x,'40');
  assert.equal(copy.require('r').parent.id,'g1');
});
test('model validates duplicate ids, numeric geometry, attributes and cycles', () => {
  const doc = new Document(); const g = factory.create('g','g',[]); doc.add(g);
  assert.throws(() => doc.add(factory.create('g','g',[])), /id already exists/);
  assert.throws(() => factory.create('rect','r',['0','0','-1','1']), /non-negative/);
  assert.throws(() => factory.create('circle','c',['NaN','0','1']), /invalid number/);
  assert.throws(() => g.set('x','1'), /unknown attribute/);
  assert.throws(() => g.insert(g), /own descendant/);
  assert.throws(() => g.scale(0), /positive/);
  assert.throws(() => factory.create('box','b',[]), /unknown shape type/);
});
