/**
 * WeekView - Detailed weekly schedule with hourly slots
 */

import { calendarService } from '../services/CalendarService.js';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export class WeekView {
  constructor(container, options = {}) {
    this.container = container;
    this.currentDate = options.currentDate || new Date();
    this.onEventClick = options.onEventClick || (() => {});
    this.onDateClick = options.onDateClick || (() => {});
    this.onNavigate = options.onNavigate || (() => {});
    this.startHour = 0;
    this.endHour = 24;
  }

  /**
   * Get start of week (Sunday)
   */
  getWeekStart() {
    const d = new Date(this.currentDate);
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
    return d;
  }

  /**
   * Get end of week (Saturday)
   */
  getWeekEnd() {
    const start = this.getWeekStart();
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return end;
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
   * Format time for display (12h format)
   */
  formatTime(timeStr) {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  }

  /**
   * Format hour for time column
   */
  formatHour(hour) {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    if (hour < 12) return `${hour} AM`;
    return `${hour - 12} PM`;
  }

  /**
   * Get period display string
   */
  getPeriodDisplay() {
    const start = this.getWeekStart();
    const end = this.getWeekEnd();
    
    if (start.getMonth() === end.getMonth()) {
      return `${MONTHS[start.getMonth()]} ${start.getDate()} - ${end.getDate()}, ${start.getFullYear()}`;
    } else if (start.getFullYear() === end.getFullYear()) {
      return `${MONTHS[start.getMonth()].substring(0, 3)} ${start.getDate()} - ${MONTHS[end.getMonth()].substring(0, 3)} ${end.getDate()}, ${start.getFullYear()}`;
    } else {
      return `${MONTHS[start.getMonth()].substring(0, 3)} ${start.getDate()}, ${start.getFullYear()} - ${MONTHS[end.getMonth()].substring(0, 3)} ${end.getDate()}, ${end.getFullYear()}`;
    }
  }

  /**
   * Navigate to previous week
   */
  prev() {
    this.currentDate = new Date(this.currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    this.render();
    this.onNavigate(this.currentDate);
  }

  /**
   * Navigate to next week
   */
  next() {
    this.currentDate = new Date(this.currentDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    this.render();
    this.onNavigate(this.currentDate);
  }

  /**
   * Go to today
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
   * Convert time string to minutes from midnight
   */
  timeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Calculate event position and height
   */
  getEventPosition(event) {
    const startMinutes = this.timeToMinutes(event.startTime || '00:00');
    const endMinutes = this.timeToMinutes(event.endTime || '23:59');
    
    const top = (startMinutes / 60) * 48; // 48px per hour
    const height = Math.max(((endMinutes - startMinutes) / 60) * 48, 24); // min 24px
    
    return { top, height };
  }

  /**
   * Render the week view
   */
  render() {
    const weekStart = this.getWeekStart();
    const weekEnd = this.getWeekEnd();
    
    const events = calendarService.getEventsForRange(
      calendarService.formatDate(weekStart),
      calendarService.formatDate(weekEnd)
    );

    // Separate all-day and timed events by day
    const allDayByDate = new Map();
    const timedByDate = new Map();

    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      const dateStr = calendarService.formatDate(d);
      allDayByDate.set(dateStr, []);
      timedByDate.set(dateStr, []);
    }

    for (const event of events) {
      const start = new Date(event.startDate);
      const end = new Date(event.endDate || event.startDate);
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = calendarService.formatDate(d);
        if (allDayByDate.has(dateStr)) {
          if (event.allDay || (event.endDate && event.endDate !== event.startDate)) {
            allDayByDate.get(dateStr).push(event);
          } else {
            timedByDate.get(dateStr).push(event);
          }
        }
      }
    }

    this.container.innerHTML = `
      <div class="week-container">
        ${this.renderHeader(weekStart)}
        ${this.renderAllDayRow(allDayByDate)}
        <div class="week-grid">
          ${this.renderTimeColumn()}
          ${this.renderDayColumns(weekStart, timedByDate)}
        </div>
      </div>
    `;

    this.attachEventListeners();
    
    // Scroll to ~8am
    const grid = this.container.querySelector('.week-grid');
    if (grid) {
      grid.scrollTop = 8 * 48;
    }
  }

  /**
   * Render week header with day names and numbers
   */
  renderHeader(weekStart) {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      const isToday = this.isToday(d);
      
      days.push(`
        <div class="week-header-cell ${isToday ? 'today' : ''}">
          <div class="week-day-name">${DAYS[i]}</div>
          <div class="week-day-number">${d.getDate()}</div>
        </div>
      `);
    }

    return `
      <div class="week-header">
        <div class="week-header-cell" style="border: none;"></div>
        ${days.join('')}
      </div>
    `;
  }

  /**
   * Render all-day events row
   */
  renderAllDayRow(allDayByDate) {
    const cells = [];
    
    for (const [dateStr, events] of allDayByDate) {
      cells.push(`
        <div class="week-all-day-cell" data-date="${dateStr}">
          ${events.map(event => `
            <div class="event-pill all-day" data-id="${event.id}"
                 style="background-color: ${event.color}">
              ${this.escapeHtml(event.title)}
            </div>
          `).join('')}
        </div>
      `);
    }

    return `
      <div class="week-all-day">
        <div class="week-all-day-label">all-day</div>
        ${cells.join('')}
      </div>
    `;
  }

  /**
   * Render time column
   */
  renderTimeColumn() {
    const slots = [];
    for (let h = this.startHour; h < this.endHour; h++) {
      slots.push(`
        <div class="week-time-slot">
          <span class="week-time-label">${this.formatHour(h)}</span>
        </div>
      `);
    }
    return `<div class="week-time-column">${slots.join('')}</div>`;
  }

  /**
   * Render day columns with timed events
   */
  renderDayColumns(weekStart, timedByDate) {
    const columns = [];
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      const dateStr = calendarService.formatDate(d);
      const events = timedByDate.get(dateStr) || [];

      // Render hour slots
      const slots = [];
      for (let h = this.startHour; h < this.endHour; h++) {
        slots.push(`<div class="week-hour-slot" data-date="${dateStr}" data-hour="${h}"></div>`);
      }

      // Render positioned events
      const eventElements = events.map(event => {
        const { top, height } = this.getEventPosition(event);
        return `
          <div class="week-event" data-id="${event.id}"
               style="top: ${top}px; height: ${height}px; background-color: ${event.color}">
            <div class="week-event-time">${this.formatTime(event.startTime)}</div>
            <div class="week-event-title">${this.escapeHtml(event.title)}</div>
          </div>
        `;
      }).join('');

      columns.push(`
        <div class="week-day-column">
          ${slots.join('')}
          ${eventElements}
        </div>
      `);
    }

    return columns.join('');
  }

  /**
   * Escape HTML entities
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Hour slot click -> create event at that time
    this.container.querySelectorAll('.week-hour-slot').forEach(slot => {
      slot.addEventListener('click', () => {
        const date = slot.dataset.date;
        const hour = slot.dataset.hour;
        this.onDateClick(date, `${hour.padStart(2, '0')}:00`);
      });
    });

    // All-day cell click -> create all-day event
    this.container.querySelectorAll('.week-all-day-cell').forEach(cell => {
      cell.addEventListener('click', (e) => {
        if (!e.target.closest('.event-pill')) {
          const date = cell.dataset.date;
          this.onDateClick(date, null, true);
        }
      });
    });

    // Event click -> edit event
    this.container.querySelectorAll('.event-pill, .week-event').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = el.dataset.id;
        this.onEventClick(id);
      });
    });
  }
}
