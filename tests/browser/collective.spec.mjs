import { test, expect } from '@playwright/test';
const open=async(page,query='')=>{await page.goto('/collectif.html'+query);await expect(page.locator('#collective-content')).toHaveAttribute('data-ready','true');};
test('collective route has one retro minibus, four festive stops and no individual data',async({page},info)=>{
  await open(page);await expect(page.getByTestId('collective-car')).toHaveCount(1);await expect(page.getByTestId('team-car')).toHaveCount(0);await expect(page.locator('[data-vehicle="minibus"]')).toHaveCount(1);await expect(page.locator('.car-art')).toHaveCount(0);await expect(page.getByTestId('collective-car')).toHaveAttribute('aria-label',/^Minibus collectif/);
  await expect(page.locator('.festive-stop')).toHaveCount(4);await expect(page.locator('.tier-card')).toHaveCount(4);await expect(page.locator('[data-marker]')).toHaveCount(47);
  await expect(page.getByRole('heading',{name:'La fête est garantie.'})).toBeVisible();await expect(page.locator('#distance')).toHaveText('1 680');
  for(const name of ['journey','before-freeze','frozen','tpe']){
    const dto=await(await page.request.get(`/data/collective-${name}.json`)).json();
    expect(JSON.stringify(dto)).not.toMatch(/private-|budget|teams|participant|answers|scores|gift|preferences|Dinant|Namur|Rochefort/i);
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const car=await page.getByTestId('collective-car').boundingBox(),map=await page.locator('#map').boundingBox(),panel=await page.locator('#journey-card').boundingBox();
  expect(car.x).toBeGreaterThan(map.x);expect(car.y).toBeGreaterThan(map.y);expect(car.x+car.width).toBeLessThan(map.x+map.width);expect(car.y+car.height).toBeLessThan(map.y+map.height);
  expect(car.x+car.width<panel.x||car.x>panel.x+panel.width||car.y+car.height<panel.y||car.y>panel.y+panel.height).toBeTruthy();
  await page.screenshot({path:info.outputPath(`collective-${info.project.name}.png`),fullPage:true});
});
test('before and after freeze keep the same formula although the fourth threshold is passed',async({page},info)=>{
  await open(page,'?scenario=before-freeze');await expect(page.locator('#reception-level')).toHaveText('3 / 4');await expect(page.locator('.tier-card[data-level="4"]')).toHaveAttribute('data-status','next');
  await page.locator('#scenario').selectOption('frozen');await expect(page.locator('#collective-content')).toHaveAttribute('data-ready','true');
  await expect(page.locator('#distance')).toHaveText('3 880');await expect(page.locator('#reception-basis')).toContainText('3 480');
  await expect(page.locator('#formula-title')).toHaveText('Soirée festive');await expect(page.locator('#formula-state')).toHaveText('Formule figée');
  await expect(page.locator('.tier-card[data-level="3"]')).toHaveAttribute('data-status','frozen');await expect(page.locator('.tier-card[data-level="4"]')).toContainText('Non retenu après gel');
  await expect(page.locator('[data-status="next"]')).toHaveCount(0);
  const position=await page.getByTestId('collective-car').getAttribute('data-ratio');expect(Number(position)).toBeGreaterThan(3860/4600);
  await page.reload();await expect(page.locator('#collective-content')).toHaveAttribute('data-ready','true');await expect(page.locator('#reception-level')).toHaveText('3 / 4');await expect(page.getByTestId('collective-car')).toHaveAttribute('data-ratio',position);
  if(info.project.name==='desktop-1920'){
    await page.getByRole('button',{name:'Écran collectif',exact:true}).click();await expect(page.locator('body')).toHaveClass(/kiosk/);
    expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight)).toBe(true);
    await page.screenshot({path:info.outputPath('collective-frozen-kiosk-1920.png'),fullPage:true});
  }
});
test('escale navigation, keyboard, kiosk idle recenter and reduced motion',async({page})=>{
  await open(page,'?scenario=before-freeze&kiosk=1');await page.emulateMedia({reducedMotion:'reduce'});
  await page.clock.install();
  const world=page.locator('#world'),initial=await world.getAttribute('transform');
  await page.locator('.tier-card[data-level="4"]').click();expect(await world.getAttribute('transform')).not.toBe(initial);
  await page.clock.fastForward(20000);await page.getByRole('button',{name:'Agrandir la carte',exact:true}).click();
  const exploring=await world.getAttribute('transform');await page.clock.fastForward(15000);await expect(world).toHaveAttribute('transform',exploring);
  await page.clock.fastForward(16000);expect(await world.getAttribute('transform')).not.toBe(exploring);
  await page.getByRole('button',{name:'Réduire la carte',exact:true}).click();const centered=await world.getAttribute('transform');
  await page.locator('#map').focus();await page.keyboard.press('ArrowRight');expect(await world.getAttribute('transform')).not.toBe(centered);
  await page.keyboard.press('Home');await expect(world).toHaveAttribute('transform',centered);
  await page.getByRole('button',{name:'Revoir notre avancée'}).click();await expect(page.locator('#map')).not.toHaveClass(/is-replaying/);
  await page.getByRole('button',{name:'Quitter l’écran collectif'}).click();await expect(page.locator('body')).not.toHaveClass(/kiosk/);
  await page.locator('#map').focus();await page.keyboard.press('ArrowRight');const manual=await world.getAttribute('transform');await page.clock.fastForward(31000);await expect(world).toHaveAttribute('transform',manual);
});
test('team/collective navigation, mobile journal, TPE and network fallback',async({page})=>{
  await page.goto('/');await expect(page.locator('#map')).toHaveAttribute('data-ready','true');
  await page.getByRole('button',{name:'Carnet de bord'}).click();await expect(page.locator('#journal')).toBeVisible();await page.keyboard.press('Escape');
  await page.getByRole('link',{name:'Le Voyage Lex EKHO',exact:true}).click();await expect(page.getByTestId('collective-car')).toHaveCount(1);
  await page.locator('#scenario').selectOption('tpe');await expect(page.locator('#company')).toHaveText('Atelier fictif');await expect(page.getByTestId('collective-car')).toHaveCount(1);
  await page.route('**/data/collective-tpe.json',r=>r.abort());await page.reload();await expect(page.locator('#fallback')).toBeVisible();await expect(page.locator('#collective-content')).toBeHidden();
});

