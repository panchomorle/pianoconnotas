import type { SavedScore } from '../types';

const DB_NAME = 'PianoConNotasDB';
const DB_VERSION = 1;
const STORE_SCORES = 'scores';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_SCORES)) {
        const store = db.createObjectStore(STORE_SCORES, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveScore(score: SavedScore): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SCORES, 'readwrite');
    const store = tx.objectStore(STORE_SCORES);
    const req = store.put(score);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getScore(id: string): Promise<SavedScore | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SCORES, 'readonly');
    const store = tx.objectStore(STORE_SCORES);
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteScore(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SCORES, 'readwrite');
    const store = tx.objectStore(STORE_SCORES);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getAllScoresOrderedByRecent(): Promise<SavedScore[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SCORES, 'readonly');
    const store = tx.objectStore(STORE_SCORES);
    const req = store.getAll();

    req.onsuccess = () => {
      const items: SavedScore[] = req.result || [];
      items.sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
      resolve(items);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getRecentScoresPaged(
  offset: number,
  limit: number
): Promise<{ scores: SavedScore[]; total: number; hasMore: boolean }> {
  const allScores = await getAllScoresOrderedByRecent();
  const total = allScores.length;
  const paged = allScores.slice(offset, offset + limit);
  const hasMore = offset + limit < total;

  return {
    scores: paged,
    total,
    hasMore,
  };
}

export async function getMostRecentScore(): Promise<SavedScore | null> {
  const scores = await getAllScoresOrderedByRecent();
  return scores.length > 0 ? scores[0] : null;
}
