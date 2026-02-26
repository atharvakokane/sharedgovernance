/**
 * VT Shared Governance Tracker - Shared Utilities
 * Handles data loading, localStorage persistence, and common helpers.
 * 
 * Note: GitHub Pages serves static files. Submissions and admin edits
 * are stored in localStorage. Use Export to save submissions for backup.
 */

const GOV_STORAGE_KEYS = {
  SESSION: 'vt_gov_session',
  SUBMISSIONS: 'vt_gov_submissions',
  MEETINGS_OVERRIDE: 'vt_gov_meetings_override',
  ASSIGNMENTS_OVERRIDE: 'vt_gov_assignments_override'
};

/**
 * Fetches JSON data from the /data folder.
 * Uses relative path for GitHub Pages compatibility.
 * @param {string} filename - Name of JSON file (e.g., 'users.json')
 * @returns {Promise<Object|Array>} Parsed JSON data
 */
async function fetchData(filename) {
  // Use path relative to current page for GitHub Pages compatibility
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  const last = pathParts[pathParts.length - 1];
  if (last && last.includes('.')) pathParts.pop(); // Remove current file
  const basePath = pathParts.length ? '/' + pathParts.join('/') : '';
  const response = await fetch(`${basePath}/data/${filename}`);
  if (!response.ok) throw new Error(`Failed to load ${filename}`);
  return response.json();
}

/**
 * Gets all submissions from localStorage.
 * Merges with initial submissions.json if it has data (for import scenarios).
 * @returns {Array} Array of submission objects
 */
