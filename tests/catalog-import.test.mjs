import test from 'node:test';import assert from 'node:assert/strict';
import {parseMasterCsv,masterRequired} from '../src/server/catalog-import.mjs';
const header=masterRequired.join(';'),row='001-A;Infusion;Artisan;tea;Thé du jardin;12,34;6;actif;5;1|2|12;oui';
test('master CSV preserves SKU zeros and exact cents, BOM, quoted separators, quotes and CRLF',()=>{
 const result=parseMasterCsv('\uFEFF'+header+';stock_quantite;url_image\r\n'+row.replace('Thé du jardin','"Thé; du ""jardin"""')+';0;https://example.test/image.png\r\n');assert.deepEqual(result.errors,[]);const p=result.records[0];assert.equal(p.sku,'001-A');assert.equal(p.product.purchaseCents,1234);assert.equal(p.master.vatBasisPoints,600);assert.equal(p.product.availability,'unavailable');assert.equal(p.product.composition,'Thé; du "jardin"');
 const comma=parseMasterCsv(header.replaceAll(';',',')+'\n'+row.replace('12,34','12.34').replaceAll(';',','),',');assert.deepEqual(comma.errors,[]);
});
test('invalid master inputs produce row errors and never silently discard unknown data',()=>{
 for(const csv of [header+';inconnue\n'+row+';x',header+'\n'+row+'\n'+row,header+'\n'+row.replace('12,34','-1'),header+'\n'+row.replace(';6;',';101;'),header+'\n'+row.replace('1|2|12','1|1'),header+'\n'+row.replace(';tea;',';wine;'),header+';url_image\n'+row+';javascript:alert(1)',header+';mis_a_jour_le\n'+row+';2026-02-30',header+'\n"broken',header+'\n'+row+';extra',header+'\n'+row.replace('001-A','=BAD'),header+'\n'+row.replace('Artisan','Art\u0000isan'),header+'\n'+Array(101).fill(row).join('\n')])assert.ok(parseMasterCsv(csv).errors.length,csv.slice(0,100));
 assert.throws(()=>parseMasterCsv('x'.repeat(120001)),{status:400});assert.throws(()=>parseMasterCsv(header,'|'),{status:400});
});
test('optional master metadata is typed and validated without fetching remote images',()=>{
 const r=parseMasterCsv(header+';prix_vente_htva;stock_quantite;poids;etiquettes_preference\n'+row+';15,90;;250;local|tea');assert.deepEqual(r.errors,[]);assert.equal(r.records[0].master.stockQuantity,null);assert.equal(r.records[0].master.sellingCents,1590);assert.equal(r.records[0].product.weightGrams,250);
 assert.ok(parseMasterCsv(header+';prix_vente_htva\n'+row+';1').errors.length);
 assert.ok(parseMasterCsv(header+';url_image\n'+row+';https://user:password@example.test/a').errors.length);
});
