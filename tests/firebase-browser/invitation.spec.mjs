import {test,expect} from '@playwright/test';
test('controlled invitation, personal welcome, retry and access to the assigned journey',async({page},info)=>{
 await page.goto('/connexion.html');await page.getByRole('button',{name:'Administration fictive'}).click();await expect(page).toHaveURL(/invitations.html/);
 await page.getByRole('button',{name:'Créer une invitation fictive'}).click();await expect(page.locator('#invitation-result')).toBeVisible();
 await page.getByRole('button',{name:'Révoquer cette invitation'}).click();await expect(page.locator('#admin-status')).toContainText('Invitation révoquée');
 await page.getByRole('button',{name:'Créer une invitation fictive'}).click();await page.getByRole('link',{name:'Ouvrir l’invitation de Camille'}).click();
 await page.getByRole('button',{name:'Continuer avec Camille · compte fictif'}).click();await expect(page.locator('#accept-form')).toBeVisible();
 await page.getByLabel('Votre nom affiché ou pseudonyme').fill('Camille');
 await page.screenshot({path:info.outputPath(`invitation-${info.project.name}.png`),fullPage:true});
 await page.route('**/api/invitation/accept',async route=>{await route.fetch();await route.abort();},{times:1});
 await page.getByRole('button',{name:'Rejoindre mon équipe'}).click();await expect(page.locator('#invitation-status')).toContainText('n’a pas pu être confirmée');
 await page.getByRole('button',{name:'Rejoindre mon équipe'}).click();await expect(page.locator('#invitation-status')).toContainText('Bon voyage');
 await expect(page).toHaveURL(/\/invitation.html$/);await page.getByRole('link',{name:'Découvrir notre voyage'}).click();await expect(page.locator('#company')).toHaveText('Lex EKHO');await expect(page.getByTestId('team-car')).toHaveCount(1);
});
