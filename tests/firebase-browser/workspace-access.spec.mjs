import {test,expect} from '@playwright/test';
test('organizer access form reads, changes and clears target state',async({page})=>{
 await page.goto('/connexion.html');await page.getByRole('button',{name:'Espace organisateur · démo',exact:true}).click();
 await expect(page.locator('#organizer-content')).toBeVisible();
 await page.route('**/api/auth/config',r=>r.fulfill({json:{mode:'provisioned'}}));
 await page.route('**/api/access/read',r=>r.fulfill({json:{uid:'target',tenantId:'fiction',campaignId:'campaign',revision:2,director:false,kiosk:false}}));
 let changed=false;await page.route('**/api/access/save',async r=>{const body=r.request().postDataJSON();expect(body.uid).toBe('target');expect(body.revision).toBe(2);expect(body.reason).toBe('Accès validé');changed=true;await r.fulfill({json:{applied:true,revision:3}});});
 await page.reload();await expect(page.getByRole('heading',{name:'Accès directeur et écran TV'})).toBeVisible();
 await page.getByLabel('Identifiant du compte').fill('target');await page.getByRole('button',{name:'Consulter les accès'}).click();await expect(page.locator('#access-current')).toContainText('Directeur : absent');
 await page.getByLabel('Motif',{exact:true}).fill('Accès validé');await page.getByRole('button',{name:'Appliquer la modification'}).click();await expect(page.locator('#access-status')).toContainText('Modification enregistrée');expect(changed).toBe(true);await expect(page.locator('#access-change')).toBeHidden();
 await page.getByRole('button',{name:'Consulter les accès'}).click();await expect(page.locator('#access-change')).toBeVisible();await page.getByLabel('Identifiant du compte').fill('another');await expect(page.locator('#access-change')).toBeHidden();
});
