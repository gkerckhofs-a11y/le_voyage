import {test,expect} from '@playwright/test';

async function emailHarness(page){
 const exchanges=[];
 await page.addInitScript(()=>{
  const auth=()=>({
   setPersistence:async()=>{},
   isSignInWithEmailLink:url=>url.includes('oobCode='),
   signInWithEmailLink:async()=>({user:{getIdToken:async()=> 'verified-email-test-token'}}),
   signOut:async()=>{}
  });
  auth.Auth={Persistence:{NONE:'none'}};
  window.firebase={initializeApp:()=>{},auth};
 });
 await page.route('**/firebasejs/**',route=>route.fulfill({status:200,contentType:'application/javascript',body:''}));
 await page.route('**/api/auth/email-link/config',route=>route.fulfill({json:{
  projectId:'rc-voyage-test-20261027',apiKey:'test-public-key',authDomain:'rc-voyage-test-20261027.firebaseapp.com',
  canonical:'http://127.0.0.1:4174'
 }}));
 await page.route('**/api/auth/identity',async route=>{
  const input=route.request().postDataJSON();
  exchanges.push(input);
  await route.fulfill({json:{connected:true,destination:input.invitationToken?'/invitation.html':'/espaces.html'}});
 });
 await page.route('**/invitation.html*',route=>route.fulfill({status:200,contentType:'text/html',body:'<html lang="fr"><body>Invitation destination</body></html>'}));
 return exchanges;
}

test('email link opened on another device accepts same-origin personal invitation and exchanges only with the server',async({page})=>{
 const invite='c'.repeat(64),exchanges=await emailHarness(page);
 await page.goto('/email-link.html?mode=signIn&oobCode=fake');
 await expect(page.locator('#email-complete')).toBeVisible();
 await page.getByLabel('Adresse e-mail destinataire').fill('employee@example.test');
 await page.getByLabel(/Lien d’invitation à votre équipe/).fill('http://127.0.0.1:4174/invitation.html#'+invite);
 await page.getByRole('button',{name:'Terminer ma connexion'}).click();
 await expect(page).toHaveURL(/\/invitation\.html#/);
 expect(exchanges).toEqual([{idToken:'verified-email-test-token',invitationToken:invite}]);
});

test('email link refuses foreign or malformed personal invitation before consuming Firebase code',async({page})=>{
 const exchanges=await emailHarness(page);
 await page.goto('/email-link.html?mode=signIn&oobCode=fake');
 await page.getByLabel('Adresse e-mail destinataire').fill('employee@example.test');
 const field=page.getByLabel(/Lien d’invitation à votre équipe/);
 await field.fill('https://malicious.example/invitation.html#'+'d'.repeat(64));
 await page.getByRole('button',{name:'Terminer ma connexion'}).click();
 await expect(page.locator('#email-status')).toContainText('lien d’invitation est invalide');
 expect(exchanges).toEqual([]);
 await field.fill('http://127.0.0.1:4174/invitation.html?redirect=evil#'+'d'.repeat(64));
 await page.getByRole('button',{name:'Terminer ma connexion'}).click();
 await expect(page.locator('#email-status')).toContainText('lien d’invitation est invalide');
 expect(exchanges).toEqual([]);
});
