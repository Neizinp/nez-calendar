/**
 * CalendarService - Event data management
 * Handles parsing, serialization, and CRUD operations for calendar events
 * Supports event types, recurrence, and Swedish holidays
 */

import { fileSystemService } from './FileSystemService.js';
import { getSwedishHolidays } from './SwedishHolidays.js';

/**
 * Event types for categorization
 */
export const EVENT_TYPES = {
  personal: { label: 'Personal', color: '#8b5cf6' },
  work: { label: 'Work', color: '#3b82f6' },
  birthday: { label: 'Birthday', color: '#ec4899' },
  holiday: { label: 'Holiday', color: '#22c55e' },
  other: { label: 'Other', color: '#6b7280' }
};

/**
 * Recurrence patterns
 */
export const RECURRENCE_PATTERNS = {
  none: 'None',
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly'
};

class CalendarService {
  constructor() {
    this.events = new Map();
    this.listeners = new Set();
    this.showHolidays = localStorage.getItem('showSwedishHolidays') !== 'false';
    this.enabledTypes = this.loadEnabledTypes();
  }

  /**
   * Load enabled event types from localStorage
   */
  loadEnabledTypes() {
    const stored = localStorage.getItem('enabledEventTypes');
    if (stored) {
      try {
        return new Set(JSON.parse(stored));
      } catch (e) {
        return new Set(Object.keys(EVENT_TYPES));
      }
    }
    return new Set(Object.keys(EVENT_TYPES));
  }

  /**
   * Save enabled types to localStorage
   */
  saveEnabledTypes() {
    localStorage.setItem('enabledEventTypes', JSON.stringify([...this.enabledTypes]));
  }

  /**
   * Toggle an event type on/off
   */
  toggleEventType(type) {
    if (this.enabledTypes.has(type)) {
      this.enabledTypes.delete(type);
    } else {
      this.enabledTypes.add(type);
    }
    this.saveEnabledTypes();
    this.notifyListeners();
  }

  /**
   * Check if an event type is enabled
   */
  isTypeEnabled(type) {
    return this.enabledTypes.has(type);
  }

