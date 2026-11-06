import { unzipSync } from 'fflate';
import type { CustomQuestion, Deck, Person, Row } from './model';
import { readWorkbook } from './workbook';

const MB = 1024 * 1024;
function unpack(bytes: Uint8Array, limit: number) {
  let size = 0;
  return unzipSync(bytes, { filter: entry => {
    size += entry.originalSize;
    if (size > limit || entry.originalSize > limit) throw new Error('The ZIP expands beyond the allowed size.');
    if (entry.name.includes('..') || entry.name.startsWith('/') || entry.name.includes('\\')) throw new Error('The ZIP contains an unsafe path.');
    return !entry.name.endsWith('/');
  } });
}
function requireValue(row: Row, key: string, context: string) {
  if (!row[key]?.trim()) throw new Error(`${context}: missing ${key}.`);
  return row[key].trim();
}
function unique(rows: Row[], key: string, context: string) {
  const ids = new Set<string>();
  for (const row of rows) {
    const id = requireValue(row, key, context);
    if (ids.has(id)) throw new Error(`${context}: duplicate ${key} ${id}.`);
    ids.add(id);
  }
}
export async function importArchive(bytes: Uint8Array, filename: string): Promise<Deck> {
  if (bytes.length > 20 * MB) throw new Error('Choose a ZIP smaller than 20 MB.');
  const files = unpack(bytes, 50 * MB);
  const books = Object.keys(files).filter(p => /\.xlsx$/i.test(p) && !p.includes('__MACOSX') && !p.split('/').pop()?.startsWith('~$'));
  if (books.length !== 1) throw new Error('The ZIP must contain exactly one Excel (.xlsx) workbook.');
  const bookPath = books[0];
  const root = bookPath.slice(0, bookPath.lastIndexOf('/') + 1);
  const sheets = readWorkbook(unpack(files[bookPath], 30 * MB));
  if (!sheets.People || !sheets.Questions) throw new Error('The workbook needs People and Questions sheets with Record_Status columns.');
  unique(sheets.People, 'Person_ID', 'People');
  if (sheets.People.length !== 4) throw new Error('Version 0.1 requires exactly four Active fictional people.');
  const people: Person[] = sheets.People.map(row => {
    const id = row.Person_ID;
    if (!/FICTIONAL/i.test(row.Notes || '')) throw new Error(`${id}: this test version accepts fictional people only. Mark fictional records in Notes.`);
    const photoName = requireValue(row, 'Photo_Filename', id);
    if (!/^[^/\\]+\.jpe?g$/i.test(photoName)) throw new Error(`${id}: Photo_Filename must be a JPG filename.`);
    const photo = files[`${root}photos/${photoName}`];
    if (!photo || photo.length < 4 || photo[0] !== 255 || photo[1] !== 216 || photo[2] !== 255) throw new Error(`${id}: missing or invalid photos/${photoName}.`);
    if (photo.length > 5 * MB) throw new Error(`${id}: portrait must be smaller than 5 MB.`);
    return { id, name: requireValue(row, 'Full_Name', id), position: requireValue(row, 'Position_Title', id), organization: requireValue(row, 'Organization', id), city: row.City, county: row.County, category: row.Category, notes: row.Notes, photo: new Blob([new Uint8Array(photo)], { type: 'image/jpeg' }) };
  });
  if (new Set(people.map(p => p.position.toLowerCase())).size !== 4) throw new Error('Position quizzes need four distinct position titles.');
  if (new Set(people.map(p => p.name.toLowerCase())).size !== 4) throw new Error('Name quizzes need four distinct display names.');
  unique(sheets.Questions, 'Question_ID', 'Questions');
  const questions: CustomQuestion[] = sheets.Questions.map(row => {
    const id = row.Question_ID;
    const raw = ['Correct_Answer', 'Distractor_1', 'Distractor_2', 'Distractor_3'].map(key => requireValue(row, key, id));
    const choices = raw.map(answer => {
      if (row.Answer_Type !== 'Person') return answer;
      const person = people.find(p => p.id === answer);
      if (!person) throw new Error(`${id}: unknown or inactive Person_ID ${answer}.`);
      return person.name;
    });
    if (new Set(choices.map(c => c.toLowerCase())).size !== 4) throw new Error(`${id}: provide four distinct answers.`);
    return { id, prompt: requireValue(row, 'Question', id), correct: choices[0], choices, explanation: row.Explanation, category: row.Category };
  });
  return { id: crypto.randomUUID(), filename, importedAt: new Date().toISOString(), people, questions, sheets, workbook: new Blob([new Uint8Array(files[bookPath])]), archive: new Blob([new Uint8Array(bytes)], { type: 'application/zip' }) };
}
