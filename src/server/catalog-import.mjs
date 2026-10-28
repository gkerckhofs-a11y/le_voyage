import {createHash,randomUUID} from 'node:crypto';
const fail=status=>Object.assign(new Error('Catalog import unavailable'),{status});
export const masterRequired=['sku','nom','fournisseur','categorie','description','prix_achat_htva','tva_taux','statut','delai_approvisionnement_jours','saisonnalite','sans_alcool'];
export const masterOptional=['artisan_id','prix_vente_htva','stock_quantite','etiquettes_preference','restrictions_ou_allergenes_produit','poids','url_image','mis_a_jour_le'];
const inputText=(value,max)=>{try{return text(value,max,true);}catch{throw fail(400);}};
const canonical=value=>JSON.stringify(value,(_key,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
const digest=x=>createHash('sha256').update(x).digest('hex');
function csvRows(text,delimiter){
 const rows=[];let row=[],cell='',quoted=false,closed=false;
 const field=()=>{row.push(cell);cell='';closed=false;};const line=()=>{field();if(row.some(x=>x!==''))rows.push(row);row=[];if(rows.length>101)throw Error('Maximum 100 produits.');};
 for(let i=0;i<text.length;i++){const c=text[i];if(quoted){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=c;continue;}
  if(c===delimiter){field();continue;}if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;line();continue;}
  if(c==='"'&&!cell&&!closed){quoted=true;continue;}if(c==='"'||closed)throw Error('Guillemets CSV invalides.');cell+=c;
 }if(quoted)throw Error('Guillemets CSV non fermés.');if(cell||row.length||closed)line();return rows;
}
function text(value,max,required=false){if(typeof value!=='string'||value.length>max||/[\u0000-\u001f\u007f]/.test(value)||(required&&!value.trim()))throw Error('Texte absent, trop long ou caractère de contrôle.');return value.trim();}
function decimal(value,max,optional=false){if(optional&&value==='')return null;if(!/^\d{1,8}([.,]\d{1,2})?$/.test(value))throw Error('Nombre décimal invalide (deux décimales maximum).');const [a,b='']=value.replace(',','.').split('.'),n=Number(a)*100+Number(b.padEnd(2,'0'));if(n>max)throw Error('Montant hors limites.');return n;}
function integer(value,max,optional=false){if(optional&&value==='')return null;if(!/^\d+$/.test(value)||Number(value)>max)throw Error('Entier hors limites.');return Number(value);}
export function parseMasterCsv(csv,delimiter=';'){
 if(typeof csv!=='string'||Buffer.byteLength(csv)>120000||![';',','].includes(delimiter))throw fail(400);
 const errors=[],records=[];let rows;try{rows=csvRows(csv.replace(/^\uFEFF/,''),delimiter);}catch(e){return {errors:[{line:0,message:e.message}],records};}
 const columns=rows.shift()??[];
 if(new Set(columns).size!==columns.length)errors.push({line:1,message:'Colonnes dupliquées.'});
 for(const key of masterRequired)if(!columns.includes(key))errors.push({line:1,message:'Colonne obligatoire absente : '+key});
 for(const key of columns)if(![...masterRequired,...masterOptional].includes(key))errors.push({line:1,message:'Colonne inconnue : '+key});
 if(!rows.length)errors.push({line:2,message:'Aucun produit.'});if(errors.length)return {errors,records};
 const seen=new Set();
 rows.forEach((cells,index)=>{const line=index+2;try{
  if(cells.length!==columns.length)throw Error('Nombre de cellules différent des colonnes.');const r=Object.fromEntries(columns.map((k,i)=>[k,cells[i]]));
  if(!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/.test(r.sku))throw Error('SKU invalide : 1 à 64 caractères, lettres, chiffres, point, tiret ou underscore.');if(seen.has(r.sku))throw Error('SKU dupliqué : '+r.sku);seen.add(r.sku);
  if(!['tea','chocolate','grocery','wine','beer','other'].includes(r.categorie))throw Error('Catégorie inconnue.');
  if(!['actif','épuisé','archivé'].includes(r.statut))throw Error('Statut inconnu.');if(!['oui','non'].includes(r.sans_alcool))throw Error('sans_alcool attend oui ou non.');
  if(['wine','beer'].includes(r.categorie)&&r.sans_alcool==='oui')throw Error('Vin ou bière incompatible avec sans_alcool.');
  const seasonMonths=r.saisonnalite.split('|').map(x=>integer(x,12));if(!seasonMonths.length||seasonMonths.some(x=>x<1)||new Set(seasonMonths).size!==seasonMonths.length)throw Error('Saisonnalité invalide : mois uniques 1 à 12 séparés par |.');
  const purchaseCents=decimal(r.prix_achat_htva,100000000);if(purchaseCents===0)throw Error('Prix d’achat nul.');const sellingCents=decimal(r.prix_vente_htva??'',100000000,true);if(sellingCents!==null&&sellingCents<purchaseCents)throw Error('Prix de vente inférieur au prix d’achat.');
  const stock=integer(r.stock_quantite??'',1000000,true),imageUrl=text(r.url_image??'',500);if(imageUrl){let u;try{u=new URL(imageUrl);}catch{throw Error('URL image invalide.');}if(u.protocol!=='https:'||u.username||u.password||!u.hostname)throw Error('URL image HTTPS sans identifiants requise.');}
  const updated=text(r.mis_a_jour_le??'',10);if(updated&&(!/^\d{4}-\d{2}-\d{2}$/.test(updated)||!Number.isFinite(Date.parse(updated))||new Date(updated).toISOString().slice(0,10)!==updated))throw Error('Date de mise à jour invalide.');
  const tags=(r.etiquettes_preference??'').split('|').filter(Boolean);if(tags.length>10||new Set(tags).size!==tags.length||tags.some(t=>! /^[A-Za-z0-9_-]{1,32}$/.test(t)))throw Error('Étiquettes invalides.');
  records.push({line,sku:r.sku,product:{name:text(r.nom,80,true),supplier:text(r.fournisseur,32,true),category:r.categorie,composition:text(r.description,400,true),purchaseCents,availability:r.statut==='épuisé'||stock===0?'unavailable':stock===null?'unknown':'available',leadDays:integer(r.delai_approvisionnement_jours,365),seasonMonths:seasonMonths.sort((a,b)=>a-b),restrictions:text(r.restrictions_ou_allergenes_produit??'',240),weightGrams:integer(r.poids||'0',1000000),alcohol:r.sans_alcool==='non',active:r.statut!=='archivé'},master:{sku:r.sku,vatBasisPoints:decimal(r.tva_taux,10000),sellingCents,stockQuantity:stock,supplierId:text(r.artisan_id??'',64),preferenceTags:tags,imageUrl,sourceUpdatedOn:updated}});
 }catch(e){errors.push({line,message:e.message});}});
 return {errors,records};
}
export function createCatalogImport({actor,check,db,ref,now,validateProduct}){
 return {
 async listImports(header,input){
  if(!input||Object.keys(input).join(',')!=='beforeRevision'||(input.beforeRevision!==null&&(!Number.isSafeInteger(input.beforeRevision)||input.beforeRevision<1||input.beforeRevision>10001)))throw fail(400);
  const uid=await actor(header);return db.runTransaction(async tx=>{await check(tx,uid);let query=ref.collection('audit').orderBy('revision','desc');if(input.beforeRevision!==null)query=query.where('revision','<',input.beforeRevision);const rows=(await tx.get(query.limit(21))).docs.map(d=>d.data()),page=rows.slice(0,20);
   return {imports:page.filter(a=>a.kind==='csv-import').map(a=>({id:a.importId,revision:a.revision,at:a.at,actor:a.actor,sourceName:a.sourceName,reason:a.reason,changeCount:a.changes.length})),nextBeforeRevision:rows.length>20?page.at(-1).revision:null};
  });
 },
 async readImport(header,input){
  if(!input||Object.keys(input).join(',')!=='importId'||typeof input.importId!=='string'||!/^[a-f0-9-]{36}$/.test(input.importId))throw fail(400);
  const uid=await actor(header);return db.runTransaction(async tx=>{await check(tx,uid);const d=(await tx.get(ref.collection('imports').doc(input.importId))).data();if(!d||d.status!=='applied')throw fail(404);
   return {id:input.importId,revision:d.appliedRevision,previousRevision:d.revision,at:d.appliedAt,actor:d.actor,sourceName:d.sourceName,sourceDigest:d.sourceDigest,reason:d.reason,changes:d.changes,products:d.products,masterById:d.masterById};
  });
 },
 async previewImport(header,input){
  if(!input||Object.keys(input).sort().join(',')!=='csv,delimiter,sourceName')throw fail(400);const uid=await actor(header),sourceName=inputText(input.sourceName,120),parsed=parseMasterCsv(input.csv,input.delimiter);
  return db.runTransaction(async tx=>{await check(tx,uid);const c=(await tx.get(ref)).data();if(!c)throw fail(503);if(parsed.errors.length)return {errors:parsed.errors,changes:[],missing:[],draftId:null,revision:c.revision};
   const bySku=new Map(c.products.map(p=>[c.masterById?.[p.id]?.sku??p.id,p])),masterById={...(c.masterById??{})},products=[...c.products],changes=[],errors=[];
   for(const r of parsed.records){const old=bySku.get(r.sku),id=old?.id??'sku-'+digest(r.sku).slice(0,32);if(!old&&products.some(p=>p.id===id)){errors.push({line:r.line,message:'Collision d’identifiant de référence.'});continue;}
    const product=validateProduct({...r.product,id,alternatives:old?.alternatives??[]}),beforeMaster=masterById[id]??null;
    if(canonical(old)!==canonical(product)||canonical(beforeMaster)!==canonical(r.master)){changes.push({sku:r.sku,action:!old?'nouveau':old.active&&!product.active?'archivage':'mise à jour',before:old??null,after:product,beforeMaster,afterMaster:r.master});const index=products.findIndex(p=>p.id===id);if(index<0)products.push(product);else products[index]=product;masterById[id]=r.master;}
   }
   if(products.length>100)errors.push({line:0,message:'Le catalogue dépasserait 100 références.'});const seen=new Set(parsed.records.map(r=>r.sku)),missing=[...bySku.keys()].filter(s=>!seen.has(s));
   if(errors.length||!changes.length)return {errors,changes,missing,draftId:null,revision:c.revision};
   const draftId=randomUUID(),at=now();tx.create(ref.collection('imports').doc(draftId),{actor:uid,at,sourceName,sourceDigest:digest(input.csv),revision:c.revision,products,masterById,changes,status:'preview',expiresAt:Date.parse(at)+3600000});
   return {draftId,revision:c.revision,changes,missing,errors:[],sourceName,at};
  });
 },
 async confirmImport(header,input){
  if(!input||Object.keys(input).sort().join(',')!=='draftId,reason'||typeof input.draftId!=='string'||!/^[a-f0-9-]{36}$/.test(input.draftId))throw fail(400);const reason=inputText(input.reason,240);if(reason.length<3)throw fail(400);const uid=await actor(header),draftRef=ref.collection('imports').doc(input.draftId);
  return db.runTransaction(async tx=>{await check(tx,uid);const d=(await tx.get(draftRef)).data();if(!d||d.actor!==uid)throw fail(403);if(d.status==='applied'){if(d.reason!==reason)throw fail(409);return {revision:d.appliedRevision,alreadyApplied:true};}
   const c=(await tx.get(ref)).data();if(!c||d.revision!==c.revision||c.revision>=10000||Date.parse(now())>=d.expiresAt)throw fail(409);
   const revision=c.revision+1,at=now();tx.set(ref,{...c,revision,products:d.products,masterById:d.masterById,lastImport:{id:input.draftId,sourceName:d.sourceName,at,actor:uid,revision}});
   tx.create(ref.collection('audit').doc(String(revision).padStart(6,'0')),{revision,actor:uid,at,reason,kind:'csv-import',importId:input.draftId,sourceName:d.sourceName,sourceDigest:d.sourceDigest,changes:d.changes,before:null,after:{name:'Import CSV · '+d.changes.length+' référence(s)'}});
   tx.update(draftRef,{status:'applied',reason,appliedRevision:revision,appliedAt:at});return {revision,alreadyApplied:false};
  });
 }
 };
}
