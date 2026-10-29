import {test,expect} from '@playwright/test';
test('private team ballot, refresh and one car after vote',async({page},info)=>{
 await page.goto('/connexion.html');await page.getByRole('button',{name:'Explorer Lex EKHO'}).click();await expect(page.getByTestId('team-car')).toHaveCount(1);await page.getByRole('link',{name:'Nos choix',exact:true}).click();await page.getByRole('link',{name:/^03 Choix d’équipe/}).click();
 // The same fixture account is reused on mobile; its committed ballot must survive.
 const status=page.locator('#vote-status');await expect(status).toContainText(/Votre voix|Votre vote/);
 if(await page.locator('#vote-form').isVisible()){
  await page.getByLabel('Les Roues libres',{exact:true}).check();await page.getByLabel('Rivière',{exact:true}).check();
  await page.screenshot({path:info.outputPath(`vote-${info.project.name}.png`),fullPage:true});
  await page.route('**/api/team-vote/cast',async route=>{await route.fetch();await route.abort();},{times:1});
  await page.getByRole('button',{name:'Valider mon vote'}).click();await expect(status).toContainText('Vote non confirmé');await page.getByRole('button',{name:'Valider mon vote'}).click();
 }else await page.screenshot({path:info.outputPath(`vote-${info.project.name}.png`),fullPage:true});
 await expect(status).toContainText('Votre vote est enregistré');await page.reload();await expect(status).toContainText('Votre vote est enregistré');await expect(page.locator('#arbitration')).toBeHidden();
 await page.getByRole('link',{name:'Retrouver notre voyage'}).click();await expect(page.getByTestId('team-car')).toHaveCount(1);
 if(info.project.name==='mobile'){
  await page.goto('/connexion.html');await page.getByRole('button',{name:'Administration fictive'}).click();await page.getByRole('link',{name:'Vote de l’équipe et clôture'}).click();await page.getByRole('button',{name:'Clôturer et appliquer'}).click();await expect(status).toContainText('Les Roues libres · Rivière');await page.getByRole('link',{name:'Retrouver notre voyage'}).click();await expect(page.locator('#team-name')).toHaveText('Les Roues libres');await expect(page.getByTestId('team-car')).toHaveCount(1);
 }
});
