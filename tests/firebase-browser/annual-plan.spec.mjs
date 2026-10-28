import {test,expect} from '@playwright/test';
test('annual calendar draft previews, saves and reloads without altering current journey',async({page},info)=>{
 await page.goto('/connexion.html');await page.getByRole('button',{name:'Administration fictive',exact:true}).click();await page.getByRole('link',{name:'Préparer le calendrier de la prochaine campagne'}).click();await expect(page.locator('#annual-fields')).toBeEnabled();
 const before=await(await page.request.get('/api/demo/team')).json();
 for(const [id,value] of Object.entries({start:'2028-02-29',timeZone:'Europe/Brussels',freezeDate:'2028-12-01',receptionDate:'2029-02-01',giftCount:'5',receptionTierCount:'4',closedStarts:''}))await page.locator('#'+id).fill(value);
 await page.locator('#evaluationWeekday').selectOption('7');await page.locator('#partialWeeks').selectOption('exclude');await page.locator('#leapDayAnniversary').selectOption('march-1');
 await page.getByRole('button',{name:'Calculer l’aperçu',exact:true}).click();await expect(page.locator('#annual-dates')).toContainText('2029-03-01');const initial=await page.locator('#annual-totals').textContent();
 const pause=await page.locator('#annual-weeks tr').nth(2).locator('td').first().textContent();await page.locator('#closedStarts').fill(pause);await page.getByRole('button',{name:'Calculer l’aperçu',exact:true}).click();await expect(page.locator('#annual-totals')).not.toHaveText(initial);
 await page.getByRole('button',{name:'Enregistrer le brouillon',exact:true}).click();await expect(page.locator('#annual-status')).toContainText('Brouillon enregistré');await page.reload();await expect(page.locator('#annual-fields')).toBeEnabled();await expect(page.locator('#start')).toHaveValue('2028-02-29');await expect(page.locator('#closedStarts')).toHaveValue(pause);await expect(page.locator('#annual-dates')).toContainText('2029-03-01');
 const after=await(await page.request.get('/api/demo/team')).json();expect(after).toEqual(before);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:info.outputPath(`annual-plan-${info.project.name}.png`),fullPage:true});
 const rejected=await page.request.post('/api/annual-plan/save',{headers:{Origin:new URL(page.url()).origin},data:{input:{},revision:0,mutationId:'forbidden'}});expect(rejected.status()).toBe(403);
});
