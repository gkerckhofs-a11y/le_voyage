import {createMasterSheetsSource} from './master-sheets.mjs';
import {demoSupplierCatalog} from './supplier-catalog.mjs';
export function demoMasterSheetsSource(){
 const product=demoSupplierCatalog().products.find(p=>p.id==='winter-treat'),rows=[['sku','nom','fournisseur','categorie','description','prix_achat_htva','tva_taux','statut','delai_approvisionnement_jours','saisonnalite','sans_alcool','poids','restrictions_ou_allergenes_produit'],[product.id,product.name,product.supplier,product.category,product.composition,product.purchaseCents/100,9,'actif',product.leadDays,product.seasonMonths.join('|'),'oui',product.weightGrams,product.restrictions]];
 return createMasterSheetsSource({spreadsheetId:'fictitious-emulator-master',tab:'Catalogue fictif',label:'Master fictif (émulateur)'},{getAccessToken:async()=> 'Fictitious-token-no-Google-access',fetchImpl:async()=>new Response(JSON.stringify({sheets:[{properties:{title:'Catalogue fictif'},data:[{rowData:rows.map(r=>({values:r.map(v=>({userEnteredValue:typeof v==='number'?{numberValue:v}:{stringValue:v}}))}))}]}]}),{headers:{'Content-Type':'application/json'}})});
}
