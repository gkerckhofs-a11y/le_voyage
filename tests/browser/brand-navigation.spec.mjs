import {test,expect} from '@playwright/test';
test('official brand and unique responsive navigation retain map actions',async({page},info)=>{
 await page.goto('/');await expect(page.locator('#distance')).not.toHaveText('—');
 const logo=page.locator('.brand-logo');await expect(logo).toHaveCount(1);await expect(logo).toHaveJSProperty('naturalWidth',300);await expect(logo.locator('..')).toHaveAttribute('href','https://rougeclemence.be/');await expect(page.locator('.brand-signature')).toHaveText('Ensemble, allons plus loin.');
 const nav=page.getByRole('navigation',{name:'Navigation principale'});await expect(nav).toHaveCount(1);
 const position=await nav.evaluate(el=>getComputedStyle(el).position);expect(position).toBe('fixed');
 const box=await nav.boundingBox();expect(Math.abs(box.y)).toBeLessThan(2);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('button',{name:'Carnet de bord',exact:true}).click();await expect(page.locator('#journal')).toBeVisible();await page.getByRole('button',{name:'Fermer le carnet'}).click();
 await page.locator('#fit-route').click();await expect(page.locator('#team-car')).toHaveCount(1);await page.locator('#recenter').click();
 await page.screenshot({path:info.project.name==='desktop-1440'||info.project.name.includes('mobile')?`docs/evidence/v5-r4a-team-${info.project.name}.png`:info.outputPath('brand.png')});
 await nav.getByRole('link',{name:'Le Voyage Lex EKHO',exact:true}).click();await expect(page.locator('.brand-logo')).toHaveJSProperty('naturalWidth',300);await expect(page.getByRole('navigation')).toHaveCount(1);
});
