import {giftScale} from '../src/domain/gift-scale.ts';
import { pathToFileURL } from 'node:url';
import { activeWeeks, addDays, planWeeks } from '../src/domain/calendar.ts';
import { compare, displayKm, exact } from '../src/domain/exact.ts';
import { closeWeek, convoyDistance, createCampaign, freezeReception, postponeWeek, receptionLevel, teamDistance } from '../src/domain/engine.ts';
import { DEFAULT_WEIGHTS, kpiScore, rollingRegularity, thresholds } from '../src/domain/scoring.ts';

/** Entirely fictional pilot fixtures. No data fetched, sent or ordered. */
export function simulate({start='2027-01-04',giftScaleVersion='v4-linear-1',reportWeekIndex=null,onCheckpoint=()=>{}}={}) {
  const clients = [
    { id: 'demo-tpe', name: 'TPE fictive', sizes: [2], mode: 'autonomous' },
    { id: 'demo-pme', name: 'PME fictive', sizes: [4,10,7,6], mode: 'autonomous' },
    { id: 'demo-lex-ekho', name: 'Lex EKHO — démonstration fictive', sizes: [6,8,5], mode: 'kpi' },
  ];
  const weeks = planWeeks(start,12,[addDays(start,21)]);
  const cutoffDate = weeks[8].endExclusive;
  const giftThresholds = giftScale(activeWeeks(weeks),3,giftScaleVersion).thresholds;
  const receptionThresholds = thresholds(activeWeeks(weeks,cutoffDate),2,'reception');
  return {
    disclaimer: 'Simulation déterministe fictive; aucun KPI réel, commande, déploiement ni efficacité RH mesurée.',
    hypotheses: { calendar: '12 semaines dont une fermeture; seuils recalculés pour ce pilote court, pas des seuils annuels validés', regularity: 'moyenne des taux de participation des 4 dernières semaines actives, semaine courante incluse', privacy: 'seuil 5, valeur neutre 3; validation vie privée encore requise', receptionCutoff: 'jour inclus, gel le lendemain; rapports clôturés après ce jour exclus de la réception', giftBudgetCentsPerTeamMilestone:10000 },
    clients: clients.map(client => {
      const scope = { tenantId:client.id,campaignId:'pilot-12-weeks' };
      const teams=client.sizes.map((size,i)=>({id:`team-${i+1}`,eligibleWeekIds:weeks.map(w=>w.id)}));
      let state=createCampaign({
        ...scope,version:'v2-proposal-1',weeks,teams,mode:client.mode,weights:DEFAULT_WEIGHTS,
        privacy:{minimumRespondents:5,neutralScore:'3'},maxJokers:2,jokerKm:70,reportDays:7,
        giftMilestones:giftThresholds.map((km,i)=>({id:`gift-${i+1}`,km,budgetCents:10000})),
        reception:{cutoffDate,baseBudgetCents:100000,tiers:receptionThresholds.map((km,i)=>({id:`reception-${i+1}`,km,budgetCents:[130000,170000][i]}))},
      });
      const histories=teams.map(()=>[]), rows=[];
      let individualAbsences=0,jokers=0;
      for(const [weekIndex,week] of weeks.entries()) {
        if(week.endExclusive>cutoffDate && !state.freeze) state=freezeReception(state,scope,addDays(cutoffDate,1));
        for(const [teamIndex,team] of teams.entries()) {
          const roster=Array.from({length:client.sizes[teamIndex]},(_,i)=>({id:`participant-${i}`,eligible:true,absent:teamIndex===0 && ((weekIndex===1 && i===0)||(weekIndex===5 && i===1))}));
          if(week.active) individualAbsences+=roster.filter(m=>m.absent).length;
          const score=['3','4','2','3','5','4','3','4','2','5','4','3'][weekIndex];
          const present=roster.filter(m=>!m.absent);
          const responses=weekIndex===7?[]:present.map(m=>({participantId:m.id,answers:[score,score,score]}));
          const isJoker=weekIndex===4&&teamIndex===0;
          if(week.active && !isJoker) histories[teamIndex].push({responded:responses.length,present:present.length});
          const decision=isJoker?{kind:'joker'}:{kind:'evaluate',input:{roster,responses,mode:client.mode,
            regularityScore:histories[teamIndex].length?rollingRegularity(histories[teamIndex],4):exact('3'),
            ...(client.mode==='kpi'?{kpis:[kpiScore(String((Number(score)-1)*25),'100','higher'),kpiScore(String((Number(score)-1)*50),'200','higher')]}:{}),
          }};
          if(isJoker) jokers++;
          const command={...scope,teamId:team.id,weekId:week.id,today:weekIndex===reportWeekIndex?addDays(week.endExclusive,7):week.endExclusive};
          if(week.active&&weekIndex===reportWeekIndex&&teamIndex===0){state=postponeWeek(state,{...command,today:addDays(week.start,2)});}
          state=closeWeek(state,command,decision);
          if(closeWeek(state,command,decision)!==state)throw new Error('Duplicate closure changed simulation');
        }
        onCheckpoint({client,weekIndex,state});
        rows.push({week:weekIndex+1,active:week.active,convoyKm:state.convoys[week.id].km,convoyKmDisplayed:displayKm(state.convoys[week.id].km),giftTasks:Object.keys(state.tasks).length});
      }
      const gifts=Object.values(state.entitlements);
      const totalMilestones=teams.length*giftThresholds.length;
      const maximumBudget=totalMilestones*10000+170000;
      return {
        client:client.name,mode:client.mode,fictional:true,teamSizes:client.sizes,
        activeWeeks:activeWeeks(weeks),giftThresholds,receptionThresholds,
        individualAbsences,jokers,teamKm:teams.map(t=>({teamId:t.id,exact:teamDistance(state,t.id),displayed:displayKm(teamDistance(state,t.id))})),
        convoyKm:convoyDistance(state),convoyKmDisplayed:displayKm(convoyDistance(state)),
        milestonesEarned:gifts.length,milestonesAvailable:totalMilestones,
        weeksUnder50Km:rows.filter(r=>r.active&&compare(r.convoyKm,exact('50'))<0).length,
        giftTasksCreated:Object.keys(state.tasks).length,giftBudgetAcquiredCents:gifts.reduce((s,g)=>s+g.budgetCents,0),
        reception:receptionLevel(state),maximumBudgetCents:maximumBudget,
        budgetDueCents:gifts.reduce((s,g)=>s+g.budgetCents,0)+receptionLevel(state).budgetCents,
        rows,
      };
    }),
  };
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) console.log(JSON.stringify(simulate(),null,2));
