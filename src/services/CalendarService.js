/**
 * CalendarService - Event data management
 * Handles parsing, serialization, and CRUD operations for calendar events
 */

import { fileSystemService } from './FileSystemService.js';

/**
 * Event structure:
 * {
 *   id: string (UUID)
 *   title: string
 *   startDate: string (YYYY-MM-DD)
 *   endDate: string (YYYY-MM-DD) - optional, for multi-day events
 *   startTime: string (HH:MM) - optional, for timed events
 *   endTime: string (HH:MM) - optional, for timed events
 *   allDay: boolean
 *   color: string (hex color)
 *   description: string (markdown body)
 * }
 */

class CalendarService {
  constructor() {
    this.events = new Map();
    this.listeners = new Set();
  }

  /**
   * Generate a UUID
   */
  generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Generate filename from event data
   */
  generateFilename(event) {
    const slug = event.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50) || 'event';
    return `${event.startDate}-${slug}.md`;
  }

  /**
   * Parse markdown content with YAML frontmatter
   */
  parseMarkdown(content) {
    const frontmatterRegex = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/;
    const match = content.match(frontmatterRegex);

    if (!match) {
      return { frontmatter: {}, body: content };
    }

    const frontmatter = {};
    const lines = match[1].split('\n');

    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim();
        let value = line.substring(colonIndex + 1).trim();

        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }

        // Parse booleans
        if (value === 'true') value = true;
        else if (value === 'false') value = false;

        frontmatter[key] = value;
      }
    }

    return {
      frontmatter,
      body: match[2].trim()
    };
  }

  /**
   * Serialize event to markdown with YAML frontmatter
   */
  serializeEvent(event) {
    const lines = ['---'];

    lines.push(`id: "${event.id}"`);
    lines.push(`title: "${event.title.replace(/"/g, '\\"')}"`);
    lines.push(`startDate: "${event.startDate}"`);

    if (event.endDate && event.endDate !== event.startDate) {
      lines.push(`endDate: "${event.endDate}"`);
    }

    lines.push(`allDay: ${event.allDay}`);

    if (!event.allDay && event.startTime) {
      lines.push(`startTime: "${event.startTime}"`);
      if (event.endTime) {
        lines.push(`endTime: "${event.endTime}"`);
      }
    }

    lines.push(`color: "${event.color}"`);
    lines.push('---');
    lines.push('');

    if (event.description) {
      lines.push(event.description);
    }

    return lines.join('\n');
  }

  /**
   * Load all events from the file system
   */
  async loadAllEvents() {
    if (!fileSystemService.hasAccess()) {
      this.events.clear();
      return [];
    }

    const files = await fileSystemService.listFiles();
    this.events.clear();

    for (const filename of files) {
      try {
        const content = await fileSystemService.readFile(filename);
        if (content) {
          const { frontmatter, body } = this.parseMarkdown(content);

          const event = {
            id: frontmatter.id || this.generateId(),
            title: frontmatter.title || 'Untitled',
            startDate: frontmatter.startDate,
            endDate: frontmatter.endDate || frontmatter.startDate,
            startTime: frontmatter.startTime || null,
            endTime: frontmatter.endTime || null,
            allDay: frontmatter.allDay !== false && !frontmatter.startTime,
            color: frontmatter.color || '#8b5cf6',
            description: body,
            _filename: filename
          };

          if (event.startDate) {
            this.events.set(event.id, event);
          }
        }
      } catch (err) {
        console.error(`Error loading event file ${filename}:`, err);
      }
    }

    this.notifyListeners();
    return Array.from(this.events.values());
  }

  /**
   * Get all events
   */
  getAllEvents() {
    return Array.from(this.events.values());
  }

  /**
   * Get events for a specific date range
   */
  getEventsForRange(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    return this.getAllEvents().filter(event => {
      const eventStart = new Date(event.startDate);
      const eventEnd = new Date(event.endDate || event.startDate);

      // Event overlaps with range if:
      // event starts before range ends AND event ends after range starts
      return eventStart <= end && eventEnd >= start;
    });
  }

  /**
   * Get events for a specific date
   */
  getEventsForDate(date) {
    const dateStr = typeof date === 'string' ? date : this.formatDate(date);

    return this.getAllEvents().filter(event => {
      const eventStart = event.startDate;
      const eventEnd = event.endDate || event.startDate;

      return dateStr >= eventStart && dateStr <= eventEnd;
    });
  }

  /**
   * Create a new event
   */
  async createEvent(eventData) {
    const event = {
      id: this.generateId(),
      title: eventData.title || 'Untitled',
      startDate: eventData.startDate,
      endDate: eventData.endDate || eventData.startDate,
      startTime: eventData.allDay ? null : (eventData.startTime || null),
      endTime: eventData.allDay ? null : (eventData.endTime || null),
      allDay: eventData.allDay !== false,
      color: eventData.color || '#8b5cf6',
      description: eventData.description || ''
    };

    const filename = this.generateFilename(event);
    const content = this.serializeEvent(event);

    await fileSystemService.writeFile(filename, content);

    event._filename = filename;
    this.events.set(event.id, event);
    this.notifyListeners();

    return event;
  }

  /**
   * Update an existing event
   */
  async updateEvent(id, eventData) {
    const existing = this.events.get(id);
    if (!existing) {
      throw new Error(`Event ${id} not found`);
    }

    // Delete old file if filename will change
    const oldFilename = existing._filename;

    const event = {
      ...existing,
      ...eventData,
      id // Preserve ID
    };

    // Ensure consistency
    if (event.allDay) {
      event.startTime = null;
      event.endTime = null;
    }

    const newFilename = this.generateFilename(event);
    const content = this.serializeEvent(event);

    // Write new file
    await fileSystemService.writeFile(newFilename, content);

    // Delete old file if different
    if (oldFilename && oldFilename !== newFilename) {
      await fileSystemService.deleteFile(oldFilename);
    }

    event._filename = newFilename;
    this.events.set(event.id, event);
    this.notifyListeners();

    return event;
  }

  /**
   * Delete an event
   */
  async deleteEvent(id) {
    const event = this.events.get(id);
    if (!event) {
      return false;
    }

    if (event._filename) {
      await fileSystemService.deleteFile(event._filename);
    }

    this.events.delete(id);
    this.notifyListeners();
    return true;
  }

  /**
   * Format date to YYYY-MM-DD
   */
  formatDate(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Add a listener for event changes
   */
  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all listeners of changes
   */
  notifyListeners() {
    for (const listener of this.listeners) {
      try {
        listener(this.getAllEvents());
      } catch (err) {
        console.error('Error in event listener:', err);
      }
    }
  }
}

export const calendarService = new CalendarService();
