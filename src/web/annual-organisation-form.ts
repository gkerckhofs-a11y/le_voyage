import type {AnnualOrganisation} from '../application/annual-organisation.ts';
import type {AnnualPlanPreview} from '../application/annual-plan.ts';
import {euroLabel} from './euro.ts';
const el = (id: string) => document.getElementById(id)!;
const field = (id: string) => el(id) as HTMLInputElement;
let rowId = 0;
function changed() {el('organisation-fields').dispatchEvent(new Event('input', {bubbles: true}));}
function addTeam(team?: AnnualOrganisation['teams'][number]) {
  const container = el('planned-team-fields'); if (container.children.length >= 100) return;
  const row = document.createElement('div'); row.className = 'annual-team-row'; row.dataset.team = '';
  for (const [key, title] of [['name', 'Nom provisoire de l’équipe'], ['headcount', 'Effectif prévu']] as const) {
    const label = document.createElement('label'), input = document.createElement('input');
    label.textContent = title; input.id = `planned-team-${rowId}-${key}`; input.dataset.field = key; input.required = true;
    if (key === 'name') {input.maxLength = 160; input.value = team?.name ?? '';}
    else {input.type = 'number'; input.min = '1'; input.step = '1'; input.max = String(Number.MAX_SAFE_INTEGER); input.value = team ? String(team.headcount) : '';}
    label.append(input); row.append(label);
  }
  const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = 'Retirer cette équipe';
  remove.addEventListener('click', () => {row.remove();updateButtons();changed();el('add-planned-team').focus();}); row.append(remove);
  rowId++; container.append(row); updateButtons();
}
function updateButtons() {
  const rows = el('planned-team-fields').children;
  (el('add-planned-team') as HTMLButtonElement).disabled = rows.length >= 100;
  for (const row of rows) (row.querySelector('button') as HTMLButtonElement).disabled = rows.length <= 1;
  el('planned-team-count').textContent = `${rows.length} équipe${rows.length > 1 ? 's' : ''} prévue${rows.length > 1 ? 's' : ''}.`;
}
function toggle() {
  const enabled = field('organisation-enabled').checked;
  (el('organisation-fields') as HTMLFieldSetElement).disabled = !enabled; el('organisation-fields').hidden = !enabled;
}
export function initializeOrganisation() {
  addTeam(); toggle();
  el('organisation-enabled').addEventListener('input', toggle);
  el('add-planned-team').addEventListener('click', () => {addTeam();changed();(el('planned-team-fields').lastElementChild?.querySelector('input') as HTMLInputElement)?.focus();});
}
export function readOrganisation(): AnnualOrganisation | undefined {
  if (!field('organisation-enabled').checked) return undefined;
  return {companyName: field('companyName').value.trim(), receptionGuests: Number(field('receptionGuests').value),
    teams: [...el('planned-team-fields').children].map(row => ({name: (row.querySelector('[data-field="name"]') as HTMLInputElement).value.trim(), headcount: Number((row.querySelector('[data-field="headcount"]') as HTMLInputElement).value)}))};
}
export function restoreOrganisation(saved?: AnnualOrganisation) {
  field('organisation-enabled').checked = !!saved; field('companyName').value = saved?.companyName ?? ''; field('receptionGuests').value = saved ? String(saved.receptionGuests) : '';
  el('planned-team-fields').replaceChildren(); for (const team of saved?.teams ?? [undefined]) addTeam(team); toggle();
}
export function renderOrganisation(plan: AnnualPlanPreview) {
  const box = el('annual-organisation-preview'); box.replaceChildren(); box.hidden = !plan.organisation; if (!plan.organisation) return;
  const o = plan.organisation, heading = document.createElement('h3'); heading.textContent = `Le Voyage de ${o.companyName}`; box.append(heading);
  const p = document.createElement('p'); p.textContent = `${o.teamCount} équipe${o.teamCount > 1 ? 's' : ''} · ${o.totalHeadcount} personnes prévues · ${o.receptionGuests} participants prévisionnels à la réception.`; box.append(p);
  const list = document.createElement('ul'); for (const team of o.teams) {const li = document.createElement('li'); li.textContent = `${team.name} : ${team.headcount} personne${team.headcount > 1 ? 's' : ''}.`; list.append(li);} box.append(list);
  const f = plan.enterpriseFunding, budget = document.createElement('p'); budget.className = 'annual-budget-total';
  budget.textContent = f ? `Maximum des enveloppes configurées : ${euroLabel(f.configuredMaximumCents)} ${f.basis}.` : 'Maximum des enveloppes non calculé : ajoutez les budgets au brouillon.'; box.append(budget);
  if (f) {const calculation = document.createElement('p'); calculation.textContent = `${euroLabel(f.giftMaximumPerTeamCents)} par équipe × ${f.teamCount} = ${euroLabel(f.giftMaximumCents)} pour les cadeaux ; + ${euroLabel(f.receptionMaximumCents)} pour la formule maximale de réception. Les niveaux de réception ne se cumulent pas ; son montant total n’est pas multiplié par le nombre de participants.`; box.append(calculation);}
  const note = document.createElement('p'); note.textContent = 'Ce montant couvre uniquement les enveloppes cadeaux par équipe et réception saisies. Cadeaux individuels, cadeaux datés, surprises et autres frais non renseignés ne sont pas chiffrés. Leur inclusion doit être précisée lors de la revue annuelle ; ce calcul ne constitue pas un devis global.'; box.append(note);
}
