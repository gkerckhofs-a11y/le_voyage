import {test,expect} from '@playwright/test';import {mkdir} from 'node:fs/promises';
import {createFirebaseEmulatorAdapter} from '../../src/server/firebase-emulator.mjs';
test('organizer publishes a client statement; director reads it without internal data or write access',async({page},info)=>{
 const a=createFirebaseEmulatorAdapter();const ref=a.db.doc('tenants/fiction-lex-ekho/campaigns/fiction-2026/clientBudgets/current'),old=(await ref.get()).data();const mutationIds=[];
 try{
 await page.goto('/connexion.html');await page.getByRole('button',{name:'Espace organisateur · démo',exact:true}).click();await page.getByRole('link',{name:'Publier le budget client',exact:true}).click();await expect(page.locator('#budget-fields')).toHaveJSProperty('disabled',false);await expect(page.locator('.header nav a[href="/organisateur.html"]')).toHaveCount(1);
 await page.locator('#allocated').fill('1000,50');await page.locator('#committed').fill('600,20');await page.locator('#consumed').fill('200,10');await page.locator('#basis').selectOption('TTC');await page.locator('#as-of').fill('2026-10-29');await page.locator('#reference').fill('TEST-CLIENT-'+info.project.name);await page.locator('#reason').fill('INTERNAL-ONLY');await page.locator('#confirmed').check();
 await expect(page.locator('#budget-preview')).toContainText('400,30');
 const session=await(await page.request.post('/api/demo/session',{headers:{Origin:new URL(page.url()).origin},data:{}})).json();expect((await page.request.post('/api/client-budget/publish',{headers:{Origin:new URL(page.url()).origin,'X-Demo-CSRF':'wrong'},data:{}})).status()).toBe(403);
 page.on('request',r=>{if(r.url().endsWith('/api/client-budget/publish'))mutationIds.push(r.postDataJSON().mutationId);});
 await page.getByRole('button',{name:'Publier le budget client',exact:true}).click();await expect(page.locator('#budget-status')).toContainText('publié et relu');await expect(page.locator('#budget-current')).toContainText('400,30');
 expect((await page.request.get('/api/client-budget?tenantId=foreign')).status()).toBe(400);
 await page.locator('#reason').fill('Response loss test');await page.locator('#confirmed').check();
 await page.route('**/api/client-budget/publish',async route=>{await route.fetch();await route.abort();});
 await page.getByRole('button',{name:'Publier le budget client',exact:true}).click();await expect(page.locator('#budget-status')).toContainText('Publication non confirmée');await expect(page.locator('#budget-fields')).toHaveJSProperty('disabled',true);
 await page.unroute('**/api/client-budget/publish');await page.getByRole('button',{name:'Recharger la situation publiée'}).click();await expect(page.locator('#budget-fields')).toHaveJSProperty('disabled',false);await expect(page.locator('#budget-current')).toContainText('400,30');
 await page.route('**/api/client-budget',route=>route.fulfill({status:403,body:'{}'}));await page.getByRole('button',{name:'Recharger la situation publiée'}).click();await expect(page.locator('#budget-current')).toBeEmpty();await expect(page.locator('#allocated')).toHaveValue('');await expect(page.locator('#budget-fields')).toHaveJSProperty('disabled',true);
 await page.unroute('**/api/client-budget');await page.getByRole('button',{name:'Recharger la situation publiée'}).click();await expect(page.locator('#budget-fields')).toHaveJSProperty('disabled',false);
 await mkdir('docs/evidence',{recursive:true});await page.screenshot({path:`docs/evidence/v5-r8b-organizer-${info.project.name}.png`,fullPage:true});
 await page.getByRole('button',{name:'Se déconnecter',exact:true}).click();await page.getByRole('button',{name:'Espace directeur · démo',exact:true}).click();await expect(page.locator('#company-status')).toHaveText('Progression actualisée.');await expect(page.locator('#client-budget')).toContainText('TEST-CLIENT-'+info.project.name);await expect(page.locator('#client-budget')).toContainText('400,30');await expect(page.locator('#client-budget')).not.toContainText('INTERNAL-ONLY');
 const view=await(await page.request.get('/api/director/progress')).json();expect(view.clientBudget).toMatchObject({allocatedCents:100050,committedCents:60020,consumedCents:20010,remainingCents:40030,basis:'TTC'});
 expect((await page.request.get('/api/client-budget')).status()).toBe(403);expect((await page.request.post('/api/client-budget/publish',{headers:{Origin:new URL(page.url()).origin,'X-Demo-CSRF':session.csrf},data:{}})).status()).toBe(403);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`docs/evidence/v5-r8b-director-${info.project.name}.png`,fullPage:true});
 await page.route('**/api/director/progress',r=>r.fulfill({status:403,body:'{}'}));await page.getByRole('button',{name:'Actualiser',exact:true}).click();await expect(page.locator('#client-budget')).toBeEmpty();
 }finally{if(old)await ref.set(old);else await ref.delete();for(const id of mutationIds)await ref.collection('publications').doc(id).delete();await a.close();}
});
