/**
 * EventModal - Create and edit calendar events
 */

import { calendarService } from '../services/CalendarService.js';

const EVENT_COLORS = [
  '#8b5cf6', // purple
  '#3b82f6', // blue
  '#22c55e', // green
  '#eab308', // yellow
  '#ef4444', // red
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
];

export class EventModal {
  constructor(options = {}) {
    this.onSave = options.onSave || (() => {});
    this.onDelete = options.onDelete || (() => {});
    this.onClose = options.onClose || (() => {});
    this.event = null;
    this.isNew = true;
    this.overlay = null;
    this.createOverlay();
  }

  /**
   * Create the modal overlay element
   */
  createOverlay() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'modal-overlay';
    this.overlay.innerHTML = this.getModalHTML();
    document.body.appendChild(this.overlay);

    // Close on overlay click
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.close();
      }
    });

    // Close on escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.overlay.classList.contains('open')) {
        this.close();
      }
    });
  }

  /**
   * Get modal HTML structure
   */
  getModalHTML() {
    return `
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">New Event</h3>
          <button class="modal-close" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label" for="event-title">Title</label>
            <input type="text" id="event-title" class="form-input" placeholder="Event title" autofocus>
          </div>

          <div class="form-group">
            <div class="checkbox-group">
              <input type="checkbox" id="event-allday" class="checkbox" checked>
              <label class="checkbox-label" for="event-allday">All day</label>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="event-start-date">Start Date</label>
              <input type="date" id="event-start-date" class="form-input">
            </div>
            <div class="form-group time-field">
              <label class="form-label" for="event-start-time">Start Time</label>
              <input type="time" id="event-start-time" class="form-input">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="event-end-date">End Date</label>
              <input type="date" id="event-end-date" class="form-input">
            </div>
            <div class="form-group time-field">
              <label class="form-label" for="event-end-time">End Time</label>
              <input type="time" id="event-end-time" class="form-input">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Color</label>
            <div class="color-picker">
              ${EVENT_COLORS.map(color => `
                <div class="color-option" data-color="${color}" style="background-color: ${color}"></div>
              `).join('')}
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="event-description">Description</label>
            <textarea id="event-description" class="form-input" placeholder="Add notes or description (markdown supported)"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary delete-btn hidden">Delete</button>
          <div style="flex: 1"></div>
          <button class="btn btn-secondary cancel-btn">Cancel</button>
          <button class="btn btn-primary save-btn">Save</button>
        </div>
      </div>
    `;
  }

  /**
   * Open modal for new event
   */
  openNew(date = null, time = null, allDay = true) {
    this.isNew = true;
    this.event = {
      title: '',
      startDate: date || calendarService.formatDate(new Date()),
      endDate: date || calendarService.formatDate(new Date()),
      startTime: time || '09:00',
      endTime: time ? this.addHour(time) : '10:00',
      allDay: allDay,
      color: EVENT_COLORS[0],
      description: ''
    };

    this.populateForm();
    this.show();
  }

  /**
   * Open modal for editing existing event
   */
  openEdit(eventId) {
    const event = calendarService.getAllEvents().find(e => e.id === eventId);
    if (!event) return;

    this.isNew = false;
    this.event = { ...event };
    this.populateForm();
    this.show();
  }

  /**
   * Add one hour to a time string
   */
  addHour(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const newHours = (hours + 1) % 24;
    return `${String(newHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  /**
   * Populate form with event data
   */
  populateForm() {
    const modal = this.overlay.querySelector('.modal');
    
    // Update title
    modal.querySelector('.modal-title').textContent = this.isNew ? 'New Event' : 'Edit Event';
    
    // Populate fields
    modal.querySelector('#event-title').value = this.event.title;
    modal.querySelector('#event-allday').checked = this.event.allDay;
    modal.querySelector('#event-start-date').value = this.event.startDate;
    modal.querySelector('#event-end-date').value = this.event.endDate || this.event.startDate;
    modal.querySelector('#event-start-time').value = this.event.startTime || '09:00';
    modal.querySelector('#event-end-time').value = this.event.endTime || '10:00';
    modal.querySelector('#event-description').value = this.event.description || '';

    // Show/hide time fields
    this.toggleTimeFields(this.event.allDay);

    // Select color
    modal.querySelectorAll('.color-option').forEach(opt => {
      opt.classList.toggle('selected', opt.dataset.color === this.event.color);
    });

    // Show/hide delete button
    modal.querySelector('.delete-btn').classList.toggle('hidden', this.isNew);
  }

  /**
   * Toggle time field visibility
   */
  toggleTimeFields(allDay) {
    const timeFields = this.overlay.querySelectorAll('.time-field');
    timeFields.forEach(field => {
      field.style.display = allDay ? 'none' : 'block';
    });
  }

  /**
   * Show the modal
   */
  show() {
    this.overlay.classList.add('open');
    this.attachFormListeners();

    // Focus title input
    setTimeout(() => {
      this.overlay.querySelector('#event-title').focus();
    }, 50);
  }

  /**
   * Close the modal
   */
  close() {
    this.overlay.classList.remove('open');
    this.onClose();
  }

  /**
   * Attach form event listeners
   */
  attachFormListeners() {
    const modal = this.overlay.querySelector('.modal');

    // Close button
    modal.querySelector('.modal-close').onclick = () => this.close();
    modal.querySelector('.cancel-btn').onclick = () => this.close();

    // All-day toggle
    modal.querySelector('#event-allday').onchange = (e) => {
      this.toggleTimeFields(e.target.checked);
    };

    // Color picker
    modal.querySelectorAll('.color-option').forEach(opt => {
      opt.onclick = () => {
        modal.querySelectorAll('.color-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
      };
    });

    // Save button
    modal.querySelector('.save-btn').onclick = () => this.save();

    // Delete button
    modal.querySelector('.delete-btn').onclick = () => this.delete();

    // Enter to save
    modal.querySelector('#event-title').onkeydown = (e) => {
      if (e.key === 'Enter') {
        this.save();
      }
    };
  }

  /**
   * Gather form data
   */
  getFormData() {
    const modal = this.overlay.querySelector('.modal');
    const allDay = modal.querySelector('#event-allday').checked;
    const selectedColor = modal.querySelector('.color-option.selected');

    return {
      title: modal.querySelector('#event-title').value.trim() || 'Untitled',
      startDate: modal.querySelector('#event-start-date').value,
      endDate: modal.querySelector('#event-end-date').value,
      startTime: allDay ? null : modal.querySelector('#event-start-time').value,
      endTime: allDay ? null : modal.querySelector('#event-end-time').value,
      allDay: allDay,
      color: selectedColor ? selectedColor.dataset.color : EVENT_COLORS[0],
      description: modal.querySelector('#event-description').value
    };
  }

  /**
   * Save the event
   */
  async save() {
    const data = this.getFormData();

    try {
      if (this.isNew) {
        await calendarService.createEvent(data);
      } else {
        await calendarService.updateEvent(this.event.id, data);
      }

      this.close();
      this.onSave();
    } catch (err) {
      console.error('Error saving event:', err);
      alert('Failed to save event: ' + err.message);
    }
  }

  /**
   * Delete the event
   */
  async delete() {
    if (!confirm('Delete this event?')) return;

    try {
      await calendarService.deleteEvent(this.event.id);
      this.close();
      this.onDelete();
    } catch (err) {
      console.error('Error deleting event:', err);
      alert('Failed to delete event: ' + err.message);
    }
  }
}
