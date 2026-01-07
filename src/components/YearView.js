/**
 * YearView - Annual overview with mini-month cards
 */

import { calendarService } from '../services/CalendarService.js';

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export class YearView {
  constructor(container, options = {}) {
    this.container = container;
    this.currentDate = options.currentDate || new Date();
    this.onMonthClick = options.onMonthClick || (() => {});
    this.onNavigate = options.onNavigate || (() => {});
  }

  /**
   * Get the current year
   */
  getYear() {
    return this.currentDate.getFullYear();
  }

  /**
   * Check if a date is today
   */
  isToday(date) {
    const today = new Date();
    return date.getFullYear() === today.getFullYear() &&
           date.getMonth() === today.getMonth() &&
           date.getDate() === today.getDate();
  }

  /**
   * Get period display string
   */
  getPeriodDisplay() {
    return `${this.getYear()}`;
  }

  /**
   * Navigate to previous year
   */
  prev() {
    this.currentDate = new Date(this.currentDate.getFullYear() - 1, this.currentDate.getMonth(), 1);
    this.render();
    this.onNavigate(this.currentDate);
  }

  /**
   * Navigate to next year
   */
  next() {
    this.currentDate = new Date(this.currentDate.getFullYear() + 1, this.currentDate.getMonth(), 1);
    this.render();
    this.onNavigate(this.currentDate);
  }

  /**
   * Go to current year
   */
  today() {
    this.currentDate = new Date();
    this.render();
    this.onNavigate(this.currentDate);
  }

  /**
   * Set current date
   */
  setDate(date) {
    this.currentDate = new Date(date);
    this.render();
  }

  /**
   * Get events for the entire year
   */
  getYearEvents() {
    const year = this.getYear();
    const start = `${year}-01-01`;
    const end = `${year}-12-31`;
    return calendarService.getEventsForRange(start, end);
  }

  /**
   * Build a set of dates that have events
   */
  buildEventDates(events) {
    const dates = new Set();
    
    for (const event of events) {
      const start = new Date(event.startDate);
      const end = new Date(event.endDate || event.startDate);
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.add(calendarService.formatDate(d));
      }
    }
    
    return dates;
  }

  /**
   * Render the year view
   */
  render() {
    const events = this.getYearEvents();
    const eventDates = this.buildEventDates(events);

    this.container.innerHTML = `
      <div class="year-grid">
        ${this.renderMonths(eventDates)}
      </div>
    `;

    this.attachEventListeners();
  }

  /**
   * Render all 12 mini-month cards
   */
  renderMonths(eventDates) {
    const year = this.getYear();
    const months = [];

    for (let month = 0; month < 12; month++) {
      months.push(this.renderMiniMonth(year, month, eventDates));
    }

    return months.join('');
  }

  /**
   * Render a single mini-month card
   */
  renderMiniMonth(year, month, eventDates) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    // Day headers
    const headers = DAYS.map(d => `<div class="mini-day-header">${d}</div>`).join('');

    // Day cells
    const days = [];
    
    // Empty cells before first day
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push('<div class="mini-day other-month"></div>');
    }

    // Actual days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = calendarService.formatDate(date);
      const isToday = this.isToday(date);
      const hasEvents = eventDates.has(dateStr);

      const classes = ['mini-day'];
      if (isToday) classes.push('today');
      if (hasEvents) classes.push('has-events');

      days.push(`<div class="${classes.join(' ')}">${day}</div>`);
    }

    return `
      <div class="mini-month" data-month="${month}">
        <div class="mini-month-title">${MONTHS[month]}</div>
        <div class="mini-month-grid">
          ${headers}
          ${days.join('')}
        </div>
      </div>
    `;
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    this.container.querySelectorAll('.mini-month').forEach(card => {
      card.addEventListener('click', () => {
        const month = parseInt(card.dataset.month);
        this.onMonthClick(this.getYear(), month);
      });
    });
  }
}
