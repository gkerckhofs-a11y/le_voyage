import {parentPort,workerData} from 'node:worker_threads';
import ExcelJS from 'exceljs';
import yauzl from 'yauzl';
const refuse=message=>{throw Object.assign(Error(message),{controlled:true});};
async function inspectZip(bytes){
 const zip=await new Promise((resolve,reject)=>yauzl.fromBuffer(bytes,{lazyEntries:true,validateEntrySizes:true,strictFileNames:true},(e,z)=>e?reject(e):resolve(z)));
 await new Promise((resolve,reject)=>{let entries=0,total=0,stopped=false;const names=new Set(),stop=e=>{if(stopped)return;stopped=true;zip.close();reject(e);};zip.on('error',stop);zip.on('end',resolve);zip.on('entry',entry=>{void(async()=>{
  if(++entries>64||entry.uncompressedSize>2000000||(total+=entry.uncompressedSize)>4000000)refuse('Classeur trop volumineux après décompression.');
  if(names.has(entry.fileName)||entry.generalPurposeBitFlag&1)refuse('Archive dupliquée ou chiffrée non acceptée.');names.add(entry.fileName);
  if(entry.fileName.endsWith('/')){zip.readEntry();return;}
  if(!/\.(xml|rels)$/.test(entry.fileName)||/vba|externalLinks|embeddings|activeX/i.test(entry.fileName))refuse('Macros, objets et liens externes non acceptés.');
  const stream=await new Promise((resolve,reject)=>zip.openReadStream(entry,(e,s)=>e?reject(e):resolve(s))),chunks=[];let size=0;for await(const chunk of stream){size+=chunk.length;if(size>2000000){stream.destroy();refuse('Entrée XLSX trop volumineuse.');}chunks.push(chunk);}
  const xml=new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks));if(/<!DOCTYPE|<!ENTITY|TargetMode\s*=\s*['"]External['"]/i.test(xml))refuse('Entités XML et liens externes non acceptés.');zip.readEntry();
 })().catch(stop);});zip.readEntry();});zip.close();
}
async function decode(){const bytes=Buffer.from(workerData);await inspectZip(bytes);const book=new ExcelJS.Workbook();await book.xlsx.load(bytes);
 if(book.worksheets.length!==1||book.worksheets[0].state!=='visible')refuse('Une seule feuille visible est requise.');const sheet=book.worksheets[0];
 if(sheet.rowCount>101||sheet.columnCount>19||sheet.rowCount<2)refuse('Maximum 100 produits et 19 colonnes ; en-têtes et au moins un produit requis.');
 if(sheet.model.merges?.length)refuse('Cellules fusionnées non acceptées.');
 const numeric=new Set(['prix_achat_htva','tva_taux','prix_vente_htva','stock_quantite','delai_approvisionnement_jours','poids']),rows=[];let headers;
 for(let row=1;row<=sheet.rowCount;row++){if(sheet.getRow(row).hidden)refuse('Lignes masquées non acceptées.');const values=[];for(let col=1;col<=sheet.columnCount;col++){if(sheet.getColumn(col).hidden)refuse('Colonnes masquées non acceptées.');const cell=sheet.getCell(row,col),v=cell.value;
  if(v===null){values.push('');continue;}if(typeof v==='object'||typeof v==='boolean')refuse('Valeurs fixes uniquement : formules, dates Excel, liens et textes enrichis non acceptés.');
  if(typeof v==='number'&&(!numeric.has(headers?.[col-1])||!Number.isFinite(v)||/%/.test(cell.numFmt)))refuse('SKU et textes doivent être au format texte ; taux TVA en nombre simple, sans format pourcentage.');
  values.push(String(v));
 }if(row===1)headers=values;rows.push(values);}
 const csv=rows.map(r=>r.map(v=>'"'+v.replaceAll('"','""')+'"').join(';')).join('\n');if(Buffer.byteLength(csv)>120000)refuse('Contenu tabulaire supérieur à 120 Ko.');return {csv};
}
try{parentPort.postMessage(await decode());}catch(e){parentPort.postMessage({error:e.controlled?e.message:'Classeur XLSX invalide, chiffré ou non pris en charge.'});}
