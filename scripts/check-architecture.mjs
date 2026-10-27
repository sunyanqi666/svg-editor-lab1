import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname, relative, resolve } from 'node:path';
import ts from 'typescript';

const root=resolve('src');
const allowed={model:new Set(['model']), commands:new Set(['commands','model']), io:new Set(['io','model']), cli:new Set(['cli','commands','io','model'])};
const files=[];
const walk=directory=>{for(const entry of readdirSync(directory,{withFileTypes:true})){const path=join(directory,entry.name);if(entry.isDirectory())walk(path);else if(path.endsWith('.ts'))files.push(path);}};
walk(root);
const errors=[];
for(const file of files){
 const local=relative(root,file);const layer=local.split('/')[0];
 const source=ts.createSourceFile(file,readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true);
 const classes=source.statements.filter(ts.isClassDeclaration);
 if(local!=='cli/main.ts'&&(classes.length!==1||classes[0].name?.text!==local.split('/').at(-1).slice(0,-3)))errors.push(`${local}: expected one class matching the filename`);
 const visit=node=>{
  if(ts.isSwitchStatement(node))errors.push(`${local}: switch dispatch is prohibited`);
  if(ts.isFunctionDeclaration(node))errors.push(`${local}: use class behavior instead of free functions`);
  if(ts.isImportDeclaration(node)){
   const target=node.moduleSpecifier.text;
   if(target.startsWith('.')){
    const dependency=relative(root,resolve(dirname(file),target)).split('/')[0];
    if(!allowed[layer]?.has(dependency))errors.push(`${local}: forbidden dependency ${target}`);
   }else if(layer==='model'||layer==='commands')errors.push(`${local}: external dependency ${target} in core`);
  }
  ts.forEachChild(node,visit);
 };
 visit(source);
}
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}else console.log(`Architecture check passed: ${files.length} source files, allowed dependencies, one class per file, no switch/free-function dispatch.`);
