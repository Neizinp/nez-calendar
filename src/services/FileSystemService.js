/**
 * FileSystemService - Browser File System Access API wrapper
 * Persists directory handle in IndexedDB for automatic reconnection
 */

const DB_NAME = 'nez-calendar-db';
const STORE_NAME = 'handles';
const HANDLE_KEY = 'directoryHandle';

class FileSystemService {
  constructor() {
    this.directoryHandle = null;
    this.eventsHandle = null;
  }

  /**
   * Check if File System Access API is supported
   */
  isSupported() {
    return "showDirectoryPicker" in window;
  }

  /**
   * Open IndexedDB database
   */
  async openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
    });
  }

  /**
   * Save directory handle to IndexedDB
   */
  async saveHandle(handle) {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(handle, HANDLE_KEY);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
      tx.oncomplete = () => db.close();
    });
  }

  /**
   * Load directory handle from IndexedDB
   */
  async loadHandle() {
    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(HANDLE_KEY);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        tx.oncomplete = () => db.close();
      });
    } catch {
      return null;
    }
  }

  /**
   * Try to restore previous directory access
   */
  async tryRestoreAccess() {
    if (!this.isSupported()) return false;

    try {
      const handle = await this.loadHandle();
      if (!handle) return false;

      // Verify we still have permission
      const permission = await handle.queryPermission({ mode: 'readwrite' });
      if (permission === 'granted') {
        this.directoryHandle = handle;
        this.eventsHandle = handle;
        this.directoryName = handle.name;
        return true;
      }

      // Try to request permission again
      const newPermission = await handle.requestPermission({ mode: 'readwrite' });
      if (newPermission === 'granted') {
        this.directoryHandle = handle;
        this.eventsHandle = handle;
        this.directoryName = handle.name;
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Prompt user to select a directory for storing events
   */
  async requestDirectoryAccess() {
    if (!this.isSupported()) {
      throw new Error('File System Access API is not supported in this browser');
    }

    try {
      this.directoryHandle = await window.showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'documents'
      });

      this.eventsHandle = this.directoryHandle;
      this.directoryName = this.directoryHandle.name;

      // Save to IndexedDB for persistence
      await this.saveHandle(this.directoryHandle);

      return true;
    } catch (err) {
      if (err.name === 'AbortError') {
        return false;
      }
      throw err;
    }
  }

  /**
   * Check if we have directory access
   */
  hasAccess() {
    return this.directoryHandle !== null && this.eventsHandle !== null;
  }

  /**
   * Get directory name
   */
  getDirectoryName() {
    return this.directoryName || "Not selected";
  }

  /**
   * List all markdown files in the events directory
   */
  async listFiles() {
    if (!this.hasAccess()) {
      throw new Error("No directory access");
    }

    const files = [];
    for await (const entry of this.eventsHandle.values()) {
      if (entry.kind === "file" && entry.name.endsWith(".md")) {
        files.push(entry.name);
      }
    }
    return files;
  }

  /**
   * Read a markdown file's content
   */
  async readFile(filename) {
    if (!this.hasAccess()) {
      throw new Error("No directory access");
    }

    try {
      const fileHandle = await this.eventsHandle.getFileHandle(filename);
      const file = await fileHandle.getFile();
      return await file.text();
    } catch (err) {
      if (err.name === "NotFoundError") {
        return null;
      }
      throw err;
    }
  }

  /**
   * Write content to a markdown file
   */
  async writeFile(filename, content) {
    if (!this.hasAccess()) {
      throw new Error("No directory access");
    }

    const fileHandle = await this.eventsHandle.getFileHandle(filename, {
      create: true,
    });

    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
  }

  /**
   * Delete a markdown file
   */
  async deleteFile(filename) {
    if (!this.hasAccess()) {
      throw new Error("No directory access");
    }

    try {
      await this.eventsHandle.removeEntry(filename);
      return true;
    } catch (err) {
      if (err.name === "NotFoundError") {
        return false;
      }
      throw err;
    }
  }

  /**
   * Check if a file exists
   */
  async fileExists(filename) {
    if (!this.hasAccess()) {
      return false;
    }

    try {
      await this.eventsHandle.getFileHandle(filename);
      return true;
    } catch {
      return false;
    }
  }
}

export const fileSystemService = new FileSystemService();
