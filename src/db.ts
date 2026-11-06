import { openDB } from 'idb';
import type { Deck, Progress } from './model';
import { emptyProgress } from './model';
const database = () => openDB('district-study-deck-v1', 1, { upgrade(db) { db.createObjectStore('local'); } });
export async function loadLocal(): Promise<{ deck?: Deck; progress: Progress }> {
  const db = await database();
  const tx = db.transaction('local', 'readonly');
  const [deck, progress] = await Promise.all([tx.store.get('deck'), tx.store.get('progress')]);
  await tx.done; db.close();
  return { deck, progress: progress || emptyProgress() };
}
export async function replaceDeck(deck: Deck) {
  const db = await database();
  const tx = db.transaction('local', 'readwrite');
  await Promise.all([tx.store.put(deck, 'deck'), tx.store.put(emptyProgress(), 'progress')]);
  await tx.done; db.close();
}
export async function saveProgress(progress: Progress) {
  const db = await database();
  await db.put('local', progress, 'progress'); db.close();
}
export async function deleteLocal() {
  const db = await database(); await db.clear('local'); db.close();
}
