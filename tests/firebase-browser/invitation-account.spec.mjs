import {test,expect} from '@playwright/test';
test('invitation account login stays on the invitation, clears password and directs accepted member to login',async({page})=>{
 let connected=false;await page.route('**/api/auth/config',r=>r.fulfill({json:{mode:'provisioned'}}));
 await page.route('**/api/invitation/session',r=>r.fulfill(connected?{json:{csrf:'a'.repeat(64)}}:{status:401,json:{error:'login'}}));
 await page.route('**/api/auth/password',async r=>{expect(r.request().postDataJSON().invitationToken).toBe('b'.repeat(64));connected=true;await r.fulfill({json:{connected:true,destination:'/invitation.html'}});});
 await page.route('**/api/invitation/preview',r=>r.fulfill({json:{organizationName:'Voyage pilote',teamName:'Équipe',status:'pending',hasGiftPreferences:false}}));
 await page.route('**/api/invitation/accept',r=>r.fulfill({json:{accepted:true,alreadyAccepted:false,destination:'/connexion.html'}}));
 await page.goto('/invitation.html#'+'b'.repeat(64));await expect(page.getByLabel('Adresse e-mail du compte destinataire')).toBeVisible();await expect(page.getByRole('button',{name:'Continuer avec Camille · compte fictif'})).toBeHidden();
 await page.getByLabel('Adresse e-mail du compte destinataire').fill('test@example.test');await page.getByLabel('Mot de passe',{exact:true}).fill('Fictitious-Password');await page.getByRole('button',{name:'Se connecter à cette invitation'}).click();await expect(page.locator('#accept-form')).toBeVisible();await expect(page.locator('#invitation-password')).toHaveValue('');
 await page.getByLabel('Votre nom affiché ou pseudonyme').fill('Invité');await page.getByRole('button',{name:'Rejoindre mon équipe'}).click();await expect(page.getByRole('link',{name:'Se connecter au voyage'})).toHaveAttribute('href','/connexion.html');await expect(page).not.toHaveURL(/#/);
});
