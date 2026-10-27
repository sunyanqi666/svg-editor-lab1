import { GroupCommand } from '../commands/GroupCommand.js';
import { UngroupCommand } from '../commands/UngroupCommand.js';
import { AddToCommand } from '../commands/AddToCommand.js';
import { ReorderCommand } from '../commands/ReorderCommand.js';
import { Document } from '../model/Document.js';
import { Shape } from '../model/Shape.js';
import { ShapeFactory } from '../model/ShapeFactory.js';
import { Session } from '../commands/Session.js';
import { CreateCommand } from '../commands/CreateCommand.js';
import { DeleteCommand } from '../commands/DeleteCommand.js';
import { MoveCommand } from '../commands/MoveCommand.js';
import { ScaleCommand } from '../commands/ScaleCommand.js';
import { SetCommand } from '../commands/SetCommand.js';
import { Tokenizer } from './Tokenizer.js';
import { Presenter } from './Presenter.js';

/** Single command-name dispatch point. Registry is intentionally built-in for Phase 1. */
export class CommandRouter {
  private readonly tokenizer = new Tokenizer();
  private readonly presenter = new Presenter();
  private readonly factory = new ShapeFactory();
  private readonly routes = new Map<string, { syntax: string; run: (args: string[], quoted: boolean[]) => string }>();
  constructor(readonly session = new Session()) {
    this.register('init', 'init [w] [h]', a => {
      this.count(a,0,2); const doc = new Document(a[0] === undefined ? 800 : this.n(a,0), a[1] === undefined ? 600 : this.n(a,1));
      this.session.replace(doc); return `canvas ${doc.width}x${doc.height} created`;
    });
    this.register('create', 'create <type> <id> [params…] [in <containerId>]', (a,q) => {
      if (a.length < 2) throw new Error('usage: create <type> <id> [params…] [in <containerId>]');
      let parent: string | undefined;
      if (a.length >= 4 && a[a.length-2] === 'in' && !q[q.length-2]) { parent = a.pop()!; a.pop(); }
      return this.session.execute(new CreateCommand(this.factory,a[0]!,a[1]!,a.slice(2),parent));
    });
    this.register('delete','delete <id>',a => { this.count(a,1); return this.session.execute(new DeleteCommand(a[0]!)); });
    this.register('move','move <id> <dx> <dy>',a => { this.count(a,3); return this.session.execute(new MoveCommand(a[0]!,this.n(a,1),this.n(a,2))); });
    this.register('scale','scale <id> <factor>',a => { this.count(a,2); return this.session.execute(new ScaleCommand(a[0]!,this.n(a,1))); });
    this.register('set','set <id> <attr> <value>',a => { this.count(a,3); return this.session.execute(new SetCommand(a[0]!,a[1]!,a[2]!)); });
    this.register('group','group <newGid> <id1> [id2…]',a => {
      if (a.length < 2) throw new Error('group requires an id and at least one shape');
      return this.session.execute(new GroupCommand(a[0]!,a.slice(1)));
    });
    this.register('ungroup','ungroup <gid>',a => { this.count(a,1); return this.session.execute(new UngroupCommand(a[0]!)); });
    this.register('addto','addto <gid> <id>',a => { this.count(a,2); return this.session.execute(new AddToCommand(a[0]!,a[1]!)); });
    this.register('front','front <id>',a => { this.count(a,1); return this.session.execute(new ReorderCommand(a[0]!,true)); });
    this.register('back','back <id>',a => { this.count(a,1); return this.session.execute(new ReorderCommand(a[0]!,false)); });
    this.register('tree','tree [id]',a => { this.count(a,0,1); return this.presenter.tree(this.session.document,a[0]); });
    this.register('show','show <id>',a => { this.count(a,1); return this.presenter.show(this.session.document,a[0]!); });
    this.register('help','help',a => { this.count(a,0); return [...this.routes.values()].map(r => r.syntax).join('\n'); });
  }
  private register(name: string, syntax: string, run: (args: string[], quoted: boolean[]) => string): void {
    this.routes.set(name,{syntax,run});
  }
  private count(args: readonly string[], min: number, max = min): void {
    if (args.length < min || args.length > max) throw new Error('invalid number of arguments');
  }
  private n(args: readonly string[], index: number): number { return Shape.finite(args[index]!); }
  run(line: string): string {
    try {
      const tokens = this.tokenizer.parse(line); if (!tokens.length) return '';
      const name = tokens.shift()!.value; const route = this.routes.get(name);
      if (!route) throw new Error('unknown command: ' + name);
      return route.run(tokens.map(t => t.value), tokens.map(t => t.quoted));
    } catch (error) {
      return 'error: ' + (error instanceof Error ? error.message : String(error)).replace(/[\r\n]+/g,' ');
    }
  }
}
