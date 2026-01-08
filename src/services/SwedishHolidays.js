/**
 * SwedishHolidays - Calculate Swedish public holidays
 * Includes fixed holidays and Easter-based moveable holidays
 */

/**
 * Calculate Easter Sunday using the Anonymous Gregorian algorithm
 * @param {number} year
 * @returns {Date}
 */
function calculateEaster(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  
  return new Date(year, month - 1, day);
}

/**
 * Add days to a date
 * @param {Date} date
 * @param {number} days
 * @returns {Date}
 */
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Find the Saturday between two dates (for Midsummer and All Saints)
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {Date}
 */
function findSaturdayBetween(startDate, endDate) {
  let current = new Date(startDate);
  while (current <= endDate) {
    if (current.getDay() === 6) {
      return current;
    }
    current.setDate(current.getDate() + 1);
  }
  return null;
}

/**
 * Format date as YYYY-MM-DD
 * @param {Date} date
 * @returns {string}
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Memoization cache for holiday calculations
const holidayCache = new Map();

/**
 * Get all Swedish public holidays for a given year (memoized)
 * @param {number} year
 * @returns {Array<{date: string, name: string, nameSv: string}>}
 */
export function getSwedishHolidays(year) {
  // Return cached result if available
  if (holidayCache.has(year)) {
    return holidayCache.get(year);
  }

  const holidays = [];
  
  // Fixed holidays
  holidays.push({
    date: `${year}-01-01`,
    name: "New Year's Day",
    nameSv: "Nyårsdagen"
  });
  
  holidays.push({
    date: `${year}-01-06`,
    name: "Epiphany",
    nameSv: "Trettondedag jul"
  });
  
  holidays.push({
    date: `${year}-05-01`,
    name: "May Day",
    nameSv: "Första maj"
  });
  
  holidays.push({
    date: `${year}-06-06`,
    name: "National Day of Sweden",
    nameSv: "Sveriges nationaldag"
  });
  
  holidays.push({
    date: `${year}-12-25`,
    name: "Christmas Day",
    nameSv: "Juldagen"
  });
  
  holidays.push({
    date: `${year}-12-26`,
    name: "Second Day of Christmas",
    nameSv: "Annandag jul"
  });
  
  // Easter-based holidays
  const easter = calculateEaster(year);
  
  holidays.push({
    date: formatDate(addDays(easter, -2)),
    name: "Good Friday",
    nameSv: "Långfredagen"
  });
  
  holidays.push({
    date: formatDate(easter),
    name: "Easter Sunday",
    nameSv: "Påskdagen"
  });
  
  holidays.push({
    date: formatDate(addDays(easter, 1)),
    name: "Easter Monday",
    nameSv: "Annandag påsk"
  });
  
  holidays.push({
    date: formatDate(addDays(easter, 39)),
    name: "Ascension Day",
    nameSv: "Kristi himmelsfärdsdag"
  });
  
  holidays.push({
    date: formatDate(addDays(easter, 49)),
    name: "Whit Sunday",
    nameSv: "Pingstdagen"
  });
  
  // Midsummer Day - Saturday between June 20-26
  const midsummer = findSaturdayBetween(
    new Date(year, 5, 20),
    new Date(year, 5, 26)
  );
  if (midsummer) {
    holidays.push({
      date: formatDate(midsummer),
      name: "Midsummer Day",
      nameSv: "Midsommardagen"
    });
  }
  
  // All Saints' Day - Saturday between October 31 - November 6
  const allSaints = findSaturdayBetween(
    new Date(year, 9, 31),
    new Date(year, 10, 6)
  );
  if (allSaints) {
    holidays.push({
      date: formatDate(allSaints),
      name: "All Saints' Day",
      nameSv: "Alla helgons dag"
    });
  }
  
  // Sort by date
  holidays.sort((a, b) => a.date.localeCompare(b.date));
  
  // Cache the result
  holidayCache.set(year, holidays);
  
  return holidays;
}

/**
 * Get holidays for a date range (useful for multi-year queries)
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @returns {Array<{date: string, name: string, nameSv: string}>}
 */
export function getHolidaysForRange(startDate, endDate) {
  const startYear = parseInt(startDate.substring(0, 4));
  const endYear = parseInt(endDate.substring(0, 4));
  const holidays = [];
  
  for (let year = startYear; year <= endYear; year++) {
    const yearHolidays = getSwedishHolidays(year);
    holidays.push(...yearHolidays.filter(h => h.date >= startDate && h.date <= endDate));
  }
  
  return holidays;
}

/**
 * Check if a specific date is a Swedish holiday
 * @param {string} dateStr - YYYY-MM-DD
 * @returns {{isHoliday: boolean, name?: string, nameSv?: string}}
 */
export function isSwedishHoliday(dateStr) {
  const year = parseInt(dateStr.substring(0, 4));
  const holidays = getSwedishHolidays(year);
  const holiday = holidays.find(h => h.date === dateStr);
  
  if (holiday) {
    return { isHoliday: true, name: holiday.name, nameSv: holiday.nameSv };
  }
  return { isHoliday: false };
}
