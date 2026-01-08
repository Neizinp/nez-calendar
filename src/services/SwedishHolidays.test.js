/**
 * Tests for SwedishHolidays service
 * Covers Easter calculation, fixed holidays, and moveable holidays
 */

import { describe, it, expect } from 'vitest';
import { getSwedishHolidays, getHolidaysForRange, isSwedishHoliday } from './SwedishHolidays.js';

describe('SwedishHolidays', () => {
  describe('getSwedishHolidays', () => {
    it('should return all Swedish holidays for a given year', () => {
      const holidays = getSwedishHolidays(2026);
      expect(holidays.length).toBeGreaterThan(10);
    });

    it('should include fixed holidays', () => {
      const holidays = getSwedishHolidays(2026);
      const dates = holidays.map(h => h.date);
      
      // New Year's Day
      expect(dates).toContain('2026-01-01');
      // Epiphany
      expect(dates).toContain('2026-01-06');
      // May Day
      expect(dates).toContain('2026-05-01');
      // National Day
      expect(dates).toContain('2026-06-06');
      // Christmas Day
      expect(dates).toContain('2026-12-25');
      // Second Day of Christmas
      expect(dates).toContain('2026-12-26');
    });

    it('should include Easter-based holidays with correct dates', () => {
      // Easter 2026 is April 5
      const holidays = getSwedishHolidays(2026);
      const dates = holidays.map(h => h.date);
      
      // Good Friday (Easter - 2 days)
      expect(dates).toContain('2026-04-03');
      // Easter Sunday
      expect(dates).toContain('2026-04-05');
      // Easter Monday
      expect(dates).toContain('2026-04-06');
      // Ascension Day (Easter + 39 days)
      expect(dates).toContain('2026-05-14');
      // Whit Sunday (Easter + 49 days)
      expect(dates).toContain('2026-05-24');
    });

    it('should include Midsummer Day on correct Saturday', () => {
      const holidays = getSwedishHolidays(2026);
      const midsummer = holidays.find(h => h.name === 'Midsummer Day');
      expect(midsummer).toBeDefined();
      // Midsummer 2026 is June 20 (Saturday between June 20-26)
      expect(midsummer.date).toBe('2026-06-20');
    });

    it('should include All Saints Day on correct Saturday', () => {
      const holidays = getSwedishHolidays(2026);
      const allSaints = holidays.find(h => h.name === "All Saints' Day");
      expect(allSaints).toBeDefined();
      // All Saints 2026 is Oct 31 (Saturday between Oct 31 - Nov 6)
      expect(allSaints.date).toBe('2026-10-31');
    });

    it('should have Swedish names for all holidays', () => {
      const holidays = getSwedishHolidays(2026);
      holidays.forEach(h => {
        expect(h.nameSv).toBeDefined();
        expect(h.nameSv.length).toBeGreaterThan(0);
      });
    });

    it('should return holidays sorted by date', () => {
      const holidays = getSwedishHolidays(2026);
      for (let i = 1; i < holidays.length; i++) {
        expect(holidays[i].date >= holidays[i - 1].date).toBe(true);
      }
    });
  });

  describe('Easter calculation edge cases', () => {
    it('should calculate Easter correctly for different years', () => {
      // Known Easter dates
      const easterDates = {
        2020: '2020-04-12',
        2021: '2021-04-04',
        2022: '2022-04-17',
        2023: '2023-04-09',
        2024: '2024-03-31',
        2025: '2025-04-20',
        2026: '2026-04-05',
        2027: '2027-03-28',
      };

      for (const [year, expectedEaster] of Object.entries(easterDates)) {
        const holidays = getSwedishHolidays(parseInt(year));
        const easter = holidays.find(h => h.name === 'Easter Sunday');
        expect(easter?.date).toBe(expectedEaster);
      }
    });
  });

  describe('getHolidaysForRange', () => {
    it('should return holidays within a date range', () => {
      const holidays = getHolidaysForRange('2026-01-01', '2026-01-31');
      expect(holidays.length).toBe(2); // New Year's Day and Epiphany
    });

    it('should return holidays spanning multiple years', () => {
      const holidays = getHolidaysForRange('2025-12-25', '2026-01-06');
      expect(holidays.length).toBeGreaterThanOrEqual(4); // Christmas + Boxing Day + New Year + Epiphany
    });

    it('should return empty array for range with no holidays', () => {
      const holidays = getHolidaysForRange('2026-02-01', '2026-02-28');
      expect(holidays.length).toBe(0);
    });
  });

  describe('isSwedishHoliday', () => {
    it('should return true for a holiday', () => {
      const result = isSwedishHoliday('2026-01-01');
      expect(result.isHoliday).toBe(true);
      expect(result.name).toBe("New Year's Day");
      expect(result.nameSv).toBe("Nyårsdagen");
    });

    it('should return false for a regular day', () => {
      const result = isSwedishHoliday('2026-01-02');
      expect(result.isHoliday).toBe(false);
      expect(result.name).toBeUndefined();
    });

    it('should handle Annandag jul correctly', () => {
      const result = isSwedishHoliday('2026-12-26');
      expect(result.isHoliday).toBe(true);
      expect(result.nameSv).toBe("Annandag jul");
    });
  });
});
