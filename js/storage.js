// IndexedDB + localStorage wrapper
const DB_NAME = 'bolson-clima';
const DB_VERSION = 2;  // ← subido de 1 a 2

const Storage = (() => {
  let db = null;

  async function init() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const d = e.target.result;
        if (!d.objectStoreNames.contains('forecast')) d.createObjectStore('forecast', { keyPath: 'id' });
        if (!d.objectStoreNames.contains('observations')) d.createObjectStore('observations', { keyPath: 'id', autoIncrement: true });
        if (!d.objectStoreNames.contains('historical')) d.createObjectStore('historical', { keyPath: 'id' });
        if (!d.objectStoreNames.contains('aerodromo')) d.createObjectStore('aerodromo', { keyPath: 'id' });  // ← NUEVO
      };
      req.onsuccess = (e) => { db = e.target.result; resolve(db); };
      req.onerror = (e) => reject(e.target.error);
    });
  }

  function tx(store, mode = 'readonly') {
    return db.transaction(store, mode).objectStore(store);
  }

  async function put(store, value) {
    return new Promise((res, rej) => {
      const r = tx(store, 'readwrite').put(value);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  }

  async function get(store, key) {
    return new Promise((res, rej) => {
      const r = tx(store).get(key);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  }

  async function getAll(store) {
    return new Promise((res, rej) => {
      const r = tx(store).getAll();
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  }

  async function del(store, key) {
    return new Promise((res, rej) => {
      const r = tx(store, 'readwrite').delete(key);
      r.onsuccess = () => res();
      r.onerror = () => rej(r.error);
    });
  }

  const prefs = {
    get(k, def) { try { const v = localStorage.getItem('pref_' + k); return v ? JSON.parse(v) : def; } catch { return def; } },
    set(k, v) { localStorage.setItem('pref_' + k, JSON.stringify(v)); },
  };

  return { init, put, get, getAll, del, prefs };
})();