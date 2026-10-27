import test from 'node:test';
import assert from 'node:assert/strict';
import { add, compare, divide, exact, mean, displayKm, sum } from '../src/domain/exact.ts';
import { DEFAULT_WEIGHTS, humanScores, kpiScore, normalizeWeights, rateScore, rollingRegularity, scoreWeek, thresholds, weeklyKm } from '../src/domain/scoring.ts';
import { input } from './fixtures.mjs';
const privacy = { minimumRespondents: 5, neutralScore: '3' };

test('Explicit optional regularity policy uses a bounded window of eligible rates',()=>{
  assert.deepEqual(rollingRegularity([{responded:0,present:5},{responded:5,present:5},{responded:2,present:4}],2),exact('4'));
  assert.throws(()=>rollingRegularity([],4));
  assert.throws(()=>rollingRegularity([{responded:0,present:0}],4));
});

test('Reference scores 1/2/3/4/5 produce exact 40/55/70/85/100 km', () => {
  for (const [score, km] of [[1,40],[2,55],[3,70],[4,85],[5,100]]) {
    assert.deepEqual(weeklyKm(Array(5).fill(exact(String(score)))), exact(String(km)));
  }
});
test('Unequal team sizes do not weight convoy distance; thirds stay exact', () => {
  assert.deepEqual(mean(['85','70','70','55'].map(exact)), exact('70'));
  const third = divide(exact('1'), exact('3'));
  assert.deepEqual(sum([third,third,third]), exact('1'));
  assert.equal(displayKm(exact('70.5')), '71');
});
test('Decimal accumulation and JSON roundtrip never introduce floating point drift', () => {
  let total = exact('0'); for (let i=0;i<1000;i++) total=add(total,exact('0.1'));
  assert.deepEqual(total,exact('100'));
  assert.equal(compare(JSON.parse(JSON.stringify(total)),exact('100')),0);
  assert.deepEqual(exact('-0.25'),{numerator:'-1',denominator:'4'});
});
test('Five valid nonnegative weights normalize; invalid inputs rejected', () => {
  assert.deepEqual(sum(normalizeWeights(['2','2','1','1','1'])),exact('1'));
  for (const weights of [[],['0','0','0','0','0'],['-1','2','3','4','5'],['NaN','1','1','1','1']]) assert.throws(()=>normalizeWeights(weights));
  for (const value of ['NaN','Infinity','1e3','5.123456789']) assert.throws(()=>exact(value));
  assert.throws(()=>weeklyKm(Array(5).fill(exact('6'))));
  assert.throws(()=>weeklyKm(Array(4).fill(exact('3'))));
});
test('V2 exact annual thresholds and single midpoint milestone', () => {
  assert.deepEqual(thresholds(46,5,'gift'),[2390,2810,3220,3630,4050]);
  assert.deepEqual(thresholds(42,4,'reception'),[2440,2910,3390,3860]);
  assert.deepEqual(thresholds(46,1,'gift'),[3220]);
  assert.deepEqual(thresholds(42,1,'reception'),[3150]);
  assert.deepEqual(thresholds(0,0,'gift'),[]);
  assert.throws(()=>thresholds(0,1,'gift'));
  assert.throws(()=>thresholds(1,8,'gift'));
});
test('Annual acceptance table matches 2 / 3 / 4 / 4.5 scores', () => {
  for (const [score,gifts,level] of [['2',1,0],['3',3,2],['4',4,3],['4.5',5,4]]) {
    const km = weeklyKm(Array(5).fill(exact(score)));
    const giftTotal = sum(Array(46).fill(km)), receptionTotal = sum(Array(42).fill(km));
    assert.equal(thresholds(46,5,'gift').filter(n=>compare(giftTotal,exact(String(n)))>=0).length,gifts);
    assert.equal(thresholds(42,4,'reception').filter(n=>compare(receptionTotal,exact(String(n)))>=0).length,level);
  }
});
test('KPI higher-is-better clamps overachievement and rejects unconfigured inverse rules', () => {
  assert.deepEqual(kpiScore('50','100','higher'),exact('3'));
  assert.deepEqual(kpiScore('200','100','higher'),exact('5'));
  assert.throws(()=>kpiScore('1','0','higher'));
  assert.throws(()=>kpiScore('-1','100','higher'));
  assert.throws(()=>kpiScore('10','100','lower'));
});
test('Absent and ineligible people are excluded from participation; duplicates rejected', () => {
  const data=input({size:7,absent:[0,1]});
  const h=humanScores(data.roster,data.responses,privacy);
  assert.equal(h.present,5); assert.equal(h.responded,5);
  assert.deepEqual(rateScore(h.responded,h.present),exact('5'));
  assert.throws(()=>humanScores(data.roster,[...data.responses,data.responses[0]],privacy));
  assert.throws(()=>humanScores(data.roster,[{participantId:'p0',answers:['3','3','3']}],privacy));
  const roster=data.roster.map(m=>m.id==='p2'?{...m,eligible:false}:m);
  assert.throws(()=>humanScores(roster,data.responses,privacy));
});
test('TPE human answers cannot be inferred from speed: 1s and 5s yield same distance', () => {
  const low=input({size:2,score:'1'}), high=input({size:2,score:'5'});
  low.regularityScore=high.regularityScore=exact('3');
  assert.deepEqual(scoreWeek(low,privacy,DEFAULT_WEIGHTS),scoreWeek(high,privacy,DEFAULT_WEIGHTS));
  assert.equal(humanScores(low.roster,low.responses,privacy).suppressed,true);
});
test('No response uses floor; missing KPI or regularity and all-absent remain explicit blockers', () => {
  assert.deepEqual(scoreWeek(input({responded:0}),privacy,DEFAULT_WEIGHTS),{km:exact('40'),source:'floor'});
  assert.throws(()=>scoreWeek({...input(),regularityScore:undefined},privacy,DEFAULT_WEIGHTS));
  assert.throws(()=>scoreWeek({...input({mode:'kpi'}),kpis:undefined},privacy,DEFAULT_WEIGHTS));
  assert.throws(()=>scoreWeek(input({size:2,absent:[0,1]}),privacy,DEFAULT_WEIGHTS));
});
