import {test,expect} from '@playwright/test';
test('provisioned invitation form sends the chosen account and removes obsolete links',async({page})=>{
 await page.goto('/connexion.html');await page.getByRole('button',{name:'Espace organisateur · démo',exact:true}).click();await expect(page.locator('#organizer-content')).toBeVisible();
 await page.route('**/api/auth/config',r=>r.fulfill({json:{mode:'provisioned'}}));
 await page.route('**/api/invitation/recipient',r=>r.fulfill({json:{uid:'recipient-account',email:'recipient@example.test'}}));
 let recipient='';await page.route('**/api/invitation/create',async r=>{recipient=r.request().postDataJSON().recipientUid;await r.fulfill({json:{id:'a'.repeat(64),url:'/invitation.html#'+'b'.repeat(64),expiresAt:Date.now()+86400000}});});
 await page.route('**/api/invitation/revoke',r=>r.fulfill({json:{revoked:true}}));
 await page.goto('/invitations.html');await expect(page.getByLabel('Identifiant du compte destinataire')).toBeVisible();
 await page.getByRole('button',{name:'Créer une invitation',exact:true}).click();await expect(page.locator('#admin-status')).toContainText('identifiant de compte valide');
 await page.getByLabel('Adresse e-mail exacte du destinataire').fill('recipient@example.test');await page.getByRole('button',{name:'Rechercher le compte'}).click();await expect(page.getByLabel('Identifiant du compte destinataire')).toHaveValue('recipient-account');await expect(page.locator('#recipient-summary')).toContainText('recipient@example.test');
 await page.getByLabel('Identifiant du compte destinataire').fill('recipient-account');await page.getByRole('button',{name:'Créer une invitation',exact:true}).click();await expect(page.locator('#invitation-result')).toBeVisible();expect(recipient).toBe('recipient-account');
 await page.getByRole('button',{name:'Révoquer cette invitation'}).click();await expect(page.locator('#invitation-result')).toBeHidden();await expect(page.locator('#invitation-url')).toHaveValue('');
 await page.getByRole('button',{name:'Créer une invitation',exact:true}).click();await expect(page.locator('#invitation-result')).toBeVisible();await page.getByLabel('Identifiant du compte destinataire').fill('another-account');await expect(page.locator('#invitation-result')).toBeHidden();await expect(page.locator('#invitation-url')).toHaveValue('');
});
