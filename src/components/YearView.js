/**
 * YearView - Annual overview with grid or linear layout
 * Linear view: entire year fits on one screen
 */

import { calendarService } from '../services/CalendarService.js';
import { BaseView } from './BaseView.js';
import { isToday, isWeekend, formatDate } from '../utils/dateUtils.js';
import { MONTHS } from '../constants.js';

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const DAYS_SHORT = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

// 20 columns × 19 rows = wider cells for readable text
const COLS_PER_ROW = 20;

export class YearView extends BaseView {
  constructor(container, options = {}) {
    super(container, options);
    this.onMonthClick = options.onMonthClick || (() => {});
    this.viewMode = localStorage.getItem('yearViewMode') || 'grid';
  }

  getYear() {
    return this.currentDate.getFullYear();
  }

  getPeriodDisplay() {
    return `${this.getYear()}`;
  }

  toggleViewMode() {
    this.viewMode = this.viewMode === 'grid' ? 'linear' : 'grid';
    localStorage.setItem('yearViewMode', this.viewMode);
    this.render();
  }

  toggleLayout() {
    this.toggleViewMode();
  }

  prev() {
    this.currentDate = new Date(this.currentDate.getFullYear() - 1, this.currentDate.getMonth(), 1);
    this.render();
    this.onNavigate(this.currentDate);
  }

  next() {
    this.currentDate = new Date(this.currentDate.getFullYear() + 1, this.currentDate.getMonth(), 1);
    this.render();
    this.onNavigate(this.currentDate);
  }

  getYearEvents() {
    const year = this.getYear();
    const start = `${year}-01-01`;
    const end = `${year}-12-31`;
    return calendarService.getEventsForRange(start, end);
  }

  render() {
    const events = this.getYearEvents();
    this.container.innerHTML = this.viewMode === 'grid' 
      ? this.renderGrid(events) 
      : this.renderLinear(events);
    this.attachEventListeners();
  }

  renderGrid(events) {
    const year = this.getYear();
    const eventsByDate = this.buildEventsByDate(events);
    const months = [];
    for (let month = 0; month < 12; month++) {
      months.push(this.renderMiniMonth(year, month, eventsByDate));
    }
    
    return `
      <div class="year-grid-container">
        <div class="year-grid">${months.join('')}</div>
      </div>
    `;
  }

  buildEventsByDate(events) {
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
    return eventsByDate;
  }

  renderMiniMonth(year, month, eventsByDate) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const dayOfWeek = firstDay.getDay();
    const startDayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const daysInMonth = lastDay.getDate();

    const headers = DAYS.map(d => `<div class="mini-day-header">${d}</div>`).join('');
    const days = [];
    
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push('<div class="mini-day other-month"></div>');
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = calendarService.formatDate(date);
      const dayIsToday = isToday(date);
      const dayEvents = eventsByDate.get(dateStr) || [];

      const classes = ['mini-day'];
      if (dayIsToday) classes.push('today');
      if (dayEvents.length > 0) classes.push('has-events');

      // Show up to 2 events with names
      const eventDots = dayEvents.slice(0, 2).map(e => 
        `<div class="mini-event" style="background:${e.color}" title="${this.escapeHtml(e.title)}">${this.escapeHtml(e.title)}</div>`
      ).join('');
      const more = dayEvents.length > 2 ? `<div class="mini-more">+${dayEvents.length - 2}</div>` : '';

      days.push(`<div class="${classes.join(' ')}" data-date="${dateStr}"><span class="mini-day-num">${day}</span>${eventDots}${more}</div>`);
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

  renderLinear(events) {
    const year = this.getYear();
    const allDays = this.buildAllDaysForYear(year);
    const rows = this.buildLinearRows(allDays, events);

    return `
      <div class="year-linear">
        <div class="year-linear-grid">
          ${rows}
        </div>
      </div>
    `;
  }

  buildAllDaysForYear(year) {
    const days = [];
    let current = new Date(year, 0, 1);
    while (current.getFullYear() === year) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return days;
  }

  buildLinearRows(allDays, events) {
    const rows = [];
    
    for (let i = 0; i < allDays.length; i += COLS_PER_ROW) {
      const rowDays = allDays.slice(i, i + COLS_PER_ROW);
      rows.push(this.renderLinearRow(rowDays, events, i === 0));
    }

    return rows.join('');
  }

