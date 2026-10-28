import test from 'node:test';
import assert from 'node:assert/strict';
import {agendaCsv} from '../../src/web/cockpit-export.ts';
const at='2026-10-28T10:00:00.000Z';
const row={campaignId:'campagne',id:'cadeau',client:'Client',team:'Équipe',title:'Thé; "été"\nChocolat',earnedOn:'2026-10-01',dueDate:'',status:'to-select'};
test('CSV is a minimal explicit projection with accents, quoted separators and line breaks',()=>{
 const csv=agendaCsv([{...row,owner:'SECRET',composition:'SECRET',purchaseCents:1234,people:['SECRET'],supplier:'SECRET',tenantId:'SECRET'}],at);
 assert.ok(csv.startsWith('\ufeff"Extrait le (UTC)";'));
 assert.ok(csv.endsWith('"";"À sélectionner"\r\n'));
 assert.ok(csv.includes('"Thé; ""été""\nChocolat"'));
 assert.ok(csv.includes('"'+at+'"'));
 assert.doesNotMatch(csv,/SECRET|1234|purchaseCents/);
 assert.equal(agendaCsv([],at).split('\r\n').length,2);
});
test('CSV neutralizes spreadsheet formulas in every exported field',()=>{
 for(const value of ['=1+1','+SUM(1)','-2','@SUM(1)','  =1','\t=1','\r=1','\n=1','\u0000=1']){
  for(const key of Object.keys(row)){
   const csv=agendaCsv([{...row,[key]:value}],at);
   assert.ok(csv.includes('"\''+value+'"'),`${key}: ${JSON.stringify(value)}`);
  }
 }
 assert.ok(agendaCsv([row],at).includes('"2026-10-01"'));
});
