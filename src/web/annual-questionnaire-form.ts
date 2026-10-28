import type {AnnualQuestionnaire} from '../application/annual-questionnaire.ts';
const el = (id: string) => document.getElementById(id)!;
const field = (id: string) => el(id) as HTMLInputElement;
const decimal = (value: string) => value.trim().replace(',', '.');
function addField(parent: HTMLElement, id: string, labelText: string, limit: number, decimalInput = false) {
  const label = document.createElement('label'), input = limit > 100 ? document.createElement('textarea') : document.createElement('input');
  if (input instanceof HTMLTextAreaElement) input.rows = 3;
  label.textContent = labelText; input.id = id; input.required = true; input.maxLength = limit;
  if (decimalInput) input.inputMode = 'decimal';
  label.append(input); parent.append(label);
}
function toggle() {
  const enabled = field('questionnaire-enabled').checked, kpi = field('questionnaire-mode').value === 'kpi';
  (el('questionnaire-fields') as HTMLFieldSetElement).disabled = !enabled; el('questionnaire-fields').hidden = !enabled;
  (el('kpi-fields') as HTMLFieldSetElement).disabled = !kpi; el('kpi-fields').hidden = !kpi;
  el('weight-label-0').textContent = kpi ? 'Objectif professionnel 1 (%)' : 'Participation (%)';
  el('weight-label-1').textContent = kpi ? 'Objectif professionnel 2 (%)' : 'Régularité (%)';
}
export function initializeQuestionnaire() {
  const values = el('human-value-fields');
  for (let i = 0; i < 3; i++) {
    addField(values, `value-${i}`, `Valeur humaine ${i + 1}`, 100);
    addField(values, `question-${i}`, `Question hebdomadaire ${i + 1}`, 500);
  }
  for (let i = 0; i < 5; i++) {
    addField(el('weight-fields'), `weight-${i}`, `Valeur humaine ${i - 1} (%)`, 30, true);
    const label = field(`weight-${i}`).parentElement!;
    const span = document.createElement('span'); span.id = `weight-label-${i}`; span.textContent = label.firstChild!.textContent;
    label.replaceChild(span, label.firstChild!);
  }
  for (let i = 0; i < 2; i++) {
    const group = document.createElement('div'); group.className = 'annual-grid';
    const heading = document.createElement('h3'); heading.textContent = `Objectif professionnel ${i + 1}`; el('kpi-fields').append(heading, group);
    for (const [key, label, limit] of [['definition', 'Définition', 500], ['source', 'Source de mesure', 500], ['frequency', 'Fréquence de mesure', 100], ['target', 'Cible non nulle', 30], ['unit', 'Unité', 100]] as const) addField(group, `kpi-${i}-${key}`, label, limit, key === 'target');
    field(`kpi-${i}-frequency`).value = 'Mensuelle';
    const label = document.createElement('label'), select = document.createElement('select'); label.textContent = 'Sens de l’objectif'; select.id = `kpi-${i}-direction`; select.required = true;
    for (const [value, text] of [['', 'Choisir…'], ['higher', 'Plus est mieux'], ['lower', 'Moins est mieux']]) {const option = document.createElement('option'); option.value = value; option.textContent = text; select.append(option);}
    label.append(select); group.append(label);
  }
  for (const id of ['questionnaire-enabled', 'questionnaire-mode']) el(id).addEventListener('input', toggle);
  toggle();
}
export function readQuestionnaire(): AnnualQuestionnaire | undefined {
  if (!field('questionnaire-enabled').checked) return undefined;
  const mode = field('questionnaire-mode').value as AnnualQuestionnaire['mode'];
  return {mode, minimumRespondents: Number(field('minimumRespondents').value), weights: Array.from({length: 5}, (_, i) => decimal(field(`weight-${i}`).value)), values: Array.from({length: 3}, (_, i) => ({label: field(`value-${i}`).value.trim(), question: field(`question-${i}`).value.trim()})), ...(mode === 'kpi' ? {kpis: Array.from({length: 2}, (_, i) => ({definition: field(`kpi-${i}-definition`).value.trim(), source: field(`kpi-${i}-source`).value.trim(), frequency: field(`kpi-${i}-frequency`).value.trim(), target: decimal(field(`kpi-${i}-target`).value), unit: field(`kpi-${i}-unit`).value.trim(), direction: field(`kpi-${i}-direction`).value as 'higher' | 'lower'}))} : {})};
}
export function restoreQuestionnaire(saved?: AnnualQuestionnaire) {
  field('questionnaire-enabled').checked = !!saved;
  field('questionnaire-mode').value = saved?.mode ?? '';
  field('minimumRespondents').value = saved ? String(saved.minimumRespondents) : '';
  for (let i = 0; i < 3; i++) {field(`value-${i}`).value = saved?.values[i].label ?? ''; field(`question-${i}`).value = saved?.values[i].question ?? '';}
  for (let i = 0; i < 5; i++) field(`weight-${i}`).value = saved?.weights[i] ?? '';
  for (let i = 0; i < 2; i++) for (const key of ['definition', 'source', 'frequency', 'target', 'unit', 'direction'] as const) field(`kpi-${i}-${key}`).value = saved?.kpis?.[i][key] ?? (key === 'frequency' ? 'Mensuelle' : '');
  toggle();
}
export function renderQuestionnaire(saved: AnnualQuestionnaire | null) {
  const box = el('annual-questionnaire-preview'); box.replaceChildren(); box.hidden = !saved; if (!saved) return;
  const heading = document.createElement('h3'); heading.textContent = `Questionnaire proposé · ${saved.mode === 'kpi' ? 'deux objectifs professionnels' : 'mode autonome'}`; box.append(heading);
  const p = document.createElement('p'); p.textContent = `Pondérations : ${saved.weights.join(' / ')} % (total 100 %). Seuil de confidentialité : ${saved.minimumRespondents} répondants. Réponses hebdomadaires sur l’échelle existante de 1 à 5.`; box.append(p);
  const list = document.createElement('ol'); for (const value of saved.values) {const li = document.createElement('li'); li.textContent = `${value.label} — ${value.question}`; list.append(li);} box.append(list);
  for (const kpi of saved.kpis ?? []) {const p = document.createElement('p'); p.textContent = `${kpi.definition} · source : ${kpi.source} · ${kpi.frequency} · cible : ${kpi.target} ${kpi.unit} · ${kpi.direction === 'lower' ? 'moins est mieux' : 'plus est mieux'}.`; box.append(p);}
}