  renderLinearRow(rowDays, events, isFirstRow) {
    const dayCells = rowDays.map((date, idx) => {
      const dateStr = calendarService.formatDate(date);
      const dayIsToday = isToday(date);
      const dayIsWeekend = isWeekend(date);
      const dayName = DAYS_SHORT[date.getDay()];
      const isFirstOfMonth = date.getDate() === 1;
      const showMonthBanner = isFirstOfMonth || (idx === 0 && isFirstRow);

      const classes = ['yl-day'];
      if (dayIsToday) classes.push('today');
      if (dayIsWeekend) classes.push('weekend');

      const monthBanner = showMonthBanner 
        ? `<div class="yl-month-banner">${MONTHS[date.getMonth()]}</div>` 
        : '';

      return `<div class="${classes.join(' ')}" data-date="${dateStr}">${monthBanner}<span class="yl-abbr">${dayName}</span><span class="yl-num">${date.getDate()}</span></div>`;
    }).join('');

    const emptyCells = COLS_PER_ROW - rowDays.length;
    const emptyHtml = '<div class="yl-day empty"></div>'.repeat(emptyCells);

    const rowStart = rowDays[0];
    const rowEnd = rowDays[rowDays.length - 1];
    const rowStartStr = calendarService.formatDate(rowStart);
    const rowEndStr = calendarService.formatDate(rowEnd);

    const rowEvents = events.filter(event => {
      const eStart = event.startDate;
      const eEnd = event.endDate || event.startDate;
      return eStart <= rowEndStr && eEnd >= rowStartStr;
    });

    // Render up to 3 events per row
    const eventBars = rowEvents.slice(0, 3).map((event) => {
      const eStartStr = event.startDate;
      const eEndStr = event.endDate || event.startDate;
      
      // Find first day >= event start
      let startIdx = -1;
      for (let j = 0; j < rowDays.length; j++) {
        const dayStr = calendarService.formatDate(rowDays[j]);
        if (dayStr >= eStartStr) { startIdx = j; break; }
      }
      if (startIdx === -1) startIdx = 0;
      
      // Find last day <= event end  
      let endIdx = -1;
      for (let j = rowDays.length - 1; j >= 0; j--) {
        const dayStr = calendarService.formatDate(rowDays[j]);
        if (dayStr <= eEndStr) { endIdx = j; break; }
      }
      if (endIdx === -1) endIdx = rowDays.length - 1;
      
      // Clamp to row boundaries
      startIdx = Math.max(0, startIdx);
      endIdx = Math.min(rowDays.length - 1, endIdx);
      
      const span = Math.max(1, endIdx - startIdx + 1);
      const leftPercent = (startIdx / COLS_PER_ROW) * 100;
      const widthPercent = (span / COLS_PER_ROW) * 100;

      return `<div class="yl-bar" style="left:${leftPercent}%;width:calc(${widthPercent}% - 2px);background:${event.color}">${this.escapeHtml(event.title)}</div>`;
    }).join('');

    return `
      <div class="yl-row">
        <div class="yl-days">${dayCells}${emptyHtml}</div>
        <div class="yl-events">${eventBars}</div>
      </div>
    `;
  }

  attachEventListeners() {
    const toggleBtn = this.container.querySelector('.year-view-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.toggleViewMode());
    }

    // Month title click -> navigate to month
    this.container.querySelectorAll('.mini-month-title').forEach(title => {
      title.addEventListener('click', (e) => {
        e.stopPropagation();
        const month = parseInt(title.closest('.mini-month').dataset.month);
        this.onMonthClick(this.getYear(), month);
      });
    });

    // Day cell click -> create event (grid view)
    this.container.querySelectorAll('.mini-day[data-date]').forEach(cell => {
      cell.addEventListener('click', (e) => {
        e.stopPropagation();
        const dateStr = cell.dataset.date;
        if (dateStr) {
          this.onDateClick(dateStr, null, true);
        }
      });
    });

    // Day cell click -> create event (linear view)
    this.container.querySelectorAll('.yl-day[data-date]').forEach(cell => {
      cell.addEventListener('click', () => {
        const dateStr = cell.dataset.date;
        if (dateStr) {
          this.onDateClick(dateStr, null, true);
        }
      });
    });
  }
}
