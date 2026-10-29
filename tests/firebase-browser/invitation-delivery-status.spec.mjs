import {test,expect} from '@playwright/test';

async function organizer(page,enabled=true){
 await page.route('**/api/demo/session',r=>r.fulfill({json:{csrf:'test-csrf',workspace:'organizer'}}));
 await page.route('**/api/invitation/session',r=>r.fulfill({json:{csrf:'test-csrf'}}));
 await page.route('**/api/auth/config',r=>r.fulfill({json:{mode:'provisioned',invitationEmailEnabled:enabled}}));
}
test('organizer reads the last delivery, distinguishes receipt from sending and clears stale recipient status',async({page},info)=>{
 await organizer(page);let sends=0,reads=0,state='none',recipient='';
 await page.route('**/api/invitation/delivery-status',r=>{reads++;recipient=r.request().postDataJSON().recipientUid;return r.fulfill({json:{status:state,startedAt:1793275200000,revoked:true}});});
 await page.route('**/api/invitation/send',r=>{sends++;state='review';return r.fulfill({status:503,json:{error:'Unavailable'}});});
 await page.goto('/invitations.html');
 const uid=page.getByLabel('Identifiant du compte destinataire'),refresh=page.getByRole('button',{name:'Consulter le suivi'}),status=page.locator('#delivery-status');
 await expect(refresh).toBeVisible();await uid.fill('recipient-test');await refresh.click();
 await expect(status).toContainText('Aucun envoi enregistré');expect(recipient).toBe('recipient-test');expect(sends).toBe(0);
 state='sent';await refresh.click();await expect(status).toContainText('Le service d’envoi a accepté');await expect(status).toContainText('n’est pas confirmée');
 await uid.fill('other-recipient');await expect(status).toHaveText('');
 await page.getByRole('button',{name:'Envoyer une invitation par e-mail'}).click();
 await expect(status).toContainText('le lien a été révoqué');await expect(status).toContainText('vérification manuelle');
 expect(sends).toBe(1);expect(reads).toBe(3);
 await refresh.click();expect(sends).toBe(1);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`test-results/r9e4-delivery-${info.project.name}.png`,fullPage:true});
});
test('delivery tracking is hidden when transport is unavailable',async({page})=>{
 await organizer(page,false);await page.goto('/invitations.html');
 await expect(page.getByLabel('Identifiant du compte destinataire')).toBeVisible();
 await expect(page.locator('#delivery-tracking')).toBeHidden();
 await expect(page.getByRole('button',{name:'Envoyer une invitation par e-mail'})).toBeHidden();
});

test('organizer revokes the tracked link once, then sees its current state without another email',async({page},info)=>{
 await organizer(page);let state='pending',revocations=0,sends=0;
 const invitationId='c'.repeat(64);
 await page.route('**/api/invitation/delivery-status',r=>r.fulfill({json:{status:'sent',startedAt:1793275200000,invitationState:state,...(state==='pending'?{revocableInvitationId:invitationId}:{})}}));
 await page.route('**/api/invitation/revoke',r=>{expect(r.request().postDataJSON()).toEqual({id:invitationId});revocations++;state='revoked';return r.fulfill({json:{revoked:true}});});
 await page.route('**/api/invitation/send',r=>{sends++;return r.fulfill({status:503,json:{}});});
 await page.goto('/invitations.html');
 await page.getByLabel('Identifiant du compte destinataire').fill('recipient-test');await page.getByRole('button',{name:'Consulter le suivi'}).click();
 const cancel=page.getByRole('button',{name:'Révoquer le lien de cet envoi'}),lifecycle=page.locator('#delivery-invitation-status');
 await expect(lifecycle).toHaveText('Lien en attente d’acceptation.');await expect(cancel).toBeVisible();
 await page.getByLabel('Identifiant du compte destinataire').fill('other-test');await expect(cancel).toBeHidden();await expect(lifecycle).toHaveText('');
 await page.getByRole('button',{name:'Consulter le suivi'}).click();await cancel.click();
 await expect(lifecycle).toContainText('Lien révoqué');await expect(cancel).toBeHidden();expect(revocations).toBe(1);expect(sends).toBe(0);
 state='accepted';await page.getByRole('button',{name:'Consulter le suivi'}).click();
 await expect(lifecycle).toContainText('Invitation acceptée');await expect(cancel).toBeHidden();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`test-results/r9e5-lifecycle-${info.project.name}.png`,fullPage:true});
});
