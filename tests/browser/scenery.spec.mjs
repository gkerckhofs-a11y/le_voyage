import {test,expect} from '@playwright/test';
test('named forest and hills use matching scenery without changing the journey',async({page},info)=>{
 await page.goto('/');await expect(page.locator('#map')).toHaveAttribute('data-ready','true');const feed=await(await page.request.get('/api/demo/team')).json();
 for(const [ratio,name] of [[.63,'La forêt des grands détours'],[.85,'Là-haut, les collines']]){
  const value=structuredClone(feed);value.journey.distance={numerator:String(Math.round(value.journey.maximumKm*ratio)),denominator:'1'};value.journey.displayKm=String(Math.round(value.journey.maximumKm*ratio));
  await page.route('**/api/demo/team',r=>r.fulfill({json:value}));await page.goto('/');await expect(page.locator('#map')).toHaveAttribute('data-ready','true');await expect(page.locator('#chapter')).toHaveText(name);
  await expect(page.getByTestId('team-car')).toHaveCount(1);await expect(page.locator('[data-scenery="castle"]')).toHaveCount(1);await expect(page.locator('[data-scenery="hill"]')).toHaveCount(2);expect(await page.locator('[data-scenery="forest"]').count()).toBeGreaterThan(60);
  const road=await page.locator('#road').getAttribute('d'),car=await page.getByTestId('team-car').getAttribute('transform');await page.locator('#fit-route').click();await page.locator('#recenter').click();expect(await page.locator('#road').getAttribute('d')).toBe(road);expect(await page.getByTestId('team-car').getAttribute('transform')).toBe(car);
  await page.screenshot({path:(info.project.name==='desktop-1440'&&ratio===.63)||(info.project.name==='mobile-390'&&ratio===.85)?`docs/evidence/v5-r4b-${ratio===.63?'forest':'hills'}-${info.project.name}.png`:info.outputPath(`scenery-${ratio}.png`)});await page.unroute('**/api/demo/team');
 }
});
test('collective overview retains one minibus and four festive stops',async({page},info)=>{
 await page.goto('/collectif.html?scenario=before-freeze&kiosk=1');await expect(page.locator('#collective-content')).toHaveAttribute('data-ready','true');await page.locator('#fit-route').click();await expect(page.getByTestId('collective-car')).toHaveCount(1);await expect(page.locator('.festive-stop')).toHaveCount(4);await expect(page.locator('.scenic-feature')).toHaveCount(11);
 await page.screenshot({path:info.project.name==='desktop-1440'?'docs/evidence/v5-r4b-kiosk-overview.png':info.outputPath('scenery-kiosk.png')});
});
