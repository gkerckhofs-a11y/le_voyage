import { test, expect } from '@playwright/test';
async function open(page){await page.goto('/');await expect(page.locator('#map')).toHaveAttribute('data-ready','true');}
async function prepareCrossing(page){
  const origin=new URL(page.url()).origin;
  const session=await(await page.request.post('/api/demo/session',{headers:{Origin:origin,'Content-Type':'application/json'},data:{}})).json();
  for(let revision=0;revision<7;revision++){
    const response=await page.request.post('/api/demo/advance',{headers:{Origin:origin,'Content-Type':'application/json','X-Demo-CSRF':session.csrf},data:{revision}});expect(response.ok()).toBeTruthy();
  }
  await page.reload();await expect(page.locator('#map')).toHaveAttribute('data-ready','true');await expect(page.locator('#distance')).toHaveText('2 380');
}
test('real crossing reveals once, keeps history and updates the collective',async({page},info)=>{
  await open(page);await prepareCrossing(page);
  const before=await(await page.request.get('/api/demo/team')).json();expect(before.attentions).toEqual([]);
  expect(JSON.stringify(before)).not.toMatch(/Une pause gourmande|milestone|budget|private-/);
  await expect(page.locator('body')).not.toContainText('Une pause gourmande');await expect(page.locator('#reveal')).not.toBeVisible();await expect(page.locator('#map')).not.toHaveClass(/is-replaying/);
  await page.getByRole('button',{name:'Simuler une semaine',exact:true}).click();await expect(page.locator('#map')).toHaveClass(/is-replaying/);
  await expect(page.locator('#reveal')).toBeVisible();await expect(page.locator('#reveal-title')).toHaveText('Une pause gourmande');await expect(page.locator('#distance')).toHaveText('2 480');
  await expect(page.getByTestId('team-car')).toHaveCount(1);await page.screenshot({path:info.outputPath(`reveal-${info.project.name}.png`),fullPage:true});
  await page.keyboard.press('Escape');await page.getByRole('button',{name:'Mes attentions',exact:true}).click();await expect(page.locator('.attention-card')).toHaveCount(1);await expect(page.locator('.attention-card')).toContainText('À composer');await page.keyboard.press('Escape');
  await page.reload();await expect(page.locator('#map')).toHaveAttribute('data-ready','true');await expect(page.locator('#reveal')).not.toBeVisible();await expect(page.locator('#map')).not.toHaveClass(/is-replaying/);await expect(page.locator('#distance')).toHaveText('2 480');
  await page.getByRole('link',{name:'Le collectif',exact:true}).click();await expect(page.locator('#collective-content')).toHaveAttribute('data-ready','true');await expect(page.locator('#distance')).toHaveText('2 480');await expect(page.getByTestId('collective-car')).toHaveCount(1);
});
test('lost response preserves acquired attention and refresh never autoplays it',async({page})=>{
  await open(page);await prepareCrossing(page);
  await page.route('**/api/demo/advance',async route=>{await route.fetch();await route.abort();},{times:1});
  await page.getByRole('button',{name:'Simuler une semaine',exact:true}).click();await expect(page.locator('#advance-status')).toContainText('La confirmation n’a pas été reçue');
  await expect(page.locator('#advance')).toBeDisabled();await page.getByRole('button',{name:'Retrouver ma progression',exact:true}).click();
  await expect(page.locator('#distance')).toHaveText('2 480');await expect(page.locator('#reveal')).not.toBeVisible();
  await page.getByRole('button',{name:'Mes attentions (1)',exact:true}).click();await page.getByRole('button',{name:'Découvrir cette attention',exact:true}).click();
  await expect(page.locator('#reveal-title')).toHaveText('Une pause gourmande');await expect(page.locator('#reveal')).toBeVisible();
  await page.reload();await expect(page.locator('#map')).toHaveAttribute('data-ready','true');await expect(page.locator('#reveal')).not.toBeVisible();
  const feed=await(await page.request.get('/api/demo/team')).json();expect(feed.revision).toBe(8);expect(feed.attentions).toHaveLength(1);expect(feed.attentions[0].unread).toBe(false);
});
test('two tabs submitting the same revision create one advancement and one automatic reveal',async({page,context})=>{
  await open(page);await prepareCrossing(page);const second=await context.newPage();await open(second);
  await Promise.all([page,second].map(p=>p.getByRole('button',{name:'Simuler une semaine',exact:true}).click()));
  for(const p of [page,second]){await expect(p.locator('#distance')).toHaveText('2 480');await expect(p.locator('#advance-status')).not.toContainText('se termine');}
  await expect.poll(async()=>Number(await page.locator('#reveal').isVisible())+Number(await second.locator('#reveal').isVisible())).toBe(1);
  const feed=await(await page.request.get('/api/demo/team')).json();expect(feed.revision).toBe(8);expect(feed.attentions).toHaveLength(1);expect(feed.attentions[0].unread).toBe(false);await second.close();
});
test('reduced motion applies progression without replay and discovery remains keyboard accessible',async({page})=>{
  await open(page);await prepareCrossing(page);await page.emulateMedia({reducedMotion:'reduce'});
  await page.getByRole('button',{name:'Simuler une semaine',exact:true}).focus();await page.keyboard.press('Enter');
  await expect(page.locator('#reveal')).toBeVisible();await expect(page.locator('#map')).not.toHaveClass(/is-replaying/);await expect(page.locator('#distance')).toHaveText('2 480');
  await page.keyboard.press('Escape');await expect(page.locator('#reveal')).not.toBeVisible();await expect(page.getByTestId('team-car')).toHaveCount(1);
});
