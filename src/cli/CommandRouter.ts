import { CommandRoute } from './CommandRoute.js';
import { SvgFileStore } from '../io/SvgFileStore.js';
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
  private readonly files = new SvgFileStore();
  private readonly tokenizer = new Tokenizer();
  private readonly presenter = new Presenter();
  private readonly factory = new ShapeFactory();
  private readonly routes = new Map<string, CommandRoute>();
  constructor(readonly session = new Session()) {
    this.register('init', 'init [w] [h]', 0, 2,  a => {
      const doc = new Document(a[0] === undefined ? 800 : this.n(a,0), a[1] === undefined ? 600 : this.n(a,1));
      this.session.replace(doc); this.files.forget(); return `canvas ${doc.width}x${doc.height} created`;
    }, false);
    this.register('read', 'read <file.svg>', 1, 1, a => {
      const result = this.files.read(a[0]!); this.session.replace(result.document);
      return [...result.warnings,`read ${a[0]} (${result.document.all().length} elements)`].join('\n');
    }, false);
    this.register('save', 'save [file.svg]', 0, 1, a => {
      const doc = this.session.document; const path = this.files.save(doc,a[0]);
      this.session.barrier(); return `saved to ${path} (${doc.all().length} elements)`;
    });
    this.register('canvas', 'canvas [w] [h]', 0, 2, a => {
      const doc = this.session.document;
      if (!a.length) return `canvas ${doc.width}x${doc.height}`;
      if (a.length !== 2) throw new Error('usage: canvas [w] [h]');
      const working = doc.clone(); working.resize(this.n(a,0),this.n(a,1));
      this.session.replace(working); return `canvas resized to ${working.width}x${working.height}`;
    });
    this.register('create', 'create <type> <id> [params…] [in <containerId>]', 2, Infinity,  (a,q) => {
      let parent: string | undefined;
      if (a.length >= 4 && a[a.length-2] === 'in' && !q[q.length-2]) { parent = a.pop()!; a.pop(); }
      return this.session.execute(new CreateCommand(this.factory,a[0]!,a[1]!,a.slice(2),parent));
    });
    this.register('delete', 'delete <id>', 1, 1, a => { return this.session.execute(new DeleteCommand(a[0]!)); });
    this.register('move', 'move <id> <dx> <dy>', 3, 3, a => { return this.session.execute(new MoveCommand(a[0]!,this.n(a,1),this.n(a,2))); });
    this.register('scale', 'scale <id> <factor>', 2, 2, a => { return this.session.execute(new ScaleCommand(a[0]!,this.n(a,1))); });
    this.register('set', 'set <id> <attr> <value>', 3, 3, a => { return this.session.execute(new SetCommand(a[0]!,a[1]!,a[2]!)); });
    this.register('group', 'group <newGid> <id1> [id2…]', 2, Infinity, a => {
      return this.session.execute(new GroupCommand(a[0]!,a.slice(1)));
    });
    this.register('ungroup', 'ungroup <gid>', 1, 1, a => { return this.session.execute(new UngroupCommand(a[0]!)); });
    this.register('addto', 'addto <gid> <id>', 2, 2, a => { return this.session.execute(new AddToCommand(a[0]!,a[1]!)); });
    this.register('front', 'front <id>', 1, 1, a => { return this.session.execute(new ReorderCommand(a[0]!,true)); });
    this.register('back', 'back <id>', 1, 1, a => { return this.session.execute(new ReorderCommand(a[0]!,false)); });
    this.register('tree', 'tree [id]', 0, 1, a => { return this.presenter.tree(this.session.document,a[0]); });
    this.register('show', 'show <id>', 1, 1, a => { return this.presenter.show(this.session.document,a[0]!); });
    this.register('undo', 'undo', 0, 0, a => { return this.session.undo(); });
    this.register('redo', 'redo', 0, 0, a => { return this.session.redo(); });
    this.register('help', 'help', 0, 0, a => { return [...this.routes.values()].map(r => r.syntax).join('\n') + '\n\nShape creation (optional suffix: in <containerId>):\n' + this.factory.usage().join('\n'); }, false);
  }
  private register(name: string, syntax: string, minimum: number, maximum: number,
    action: (args: string[], quoted: boolean[]) => string, requiresDocument = true): void {
    this.routes.set(name,new CommandRoute(syntax,minimum,maximum,action,requiresDocument));
  }
  private n(args: readonly string[], index: number): number { return Shape.finite(args[index]!); }
  run(line: string): string {
    try {
      const tokens = this.tokenizer.parse(line); if (!tokens.length) return '';
      const name = tokens.shift()!.value; const route = this.routes.get(name);
      if (!route) throw new Error('unknown command: ' + name);
      if (route.requiresDocument) this.session.ensureDocument();
      return route.execute(tokens.map(t => t.value), tokens.map(t => t.quoted));
    } catch (error) {
      return 'error: ' + (error instanceof Error ? error.message : String(error)).replace(/[\r\n]+/g,' ');
    }
  }
}
