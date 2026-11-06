import { describe, expect, it, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { zipSync, unzipSync, strToU8 } from 'fflate';
import { DOMParser } from '@xmldom/xmldom';
import { importArchive } from '../src/importer';
import { answerQuestion, advance, makeSession, shuffle } from '../src/quiz';
import { deleteLocal, loadLocal, replaceDeck, saveProgress } from '../src/db';
import { emptyProgress, modes } from '../src/model';
import { readWorkbook } from '../src/workbook';
const packDir = process.env.STUDY_PACK_DIR || path.resolve('..');
Object.assign(globalThis, { DOMParser });
const hasFixture = existsSync(path.join(packDir, 'District_Study_Deck.xlsx'));
export async function fixture() {
  const entries: Record<string, Uint8Array> = { 'District_Study_Deck.xlsx': new Uint8Array(await readFile(path.join(packDir, 'District_Study_Deck.xlsx'))) };
  for (const filename of await readdir(path.join(packDir, 'photos'))) if (/\.jpg$/i.test(filename)) entries[`photos/${filename}`] = new Uint8Array(await readFile(path.join(packDir, 'photos', filename)));
  return zipSync(entries);
}
describe('pure behavior', () => {
  it('shuffles without mutation, duplication, or loss', () => {
    const source = [1, 2, 3, 4];
    const orders = new Set(Array.from({ length: 50 }, () => { const result = shuffle(source); expect([...result].sort()).toEqual(source); return result.join(''); }));
    expect(source).toEqual([1, 2, 3, 4]); expect(orders.size).toBeGreaterThan(1);
  });
  it('rejects missing workbooks and invalid ZIPs with no storage writes', async () => {
    await expect(importArchive(zipSync({ 'notes.txt': strToU8('test') }), 'bad.zip')).rejects.toThrow('exactly one');
    await expect(importArchive(strToU8('not a zip'), 'bad.zip')).rejects.toThrow();
  });
  it('rejects oversized input before decompressing', async () => {
    await expect(importArchive(new Uint8Array(20 * 1024 * 1024 + 1), 'large.zip')).rejects.toThrow('smaller than 20 MB');
  });
  it('round trips and deletes empty progress in IndexedDB', async () => {
    await deleteLocal(); await saveProgress(emptyProgress());
    expect((await loadLocal()).progress).toEqual(emptyProgress());
    await deleteLocal(); expect((await loadLocal()).deck).toBeUndefined();
  });
  it('reads shared rich strings, sparse cells, relationship paths, and cached formulas', () => {
    const files = {
      'xl/workbook.xml': strToU8('<workbook xmlns="urn:sheet" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Questions" r:id="r1"/></sheets></workbook>'),
      'xl/_rels/workbook.xml.rels': strToU8('<Relationships xmlns="urn:rels"><Relationship Id="r1" Target="/xl/worksheets/a.xml"/></Relationships>'),
      'xl/sharedStrings.xml': strToU8('<sst xmlns="urn:sheet"><si><r><t>Act</t></r><r><t>ive</t></r></si></sst>'),
      'xl/worksheets/a.xml': strToU8('<worksheet xmlns="urn:sheet"><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Record_Status</t></is></c><c r="C1" t="inlineStr"><is><t>Value</t></is></c></row><row r="2"><c r="A2" t="s"><v>0</v></c><c r="C2"><f>6*7</f><v>42</v></c></row><row r="3"><c r="A3" t="inlineStr"><is><t>Draft</t></is></c></row></sheetData></worksheet>'),
    };
    expect(readWorkbook(files)).toEqual({ Questions: [{ Record_Status: 'Active', Value: '42' }] });
  });
  it('rejects DTD/entity XML declarations and external sheet targets', () => {
    const files = { 'xl/workbook.xml': strToU8('<!DOCTYPE workbook><workbook/>') };
    expect(() => readWorkbook(files)).toThrow('XML declarations');
    expect(() => readWorkbook({
      'xl/workbook.xml': strToU8('<workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="People" r:id="r1"/></sheets></workbook>'),
      'xl/_rels/workbook.xml.rels': strToU8('<Relationships><Relationship Id="r1" Target="https://example.invalid/sheet.xml"/></Relationships>'),
    })).toThrow('External worksheets');
  });
});
describe.skipIf(!hasFixture)('provided private fictional pack', () => {
  beforeEach(async () => { await deleteLocal(); });
  it('imports exactly four people, JPG blobs, all 16 questions, and supporting records', async () => {
    const deck = await importArchive(await fixture(), 'private.zip');
    expect(deck.people).toHaveLength(4); expect(deck.questions).toHaveLength(16);
    expect(deck.people.every(p => p.photo.type === 'image/jpeg' && p.photo.size > 1000)).toBe(true);
    expect(deck.sheets.Geography).toHaveLength(8); expect(deck.sheets.Organizations).toHaveLength(4);
    expect(deck.workbook.size).toBeGreaterThan(1000);
    expect(deck.questions[0].choices).toEqual(expect.arrayContaining(deck.people.map(p => p.name)));
  });
  it('creates four randomized distinct options with one correct answer in all four modes', async () => {
    const deck = await importArchive(await fixture(), 'private.zip');
    for (const mode of modes) {
      const orders = new Set<string>();
      for (let i = 0; i < 20; i++) {
        const session = makeSession(deck, mode.id);
        expect(session.questions.length).toBe(mode.id === 'custom' ? 16 : 4);
        for (const q of session.questions) {
          expect(new Set(q.choices.map(c => c.id)).size).toBe(4);
          expect(q.choices.filter(c => c.id === q.correct)).toHaveLength(1);
        }
        orders.add(session.questions[0].choices.map(c => c.id).join(','));
      }
      expect(orders.size).toBeGreaterThan(1);
    }
  });
  it('saves a wrong answer once, resumes the same choices, completes a quiz, and resets on reimport', async () => {
    const deck = await importArchive(await fixture(), 'private.zip'); await replaceDeck(deck);
    let progress = { ...emptyProgress(), session: makeSession(deck, 'photo-name') };
    expect(advance(progress)).toEqual(progress);
    const wrong = progress.session.questions[0].choices.find(c => c.id !== progress.session.questions[0].correct)!.id;
    progress = answerQuestion(progress, wrong) as typeof progress;
    expect(answerQuestion(progress, wrong).attempts).toHaveLength(1);
    expect(progress.attempts[0].correct).toBe(false);
    await saveProgress(progress);
    const restored = await loadLocal(); expect(restored.progress).toEqual(progress);
    expect(restored.deck!.people[0].photo.size).toBe(deck.people[0].photo.size);
    expect(new Uint8Array(await restored.deck!.people[0].photo.arrayBuffer())).toEqual(new Uint8Array(await deck.people[0].photo.arrayBuffer()));
    for (let i = 0; i < 4; i++) {
      if (i) progress = answerQuestion(progress, progress.session.questions[i].correct) as typeof progress;
      progress = advance(progress) as typeof progress;
    }
    expect(progress.session.finished).toBe(true); expect(progress.attempts).toHaveLength(4);
    await saveProgress(progress); await replaceDeck(deck);
    expect((await loadLocal()).progress).toEqual(emptyProgress());
  });
  it('rejects missing photos without replacing a previously imported deck', async () => {
    const bytes = await fixture(); const deck = await importArchive(bytes, 'valid.zip'); await replaceDeck(deck);
    const files = unzipSync(bytes); delete files[Object.keys(files).find(p => p.startsWith('photos/'))!];
    await expect(importArchive(zipSync(files), 'missing.zip')).rejects.toThrow('missing or invalid');
    expect((await loadLocal()).deck!.id).toBe(deck.id);
  });
  it('accepts a wrapping ZIP folder and rejects traversal paths', async () => {
    const files = unzipSync(await fixture());
    const wrapped = Object.fromEntries(Object.entries(files).map(([name, data]) => [`pack/${name}`, data]));
    expect((await importArchive(zipSync(wrapped), 'wrapped.zip')).people).toHaveLength(4);
    await expect(importArchive(zipSync({ '../outside.txt': strToU8('test') }), 'unsafe.zip')).rejects.toThrow('unsafe path');
  });
  it('excludes inactive questions and rejects duplicate or unknown person IDs', async () => {
    const files = unzipSync(await fixture());
    const change = (entry: string, mutate: (value: string) => string) => {
      const book = unzipSync(files['District_Study_Deck.xlsx']);
      book[entry] = strToU8(mutate(new TextDecoder().decode(book[entry])));
      return zipSync({ ...files, 'District_Study_Deck.xlsx': zipSync(book) });
    };
    const inactive = change('xl/worksheets/sheet3.xml', text => text.replace('>Active<', '>Draft<'));
    expect((await importArchive(inactive, 'inactive.zip')).questions).toHaveLength(15);
    const duplicate = change('xl/worksheets/sheet2.xml', text => text.replace('>P002<', '>P001<'));
    await expect(importArchive(duplicate, 'duplicate.zip')).rejects.toThrow('duplicate Person_ID');
    const unknown = change('xl/worksheets/sheet3.xml', text => text.replace('>P001<', '>P999<'));
    await expect(importArchive(unknown, 'unknown.zip')).rejects.toThrow('unknown or inactive Person_ID');
    const repeatedAnswer = change('xl/worksheets/sheet3.xml', text => text.replace('>P002<', '>P001<'));
    await expect(importArchive(repeatedAnswer, 'repeated.zip')).rejects.toThrow('four distinct answers');
  });
});
