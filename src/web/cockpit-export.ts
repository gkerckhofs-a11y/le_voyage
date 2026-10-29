/** Explicit minimal projection: never serialize a full operations row. */
export type AgendaExportRow = Readonly<{
  campaignId:string; id:string; client:string; team:string; title:string;
  earnedOn:string; dueDate:string; status:string;
}>;
export const giftStatusLabels:Record<string,string> = {
  'to-select':'À sélectionner','to-order':'À commander','to-receive':'À réceptionner',
  'to-compose':'À composer',ready:'Prêt','to-deliver':'À expédier / remettre',
  delivered:'Remis',incident:'Incident'
};
function cell(value:string):string {
  // Quotes alone do not stop spreadsheet formulas. Also protect leading control
  // characters and whitespace before a formula introducer.
  const safe = /^[\s\u0000-\u001f]*[=+\-@]|^[\t\r\n]/u.test(value) ? "'"+value : value;
  return '"'+safe.replaceAll('"','""')+'"';
}
export function agendaCsv(rows:readonly AgendaExportRow[],generatedAt:string):string {
  const header=['Extrait le (UTC)','Campagne','Identifiant cadeau','Client','Équipe','Cadeau acquis','Acquis le','Échéance','Statut'];
  const records=rows.map(r=>[generatedAt,r.campaignId,r.id,r.client,r.team,r.title,r.earnedOn,r.dueDate,giftStatusLabels[r.status]??r.status]);
  // UTF-8 BOM and semicolons support accented French text in common spreadsheets.
  return '\ufeff'+[header,...records].map(row=>row.map(cell).join(';')).join('\r\n')+'\r\n';
}
