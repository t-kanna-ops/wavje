// ===== File System Manager =====
class FileSystemManager {
  constructor() {
    this.db = null;
    this.dbName = 'WavJeDB';
    this.dbVersion = 1;
  }

  async initialize() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        console.log('✓IndexedDB initialized');
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        if (!db.objectStoreNames.contains('fileHandles')) {
          db.createObjectStore('fileHandles', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('sessions')) {
          db.createObjectStore('sessions', { keyPath: 'id' });
        }
      };
    });
  }

  async saveFileHandle(id, handle) {
    if (!this.db) await this.initialize();
    
    const tx = this.db.transaction(['fileHandles'], 'readwrite');
    const store = tx.objectStore('fileHandles');
    await store.put({ id, handle, timestamp: Date.now() });
  }

  async getFileHandle(id) {
    if (!this.db) await this.initialize();
    
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['fileHandles'], 'readonly');
      const store = tx.objectStore('fileHandles');
      const request = store.get(id);
      
      request.onsuccess = () => {
        resolve(request.result?.handle || null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveSession(sessionData) {
    if (!this.db) await this.initialize();
    
    const tx = this.db.transaction(['sessions'], 'readwrite');
    const store = tx.objectStore('sessions');
    sessionData.timestamp = Date.now();
    await store.put(sessionData);
    console.log(`✓Session saved: ${sessionData.id}`);
  }

  async loadSession(id) {
    if (!this.db) await this.initialize();
    
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['sessions'], 'readonly');
      const store = tx.objectStore('sessions');
      const request = store.get(id);
      
      request.onsuccess = () => {
        resolve(request.result || null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async listSessions() {
    if (!this.db) await this.initialize();
    
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['sessions'], 'readonly');
      const store = tx.objectStore('sessions');
      const request = store.getAll();
      
      request.onsuccess = () => {
        resolve(request.result || []);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteSession(id) {
    if (!this.db) await this.initialize();
    
    const tx = this.db.transaction(['sessions'], 'readwrite');
    const store = tx.objectStore('sessions');
    await store.delete(id);
    console.log(`✓Session deleted: ${id}`);
  }
}


export default FileSystemManager;