test('completed collective parks once, retains frozen level and offers manual reduced-motion replay',async({page},info)=>{
 await open(page,'?scenario=frozen');
 const car=page.getByTestId('collective-car');await expect(car).toHaveAttribute('data-parked','true');await expect(car).toHaveCount(1);
 await expect(page.locator('#collective-ending-summary')).toContainText('3 880 km');await expect(page.locator('#collective-ending-summary')).toContainText('niveau 3 / 4');
 const pose=await car.getAttribute('transform');await expect(page.locator('#map')).not.toHaveClass(/is-replaying/);
 await page.locator('#collective-arrival-replay').click();await expect(page.locator('#map')).toHaveClass(/is-replaying/);await expect(page.locator('#map')).not.toHaveClass(/is-replaying/);await expect(car).toHaveAttribute('transform',pose);
 await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#collective-arrival-replay').focus();await page.keyboard.press('Enter');await expect(page.locator('#map')).not.toHaveClass(/is-replaying/);
 await page.reload();await expect(page.locator('#collective-content')).toHaveAttribute('data-ready','true');await expect(car).toHaveAttribute('transform',pose);await expect(page.locator('#map')).not.toHaveClass(/is-replaying/);await expect(page.locator('.tier-card[data-level="4"]')).toHaveAttribute('data-status','unreached');
 if(info.project.name==='desktop-1920'){await page.locator('#kiosk-toggle').click();expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight)).toBe(true);}
 await page.locator('#collective-ending-summary').click();
 await page.screenshot({path:info.outputPath(`collective-ending-${info.project.name}.png`),fullPage:true});
 await open(page,'?scenario=before-freeze');await expect(page.locator('#collective-ending')).toBeHidden();await expect(page.locator('#arrival-parking')).toHaveCount(0);
});
