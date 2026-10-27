export class Tokenizer {
  parse(line: string): { value: string; quoted: boolean }[] {
    if (line.trimStart().startsWith('#')) return [];
    const result: { value: string; quoted: boolean }[] = [];
    let i = 0;
    while (i < line.length) {
      while (/\s/.test(line[i] ?? '') && i < line.length) i++;
      if (i >= line.length) break;
      let value = ''; const quoted = line[i] === '"';
      if (quoted) {
        i++; let closed = false;
        while (i < line.length) {
          const ch = line[i++]!;
          if (ch === '"') { closed = true; break; }
          if (ch === '\\' && (line[i] === '"' || line[i] === '\\')) value += line[i++]!;
          else value += ch;
        }
        if (!closed) throw new Error('unterminated quoted string');
        if (i < line.length && !/\s/.test(line[i]!)) throw new Error('expected whitespace after quoted string');
      } else {
        while (i < line.length && !/\s/.test(line[i]!)) {
          if (line[i] === '"') throw new Error('quotes must surround a complete argument');
          value += line[i++]!;
        }
      }
      result.push({ value, quoted });
    }
    return result;
  }
}
