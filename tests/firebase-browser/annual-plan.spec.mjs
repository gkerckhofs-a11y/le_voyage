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
 await page.locator('#funding-enabled').check();await page.locator('#funding-basis').selectOption('TTC');
 for(const [i,amount] of ['125,50','200','300','400','500'].entries())await page.locator('#gift-funding-'+i).fill(amount);
 for(const [i,amount] of ['1000','1300','1600','2000','2500'].entries())await page.locator('#reception-funding-'+i).fill(amount);
 await page.getByRole('button',{name:'Enregistrer le brouillon',exact:true}).click();await expect(page.locator('#annual-status')).toContainText('Brouillon enregistré');await page.reload();await expect(page.locator('#annual-fields')).toBeEnabled();await expect(page.locator('#gift-funding-0')).toHaveValue('125,50');await expect(page.locator('#annual-funding-preview')).toContainText('2 500,00 €');await expect(page.locator('#annual-funding-preview')).toContainText('1 525,50 €');expect(await(await page.request.get('/api/demo/team')).json()).toEqual(before);
 await page.locator('.annual-funding-form').screenshot({path:info.outputPath(`annual-funding-form-${info.project.name}.png`)});
 await page.locator('#annual-funding-preview').screenshot({path:info.outputPath(`annual-funding-preview-${info.project.name}.png`)});
 await page.locator('#giftCount').fill('6');await page.getByRole('button',{name:'Enregistrer le brouillon',exact:true}).click();await expect(page.locator('#gift-funding-5')).toBeFocused();const stored=await(await page.request.get('/api/annual-plan')).json();expect(stored.input.giftCount).toBe(5);

 await page.getByRole('button',{name:'Recharger le brouillon enregistré'}).click();await expect(page.locator('#giftCount')).toHaveValue('5');
 await page.locator('#questionnaire-enabled').check();await page.locator('#questionnaire-mode').selectOption('autonomous');
 for(let i=0;i<3;i++){await page.locator('#value-'+i).fill(['Entraide','Qualité','Initiative'][i]);await page.locator('#question-'+i).fill('Cette semaine, ai-je contribué à notre valeur '+(i+1)+' ?');}
 for(let i=0;i<5;i++)await page.locator('#weight-'+i).fill('20');await page.locator('#minimumRespondents').fill('5');
 await page.getByRole('button',{name:'Enregistrer le brouillon',exact:true}).click();await expect(page.locator('#annual-status')).toContainText('Brouillon enregistré');await page.reload();await expect(page.locator('#annual-fields')).toBeEnabled();await expect(page.locator('#value-0')).toHaveValue('Entraide');await expect(page.locator('#annual-questionnaire-preview')).toContainText('total 100 %');
 await page.locator('#weight-0').fill('19');await page.getByRole('button',{name:'Enregistrer le brouillon',exact:true}).click();await expect(page.locator('#annual-status')).toContainText('refusé');expect((await(await page.request.get('/api/annual-plan')).json()).input.questionnaire.weights[0]).toBe('20');
 await page.locator('#weight-0').fill('20');await page.locator('#questionnaire-mode').selectOption('kpi');
 for(let i=0;i<2;i++){for(const [key,value] of Object.entries({definition:'Délai '+i,source:'Rapport mensuel',target:'2,5',unit:'jours'}))await page.locator('#kpi-'+i+'-'+key).fill(value);await page.locator('#kpi-'+i+'-direction').selectOption('lower');}
 await page.getByRole('button',{name:'Enregistrer le brouillon',exact:true}).click();await expect(page.locator('#annual-status')).toContainText('Brouillon enregistré');await page.reload();await expect(page.locator('#kpi-0-target')).toHaveValue('2.5');await expect(page.locator('#annual-questionnaire-preview')).toContainText('moins est mieux');expect(await(await page.request.get('/api/demo/team')).json()).toEqual(before);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.locator('.annual-questionnaire-form').screenshot({path:info.outputPath(`annual-questionnaire-${info.project.name}.png`)});
 await page.locator('#annual-questionnaire-preview').screenshot({path:info.outputPath(`annual-questionnaire-preview-${info.project.name}.png`)});
 await page.locator('#questionnaire-mode').selectOption('autonomous');await page.getByRole('button',{name:'Enregistrer le brouillon',exact:true}).click();await expect(page.locator('#annual-status')).toContainText('Brouillon enregistré');expect((await(await page.request.get('/api/annual-plan')).json()).input.questionnaire.kpis).toBeUndefined();
 const rejected=await page.request.post('/api/annual-plan/save',{headers:{Origin:new URL(page.url()).origin},data:{input:{},revision:0,mutationId:'forbidden'}});expect(rejected.status()).toBe(403);
});
