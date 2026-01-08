/**
 * Tests for Date Utilities
 */

import { describe, it, expect } from 'vitest';
import {
  formatDate,
  isToday,
  isWeekend,
  addDays,
  getWeekStart,
  getWeekEnd,
  getWeekNumber,
  isSameDay,
  parseDate
} from './dateUtils.js';

describe('dateUtils', () => {
  describe('formatDate', () => {
    it('should format date as YYYY-MM-DD', () => {
      const date = new Date(2026, 0, 15); // Jan 15, 2026
      expect(formatDate(date)).toBe('2026-01-15');
    });

    it('should pad single digit months', () => {
      const date = new Date(2026, 2, 5); // Mar 5
      expect(formatDate(date)).toBe('2026-03-05');
    });

    it('should pad single digit days', () => {
      const date = new Date(2026, 11, 1); // Dec 1
      expect(formatDate(date)).toBe('2026-12-01');
    });
  });

  describe('isToday', () => {
    it('should return true for today', () => {
      expect(isToday(new Date())).toBe(true);
    });

    it('should return false for yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isToday(yesterday)).toBe(false);
    });

    it('should return false for tomorrow', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(isToday(tomorrow)).toBe(false);
    });
  });

  describe('isWeekend', () => {
    it('should return true for Saturday', () => {
      const saturday = new Date(2026, 0, 10); // Jan 10, 2026 is Saturday
      expect(isWeekend(saturday)).toBe(true);
    });

    it('should return true for Sunday', () => {
      const sunday = new Date(2026, 0, 11); // Jan 11, 2026 is Sunday
      expect(isWeekend(sunday)).toBe(true);
    });

    it('should return false for weekdays', () => {
      const monday = new Date(2026, 0, 5); // Jan 5, 2026 is Monday
      expect(isWeekend(monday)).toBe(false);
      
      const friday = new Date(2026, 0, 9); // Jan 9, 2026 is Friday
      expect(isWeekend(friday)).toBe(false);
    });
  });

  describe('addDays', () => {
    it('should add positive days', () => {
      const date = new Date(2026, 0, 15);
      const result = addDays(date, 5);
      expect(formatDate(result)).toBe('2026-01-20');
    });

    it('should subtract days with negative value', () => {
      const date = new Date(2026, 0, 15);
      const result = addDays(date, -5);
      expect(formatDate(result)).toBe('2026-01-10');
    });

    it('should handle month boundaries', () => {
      const date = new Date(2026, 0, 30);
      const result = addDays(date, 5);
      expect(formatDate(result)).toBe('2026-02-04');
    });

    it('should not mutate original date', () => {
      const date = new Date(2026, 0, 15);
      addDays(date, 5);
      expect(formatDate(date)).toBe('2026-01-15');
    });
  });

  describe('getWeekStart', () => {
    it('should return Monday for a Wednesday', () => {
      const wednesday = new Date(2026, 0, 7); // Jan 7, 2026 is Wednesday
      const monday = getWeekStart(wednesday);
      expect(formatDate(monday)).toBe('2026-01-05');
      expect(monday.getDay()).toBe(1); // Monday
    });

    it('should return same day for Monday', () => {
      const monday = new Date(2026, 0, 5); // Jan 5, 2026 is Monday
      const result = getWeekStart(monday);
      expect(formatDate(result)).toBe('2026-01-05');
    });

    it('should return previous Monday for Sunday', () => {
      const sunday = new Date(2026, 0, 11); // Jan 11, 2026 is Sunday
      const monday = getWeekStart(sunday);
      expect(formatDate(monday)).toBe('2026-01-05');
    });
  });

  describe('getWeekEnd', () => {
    it('should return Sunday for any day in week', () => {
      const wednesday = new Date(2026, 0, 7);
      const sunday = getWeekEnd(wednesday);
      expect(formatDate(sunday)).toBe('2026-01-11');
      expect(sunday.getDay()).toBe(0); // Sunday
    });
  });

  describe('getWeekNumber', () => {
    it('should return correct ISO week number', () => {
      // Jan 8, 2026 is in week 2
      const date = new Date(2026, 0, 8);
      expect(getWeekNumber(date)).toBe(2);
    });

    it('should return week 1 for first week of year', () => {
      // Jan 1, 2026 is in week 1
      const date = new Date(2026, 0, 1);
      expect(getWeekNumber(date)).toBe(1);
    });
  });

  describe('isSameDay', () => {
    it('should return true for same day', () => {
      const date1 = new Date(2026, 0, 15, 10, 30);
      const date2 = new Date(2026, 0, 15, 20, 45);
      expect(isSameDay(date1, date2)).toBe(true);
    });

    it('should return false for different days', () => {
      const date1 = new Date(2026, 0, 15);
      const date2 = new Date(2026, 0, 16);
      expect(isSameDay(date1, date2)).toBe(false);
    });
  });

  describe('parseDate', () => {
    it('should parse YYYY-MM-DD string', () => {
      const date = parseDate('2026-01-15');
      expect(date.getFullYear()).toBe(2026);
      expect(date.getMonth()).toBe(0); // January
      expect(date.getDate()).toBe(15);
    });

    it('should handle December correctly', () => {
      const date = parseDate('2026-12-25');
      expect(date.getMonth()).toBe(11); // December
    });
  });
});
