import {test,expect} from '@playwright/test';
async function check(page,info){
 await expect(page.locator('.brand-logo')).toHaveJSProperty('naturalWidth',300);const nav=page.locator('.header nav');await expect(nav).toHaveCount(1);await expect(nav).toBeVisible();
 const mobile=info.project.name==='mobile',team=await page.locator('body').evaluate(el=>el.classList.contains('team-navigation'));expect(await nav.evaluate(el=>getComputedStyle(el).position)).toBe(team||mobile?'fixed':'static');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 if(mobile){const box=await nav.boundingBox();expect(box.height).toBeLessThanOrEqual(150);expect(team?Math.abs(box.y):Math.abs(box.y+box.height-page.viewportSize().height)).toBeLessThan(2);}
}
test('four spaces retain one usable branded navigation',async({page},info)=>{
 await page.goto('/connexion.html');await page.getByRole('button',{name:'Les quatre espaces · compte fictif'}).click();await expect(page.locator('#workspace-list section')).toHaveCount(4);
 for(const role of ['Mon équipe','Cockpit cadeaux','Vue entreprise','Organisation des campagnes']){
  await page.locator('#workspace-list section').filter({has:page.getByRole('heading',{name:role,exact:true})}).getByRole('button').click();await expect(page.locator('#workspace-switch')).toBeVisible();await check(page,info);
  if(role==='Mon équipe'){
   await expect(page.locator('.header nav').locator('a,button')).toHaveCount(4);for(const name of ['Le voyage d’équipe','Nos choix'])await expect(page.locator('.header nav').getByRole('link',{name,exact:true})).toBeVisible();await expect(page.locator('.header nav').getByRole('link',{name:'Ma semaine',exact:true})).toHaveCount(0);
   await page.screenshot({path:info.outputPath('team-session.png')});
  }
  await page.getByRole('link',{name:'Changer d’espace',exact:true}).click();await expect(page.locator('#workspace-list section')).toHaveCount(4);
 }
});
test('branded kiosk keeps navigation hidden and one collective vehicle',async({page},info)=>{
 await page.goto('/connexion.html');await page.getByRole('button',{name:'Modes KPI et TV · compte fictif'}).click();await page.locator('#workspace-modes section').filter({has:page.getByRole('heading',{name:'Écran collectif / TV',exact:true})}).getByRole('button').click();await expect(page.locator('#collective-content')).toHaveAttribute('data-ready','true');
 await expect(page.locator('.brand-logo')).toHaveJSProperty('naturalWidth',300);await expect(page.locator('.header nav')).toBeHidden();await expect(page.getByTestId('collective-car')).toHaveCount(1);expect((await page.request.get('/api/workspaces')).status()).toBe(403);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:info.project.name==='desktop'?'docs/evidence/v5-r4a-kiosk-desktop.png':info.outputPath('kiosk.png')});
});
