import {exact, bounded, compare, sum} from '../domain/exact.ts';

export type AnnualQuestionnaire = {
  mode: 'autonomous' | 'kpi';
  values: readonly {label: string; question: string}[];
  weights: readonly string[];
  minimumRespondents: number;
  kpis?: readonly {definition: string; source: string; frequency: string; target: string; unit: string; direction: 'higher' | 'lower'}[];
};
const record = (value: unknown, keys: readonly string[]): void => {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !keys.includes(key))) throw new Error('Invalid questionnaire fields');
};
const text = (value: unknown, limit: number): void => {
  if (typeof value !== 'string' || !value.trim() || value.length > limit) throw new Error('Questionnaire text required');
};
/** Future campaign draft only. Never supplies live questions or changes scoring. */
export function previewAnnualQuestionnaire(input: AnnualQuestionnaire | undefined): AnnualQuestionnaire | null {
  if (input === undefined) return null;
  record(input, ['mode', 'values', 'weights', 'minimumRespondents', 'kpis']);
  if (!['autonomous', 'kpi'].includes(input.mode)) throw new Error('Explicit questionnaire mode required');
  if (!Array.isArray(input.values) || input.values.length !== 3) throw new Error('Exactly three human values required');
  for (const value of input.values) {
    record(value, ['label', 'question']); text(value.label, 100); text(value.question, 500);
  }
  if (!Array.isArray(input.weights) || input.weights.length !== 5 || compare(sum(input.weights.map(w => bounded(exact(w), '0', '100'))), exact('100')) !== 0) throw new Error('Five weights must total exactly 100 percent');
  // Same lower bound as the existing human-score engine; no commercial default.
  if (!Number.isSafeInteger(input.minimumRespondents) || input.minimumRespondents < 2) throw new Error('Confidentiality threshold must be at least two');
  if (input.mode === 'autonomous') {
    if (input.kpis !== undefined) throw new Error('Autonomous mode cannot retain KPI settings');
  } else {
    if (!Array.isArray(input.kpis) || input.kpis.length !== 2) throw new Error('Exactly two KPI definitions required');
    for (const kpi of input.kpis) {
      record(kpi, ['definition', 'source', 'frequency', 'target', 'unit', 'direction']);
      text(kpi.definition, 500); text(kpi.source, 500); text(kpi.frequency, 100); text(kpi.unit, 100);
      if (compare(exact(kpi.target), exact('0')) === 0) throw new Error('KPI target must not be zero');
      if (!['higher', 'lower'].includes(kpi.direction)) throw new Error('Explicit KPI direction required');
    }
  }
  return structuredClone(input);
}
