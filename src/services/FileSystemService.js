/**
 * FileSystemService - Browser File System Access API wrapper
 * Allows the user to select a folder for storing markdown event files
 */

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

      // Use selected folder directly for events
      this.eventsHandle = this.directoryHandle;

      // Store the directory name for display
      this.directoryName = this.directoryHandle.name;

      return true;
    } catch (err) {
      if (err.name === 'AbortError') {
        // User cancelled the picker
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
