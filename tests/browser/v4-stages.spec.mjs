import {test,expect} from '@playwright/test';
test('V4 milestones, full-route view and return to the same car',async({page},info)=>{
 await page.goto('/');await expect(page.locator('#map')).toHaveAttribute('data-ready','true');
 const car=page.getByTestId('team-car');await expect(car).toHaveCount(1);await expect(page.locator('.road-marker')).toHaveCount(58);await expect(page.locator('.gift-route-marker')).toHaveCount(5);
 const before=await car.getAttribute('transform');await expect(page.locator('#stage-list')).toContainText('encore 710 km');
 await page.getByRole('button',{name:'Voir tout le parcours',exact:true}).click();
 const bounds=await page.evaluate(()=>{const r=document.getElementById('road').getBoundingClientRect(),m=document.getElementById('map').getBoundingClientRect();return {inside:r.left>=m.left&&r.right<=m.right&&r.top>=m.top&&r.bottom<=m.bottom,zoom:Number(document.getElementById('map').dataset.zoom)};});expect(bounds.inside).toBe(true);expect(bounds.zoom).toBeLessThan(.45);await expect(car).toHaveAttribute('transform',before);
 await expect(page.locator('#map-status')).not.toHaveClass(/visible/);
 await page.screenshot({path:info.outputPath(`v4-overview-${info.project.name}.png`),fullPage:true});
 await page.getByRole('button',{name:'Retrouver ma voiture',exact:true}).click();await expect(page.locator('.journey-shell')).not.toHaveClass(/overview/);await expect(car).toHaveAttribute('transform',before);expect(Number(await page.locator('#map').getAttribute('data-zoom'))).toBeGreaterThan(.7);
 await expect(page.locator('#map-status')).not.toHaveClass(/visible/);
 await page.screenshot({path:info.outputPath(`v4-follow-${info.project.name}.png`),fullPage:true});
 if(info.project.name==='desktop-1920'){
  await page.goto('/collectif.html?scenario=frozen&kiosk=1');await expect(page.locator('#map')).toHaveAttribute('data-ready','true');await page.getByRole('button',{name:'Voir tout le parcours',exact:true}).click();await expect(page.getByTestId('collective-car')).toHaveCount(1);await expect(page.locator('#map-status')).not.toHaveClass(/visible/);await page.screenshot({path:info.outputPath('v4-overview-kiosk.png'),fullPage:true});
 }
});
