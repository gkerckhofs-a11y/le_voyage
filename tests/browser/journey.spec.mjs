import { test, expect } from '@playwright/test';
import { journeyRoute } from '../../src/map/route.ts';
import { positionAt } from '../../src/map/geometry.ts';
test.beforeEach(async({page})=>{await page.goto('/');await expect(page.locator('#map')).toHaveAttribute('data-ready','true');});
test('one car, neutral markers, no private resources; responsive capture',async({page},info)=>{
  await expect(page.getByTestId('team-car')).toHaveCount(1);await expect(page.locator('[data-marker]')).toHaveCount(58);
  const dto=(await (await page.request.get('/api/demo/team')).json()).journey;
  expect(JSON.stringify(dto)).not.toMatch(/budget|autre-equipe|responses|preferences|reception|private-/i);
  await expect(page.locator('#stage-list')).toContainText('Cadeau mystère');await expect(page.locator('body')).not.toContainText(/classement/i);
  const car=await page.getByTestId('team-car').boundingBox(),map=await page.locator('#map').boundingBox(),card=await page.locator('#journey-card').boundingBox();
  expect(car.x).toBeGreaterThan(map.x);expect(car.y).toBeGreaterThan(map.y);expect(car.x+car.width).toBeLessThan(map.x+map.width);expect(car.y+car.height).toBeLessThan(map.y+map.height);
  expect(car.x+car.width<card.x||car.x>card.x+card.width||car.y+car.height<card.y||car.y>card.y+card.height).toBeTruthy();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  for(const path of ['/src/domain/engine.ts','/scripts/demo-journey.mjs','/docs/V3-PHASE-0.md','/package.json'])expect((await page.request.get(path)).status()).toBe(404);
  await page.screenshot({path:info.outputPath(`${info.project.name}.png`),fullPage:true});
});
test('browser SVG agrees with geometry at 0, 50 and 100 percent',async({page})=>{
  for(const ratio of [0,.5,1]){
    const actual=await page.locator('#road').evaluate((path,r)=>{const p=path.getPointAtLength(path.getTotalLength()*r);return {x:p.x,y:p.y};},ratio);
    const expected=positionAt(journeyRoute,ratio);expect(Math.hypot(actual.x-expected.x,actual.y-expected.y)).toBeLessThan(.6);
  }
});
test('pan, keyboard, zoom, recenter and panel controls',async({page},info)=>{
  const world=page.locator('#world'),initial=await world.getAttribute('transform');
  await page.locator('#map').focus();await page.keyboard.press('ArrowRight');expect(await world.getAttribute('transform')).not.toBe(initial);
  await page.keyboard.press('Home');await expect(world).toHaveAttribute('transform',initial);
  const zoom=Number(await page.locator('#map').getAttribute('data-zoom'));await page.getByRole('button',{name:'Agrandir la carte',exact:true}).click();
  expect(Number(await page.locator('#map').getAttribute('data-zoom'))).toBeGreaterThan(zoom);
  await page.getByRole('button',{name:'Réduire la carte',exact:true}).click();
  await page.getByRole('button',{name:'Replier le panneau de progression'}).click();await expect(page.locator('#card-details')).toBeHidden();
  await page.getByRole('button',{name:'Déplier le panneau de progression'}).click();await expect(page.locator('#card-details')).toBeVisible();
  await page.getByRole('button',{name:'Vue simplifiée',exact:true}).click();await expect(page.locator('.map-details')).toBeHidden();
  await page.getByRole('button',{name:'Vue illustrée',exact:true}).click();
  if(!info.project.use.isMobile){
    const box=await page.locator('#map').boundingBox();const before=await world.getAttribute('transform');
    await page.mouse.move(box.x+box.width*.7,box.y+box.height*.3);await page.mouse.down();await page.mouse.move(box.x+box.width*.7+80,box.y+box.height*.3+50,{steps:5});await page.mouse.up();
    expect(await world.getAttribute('transform')).not.toBe(before);await page.getByRole('button',{name:'Retrouver ma voiture',exact:true}).click();
  }
});
test('replay follows the route, creates no duplicate, refresh stays at acquired distance',async({page})=>{
  await page.getByRole('button',{name:'Revoir notre avancée'}).click();
  await expect(page.locator('#map')).toHaveClass(/is-replaying/);
  const moving=Number(await page.getByTestId('team-car').getAttribute('data-ratio'));expect(moving).toBeLessThan(1680/4600);
  await expect(page.getByRole('button',{name:'Revoir notre avancée'})).toBeEnabled({timeout:6000});
  await expect(page.getByTestId('team-car')).toHaveCount(1);
  const final=await page.getByTestId('team-car').getAttribute('data-ratio');await page.reload();await expect(page.locator('#map')).toHaveAttribute('data-ready','true');
  await expect(page.getByTestId('team-car')).toHaveAttribute('data-ratio',final);await expect(page.locator('#map')).not.toHaveClass(/is-replaying/);
});
test('reduced motion, dialogs, keyboard close, and loading fallback',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});const before=await page.getByTestId('team-car').getAttribute('transform');
  await page.getByRole('button',{name:'Revoir notre avancée'}).click();await expect(page.getByTestId('team-car')).toHaveAttribute('transform',before);await expect(page.locator('#map')).not.toHaveClass(/is-replaying/);
  await page.getByRole('button',{name:'Données fictives · À propos de la démo'}).click();await expect(page.locator('#about')).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('#about')).not.toBeVisible();
  await page.route('**/api/demo/team',route=>route.abort());await page.reload();await expect(page.locator('#fallback')).toBeVisible();await expect(page.locator('.journey-shell')).toBeHidden();
});
test('real touch drag and pinch preserve a single car',async({page,context},info)=>{
  test.skip(!info.project.use.hasTouch,'Touch device only');
  const cdp=await context.newCDPSession(page),box=await page.locator('#map').boundingBox(),x=box.x+box.width/2,y=box.y+170;
  const touch=(type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(([id,x,y])=>({id,x,y}))});
  const initial=await page.locator('#world').getAttribute('transform');
  await touch('touchStart',[[1,x,y]]);await touch('touchMove',[[1,x+55,y-45]]);await touch('touchEnd',[]);
  expect(await page.locator('#world').getAttribute('transform')).not.toBe(initial);
  const zoom=Number(await page.locator('#map').getAttribute('data-zoom'));
  await touch('touchStart',[[1,x-35,y],[2,x+35,y]]);await touch('touchMove',[[1,x-65,y],[2,x+65,y]]);await touch('touchEnd',[]);
  expect(Number(await page.locator('#map').getAttribute('data-zoom'))).toBeGreaterThan(zoom);
  await expect(page.getByTestId('team-car')).toHaveCount(1);await page.getByRole('button',{name:'Retrouver ma voiture',exact:true}).click();
});
