import type {AnnualAttentionsPreview} from './annual-attentions.ts';
import type {previewAnnualFunding} from './annual-funding.ts';

export type AnnualOrganisation = {
  companyName: string;
  teams: readonly {name: string; headcount: number}[];
  receptionGuests: number;
};
const record = (value: unknown, keys: readonly string[]) => {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !keys.includes(key))) throw new Error('Invalid organisation fields');
};
const text = (value: unknown) => {
  if (typeof value !== 'string' || !value.trim() || value.length > 160) throw new Error('Organisation name required');
};
const safe = (value: bigint) => {
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('Organisation total exceeds exact range');
  return Number(value);
};
/** Planned counts only, not a roster or membership change. */
export function previewAnnualOrganisation(input: AnnualOrganisation | undefined) {
  if (input === undefined) return null;
  record(input, ['companyName', 'teams', 'receptionGuests']); text(input.companyName);
  // Technical payload limit for this prototype, not a commercial team limit.
  if (!Array.isArray(input.teams) || input.teams.length < 1 || input.teams.length > 100) throw new Error('One to 100 planned teams required');
  const names = new Set<string>(); let people = 0n;
  for (const team of input.teams) {
    record(team, ['name', 'headcount']); text(team.name);
    const name = team.name.trim().normalize('NFKC').toLocaleLowerCase('fr');
    if (names.has(name)) throw new Error('Distinct planned team names required');
    names.add(name);
    if (!Number.isSafeInteger(team.headcount) || team.headcount < 1) throw new Error('Positive exact team headcount required');
    people += BigInt(team.headcount);
  }
  if (!Number.isSafeInteger(input.receptionGuests) || input.receptionGuests < 0) throw new Error('Exact reception guest count required');
  return {...structuredClone(input), teamCount: input.teams.length, totalHeadcount: safe(people)};
}
/** Sum only the configured progression-gift and reception envelopes, never an all-in quote. */
export function previewEnterpriseFunding(
  organisation: ReturnType<typeof previewAnnualOrganisation>,
  funding: ReturnType<typeof previewAnnualFunding>,
  attentions: AnnualAttentionsPreview = null,
) {
  if (!organisation || !funding) return null;
  if(attentions&&(attentions.basis!==funding.basis||attentions.totalCents===null))throw new Error('Complete matching attention budgets required');
  const giftLines = funding.giftAllocations.map((allocation, index) => {
    const quantity = allocation.unit === 'team' ? organisation.teamCount : organisation.totalHeadcount;
    return {stage:index + 1,...allocation,quantity,totalCents:safe(BigInt(allocation.amountCents) * BigInt(quantity))};
  });
  const gifts = giftLines.reduce((total,line) => total + BigInt(line.totalCents),0n);
  return {currency: funding.currency, basis: funding.basis, teamCount: organisation.teamCount,
    giftLines,giftMaximumPerTeamCents: funding.giftMaximumPerTeamCents, giftMaximumCents: safe(gifts),
    receptionMaximumCents: funding.receptionMaximumCents,
    datedMaximumCents:attentions?.datedMaximumCents??0,surpriseMaximumCents:attentions?.surpriseMaximumCents??0,
    configuredMaximumCents: safe(gifts + BigInt(funding.receptionMaximumCents) + BigInt(attentions?.totalCents??0))};
}