  /**
   * Toggle Swedish holidays
   */
  toggleHolidays() {
    this.showHolidays = !this.showHolidays;
    localStorage.setItem('showSwedishHolidays', this.showHolidays);
    this.notifyListeners();
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

        // Parse booleans and numbers
        if (value === 'true') value = true;
        else if (value === 'false') value = false;
        else if (/^\d+$/.test(value)) value = parseInt(value);

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
    lines.push(`type: "${event.type || 'personal'}"`);

    // Recurrence fields
    if (event.recurrence && event.recurrence !== 'none') {
      lines.push(`recurrence: "${event.recurrence}"`);
      if (event.recurrenceEnd) {
        lines.push(`recurrenceEnd: "${event.recurrenceEnd}"`);
      }
      if (event.recurrenceInterval && event.recurrenceInterval > 1) {
        lines.push(`recurrenceInterval: ${event.recurrenceInterval}`);
      }
    }

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
            type: frontmatter.type || 'personal',
            recurrence: frontmatter.recurrence || 'none',
            recurrenceEnd: frontmatter.recurrenceEnd || null,
            recurrenceInterval: frontmatter.recurrenceInterval || 1,
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
   * Get all events (including generated recurrence instances and holidays)
   */
  getAllEvents() {
    let events = Array.from(this.events.values());
    
    // Filter by enabled types
    events = events.filter(e => this.enabledTypes.has(e.type || 'personal'));
    
    return events;
  }

  /**
   * Expand recurring events into instances for a date range
   */
  expandRecurringEvents(events, startDate, endDate) {
    const expanded = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    for (const event of events) {
      if (!event.recurrence || event.recurrence === 'none') {
        expanded.push(event);
        continue;
      }

      // Generate recurring instances
      const eventStart = new Date(event.startDate);
      const eventEnd = event.endDate ? new Date(event.endDate) : new Date(event.startDate);
      const duration = eventEnd - eventStart;
      const recurrenceEnd = event.recurrenceEnd ? new Date(event.recurrenceEnd) : end;
      const interval = event.recurrenceInterval || 1;

      let current = new Date(eventStart);
      let instanceCount = 0;
      const maxInstances = 365; // Safety limit

      while (current <= end && current <= recurrenceEnd && instanceCount < maxInstances) {
        if (current >= start || new Date(current.getTime() + duration) >= start) {
          const instanceEnd = new Date(current.getTime() + duration);
          expanded.push({
            ...event,
            id: `${event.id}_${this.formatDate(current)}`,
            startDate: this.formatDate(current),
            endDate: this.formatDate(instanceEnd),
            _isRecurrenceInstance: true,
            _originalId: event.id
          });
        }

        // Advance to next occurrence
        switch (event.recurrence) {
          case 'daily':
            current.setDate(current.getDate() + interval);
            break;
          case 'weekly':
            current.setDate(current.getDate() + (7 * interval));
            break;
          case 'monthly':
            current.setMonth(current.getMonth() + interval);
            break;
          case 'yearly':
            current.setFullYear(current.getFullYear() + interval);
            break;
          default:
            instanceCount = maxInstances; // Exit loop
        }
        instanceCount++;
      }
    }

    return expanded;
  }

  /**
   * Get Swedish holidays as events
   */
  getHolidayEvents(startDate, endDate) {
    if (!this.showHolidays || !this.enabledTypes.has('holiday')) {
      return [];
    }

    const startYear = parseInt(startDate.substring(0, 4));
    const endYear = parseInt(endDate.substring(0, 4));
    const holidays = [];

    for (let year = startYear; year <= endYear; year++) {
      const yearHolidays = getSwedishHolidays(year);
      for (const h of yearHolidays) {
        if (h.date >= startDate && h.date <= endDate) {
          holidays.push({
            id: `holiday_${h.date}`,
            title: h.nameSv,
            startDate: h.date,
            endDate: h.date,
            allDay: true,
            color: EVENT_TYPES.holiday.color,
            type: 'holiday',
            _isHoliday: true,
            _englishName: h.name
          });
        }
      }
    }

    return holidays;
  }

  /**
   * Get events for a specific date range (with recurrence expansion and holidays)
   */
  getEventsForRange(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Get base events that overlap with range
    let events = this.getAllEvents().filter(event => {
      const eventStart = new Date(event.startDate);
      const eventEnd = new Date(event.endDate || event.startDate);
      return eventStart <= end && eventEnd >= start;
    });

    // Expand recurring events
    events = this.expandRecurringEvents(events, startDate, endDate);

    // Add holidays
    const holidays = this.getHolidayEvents(startDate, endDate);
    events = [...events, ...holidays];

    return events;
  }

  /**
   * Get events for a specific date
   */
  getEventsForDate(date) {
    const dateStr = typeof date === 'string' ? date : this.formatDate(date);
    return this.getEventsForRange(dateStr, dateStr);
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
      color: eventData.color || EVENT_TYPES[eventData.type || 'personal'].color,
      type: eventData.type || 'personal',
      recurrence: eventData.recurrence || 'none',
      recurrenceEnd: eventData.recurrenceEnd || null,
      recurrenceInterval: eventData.recurrenceInterval || 1,
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
    // Handle recurring instance updates
    const originalId = id.includes('_') ? id.split('_')[0] : id;
    const existing = this.events.get(originalId);
    
    if (!existing) {
      throw new Error(`Event ${id} not found`);
    }

    const oldFilename = existing._filename;

    const event = {
      ...existing,
      ...eventData,
      id: originalId // Preserve original ID
    };

    // Ensure consistency
    if (event.allDay) {
      event.startTime = null;
      event.endTime = null;
    }

    const newFilename = this.generateFilename(event);
    const content = this.serializeEvent(event);

    await fileSystemService.writeFile(newFilename, content);

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
    // Handle recurring instance deletions
    const originalId = id.includes('_') ? id.split('_')[0] : id;
    const event = this.events.get(originalId);
    
    if (!event) {
      return false;
    }

    if (event._filename) {
      await fileSystemService.deleteFile(event._filename);
    }

    this.events.delete(originalId);
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
