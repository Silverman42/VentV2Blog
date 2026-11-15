/**
 * Encrypted bookmark store (PRD FR-4).
 * - AES-GCM 256 key, generated non-extractable and kept in IndexedDB (`vent-keys`)
 * - ciphertext JSON `{ v, iv, ct }` in localStorage under `vent:bookmarks`
 * - fresh 12-byte IV per write, 200 item cap, cross-tab sync via the `storage` event
 * - falls back to session-only memory when Web Crypto / IndexedDB are unavailable
 */

export interface Bookmark {
  id: string;
  slug: string;
  title: string;
  category: string;
  coverImage: string;
  savedAt: string;
}

export type BookmarkInput = Omit<Bookmark, 'savedAt'>;

export const LS_KEY = 'vent:bookmarks';
export const MAX_BOOKMARKS = 200;
export const CHANGE_EVENT = 'bookmarks:change';

const NOTICE_SESSION_ONLY = 'Saved posts will only be kept for this session on this browser.';
const NOTICE_RESET = "We couldn't restore your saved posts on this device.";

const b64 = (buf: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

let list: Bookmark[] = [];
let notice: string | null = null;
let memOnly = false;
let key: CryptoKey | null = null;
let ready: Promise<void> | null = null;

function emit() {
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { list: [...list], notice } }));
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('vent-keys', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('keys');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getKey(): Promise<CryptoKey> {
  if (key) return key;
  const db = await openDb();
  let stored = await new Promise<CryptoKey | undefined>((resolve, reject) => {
    const q = db.transaction('keys').objectStore('keys').get('bookmarks');
    q.onsuccess = () => resolve(q.result as CryptoKey | undefined);
    q.onerror = () => reject(q.error);
  });
  if (!stored) {
    stored = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    await new Promise<void>((resolve, reject) => {
      const t = db.transaction('keys', 'readwrite');
      t.objectStore('keys').put(stored, 'bookmarks');
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error);
    });
  }
  key = stored;
  return key;
}

async function load() {
  const raw = localStorage.getItem(LS_KEY);
  try {
    const k = await getKey();
    if (!raw) {
      list = [];
    } else {
      const { iv, ct } = JSON.parse(raw);
      const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv) }, k, unb64(ct));
      list = JSON.parse(new TextDecoder().decode(pt));
    }
  } catch {
    if (!window.crypto?.subtle || !window.indexedDB) {
      memOnly = true;
      notice = NOTICE_SESSION_ONLY;
    } else if (raw) {
      localStorage.removeItem(LS_KEY);
      list = [];
      notice = NOTICE_RESET;
    }
  }
  emit();
}

async function persist(next: Bookmark[]) {
  if (memOnly) return;
  try {
    const k = await getKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, new TextEncoder().encode(JSON.stringify(next)));
    localStorage.setItem(LS_KEY, JSON.stringify({ v: 1, iv: b64(iv), ct: b64(ct) }));
  } catch {
    memOnly = true;
    notice = NOTICE_SESSION_ONLY;
    emit();
  }
}

/** Load once per page and start listening for changes made in other tabs. */
export function initBookmarks(): Promise<void> {
  if (!ready) {
    ready = load();
    window.addEventListener('storage', (e) => {
      if (e.key === LS_KEY || e.key === null) load();
    });
  }
  return ready;
}

export const getBookmarks = () => [...list];
export const getNotice = () => notice;
export const isSaved = (id: string) => list.some((b) => b.id === id);

export function setBookmarks(next: Bookmark[]) {
  list = next;
  emit();
  void persist(next);
}

export type ToggleResult =
  | { status: 'added' | 'removed'; previous: Bookmark[] }
  | { status: 'limit' };

export function toggleBookmark(input: BookmarkInput): ToggleResult {
  const previous = [...list];
  const saved = previous.some((b) => b.id === input.id);
  if (!saved && previous.length >= MAX_BOOKMARKS) return { status: 'limit' };
  const next = saved
    ? previous.filter((b) => b.id !== input.id)
    : [{ ...input, savedAt: new Date().toISOString() }, ...previous];
  setBookmarks(next);
  return { status: saved ? 'removed' : 'added', previous };
}
