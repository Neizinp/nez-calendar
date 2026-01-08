/**
 * BaseView - Shared base class for calendar views
 * Provides common constructor, navigation, and utility methods
 */

import { isToday, formatDate } from '../utils/dateUtils.js';

export class BaseView {
  constructor(container, options = {}) {
    this.container = container;
    this.currentDate = options.currentDate || new Date();
    this.onEventClick = options.onEventClick || (() => {});
    this.onDateClick = options.onDateClick || (() => {});
    this.onNavigate = options.onNavigate || (() => {});
  }

  /**
   * Navigate to today
   */
  today() {
    this.currentDate = new Date();
    this.render();
    this.onNavigate(this.currentDate);
  }

  /**
   * Set a specific date
   */
  setDate(date) {
    this.currentDate = new Date(date);
    this.render();
  }

  /**
   * Get period display string (override in subclass)
   */
  getPeriodDisplay() {
    return '';
  }

  /**
   * Render the view (override in subclass)
   */
  render() {
    throw new Error('render() must be implemented by subclass');
  }

  /**
   * Navigate to previous period (override in subclass)
   */
  prev() {
    throw new Error('prev() must be implemented by subclass');
  }

  /**
   * Navigate to next period (override in subclass)
   */
  next() {
    throw new Error('next() must be implemented by subclass');
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
   * Check if date is today (convenience wrapper)
   */
  isToday(date) {
    return isToday(date);
  }

  /**
   * Format date (convenience wrapper)
   */
  formatDate(date) {
    return formatDate(date);
  }
}