function getSubmissions() {
  try {
    const stored = localStorage.getItem(GOV_STORAGE_KEYS.SUBMISSIONS);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Saves a new submission to localStorage.
 * @param {Object} submission - Submission object
 */
function saveSubmission(submission) {
  const submissions = getSubmissions();
  submissions.push(submission);
  localStorage.setItem(GOV_STORAGE_KEYS.SUBMISSIONS, JSON.stringify(submissions));
}

/**
 * Gets meetings - uses localStorage override if admin has edited, else fetches from JSON.
 * @param {Array} meetingsFromFile - Meetings loaded from meetings.json
 * @returns {Array} Merged/override meetings
 */
function getMeetingsWithOverride(meetingsFromFile) {
  try {
    const override = localStorage.getItem(GOV_STORAGE_KEYS.MEETINGS_OVERRIDE);
    if (override) return JSON.parse(override);
  } catch {}
  return meetingsFromFile;
}

/**
 * Saves meetings override to localStorage (admin edits).
 * @param {Array} meetings - Updated meetings array
 */
function saveMeetingsOverride(meetings) {
  localStorage.setItem(GOV_STORAGE_KEYS.MEETINGS_OVERRIDE, JSON.stringify(meetings));
}

/**
 * Gets assignments - uses localStorage override if admin has edited.
 * @param {Array} assignmentsFromFile - Assignments from assignments.json
 * @returns {Array} Merged/override assignments
 */
function getAssignmentsWithOverride(assignmentsFromFile) {
  try {
    const override = localStorage.getItem(GOV_STORAGE_KEYS.ASSIGNMENTS_OVERRIDE);
    if (override) return JSON.parse(override);
  } catch {}
  return assignmentsFromFile;
}

/**
 * Saves assignments override to localStorage (admin edits).
 * @param {Array} assignments - Updated assignments array
 */
function saveAssignmentsOverride(assignments) {
  localStorage.setItem(GOV_STORAGE_KEYS.ASSIGNMENTS_OVERRIDE, JSON.stringify(assignments));
}

/**
 * Generates a unique ID for new meetings.
 * @param {Array} meetings - Existing meetings
 * @returns {string} New unique ID
 */
function generateMeetingId(meetings) {
  const ids = meetings.map(m => parseInt((m.id || '').replace(/\D/g, ''), 10)).filter(Boolean);
  const max = ids.length ? Math.max(...ids) : 0;
  return `m${max + 1}`;
}

/**
 * Renders a month-view calendar with meetings grouped by day.
 * Meetings are color-coded by committee.
 * @param {string} containerId - Target container element id
 * @param {Array} meetings - Meetings to render
 * @param {Object} options - Optional display options
 */
function renderMeetingsCalendar(containerId, meetings, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const safeMeetings = Array.isArray(meetings) ? meetings.slice() : [];
  const datedMeetings = safeMeetings
    .filter(m => m && m.date)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));

  if (datedMeetings.length === 0) {
    container.innerHTML = `<div class="empty-state">${calendarEscapeHtml(options.emptyMessage || 'No meetings scheduled.')}</div>`;
    return;
  }

  const todayKey = toCalendarKey(new Date());
  const initialMonth = getCurrentCalendarMonth();

  const state = {
    viewMonth: initialMonth
  };

  const meetingsByDay = {};
  datedMeetings.forEach(meeting => {
    const dayKey = meeting.date;
    if (!meetingsByDay[dayKey]) meetingsByDay[dayKey] = [];
    meetingsByDay[dayKey].push(meeting);
  });

  const committeeColorMap = buildCommitteeColorMap(datedMeetings);
  const firstMeetingDate = parseCalendarDate(datedMeetings[0].date);
  const firstMeetingMonth = firstMeetingDate
    ? new Date(firstMeetingDate.getFullYear(), firstMeetingDate.getMonth(), 1)
    : null;

  function renderMonth() {
    const monthLabel = state.viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const monthStart = new Date(state.viewMonth.getFullYear(), state.viewMonth.getMonth(), 1);
    const monthEnd = new Date(state.viewMonth.getFullYear(), state.viewMonth.getMonth() + 1, 0);
    const firstWeekday = monthStart.getDay(); // 0 = Sunday
    const totalDays = monthEnd.getDate();

    const cells = [];
    for (let i = 0; i < firstWeekday; i += 1) {
      cells.push('<div class="calendar-day calendar-day-empty" aria-hidden="true"></div>');
    }

    for (let day = 1; day <= totalDays; day += 1) {
      const dayDate = new Date(state.viewMonth.getFullYear(), state.viewMonth.getMonth(), day);
      const dayKey = toCalendarKey(dayDate);
      const dayMeetings = meetingsByDay[dayKey] || [];
      const meetingChips = dayMeetings.map(meeting => {
        const color = committeeColorMap[meeting.committee] || '#6c757d';
        const committeeLabel = meeting.committee || meeting.name || 'Meeting';
        const meetingLabel = meeting.name && meeting.name !== committeeLabel ? meeting.name : '';
        const timeLabel = meeting.time ? meeting.time : 'Time TBD';
        return `
          <div class="calendar-event" style="border-left-color: ${color};">
            <span class="calendar-event-name">${calendarEscapeHtml(committeeLabel)}</span>
            ${meetingLabel ? `<span class="calendar-event-meeting">${calendarEscapeHtml(meetingLabel)}</span>` : ''}
            <span class="calendar-event-time">${calendarEscapeHtml(timeLabel)}</span>
          </div>
        `;
      }).join('');

      const isToday = dayKey === todayKey;
      cells.push(`
        <div class="calendar-day ${dayMeetings.length ? 'calendar-day-has-events' : ''} ${isToday ? 'calendar-day-today' : ''}">
          <div class="calendar-day-number">${day}</div>
          <div class="calendar-events">${meetingChips}</div>
        </div>
      `);
    }

    const meetingsInMonth = datedMeetings.filter(meeting => {
      const meetingDate = parseCalendarDate(meeting.date);
      return meetingDate &&
        meetingDate.getFullYear() === state.viewMonth.getFullYear() &&
        meetingDate.getMonth() === state.viewMonth.getMonth();
    }).length;

    const monthHint = meetingsInMonth === 0
      ? 'No meetings in this month. Use Jump to First Meeting.'
      : `${meetingsInMonth} meeting${meetingsInMonth === 1 ? '' : 's'} in this month.`;

    const legendItems = Object.keys(committeeColorMap).sort().map(committee => `
      <div class="calendar-legend-item">
        <span class="calendar-legend-swatch" style="background: ${committeeColorMap[committee]};"></span>
        <span>${calendarEscapeHtml(committee)}</span>
      </div>
    `).join('');

    container.innerHTML = `
      <div class="calendar-wrap">
        <div class="calendar-toolbar">
          <button type="button" class="btn btn-secondary btn-sm" data-cal-nav="prev" aria-label="Previous month">Previous</button>
          <h3 class="calendar-month-label">${calendarEscapeHtml(monthLabel)}</h3>
          <div style="display: flex; gap: 0.5rem;">
            <button type="button" class="btn btn-secondary btn-sm" data-cal-nav="jump-first" aria-label="Jump to first meeting month">Jump to First Meeting</button>
            <button type="button" class="btn btn-secondary btn-sm" data-cal-nav="next" aria-label="Next month">Next</button>
          </div>
        </div>
        <div class="calendar-month-hint">${calendarEscapeHtml(monthHint)}</div>
        <div class="calendar-legend">${legendItems}</div>
        <div class="calendar-grid-header">
          <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
        </div>
        <div class="calendar-grid">${cells.join('')}</div>
      </div>
    `;

    container.querySelectorAll('[data-cal-nav]').forEach(btn => {
      btn.addEventListener('click', function() {
        const nav = this.getAttribute('data-cal-nav');
        if (nav === 'jump-first' && firstMeetingMonth) {
          state.viewMonth = new Date(firstMeetingMonth.getFullYear(), firstMeetingMonth.getMonth(), 1);
        } else {
          const delta = nav === 'prev' ? -1 : 1;
          state.viewMonth = new Date(state.viewMonth.getFullYear(), state.viewMonth.getMonth() + delta, 1);
        }
        renderMonth();
      });
    });
  }

  renderMonth();
}

function buildCommitteeColorMap(meetings) {
  const palette = [
    '#861f41', '#e87722', '#2a9d8f', '#457b9d', '#7b2cbf', '#ef476f',
    '#118ab2', '#6a994e', '#bc6c25', '#3a86ff', '#ff6b6b', '#2b9348'
  ];
  const committees = [...new Set(meetings.map(m => m.committee).filter(Boolean))].sort();
  const colorMap = {};
  committees.forEach((committee, i) => {
    colorMap[committee] = palette[i % palette.length];
  });
  return colorMap;
}

function parseCalendarDate(dateStr) {
  if (!dateStr) return null;
  const parts = String(dateStr).split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function toCalendarKey(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getCurrentCalendarMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function calendarEscapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
