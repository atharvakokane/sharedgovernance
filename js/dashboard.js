/**
 * VT Shared Governance Tracker - Senator Dashboard Module
 * Displays assigned committees and meetings, allows attendance confirmation and notes submission.
 */

/**
 * Gets committees assigned to a senator.
 * @param {string} pid - Senator's PID
 * @param {Array} assignments - Assignments array (with admin overrides applied)
 * @returns {Array} Committee names
 */
function getAssignedCommittees(pid, assignments) {
  const assignment = assignments.find(a => String(a.pid) === String(pid));
  return assignment ? (assignment.committees || []) : [];
}

/**
 * Filters meetings to only those for the senator's committees.
 * @param {Array} meetings - All meetings
 * @param {Array} committees - Senator's committee names
 * @returns {Array} Filtered meetings
 */
function filterMeetingsByCommittees(meetings, committees) {
  return meetings.filter(m => committees.includes(m.committee));
}

/**
 * Renders the senator dashboard with meetings and submission forms.
 * @param {Object} session - Current user session
 * @param {Array} meetings - Filtered meetings for user's committees
 */
function renderDashboard(session, meetings) {
  const container = document.getElementById('meetingsContainer');
  if (!container) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Filter out meetings that are more than 5 days old
  const activeMeetings = meetings.filter(meeting => {
    const meetingDate = new Date(meeting.date + 'T12:00:00');
    meetingDate.setHours(0, 0, 0, 0);
    const diffTime = meetingDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= -5;
  });

  if (activeMeetings.length === 0) {
    container.innerHTML = '<div class="empty-state">No meetings scheduled for your committees at this time.</div>';
    return;
  }

  container.innerHTML = activeMeetings.map(meeting => {
    const meetingDate = new Date(meeting.date + 'T12:00:00');
    meetingDate.setHours(0, 0, 0, 0);
    const diffTime = meetingDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let countdownText = '';
    let countdownClass = '';
    
    if (diffDays === 0) {
      countdownText = 'Today';
      countdownClass = 'countdown-today';
    } else if (diffDays === 1) {
      countdownText = 'Tomorrow';
      countdownClass = 'countdown-soon';
    } else if (diffDays > 1) {
      countdownText = `${diffDays} days left`;
      countdownClass = 'countdown-future';
    } else if (diffDays < 0) {
      const pastDays = Math.abs(diffDays);
      countdownText = `${pastDays} day${pastDays > 1 ? 's' : ''} overdue`;
      countdownClass = 'countdown-overdue';
    }

    return `
      <div class="card meeting-card" data-meeting-id="${meeting.id}">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
          <h3 style="margin: 0;">${escapeHtml(meeting.committee)}</h3>
          <span class="countdown-badge ${countdownClass}">${countdownText}</span>
        </div>
        <div class="meeting-meta">
          <span><strong>Date:</strong> ${formatDate(meeting.date)}</span>
          <span><strong>Time:</strong> ${escapeHtml(meeting.time || '')}</span>
          ${meeting.location ? `<span><strong>Location:</strong> ${escapeHtml(meeting.location)}</span>` : ''}
        </div>
      <form class="meeting-submission-form" data-meeting-id="${meeting.id}">
        <div class="form-group" style="margin-bottom: 1rem;">
          <label class="attendance-label">
            <input type="checkbox" name="attendance" value="confirmed">
            I attended this meeting
          </label>
        </div>
        <div class="form-group">
            <label for="notes-${meeting.id}">Meeting Notes</label>
            <textarea id="notes-${meeting.id}" name="notes" placeholder="Enter your meeting notes here..."></textarea>
          </div>
          <button type="submit" class="btn btn-primary btn-sm">Submit</button>
        </form>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.meeting-submission-form').forEach(form => {
    // Add change listener to the attendance checkbox for styling
    const checkbox = form.querySelector('[name="attendance"]');
    const label = checkbox.closest('.attendance-label');
    checkbox.addEventListener('change', function() {
      if (this.checked) {
        label.classList.add('checked');
      } else {
        label.classList.remove('checked');
      }
    });

    form.addEventListener('submit', function(e) {
      e.preventDefault();
      const meetingId = this.dataset.meetingId;
      const meeting = activeMeetings.find(m => m.id === meetingId);
      const attendance = this.querySelector('[name="attendance"]').checked;
      const notes = this.querySelector('[name="notes"]').value.trim();
      handleSubmission(session, meeting, attendance, notes, this);
    });
  });
}

/**
 * Saves submission to localStorage and shows confirmation.
 */
function handleSubmission(session, meeting, attendance, notes, formEl) {
  const submission = {
    pid: session.pid,
    committeeName: meeting.committee,
    meetingDate: meeting.date,
    meetingId: meeting.id,
    timestamp: new Date().toISOString(),
    attendanceConfirmed: attendance,
    notes: notes
  };

  saveSubmission(submission);

  var card = formEl.closest('.meeting-card');
  var existingAlert = card.querySelector('.alert-success');
  if (existingAlert) existingAlert.remove();

  var alertEl = document.createElement('div');
  alertEl.className = 'alert alert-success';
  alertEl.textContent = 'Submission received. Thank you!';
  alertEl.setAttribute('role', 'status');
  formEl.insertBefore(alertEl, formEl.firstChild);

  formEl.reset();
  // Remove 'checked' class from attendance label after reset
  const attendanceLabel = formEl.querySelector('.attendance-label');
  if (attendanceLabel) attendanceLabel.classList.remove('checked');

  setTimeout(function() { alertEl.remove(); }, 5000);
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    var d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch (e) {
    return dateStr;
  }
}
