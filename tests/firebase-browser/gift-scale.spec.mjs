import {test,expect} from '@playwright/test';
test('explicit V5 draft profile persists and historical draft reload resets it without changing active campaign',async({page},info)=>{
 await page.goto('/connexion.html');await page.getByRole('button',{name:'Administration fictive',exact:true}).click();await page.getByRole('link',{name:'Préparer le calendrier de la prochaine campagne'}).click();await expect(page.locator('#annual-fields')).toHaveJSProperty('disabled',false);
 const before=await(await page.request.get('/api/demo/team')).json();
 const headers={Origin:new URL(page.url()).origin};const session=await(await page.request.post('/api/demo/session',{headers,data:{}})).json();headers['X-Demo-CSRF']=session.csrf;
 const input={start:'2027-11-15',evaluationWeekday:7,partialWeeks:'exclude',leapDayAnniversary:'february-28',timeZone:'Europe/Brussels',closedStarts:[],freezeDate:'2028-09-01',receptionDate:'2028-10-20',giftCount:5,receptionTierCount:4};
 async function save(value){const current=await(await page.request.get('/api/annual-plan')).json();const r=await page.request.post('/api/annual-plan/save',{headers,data:{input:value,revision:current.revision,mutationId:crypto.randomUUID()}});expect(r.status()).toBe(200);return r.json();}
 const historical=await save(input);await page.reload();await expect(page.locator('#giftScaleVersion')).toHaveValue('v4-linear-1');await expect(page.locator('#annual-fields')).toHaveJSProperty('disabled',false);
 await page.locator('#giftScaleVersion').selectOption('v5-early-simulation-1');await page.getByRole('button',{name:'Enregistrer le brouillon',exact:true}).click();await expect(page.locator('#annual-status')).toContainText('Brouillon enregistré');await page.reload();await expect(page.locator('#giftScaleVersion')).toHaveValue('v5-early-simulation-1');await expect(page.locator('#annual-gifts')).toContainText('simulation à tester avant contractualisation');
 const next=await(await page.request.get('/api/annual-plan')).json();expect(next.preview.giftThresholds).not.toEqual(historical.preview.giftThresholds);expect(next.preview.receptionThresholds).toEqual(historical.preview.receptionThresholds);expect(await(await page.request.get('/api/demo/team')).json()).toEqual(before);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.locator('#annual-gifts').scrollIntoViewIfNeeded();await page.screenshot({path:`docs/evidence/v5-r3-scale-${info.project.name}.png`});
 const bad=await page.request.post('/api/annual-plan/preview',{headers,data:{input:{...input,giftScaleVersion:'unrecognised'}}});expect(bad.status()).toBe(400);
 await save(input);await page.getByRole('button',{name:'Recharger le brouillon enregistré'}).click();await expect(page.locator('#giftScaleVersion')).toHaveValue('v4-linear-1');await expect(page.locator('#annual-gifts')).toContainText('V4 — barème historique');expect(await(await page.request.get('/api/demo/team')).json()).toEqual(before);
});
