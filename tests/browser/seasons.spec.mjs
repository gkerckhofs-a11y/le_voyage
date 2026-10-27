import {test,expect} from '@playwright/test';
test('season rollover repaints landscape without moving route, milestones or vehicle',async({page},info)=>{
 await page.clock.install({time:new Date('2028-02-29T23:59:30+01:00')});
 await page.goto('/');await expect(page.locator('#map')).toHaveAttribute('data-ready','true');
 await expect(page.locator('#world')).toHaveAttribute('data-season','winter');
 const geometry=()=>page.evaluate(()=>({road:document.querySelector('#road').getAttribute('d'),car:document.querySelector('#team-car').getAttribute('transform'),stages:[...document.querySelectorAll('.gift-route-marker')].map(n=>n.outerHTML),camera:document.querySelector('#world').getAttribute('transform')}));
 const before=await geometry();
 await page.clock.fastForward(61000);
 await expect(page.locator('#world')).toHaveAttribute('data-season','spring');expect(await geometry()).toEqual(before);
 await expect(page.getByTestId('team-car')).toHaveCount(1);
 for(const [season,month] of [['spring','04'],['summer','07'],['autumn','10'],['winter','12']]){
  await page.clock.setSystemTime(new Date(`2028-${month}-15T12:00:00Z`));await page.clock.fastForward(61000);
  await expect(page.locator('#world')).toHaveAttribute('data-season',season);expect(await geometry()).toEqual(before);
  await page.screenshot({path:info.outputPath(`v44-${season}-${info.project.name}.png`),fullPage:true});
 }
});
