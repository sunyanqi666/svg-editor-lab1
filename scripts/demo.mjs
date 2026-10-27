import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { SvgCodec } from '../dist/io/SvgCodec.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const directory=mkdtempSync(join(tmpdir(),'svg-editor-demo-'));
try {
  for(const [name,filename] of [['流程图与 SVG 保存','flowchart.commands'],['跨容器分组与撤销重做','history.commands']]){
    const file=join(directory,filename+'.svg');
    let input=readFileSync(join(root,'fixtures',filename),'utf8');
    input=input.replace('save fixtures/flowchart.svg',`save "${file}"`);
    if(filename==='history.commands')input+=`\nsave "${file}"\n`;
    console.log(`\n=== ${name} ===`);
    const result=spawnSync(process.execPath,[join(root,'dist/cli/main.js')],{cwd:root,input,encoding:'utf8'});
    if(result.error)throw result.error;
    process.stdout.write(result.stdout);
    assert.equal(result.status,0,result.stderr);
    assert.equal(result.stderr,'');
    assert.doesNotMatch(result.stdout,/^error:/m);
    const doc=new SvgCodec().decode(readFileSync(file,'utf8')).document;
    if(filename==='flowchart.commands'){
      assert.equal(doc.all().length,8);assert.equal(doc.require('process').attributes.y,'100');
      assert.equal(doc.require('process-label').content,'处理数据 v2');
    }else{
      assert.equal(doc.require('a').parent.id,'left');assert.equal(doc.require('label').parent.id,'right');
      assert.equal(doc.require('a').attributes.x,'30');assert.equal(doc.require('label').attributes.y,'80');
    }
  }
  console.log('\n两组演示均验证通过；临时 SVG 已清理，项目文件保持原样。');
}catch(error){console.error(error);process.exitCode=1;}
finally{rmSync(directory,{recursive:true,force:true});}
