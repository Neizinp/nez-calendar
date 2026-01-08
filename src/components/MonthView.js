/**
 * MonthView - Classic calendar grid layout
 */

import { calendarService } from '../services/CalendarService.js';
import { BaseView } from './BaseView.js';
import { isToday } from '../utils/dateUtils.js';
import { DAYS, MONTHS } from '../constants.js';

export class MonthView extends BaseView {
  constructor(container, options = {}) {
    super(container, options);
  }

  /**
   * Get the first day of the month grid (may be in prev month)
   */
  getGridStart() {
    const firstOfMonth = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
    const dayOfWeek = firstOfMonth.getDay();
    // Monday = 0 offset, Sunday = 6 offset
    const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const start = new Date(firstOfMonth);
    start.setDate(start.getDate() - offset);
    return start;
  }

  /**
   * Get the last day of the month grid (may be in next month)
   */
  getGridEnd() {
    const start = this.getGridStart();
    const end = new Date(start);
    end.setDate(end.getDate() + 41); // 6 weeks
    return end;
  }

  /**
   * Check if a date is in the current month
   */
  isCurrentMonth(date) {
    return date.getMonth() === this.currentDate.getMonth();
  }

  /**
   * Format time for display (24h)
   */
  formatTime(timeStr) {
    if (!timeStr) return '';
    return timeStr; // Already in HH:MM format
  }

  /**
   * Get period display string
   */
  getPeriodDisplay() {
    return `${MONTHS[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`;
  }

  /**
   * Navigate to previous month
   */
  prev() {
    this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() - 1, 1);
    this.render();
    this.onNavigate(this.currentDate);
  }

  /**
   * Navigate to next month
   */
  next() {
    this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 1);
    this.render();
    this.onNavigate(this.currentDate);
  }

  /**
   * Render the month view
   */
  render() {
    const events = calendarService.getEventsForRange(
      calendarService.formatDate(this.getGridStart()),
      calendarService.formatDate(this.getGridEnd())
    );

    // Build events by date lookup
    const eventsByDate = new Map();
    for (const event of events) {
      const start = new Date(event.startDate);
      const end = new Date(event.endDate || event.startDate);
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = calendarService.formatDate(d);
        if (!eventsByDate.has(dateStr)) {
          eventsByDate.set(dateStr, []);
        }
        eventsByDate.get(dateStr).push(event);
      }
    }

    this.container.innerHTML = `
      <div class="calendar-container">
        <div class="calendar-header">
          ${DAYS.map(day => `<div class="day-header">${day}</div>`).join('')}
        </div>
        <div class="month-grid">
          ${this.renderDays(eventsByDate)}
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  /**
   * Render day cells
   */
  renderDays(eventsByDate) {
    const cells = [];
    const gridStart = this.getGridStart();
    const current = new Date(gridStart);

    for (let i = 0; i < 42; i++) {
      const dateStr = calendarService.formatDate(current);
      const dayEvents = eventsByDate.get(dateStr) || [];
      const isToday = this.isToday(current);
      const isCurrentMonth = this.isCurrentMonth(current);

      const classes = ['day-cell'];
      if (!isCurrentMonth) classes.push('other-month');
      if (isToday) classes.push('today');

      cells.push(`
        <div class="${classes.join(' ')}" data-date="${dateStr}">
          <div class="day-number">${current.getDate()}</div>
          <div class="day-events">
            ${this.renderDayEvents(dayEvents, dateStr)}
          </div>
        </div>
      `);

      current.setDate(current.getDate() + 1);
    }

    return cells.join('');
  }

  /**
   * Render events for a day
   */
  renderDayEvents(events, dateStr) {
    const maxVisible = 3;
    const sorted = [...events].sort((a, b) => {
      // All-day first, then by time
      if (a.allDay && !b.allDay) return -1;
      if (!a.allDay && b.allDay) return 1;
      return (a.startTime || '').localeCompare(b.startTime || '');
    });

    const visible = sorted.slice(0, maxVisible);
    const remaining = sorted.length - maxVisible;

    let html = visible.map(event => {
      const isMultiDay = event.endDate && event.endDate !== event.startDate;
      const isStart = event.startDate === dateStr;
      const isEnd = event.endDate === dateStr;
      
      if (event.allDay || isMultiDay) {
        // All-day or multi-day: show as solid pill
        let title = event.title;
        if (isMultiDay && !isStart) {
          title = `↳ ${event.title}`;
        }
        return `
          <div class="event-pill all-day" data-id="${event.id}" 
               style="background-color: ${event.color}">
            ${this.escapeHtml(title)}
          </div>
        `;
      } else {
        // Timed event: show with time
        return `
          <div class="event-pill timed" data-id="${event.id}"
               style="border-color: ${event.color}">
            <span class="event-time">${this.formatTime(event.startTime)}</span>
            ${this.escapeHtml(event.title)}
          </div>
        `;
      }
    }).join('');

    if (remaining > 0) {
      html += `<div class="more-events">+${remaining} more</div>`;
    }

    return html;
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
    // Day click -> create event
    this.container.querySelectorAll('.day-cell').forEach(cell => {
      cell.addEventListener('click', (e) => {
        if (!e.target.closest('.event-pill')) {
          const date = cell.dataset.date;
          this.onDateClick(date);
        }
      });
    });

    // Event click -> edit event
    this.container.querySelectorAll('.event-pill').forEach(pill => {
      pill.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = pill.dataset.id;
        this.onEventClick(id);
      });
    });
  }
}
