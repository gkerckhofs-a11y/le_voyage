import {chromium,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const baseURL=process.env.RC_TEST_URL,password=process.env.RC_TEST_ACCESS_PASSWORD;
if(baseURL!=='https://rc-voyage-test-20261027.web.app'||!password)throw Error('Explicit staging target and credential required');
await mkdir('test-results/staging',{recursive:true});
const denied=await fetch(baseURL+'/connexion.html');if(denied.status!==401)throw Error('Test gate is not active');
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 for(const [name,viewport] of [['desktop',{width:1440,height:900}],['mobile',{width:390,height:844}]]){
  const context=await browser.newContext({baseURL,viewport,httpCredentials:{username:'voyage',password},...(name==='mobile'?{isMobile:true,hasTouch:true}:{})});const page=await context.newPage();
  await page.goto('/connexion.html');await page.getByRole('button',{name:'Explorer Lex EKHO'}).click();await expect(page.getByTestId('team-car')).toHaveCount(1);await expect(page.locator('#company')).toHaveText('Lex EKHO');
  await page.reload();await expect(page.getByTestId('team-car')).toHaveCount(1);await page.screenshot({path:`test-results/staging/team-${name}.png`,fullPage:true});
  await page.getByRole('link',{name:'Mes goûts',exact:true}).click();await expect(page.locator('#preferences-form')).toBeVisible();await page.getByLabel('Uniquement sans alcool',{exact:true}).check();await page.getByRole('button',{name:'Enregistrer mes préférences'}).click();await expect(page.locator('#preferences-status')).toContainText('Vos préférences sont enregistrées');await page.reload();await expect(page.getByLabel('Uniquement sans alcool',{exact:true})).toBeChecked();
  await page.goto('/connexion.html');await page.getByRole('button',{name:'Explorer l’Atelier'}).click();await expect(page.locator('#company')).toHaveText('Atelier fictif');await page.getByRole('link',{name:'Mes goûts',exact:true}).click();await expect(page.locator('#preferences-form')).toBeVisible();await expect(page.getByLabel('Uniquement sans alcool',{exact:true})).not.toBeChecked();
  const login=async name=>{await page.goto('/connexion.html');await page.getByText('TPE autonome fictive',{exact:true}).click();await page.getByRole('button',{name,exact:true}).click();};
  await login('Participer à la TPE');await expect(page.getByTestId('team-car')).toHaveCount(1);const before=await(await page.request.get('/api/demo/team')).json();
  await login('Administrer la TPE');await expect(page.locator('.coordination-team')).toHaveCount(1);await page.getByRole('button',{name:'Ouvrir',exact:true}).click();await expect(page.locator('.coordination-team')).toContainText('Ouverte');
  await login('Participer à la TPE');await page.getByRole('link',{name:'Ma semaine',exact:true}).click();for(let i=0;i<3;i++)await page.locator(`input[name="q${i}"][value="4"]`).check();await page.screenshot({path:`test-results/staging/weekly-${name}.png`,fullPage:true});await page.getByRole('button',{name:'Valider mes trois réponses'}).click();await expect(page.locator('#week-status')).toContainText('réponses sont enregistrées');
  await login('Administrer la TPE');await page.getByRole('button',{name:'Clôturer',exact:true}).click();await expect(page.locator('.coordination-team')).toContainText('À ouvrir');const after=await(await page.request.get('/api/demo/team')).json();expect(Number(after.journey.displayKm)-Number(before.journey.displayKm)).toBe(85);
  await page.getByRole('link',{name:'Voir le voyage collectif'}).click();await expect(page.getByTestId('collective-car')).toHaveCount(1);await page.screenshot({path:`test-results/staging/collective-${name}.png`,fullPage:true});
  await page.getByRole('button',{name:'Se déconnecter'}).click();await expect(page.getByRole('button',{name:'Explorer Lex EKHO'})).toBeVisible();
  await context.close();console.log(`Staging ${name}: login, refresh, preferences, tenant separation, TPE questionnaire/closure +85 km, collective and logout passed`);
 }
 await writeFile('test-results/staging/result.json',JSON.stringify({url:baseURL,passed:['gate','desktop','mobile'],timestamp:new Date().toISOString()}));
}finally{await browser.close();}
