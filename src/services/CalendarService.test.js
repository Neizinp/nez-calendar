/**
 * Tests for CalendarService
 * Covers event parsing, serialization, CRUD operations, recurrence, and filtering
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock localStorage
const localStorageMock = {
  store: {},
  getItem: vi.fn((key) => localStorageMock.store[key] || null),
  setItem: vi.fn((key, value) => { localStorageMock.store[key] = value; }),
  removeItem: vi.fn((key) => { delete localStorageMock.store[key]; }),
  clear: vi.fn(() => { localStorageMock.store = {}; }),
};
global.localStorage = localStorageMock;

// Mock FileSystemService
vi.mock('./FileSystemService.js', () => ({
  fileSystemService: {
    hasAccess: vi.fn(() => true),
    listFiles: vi.fn(() => Promise.resolve([])),
    readFile: vi.fn(() => Promise.resolve(null)),
    writeFile: vi.fn(() => Promise.resolve()),
    deleteFile: vi.fn(() => Promise.resolve()),
  }
}));

// Import after mocking
const { calendarService, EVENT_TYPES, RECURRENCE_PATTERNS } = await import('./CalendarService.js');

describe('CalendarService', () => {
  beforeEach(() => {
    // Reset service state
    calendarService.events.clear();
    calendarService.enabledTypes = new Set(Object.keys(EVENT_TYPES));
    calendarService.showHolidays = true;
  });

  describe('EVENT_TYPES', () => {
    it('should have all expected event types', () => {
      expect(EVENT_TYPES.personal).toBeDefined();
      expect(EVENT_TYPES.work).toBeDefined();
      expect(EVENT_TYPES.birthday).toBeDefined();
      expect(EVENT_TYPES.holiday).toBeDefined();
      expect(EVENT_TYPES.other).toBeDefined();
    });

    it('should have colors for all types', () => {
      Object.values(EVENT_TYPES).forEach(type => {
        expect(type.color).toMatch(/^#[0-9a-fA-F]{6}$/);
      });
    });
  });

  describe('RECURRENCE_PATTERNS', () => {
    it('should have all expected patterns', () => {
      expect(RECURRENCE_PATTERNS.none).toBe('None');
      expect(RECURRENCE_PATTERNS.daily).toBe('Daily');
      expect(RECURRENCE_PATTERNS.weekly).toBe('Weekly');
      expect(RECURRENCE_PATTERNS.monthly).toBe('Monthly');
      expect(RECURRENCE_PATTERNS.yearly).toBe('Yearly');
    });
  });

  describe('parseMarkdown', () => {
    it('should parse valid YAML frontmatter', () => {
      const content = `---
title: "Test Event"
startDate: "2026-01-15"
allDay: true
---

Event description here.`;

      const result = calendarService.parseMarkdown(content);
      expect(result.frontmatter.title).toBe('Test Event');
      expect(result.frontmatter.startDate).toBe('2026-01-15');
      expect(result.frontmatter.allDay).toBe(true);
      expect(result.body).toBe('Event description here.');
    });

    it('should handle content without frontmatter', () => {
      const content = 'Just some content without frontmatter';
      const result = calendarService.parseMarkdown(content);
      expect(result.frontmatter).toEqual({});
      expect(result.body).toBe(content);
    });

    it('should parse boolean values correctly', () => {
      const content = `---
allDay: true
recurring: false
---`;
      const result = calendarService.parseMarkdown(content);
      expect(result.frontmatter.allDay).toBe(true);
      expect(result.frontmatter.recurring).toBe(false);
    });

    it('should parse numeric values correctly', () => {
      const content = `---
recurrenceInterval: 2
---`;
      const result = calendarService.parseMarkdown(content);
      expect(result.frontmatter.recurrenceInterval).toBe(2);
    });
  });

  describe('serializeEvent', () => {
    it('should serialize event to markdown with frontmatter', () => {
      const event = {
        id: 'test-123',
        title: 'Test Event',
        startDate: '2026-01-15',
        endDate: '2026-01-15',
        allDay: true,
        color: '#8b5cf6',
        type: 'personal',
        description: 'This is a test'
      };

      const result = calendarService.serializeEvent(event);
      expect(result).toContain('---');
      expect(result).toContain('id: "test-123"');
      expect(result).toContain('title: "Test Event"');
      expect(result).toContain('startDate: "2026-01-15"');
      expect(result).toContain('allDay: true');
      expect(result).toContain('This is a test');
    });

    it('should not include endDate if same as startDate', () => {
      const event = {
        id: 'test-123',
        title: 'Test',
        startDate: '2026-01-15',
        endDate: '2026-01-15',
        allDay: true,
        color: '#8b5cf6',
        type: 'personal'
      };

      const result = calendarService.serializeEvent(event);
      expect(result).not.toContain('endDate');
    });

    it('should include endDate if different from startDate', () => {
      const event = {
        id: 'test-123',
        title: 'Multi-day',
        startDate: '2026-01-15',
        endDate: '2026-01-17',
        allDay: true,
        color: '#8b5cf6',
        type: 'personal'
      };

      const result = calendarService.serializeEvent(event);
      expect(result).toContain('endDate: "2026-01-17"');
    });

    it('should include time for non all-day events', () => {
      const event = {
        id: 'test-123',
        title: 'Meeting',
        startDate: '2026-01-15',
        startTime: '09:00',
        endTime: '10:00',
        allDay: false,
        color: '#3b82f6',
        type: 'work'
      };

      const result = calendarService.serializeEvent(event);
      expect(result).toContain('startTime: "09:00"');
      expect(result).toContain('endTime: "10:00"');
      expect(result).toContain('allDay: false');
    });
  });

  describe('formatDate', () => {
    it('should format date as YYYY-MM-DD', () => {
      const date = new Date(2026, 0, 15); // Jan 15, 2026
      expect(calendarService.formatDate(date)).toBe('2026-01-15');
    });

    it('should pad single digit months and days', () => {
      const date = new Date(2026, 0, 5); // Jan 5, 2026
      expect(calendarService.formatDate(date)).toBe('2026-01-05');
    });
  });

  describe('generateFilename', () => {
    it('should generate filename from date and title', () => {
      const event = {
        startDate: '2026-01-15',
        title: 'Team Meeting'
      };
      const filename = calendarService.generateFilename(event);
      expect(filename).toBe('2026-01-15-team-meeting.md');
    });

    it('should handle special characters in title', () => {
      const event = {
        startDate: '2026-01-15',
        title: 'Meeting @ Office!'
      };
      const filename = calendarService.generateFilename(event);
      expect(filename).toBe('2026-01-15-meeting-office.md');
    });

    it('should truncate long titles', () => {
      const event = {
        startDate: '2026-01-15',
        title: 'This is a very long event title that should be truncated to prevent excessively long filenames'
      };
      const filename = calendarService.generateFilename(event);
      expect(filename.length).toBeLessThanOrEqual(70); // date + 50 chars + .md
    });
  });

  describe('Event type filtering', () => {
    it('should toggle event types', () => {
      expect(calendarService.isTypeEnabled('personal')).toBe(true);
      calendarService.toggleEventType('personal');
      expect(calendarService.isTypeEnabled('personal')).toBe(false);
      calendarService.toggleEventType('personal');
      expect(calendarService.isTypeEnabled('personal')).toBe(true);
    });
  });

  describe('Holiday events', () => {
    it('should return holidays when enabled', () => {
      const holidays = calendarService.getHolidayEvents('2026-01-01', '2026-01-31');
      expect(holidays.length).toBeGreaterThan(0);
      expect(holidays.some(h => h.title === 'Nyårsdagen')).toBe(true);
    });

    it('should return empty array when holidays disabled', () => {
      calendarService.toggleEventType('holiday');
      const holidays = calendarService.getHolidayEvents('2026-01-01', '2026-01-31');
      expect(holidays.length).toBe(0);
    });

    it('should mark holiday events correctly', () => {
      const holidays = calendarService.getHolidayEvents('2026-01-01', '2026-01-31');
      holidays.forEach(h => {
        expect(h._isHoliday).toBe(true);
        expect(h.type).toBe('holiday');
        expect(h.allDay).toBe(true);
      });
    });
  });

  describe('Recurrence expansion', () => {
    it('should expand daily recurring events', () => {
      const events = [{
        id: 'daily-1',
        title: 'Daily Standup',
        startDate: '2026-01-01',
        endDate: '2026-01-01',
        recurrence: 'daily',
        recurrenceEnd: '2026-01-05'
      }];

      const expanded = calendarService.expandRecurringEvents(events, '2026-01-01', '2026-01-10');
      expect(expanded.length).toBe(5); // Jan 1-5
    });

    it('should expand weekly recurring events', () => {
      const events = [{
        id: 'weekly-1',
        title: 'Weekly Review',
        startDate: '2026-01-05', // Monday
        endDate: '2026-01-05',
        recurrence: 'weekly',
        recurrenceEnd: '2026-01-26'
      }];

      const expanded = calendarService.expandRecurringEvents(events, '2026-01-01', '2026-01-31');
      expect(expanded.length).toBe(4); // Jan 5, 12, 19, 26
    });

    it('should respect recurrence interval', () => {
      const events = [{
        id: 'biweekly-1',
        title: 'Biweekly',
        startDate: '2026-01-05',
        endDate: '2026-01-05',
        recurrence: 'weekly',
        recurrenceInterval: 2,
        recurrenceEnd: '2026-02-28'
      }];

      const expanded = calendarService.expandRecurringEvents(events, '2026-01-01', '2026-02-28');
      expect(expanded.length).toBe(4); // Jan 5, Jan 19, Feb 2, Feb 16
    });

    it('should not expand non-recurring events', () => {
      const events = [{
        id: 'single-1',
        title: 'One-time Event',
        startDate: '2026-01-15',
        endDate: '2026-01-15',
        recurrence: 'none'
      }];

      const expanded = calendarService.expandRecurringEvents(events, '2026-01-01', '2026-01-31');
      expect(expanded.length).toBe(1);
      expect(expanded[0].id).toBe('single-1');
    });
  });

  describe('validateEvent', () => {
    it('should return empty array for valid event', () => {
      const errors = calendarService.validateEvent({
        title: 'Valid Event',
        startDate: '2026-01-15',
        allDay: true
      });
      expect(errors).toEqual([]);
    });

    it('should require title', () => {
      const errors = calendarService.validateEvent({
        title: '',
        startDate: '2026-01-15'
      });
      expect(errors).toContain('Title is required');
    });

    it('should require valid start date format', () => {
      const errors = calendarService.validateEvent({
        title: 'Test',
        startDate: '01-15-2026' // wrong format
      });
      expect(errors).toContain('Invalid start date format (expected YYYY-MM-DD)');
    });

    it('should validate end date format', () => {
      const errors = calendarService.validateEvent({
        title: 'Test',
        startDate: '2026-01-15',
        endDate: 'invalid'
      });
      expect(errors).toContain('Invalid end date format (expected YYYY-MM-DD)');
    });

    it('should require end date after start date', () => {
      const errors = calendarService.validateEvent({
        title: 'Test',
        startDate: '2026-01-15',
        endDate: '2026-01-10'
      });
      expect(errors).toContain('End date must be on or after start date');
    });

    it('should validate time formats for non all-day events', () => {
      const errors = calendarService.validateEvent({
        title: 'Test',
        startDate: '2026-01-15',
        allDay: false,
        startTime: '9:00', // missing leading zero
        endTime: 'invalid'
      });
      expect(errors).toContain('Invalid start time format (expected HH:MM)');
      expect(errors).toContain('Invalid end time format (expected HH:MM)');
    });
  });
});
