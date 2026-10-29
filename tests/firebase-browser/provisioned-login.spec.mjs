import {test,expect} from '@playwright/test';
test('account connection hides profiles, clears failed password and opens assigned spaces',async({page},info)=>{
 await page.route('**/api/auth/config',r=>r.fulfill({json:{mode:'provisioned'}}));
 let attempts=0;await page.route('**/api/auth/password',r=>{attempts++;return r.fulfill(attempts===1?{status:401,json:{error:'refused'}}:{json:{destination:'/espaces.html'}});});
 await page.route('**/api/workspaces',r=>r.fulfill({json:{entries:[],csrf:'a'.repeat(64)}}));
 await page.goto('/connexion.html');await expect(page.getByLabel('Adresse e-mail')).toBeVisible();await expect(page.getByRole('button',{name:'Explorer Lex EKHO'})).toBeHidden();
 await page.getByLabel('Adresse e-mail').fill('test@example.test');await page.getByLabel('Mot de passe',{exact:true}).fill('Fictitious-Password');await page.getByRole('button',{name:'Se connecter',exact:true}).click();
 await expect(page.locator('#login-status')).toContainText('Connexion refusée');await expect(page.getByLabel('Mot de passe',{exact:true})).toHaveValue('');await expect(page.getByRole('button',{name:'Se connecter',exact:true})).toBeEnabled();
 await page.screenshot({path:info.outputPath('account-login.png'),fullPage:true});
 await page.getByLabel('Mot de passe',{exact:true}).fill('Fictitious-Password');await page.getByRole('button',{name:'Se connecter',exact:true}).click();await expect(page).toHaveURL(/espaces.html/);
});
