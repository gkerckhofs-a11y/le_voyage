import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {createFirebaseEmulatorAdapter} from '../../src/server/firebase-emulator.mjs';
import {newOperationsDemo} from '../../src/server/demo-service.mjs';

test('confirmed preferences stay fixed in Clem cockpit when the personal profile changes',async({page})=>{
 // A distinct emulator tenant keeps confirmation independent of export/catalog/delivery fixtures.
 const adapter=createFirebaseEmulatorAdapter(),record=newOperationsDemo(),tenantId='r5-freeze-'+randomUUID(),campaignId=record.ledger.state.config.campaignId,scope={tenantId,campaignId};
 record.ledger.state.config.tenantId=tenantId;
 const grant=adapter.db.doc('giftOperators/demo-operations-user'),person='r5-person',pref=adapter.db.doc(`tenants/${tenantId}/giftPreferences/${person}`);
 try{
  await adapter.db.doc(`tenants/${tenantId}/campaigns/${campaignId}`).set({payload:JSON.stringify(record)});
  await adapter.db.doc(`tenants/${tenantId}/members/${person}`).set({uid:person,tenantId,active:true,assignments:[{campaignId,teamId:'explorateurs'}]});
  await adapter.db.doc(`tenants/${tenantId}/profiles/${person}`).set({displayName:'Profil fictif R5'});
  await pref.set({revision:1,value:{choices:['tea'],alcoholFree:true,surprise:false,privateContactRequested:false}});
  await adapter.db.runTransaction(async tx=>{const g=(await tx.get(grant)).data();tx.update(grant,{campaigns:[...g.campaigns,scope]});});
  await page.goto('/connexion.html');await page.getByRole('button',{name:'Cockpit Clem · démo',exact:true}).click();await expect(page.locator('.gift-row').first()).toBeVisible();
  const response=await page.request.get('/api/gifts/ops');expect(response.status()).toBe(200);const rows=(await response.json()).rows,row=rows.find(r=>r.tenantId===tenantId&&r.team==='Les Explorateurs');expect(row).toBeTruthy();
  await page.locator(`.gift-row[data-id="${row.id}"]`).click();await expect(page.locator('#save-gift')).toBeEnabled();await page.locator('#beneficiary-panel summary').click();
  await page.getByRole('button',{name:'Charger les bénéficiaires'}).click();await page.locator('[name="gift-beneficiary"]').check();await page.locator('#beneficiary-confirmed').check();await page.locator('#beneficiary-reason').fill('Bénéficiaire fictif du test isolé');await page.getByRole('button',{name:'Confirmer et figer la liste'}).click();await expect(page.locator('#beneficiary-status')).toContainText('Liste figée');
  await page.locator('#beneficiary-reason').fill('Préférences fictives relues');await page.getByRole('button',{name:'Valider la revue des préférences'}).click();await expect(page.locator('#beneficiary-status')).toContainText('Préférences relues');
  await page.getByLabel('Responsable',{exact:true}).fill('Clem fictive');await page.getByLabel('Échéance',{exact:true}).fill('2026-11-20');await page.getByLabel('Composition envisagée').fill('Infusion fictive');await page.getByLabel('Artisan / fournisseur').fill('Artisan fictif');await page.getByLabel('Composition vérifiée sans alcool').check();await page.getByLabel('Référence de commande',{exact:true}).fill('COMMANDE-FICTIVE-R5');
  for(const next of ['to-order','to-receive']){
   await page.getByLabel('Prochaine situation').selectOption(next);await page.getByLabel('Motif de la modification',{exact:true}).fill('Confirmation fictive après revue');await page.getByRole('button',{name:'Enregistrer le suivi',exact:true}).click();await expect(page.locator('#cockpit-status')).toContainText('Suivi enregistré');await expect(page.locator('#save-gift')).toBeEnabled();await expect(page.getByLabel('Motif de la modification',{exact:true})).toHaveValue('');
  }
  await pref.update({revision:2,'value.choices':['chocolate']});
  await page.getByRole('button',{name:'Charger les bénéficiaires'}).click();await expect(page.locator('#beneficiary-status')).toContainText('Préférences conservées à la confirmation');await expect(page.locator('#beneficiary-list')).toContainText('Thé / infusion');await expect(page.locator('#beneficiary-list')).not.toContainText('Chocolat');await expect(page.getByRole('button',{name:'Valider la revue des préférences'})).toBeDisabled();
 }finally{
  await adapter.db.runTransaction(async tx=>{const g=(await tx.get(grant)).data();if(g)tx.update(grant,{campaigns:g.campaigns.filter(s=>s.tenantId!==tenantId)});});
  await adapter.close();
 }
});
