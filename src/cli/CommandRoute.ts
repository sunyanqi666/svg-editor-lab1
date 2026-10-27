/** One registered route owns its syntax and argument validation. */
export class CommandRoute {
  constructor(readonly syntax: string, private readonly minimum: number, private readonly maximum: number,
    private readonly action: (args: string[], quoted: boolean[]) => string, readonly requiresDocument = true) {}
  execute(args: string[], quoted: boolean[]): string {
    if (args.length < this.minimum || args.length > this.maximum) throw new Error('usage: ' + this.syntax);
    try { return this.action(args,quoted); }
    catch (error) {
      if (error instanceof Error && error.message.startsWith('invalid number:'))
        throw new Error(error.message + '; usage: ' + this.syntax);
      throw error;
    }
  }
}
