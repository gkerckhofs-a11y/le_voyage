import {test,expect} from '@playwright/test';
import {createCampaign} from '../../src/domain/engine.ts';
import {planWeeks} from '../../src/domain/calendar.ts';
import {closeWithEvents,teamFeed} from '../../src/application/events.ts';
import {config,input,scope,cmd} from '../fixtures.mjs';
function finished(scores){
 let ledger={state:createCampaign(config({mode:'kpi',weeks:planWeeks('2027-01-04',3),giftMilestones:[100,200,280].map(k=>({id:'g'+k,km:k,budgetCents:1000}))})),revision:0,events:[],presented:{}};
 const catalog=Object.fromEntries([100,200,280].map(k=>['g'+k,{title:'Attention fictive '+k,description:'Acquise'}]));
 ledger.state.config.weeks.forEach((w,i)=>{ledger=closeWithEvents(ledger,cmd(w),{kind:'evaluate',input:input({mode:'kpi',score:scores[i]})},catalog);});
 return teamFeed(ledger,{...scope,teamId:'cometes',viewerId:'test'},{organizationName:'Lex EKHO · scénario fictif',teamName:'Comètes',color:'#aa4433'});
}
test('earned 55/80/100% endings: one parked car, truthful summary, replay and reduced motion',async({page},info)=>{
 for(const [percent,scores,gifts] of [[55,['2','2','2'],1],[80,['3','4','4'],2],[100,['5','5','5'],3]]){
  const feed=finished(scores);
  await page.route('**/api/demo/team',r=>r.fulfill({json:feed}));
  await page.goto('/');const car=page.getByTestId('team-car');await expect(car).toHaveAttribute('data-parked','true');
  await expect(car).toHaveCount(1);await expect(car).toHaveAttribute('data-ratio',String(percent/100));
  await expect(page.locator('#journey-closure')).toBeVisible();await expect(page.locator('#closure-gifts')).toContainText(`${gifts} palier`);
  await expect(page.locator('#closure-summary')).toContainText(percent===100?'au terminus':'dernière position gagnée');
  const parked=await car.getAttribute('transform'),road=await page.locator('#road').getAttribute('d');
  await expect(page.locator('#map')).not.toHaveClass(/is-replaying/);
  await page.locator('#arrival-replay').click();await expect(page.locator('#map')).toHaveClass(/is-replaying/);
  await expect(page.locator('#map')).not.toHaveClass(/is-replaying/);await expect(car).toHaveAttribute('transform',parked);await expect(page.locator('#road')).toHaveAttribute('d',road);
  await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#arrival-replay').focus();await page.keyboard.press('Enter');await expect(page.locator('#map')).not.toHaveClass(/is-replaying/);
  await page.reload();await expect(car).toHaveAttribute('data-parked','true');await expect(page.locator('#map')).not.toHaveClass(/is-replaying/);await expect(car).toHaveAttribute('transform',parked);
  await page.screenshot({path:info.outputPath(`arrival-${percent}-${info.project.name}.png`),fullPage:true});
  await page.unroute('**/api/demo/team');await page.emulateMedia({reducedMotion:'no-preference'});
 }
});
test('actual final-week transaction parks once and refresh keeps the earned result',async({page})=>{
 await page.goto('/');await expect(page.locator('#map')).toHaveAttribute('data-ready','true');
 const origin=new URL(page.url()).origin,session=await(await page.request.post('/api/demo/session',{headers:{Origin:origin},data:{}})).json();
 for(let revision=0;revision<21;revision++)expect((await page.request.post('/api/demo/advance',{headers:{Origin:origin,'X-Demo-CSRF':session.csrf},data:{revision}})).ok()).toBeTruthy();
 // Claim earlier discoveries so only the final-week event drives this presentation.
 const earlier=await(await page.request.get('/api/demo/team')).json();await page.request.post('/api/demo/claim',{headers:{Origin:origin,'X-Demo-CSRF':session.csrf},data:{eventIds:earlier.unseenEventIds}});
 await page.reload();await expect(page.locator('#map')).toHaveAttribute('data-ready','true');await page.locator('#advance').click();
 await expect(page.getByTestId('team-car')).toHaveAttribute('data-parked','true');await expect(page.locator('#map')).not.toHaveClass(/is-replaying/);
 await expect(page.locator('#distance')).toHaveText('3 880');await expect(page.locator('#closure-gifts')).toContainText('4 paliers');
 const feed=await(await page.request.get('/api/demo/team')).json();expect(feed.unseenEventIds).not.toContain(feed.closure.id);
 await page.reload();await expect(page.getByTestId('team-car')).toHaveAttribute('data-parked','true');await expect(page.locator('#map')).not.toHaveClass(/is-replaying/);await expect(page.locator('#distance')).toHaveText('3 880');
});
