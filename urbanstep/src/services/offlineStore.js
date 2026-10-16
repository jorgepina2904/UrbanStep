/**
 * offlineStore.js — Almacenamiento local IndexedDB para operar sin internet.
 *  - 'kv':         instantáneas de catálogo (productos) para arrancar sin conexión.
 *  - 'salesQueue': ventas pendientes de subir a Supabase (idempotentes por id de venta).
 * Toda función es tolerante a fallos: si IndexedDB no está disponible, degrada sin romper la app.
 */
const DB_NAME = 'urbanstep_offline';
const DB_VERSION = 1;

let _dbPromise = null;

const openDb = () => {
    if (typeof indexedDB === 'undefined') return Promise.reject(new Error('IndexedDB no disponible'));
    if (_dbPromise) return _dbPromise;
    _dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
            if (!db.objectStoreNames.contains('salesQueue')) db.createObjectStore('salesQueue', { keyPath: 'id' });
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => { _dbPromise = null; reject(req.error); };
    });
    return _dbPromise;
};

const run = async (store, mode, fn) => {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(store, mode);
        const result = fn(tx.objectStore(store));
        tx.oncomplete = () => resolve(result && 'result' in result ? result.result : undefined);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
    });
};

export const offlineStore = {
    async kvSet(key, value) {
        try { await run('kv', 'readwrite', (s) => s.put(value, key)); } catch (e) { console.warn('offlineStore.kvSet:', e); }
    },
    async kvGet(key) {
        try { return await run('kv', 'readonly', (s) => s.get(key)); } catch (e) { console.warn('offlineStore.kvGet:', e); return undefined; }
    },
    async queueAdd(item) {
        await run('salesQueue', 'readwrite', (s) => s.put(item));
    },
    async queueAll() {
        try { return (await run('salesQueue', 'readonly', (s) => s.getAll())) || []; } catch (e) { console.warn('offlineStore.queueAll:', e); return []; }
    },
    async queueRemove(id) {
        await run('salesQueue', 'readwrite', (s) => s.delete(id));
    }
};

export default offlineStore;
