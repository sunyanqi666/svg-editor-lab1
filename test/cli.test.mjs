import test from 'node:test';
import assert from 'node:assert/strict';
import { CommandRouter } from '../dist/cli/CommandRouter.js';

const ok = (cli,line) => { const output=cli.run(line); assert.ok(!output.startsWith('error:'),output); return output; };
test('CLI parses quoted text, escapes, hash colors and comments', () => {
  const cli = new CommandRouter();
  assert.match(cli.run('tree'), /no document/); assert.match(cli.run('help'), /create/);
  ok(cli,'init'); ok(cli,'create g node');
  ok(cli,'create rect r 10.5 -2 30 40 #3366ff in node');
  ok(cli,'create text label 1 2 "中文 with spaces" in node');
  ok(cli,'create text literal 0 0 "in"');
  assert.equal(cli.session.document.require('literal').content,'in');
  assert.equal(cli.session.document.require('r').attributes.fill,'#3366ff');
  assert.match(ok(cli,'tree'), /中文 with spaces/);
  ok(cli,'set label text "say \\"hello\\""');
  assert.equal(cli.session.document.require('label').content,'say "hello"');
  assert.equal(cli.run(' # a script comment'),'');
  assert.match(cli.run('set label text "bad'), /unterminated/);
});
test('failed commands leave the whole document untouched', () => {
  const cli = new CommandRouter(); ok(cli,'init'); ok(cli,'create rect r 1 2 3 4');
  const before = ok(cli,'tree');
  for (const line of ['create circle r 0 0 1','move r NaN 2','scale r 0','set r height -1','set r id xxx','create g x in r','delete missing','init -1 2','create box b']) {
    assert.match(cli.run(line), /^error:/,line); assert.equal(ok(cli,'tree'),before,line);
  }
});
