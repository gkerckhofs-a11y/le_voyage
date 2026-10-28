import {test,expect} from '@playwright/test';
test('controlled invitation, personal welcome, retry and access to the assigned journey',async({page},info)=>{
 await page.goto('/connexion.html');await page.getByRole('button',{name:'Administration fictive'}).click();await expect(page).toHaveURL(/invitations.html/);
 await page.getByRole('button',{name:'Créer une invitation fictive'}).click();await expect(page.locator('#invitation-result')).toBeVisible();
 await page.getByRole('button',{name:'Révoquer cette invitation'}).click();await expect(page.locator('#admin-status')).toContainText('Invitation révoquée');
 await page.getByRole('button',{name:'Créer une invitation fictive'}).click();await page.getByRole('link',{name:'Ouvrir l’invitation de Camille'}).click();
 await page.getByRole('button',{name:'Continuer avec Camille · compte fictif'}).click();await expect(page.locator('#accept-form')).toBeVisible();
 await page.getByLabel('Votre nom affiché ou pseudonyme').fill('Camille');
 const firstProfile=await page.locator('#signup-preferences').isVisible();
 if(firstProfile){
  await page.getByLabel('Je laisse choisir Rouge Clémence',{exact:true}).uncheck();
  for(const label of ['Vin','Bière','Thé et infusions','Chocolat'])await page.getByLabel(label,{exact:true}).check();
  await page.getByRole('button',{name:'Rejoindre mon équipe'}).click();await expect(page.locator('#invitation-status')).toContainText('au maximum trois');
  await page.getByLabel('Uniquement sans alcool',{exact:true}).check();await expect(page.getByLabel('Vin',{exact:true})).not.toBeChecked();await expect(page.getByLabel('Bière',{exact:true})).toBeDisabled();
 }else await expect(page.locator('#existing-preferences')).toBeVisible();
 await page.screenshot({path:`docs/evidence/v5-r5-invitation-${info.project.name}.png`,fullPage:true});
 await page.route('**/api/invitation/accept',async route=>{await route.fetch();await route.abort();},{times:1});
 await page.getByRole('button',{name:'Rejoindre mon équipe'}).click();await expect(page.locator('#invitation-status')).toContainText('n’a pas pu être confirmée');
 await page.getByRole('button',{name:'Rejoindre mon équipe'}).click();await expect(page.locator('#invitation-status')).toContainText('Bon voyage');
 await expect(page).toHaveURL(/\/invitation.html$/);await page.getByRole('link',{name:'Découvrir notre voyage'}).click();await expect(page.locator('#company')).toHaveText('Lex EKHO');await expect(page.getByTestId('team-car')).toHaveCount(1);
 await page.getByRole('link',{name:'Mes goûts',exact:true}).click();await expect(page.getByLabel('Thé et infusions',{exact:true})).toBeChecked();await expect(page.getByLabel('Chocolat',{exact:true})).toBeChecked();await expect(page.getByLabel('Uniquement sans alcool',{exact:true})).toBeChecked();
 await expect(page.locator('main')).toContainText('pas encore préparés ou confirmés');
 await page.screenshot({path:`docs/evidence/v5-r5-profile-${info.project.name}.png`,fullPage:true});
});
