import {test,expect} from '@playwright/test';
import {readFile,mkdir} from 'node:fs/promises';
import {agendaCsv} from '../../src/web/cockpit-export.ts';
test('Clem exports only the freshly authorized filtered agenda and cannot export on read failure',async({page},info)=>{
 await page.goto('/connexion.html');await page.getByRole('button',{name:'Cockpit Clem · démo',exact:true}).click();
 await expect(page.locator('.gift-row')).toHaveCount(4);
 const initial=await(await page.request.get('/api/gifts/ops')).json(),row=initial.rows[0];
 await page.locator('#client-filter').selectOption(row.tenantId);
 await page.locator('#team-filter').fill(row.team);
 await page.locator('#status-filter').selectOption(row.status);
 await page.locator('#horizon-filter').selectOption('7');
 const button=page.getByRole('button',{name:'Exporter la liste (CSV)',exact:true});
 const visible=await page.locator('.gift-row').count();expect(visible).toBeGreaterThan(0);
 const response=page.waitForResponse(r=>r.url().endsWith('/api/gifts/ops')&&r.request().method()==='GET');
 const downloaded=page.waitForEvent('download');await button.click();
 const fresh=await(await response).json(),download=await downloaded;
 expect(download.suggestedFilename()).toMatch(/^le-voyage-cadeaux-\d{4}-\d{2}-\d{2}\.csv$/);
 const csv=await readFile(await download.path(),'utf8');
 const ids=await page.locator('.gift-row').evaluateAll(nodes=>nodes.map(n=>n.dataset.id));
 expect(csv).toBe(agendaCsv(fresh.rows.filter(r=>r.tenantId===row.tenantId&&ids.includes(r.id)),fresh.generatedAt));
 await expect(page.locator('#export-status')).toContainText(`Export préparé : ${visible} cadeau`);
 expect(csv).not.toMatch(/purchaseCents|composition|supplier|alcoholFree|people|owner/);
 await page.locator('#team-filter').fill('aucune-équipe-correspondante');await expect(button).toBeDisabled();
 await page.locator('#team-filter').fill(row.team);await expect(button).toBeEnabled();
 let downloads=0;page.on('download',()=>downloads++);
 for(const failure of ['denied','network']){
  await page.route('**/api/gifts/ops',route=>failure==='denied'?route.fulfill({status:403,body:'{}'}):route.abort());
  await button.click();await expect(page.locator('#export-status')).toContainText('Aucun fichier créé');await expect(button).toBeEnabled();
  expect(downloads).toBe(0);await page.unroute('**/api/gifts/ops');
 }
 await page.route('**/api/gifts/ops',async route=>{const r=await route.fetch(),data=await r.json();data.clients=data.clients.filter(c=>c.tenantId!==row.tenantId);data.rows=data.rows.filter(r=>r.tenantId!==row.tenantId);await route.fulfill({json:data});});
 await button.click();await expect(page.locator('#export-status')).toContainText('Aucun cadeau à exporter');await expect(page.locator('#client-filter')).toHaveValue(row.tenantId);expect(downloads).toBe(0);
 await page.unroute('**/api/gifts/ops');await page.getByRole('button',{name:'Actualiser',exact:true}).click();await expect(button).toBeEnabled();
 const next=page.waitForEvent('download');await button.click();await next;
 await expect(page.locator('#export-status')).toContainText('Export préparé');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await mkdir('docs/evidence',{recursive:true});
 await page.screenshot({path:`docs/evidence/v48a-export-${info.project.name}.png`});
});
