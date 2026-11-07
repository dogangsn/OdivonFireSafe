import { BUILD_INFO } from './build-info';

/** Where the build the browser last ran is remembered. */
export const RELEASE_KEY = 'odivon:fire-safe:release';
/** User preferences that survive a release reset. */
const KEPT_KEYS = ['odivon:theme', 'odivon:preferred_lang'];
/** Pages a signed-out visitor may stay on after a reset. */
const PUBLIC_PATHS = ['/login', '/register', '/forgot-password', '/legal/'];

function safeStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function clearCookies(): void {
  const host = location.hostname;
  const domains = ['', host, `.${host}`, `.${host.split('.').slice(-2).join('.')}`];
  for (const cookie of document.cookie.split(';')) {
    const name = cookie.split('=')[0]?.trim();
    if (!name) continue;
    for (const domain of domains) {
      const scope = domain ? `; domain=${domain}` : '';
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${scope}`;
    }
  }
}

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.deleteDatabase(name);
      request.onsuccess = request.onerror = request.onblocked = () => resolve();
    } catch {
      resolve();
    }
  });
}

async function clearIndexedDb(): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  // Firebase keeps the signed-in user here; older browsers cannot list databases.
  const names = new Set([
    'firebaseLocalStorageDb',
    'firebase-heartbeat-database',
    'firebase-app-check-database',
  ]);
  try {
    for (const db of (await indexedDB.databases?.()) ?? []) if (db.name) names.add(db.name);
  } catch {}
  await Promise.all([...names].map(deleteDatabase));
}

/** Removes cookies, storage, IndexedDB, Cache Storage and service workers, keeping preferences. */
export async function clearClientState(): Promise<void> {
  const storage = safeStorage();
  if (storage) {
    const kept = KEPT_KEYS.map((key) => [key, storage.getItem(key)] as const);
    storage.clear();
    for (const [key, value] of kept) if (value !== null) storage.setItem(key, value);
  }
  try {
    sessionStorage.clear();
  } catch {}
  clearCookies();
  await clearIndexedDb();
  try {
    if ('caches' in window)
      await Promise.all((await caches.keys()).map((key) => caches.delete(key)));
  } catch {}
  try {
    if ('serviceWorker' in navigator)
      await Promise.all(
        (await navigator.serviceWorker.getRegistrations()).map((r) => r.unregister()),
      );
  } catch {}
}

function isPublicPath(path: string): boolean {
  return PUBLIC_PATHS.some((p) => path === p || path.startsWith(p.endsWith('/') ? p : `${p}/`));
}

/**
 * Runs before Angular starts. When the browser last ran another build, it clears the old session
 * and data and sends the user to the login page. Returns false when the page is being redirected.
 */
export async function resetOnNewRelease(): Promise<boolean> {
  const storage = safeStorage();
  if (!storage) return true;
  const previous = storage.getItem(RELEASE_KEY);
  if (previous === BUILD_INFO.buildId) return true;
  // A first visit with no saved data has nothing to clear.
  const hadData = previous !== null || storage.length > 0 || document.cookie.length > 0;
  if (hadData) await clearClientState();
  storage.setItem(RELEASE_KEY, BUILD_INFO.buildId);
  if (hadData && !isPublicPath(location.pathname)) {
    location.replace('/login');
    return false;
  }
  return true;
}
