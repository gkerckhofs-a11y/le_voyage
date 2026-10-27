import { readFile, writeFile, mkdir, readdir, rm, cp } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { execFileSync } from 'node:child_process';
import { collectiveScenarios, demoCollective } from './demo-collective.mjs';
const root=resolve(import.meta.dirname,'..'),output=resolve(root,'dist-web');
await rm(output,{recursive:true,force:true});await mkdir(output,{recursive:true});
const compiled=resolve(root,'.web-compiled');
await rm(compiled,{recursive:true,force:true});
execFileSync(resolve(root,'node_modules/.bin/tsc'),['--project','tsconfig.web.json'],{cwd:root,stdio:'inherit'});
await cp(resolve(root,'web'),output,{recursive:true});
// Explicit allowlist: no domain, projection, fixture generator, tests, docs or source maps in public output.
for(const dir of ['map','web']) {
  for(const file of await readdir(resolve(root,'src',dir))) {
    if(!file.endsWith('.ts'))continue;
    const target=resolve(output,'assets',dir,file.replace(/\.ts$/,'.js'));await mkdir(resolve(target,'..'),{recursive:true});
    await cp(resolve(compiled,dir,file.replace(/\.ts$/,'.js')),target);
  }
}
await mkdir(resolve(output,'data'),{recursive:true});
for (const scenario of collectiveScenarios) await writeFile(resolve(output,`data/collective-${scenario}.json`),JSON.stringify(demoCollective(scenario))+'\n');
await rm(compiled,{recursive:true,force:true});
console.log(`Built ${relative(root,output)}; public projection only, no Firebase connection.`);
