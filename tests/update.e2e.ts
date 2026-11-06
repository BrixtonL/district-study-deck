import { test, expect } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import { zipSync } from 'fflate';

test('an accepted service-worker update preserves the deck, photo bytes, progress, and saved quiz', async ({ page, context }) => {
  test.skip(!!process.env.LIVE_URL, 'The update fixture is local; never change production files to simulate a release.');
  const base = process.env.TEST_BASE_PATH || '/';
  const files = new Map<string, Buffer>();
  async function collect(directory: string) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) await collect(filename);
      else files.set(path.relative('dist', filename).split(path.sep).join('/'), await readFile(filename));
    }
  }
  await collect('dist');
  const swBefore = files.get('sw.js')!.toString();
  const swAfter = swBefore.replace(/(url:"index\.html",revision:")[^"]+("})/, '$1update-retention-fixture$2');
  expect(swAfter).not.toBe(swBefore);
  const htmlAfter = files.get('index.html')!.toString().replace('<title>District Study Deck</title>', '<title>District Study Deck · update verification</title>');
  let upgraded = false;
  const server = createServer((req, res) => {
    const pathname = new URL(req.url || '/', 'http://fixture.invalid').pathname;
    if (!pathname.startsWith(base)) { res.writeHead(404); res.end(); return; }
    const key = pathname.slice(base.length) || 'index.html';
    let body = files.get(key);
    if (upgraded && key === 'sw.js') body = Buffer.from(swAfter);
    if (upgraded && key === 'index.html') body = Buffer.from(htmlAfter);
    if (!body) { res.writeHead(404); res.end(); return; }
    const type = key.endsWith('.js') ? 'application/javascript' : key.endsWith('.css') ? 'text/css' : key.endsWith('.png') ? 'image/png' : key.endsWith('.webmanifest') ? 'application/manifest+json' : 'text/html';
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' }); res.end(body);
  });
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  try {
    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}${base}`;
    const pack = process.env.STUDY_PACK_DIR || path.resolve('..');
    const data: Record<string, Uint8Array> = { 'District_Study_Deck.xlsx': await readFile(path.join(pack, 'District_Study_Deck.xlsx')) };
    for (const f of await readdir(path.join(pack, 'photos'))) if (/\.jpg$/i.test(f)) data[`photos/${f}`] = await readFile(path.join(pack, 'photos', f));
    await page.goto(url);
    await expect(page.getByText('Ready for offline', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Study data', exact: true }).click();
    await page.getByLabel('Choose study pack ZIP').setInputFiles({ name: 'update-test.zip', mimeType: 'application/zip', buffer: Buffer.from(zipSync(data)) });
    await page.getByRole('button', { name: 'Import and save deck' }).click();
    await expect(page.getByText('Study pack imported.', { exact: false })).toBeVisible();
    await page.getByRole('button', { name: 'Practice', exact: true }).click();
    await page.getByRole('button', { name: /Photo to name/ }).click();
    await page.locator('.choice').first().click();
    await expect(page.locator('.feedback')).toBeVisible();
    const before = await snapshot();
    expect(before.people).toBe(4); expect(before.attempts).toBe(1);
    upgraded = true;
    await page.evaluate(async () => { await (await navigator.serviceWorker.ready).update(); });
    await expect(page.getByRole('button', { name: 'Update app', exact: true })).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: 'Update app', exact: true }).click();
    await expect(page).toHaveTitle('District Study Deck · update verification');
    expect(await snapshot()).toEqual(before);
    await page.getByRole('button', { name: 'Resume practice', exact: true }).click();
    await expect(page.locator('.feedback')).toBeVisible();
    await context.setOffline(true); await page.reload();
    await expect(page.getByText('Offline · ready')).toBeVisible();
    expect(await snapshot()).toEqual(before);
    await page.getByRole('button', { name: 'People directory', exact: true }).click();
    await expect(page.locator('.person-card')).toHaveCount(4);
    await expect.poll(() => page.locator('.person-card img').evaluateAll(imgs => imgs.every(img => (img as HTMLImageElement).naturalWidth > 0))).toBe(true);
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }

  async function snapshot() {
    return page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => { const request = indexedDB.open('district-study-deck-v1', 1); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
      const get = (key: string) => new Promise<any>((resolve, reject) => { const request = db.transaction('local').objectStore('local').get(key); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
      const deck = await get('deck'); const progress = await get('progress'); db.close();
      const photos = await Promise.all(deck.people.map(async (p: { photo: Blob }) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await p.photo.arrayBuffer()))).join(',')));
      return { deckId: deck.id, people: deck.people.length, photos, attempts: progress.attempts.length, progress };
    });
  }
});
