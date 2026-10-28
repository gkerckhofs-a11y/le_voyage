import ExcelJS from 'exceljs';
export const xlsxHeaders=['sku','nom','fournisseur','categorie','description','prix_achat_htva','tva_taux','statut','delai_approvisionnement_jours','saisonnalite','sans_alcool','stock_quantite'];
export async function masterXlsx(edit=()=>{}){const book=new ExcelJS.Workbook(),sheet=book.addWorksheet('Catalogue');sheet.addRow(xlsxHeaders);sheet.addRow(['001-A','Infusion XLSX','Artisan','tea','Infusion fictive',13.25,6,'actif',5,'1|2|3','oui',12]);await edit(book,sheet);return Buffer.from(await book.xlsx.writeBuffer());}
