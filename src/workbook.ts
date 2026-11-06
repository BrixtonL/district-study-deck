import type { Row } from './model';
const elements = (node: Document | Element, name: string) => Array.from(node.getElementsByTagNameNS('*', name));
function xml(bytes: Uint8Array | undefined, name: string): Document {
  if (!bytes) throw new Error(`The workbook is missing ${name}.`);
  const text = new TextDecoder().decode(bytes);
  if (/<!DOCTYPE|<!ENTITY/i.test(text)) throw new Error('Workbook XML declarations are not supported.');
  const document = new DOMParser().parseFromString(text, 'application/xml');
  if (elements(document, 'parsererror').length) throw new Error(`Invalid workbook XML: ${name}.`);
  return document;
}
const textRuns = (node: Element) => elements(node, 't').map(t => t.textContent || '').join('');
function column(reference: string) {
  const letters = reference.match(/^([A-Z]+)[1-9][0-9]*$/)?.[1];
  if (!letters) throw new Error('A workbook cell has an invalid reference.');
  const index = [...letters].reduce((sum, letter) => sum * 26 + letter.charCodeAt(0) - 64, 0);
  if (index > 16384) throw new Error('A workbook cell is outside the Excel column limit.');
  return index;
}
/** Reads values for the supplied tabular XLSX format. Resolves namespaces,
 * relationship targets, sparse cells, inline/shared rich strings and cached
 * formula values. Formulas and links are never evaluated or fetched. */
export function readWorkbook(files: Record<string, Uint8Array>): Record<string, Row[]> {
  const book = xml(files['xl/workbook.xml'], 'xl/workbook.xml');
  const rels = xml(files['xl/_rels/workbook.xml.rels'], 'workbook relationships');
  const relationships = new Map(elements(rels, 'Relationship').filter(r => r.getAttribute('TargetMode') !== 'External').map(r => [r.getAttribute('Id'), r.getAttribute('Target')]));
  const shared = files['xl/sharedStrings.xml'] ? elements(xml(files['xl/sharedStrings.xml'], 'shared strings'), 'si').map(textRuns) : [];
  const sheets: Record<string, Row[]> = {};
  for (const sheet of elements(book, 'sheet')) {
    const name = sheet.getAttribute('name') || '';
    if (!['People', 'Questions', 'Geography', 'Organizations'].includes(name)) continue;
    if (sheets[name]) throw new Error(`Duplicate worksheet: ${name}.`);
    const relationship = sheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
    const target = relationships.get(relationship);
    if (!target) throw new Error(`Missing worksheet relationship: ${name}.`);
    const location = new URL(target, 'https://workbook.invalid/xl/workbook.xml');
    if (location.origin !== 'https://workbook.invalid') throw new Error('External worksheets are not supported.');
    const document = xml(files[decodeURIComponent(location.pathname.slice(1))], name);
    const headers = new Map<number, string>();
    const rows: Row[] = [];
    for (const row of elements(document, 'row')) {
      const values = new Map<number, string>();
      for (const cell of elements(row, 'c')) {
        const index = column(cell.getAttribute('r') || '');
        const type = cell.getAttribute('t');
        let value = elements(cell, 'v')[0]?.textContent || '';
        if (type === 's') {
          const reference = Number(value);
          if (!Number.isInteger(reference) || reference < 0 || reference >= shared.length) throw new Error(`Invalid shared string in ${name}.`);
          value = shared[reference];
        } else if (type === 'inlineStr') value = textRuns(cell);
        else if (type === 'e' && value) throw new Error(`${name}: a cell contains the Excel error ${value}.`);
        values.set(index, value.trim());
      }
      if (row.getAttribute('r') === '1') {
        const seen = new Set<string>();
        for (const [col, value] of values) {
          if (!value) continue;
          if (seen.has(value)) throw new Error(`${name}: duplicate column header ${value}.`);
          headers.set(col, value); seen.add(value);
        }
        if (!seen.has('Record_Status')) throw new Error(`${name}: missing Record_Status column.`);
      } else {
        const record: Row = {};
        for (const [col, header] of headers) record[header] = values.get(col) || '';
        if (record.Record_Status === 'Active') rows.push(record);
      }
    }
    if (!headers.size) throw new Error(`${name}: missing header row.`);
    sheets[name] = rows;
  }
  return sheets;
}
