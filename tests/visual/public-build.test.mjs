import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
test('public build has a strict file allowlist and no private domain data or production endpoint',async()=>{
  const root=resolve('dist-web'),files=(await readdir(root,{recursive:true,withFileTypes:true})).filter(e=>e.isFile()).map(e=>resolve(e.parentPath,e.name).slice(root.length+1)).sort();
  assert.deepEqual(files,['assets/map/geometry.js','assets/map/route.js','assets/web/camera.js','assets/web/collective.js','assets/web/festive-stops.js','assets/web/journey-map.js','assets/web/landscape.js','assets/web/main.js','collectif.html','collective.css','data/collective-before-freeze.json','data/collective-frozen.json','data/collective-journey.json','data/collective-tpe.json','data/team.json','index.html','styles.css']);
  for(const path of files){
    const text=await readFile(resolve(root,path),'utf8');
    assert.doesNotMatch(text,/private-gift|private-person|private-tier|autre-equipe-privee|giftMilestones|budgetCents|firebaseio\.com|firestore\.googleapis|le-voyage-f0ae3|AIza|refresh_token|\/domain\//,path);
  }
});
