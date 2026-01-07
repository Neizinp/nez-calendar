/**
 * Nez Calendar - Main Application Entry Point
 */

import './style.css';
import { fileSystemService } from './services/FileSystemService.js';
import { calendarService } from './services/CalendarService.js';
import { MonthView } from './components/MonthView.js';
import { WeekView } from './components/WeekView.js';
import { YearView } from './components/YearView.js';
import { EventModal } from './components/EventModal.js';

class NezCalendar {
  constructor() {
    this.currentView = 'month';
    this.currentDate = new Date();
    this.view = null;
    this.modal = null;
    this.container = document.getElementById('app');
  }

  /**
   * Initialize the application
   */
  async init() {
    this.renderLayout();
    this.attachGlobalListeners();
    
    // Create event modal
    this.modal = new EventModal({
      onSave: () => this.refreshView(),
      onDelete: () => this.refreshView()
    });

    // Check for existing directory access or show welcome screen
    if (!fileSystemService.hasAccess()) {
      this.showWelcome();
    } else {
      await this.loadAndRender();
    }
  }

  /**
   * Render main layout structure
   */
  renderLayout() {
    this.container.innerHTML = `
      <header class="header">
        <div class="header-left">
          <div class="logo">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <span>Nez Calendar</span>
          </div>
        </div>
        <div class="header-center">
          <div class="nav-period">
            <button class="btn btn-icon nav-prev" aria-label="Previous">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>
            <span class="period-display"></span>
            <button class="btn btn-icon nav-next" aria-label="Next">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          </div>
          <button class="btn btn-secondary today-btn">Today</button>
        </div>
        <div class="header-right">
          <div class="view-tabs">
            <button class="view-tab" data-view="week">Week</button>
            <button class="view-tab active" data-view="month">Month</button>
            <button class="view-tab" data-view="year">Year</button>
          </div>
          <button class="btn btn-primary add-event-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Add Event
          </button>
        </div>
      </header>
      <main class="main-content"></main>
    `;

    this.mainContent = this.container.querySelector('.main-content');
    this.periodDisplay = this.container.querySelector('.period-display');
  }

  /**
   * Attach global event listeners
   */
  attachGlobalListeners() {
    // View tabs
    this.container.querySelectorAll('.view-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.switchView(tab.dataset.view);
      });
    });

    // Navigation
    this.container.querySelector('.nav-prev').addEventListener('click', () => {
      this.view?.prev();
      this.updatePeriodDisplay();
    });

    this.container.querySelector('.nav-next').addEventListener('click', () => {
      this.view?.next();
      this.updatePeriodDisplay();
    });

    this.container.querySelector('.today-btn').addEventListener('click', () => {
      this.view?.today();
      this.updatePeriodDisplay();
    });

    // Add event button
    this.container.querySelector('.add-event-btn').addEventListener('click', () => {
      this.modal.openNew();
    });

    // Listen for calendar events changes
    calendarService.addListener(() => {
      this.refreshView();
    });
  }

  /**
   * Show welcome screen for first-time setup
   */
  showWelcome() {
    this.mainContent.innerHTML = `
      <div class="welcome-screen">
        <svg class="welcome-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
        <h1 class="welcome-title">Welcome to Nez Calendar</h1>
        <p class="welcome-text">
          Your events are stored as markdown files on your computer. 
          Choose a folder to get started - all your events will be saved there as <code>.md</code> files.
        </p>
        <button class="btn btn-primary select-folder-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
          Select Folder
        </button>
        <p class="welcome-hint">
          Your browser will ask for permission to read and write files in the selected folder.
        </p>
      </div>
    `;

    this.mainContent.querySelector('.select-folder-btn').addEventListener('click', async () => {
      await this.selectFolder();
    });

    // Update period display even when showing welcome
    this.updatePeriodDisplay();
  }

  /**
   * Prompt user to select a folder
   */
  async selectFolder() {
    try {
      const success = await fileSystemService.requestDirectoryAccess();
      if (success) {
        await this.loadAndRender();
      }
    } catch (err) {
      console.error('Error selecting folder:', err);
      alert('Failed to access folder: ' + err.message);
    }
  }

  /**
   * Load events and render current view
   */
  async loadAndRender() {
    await calendarService.loadAllEvents();
    this.renderCurrentView();
  }

  /**
   * Switch to a different view
   */
  switchView(viewName) {
    if (this.currentView === viewName) return;

    this.currentView = viewName;

    // Update tab states
    this.container.querySelectorAll('.view-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.view === viewName);
    });

    this.renderCurrentView();
  }

  /**
   * Render the current view
   */
  renderCurrentView() {
    const options = {
      currentDate: this.currentDate,
      onEventClick: (id) => this.modal.openEdit(id),
      onDateClick: (date, time, allDay) => {
        this.modal.openNew(date, time, allDay !== false);
      },
      onNavigate: (date) => {
        this.currentDate = date;
        this.updatePeriodDisplay();
      },
      onMonthClick: (year, month) => {
        this.currentDate = new Date(year, month, 1);
        this.switchView('month');
      }
    };

    switch (this.currentView) {
      case 'week':
        this.view = new WeekView(this.mainContent, options);
        break;
      case 'year':
        this.view = new YearView(this.mainContent, options);
        break;
      case 'month':
      default:
        this.view = new MonthView(this.mainContent, options);
        break;
    }

    this.view.render();
    this.updatePeriodDisplay();
  }

  /**
   * Refresh the current view
   */
  refreshView() {
    this.view?.render();
  }

  /**
   * Update the period display in the header
   */
  updatePeriodDisplay() {
    if (this.view && this.periodDisplay) {
      this.periodDisplay.textContent = this.view.getPeriodDisplay();
    }
  }
}

// Initialize app
const app = new NezCalendar();
app.init();
