/**
 * VT Shared Governance Tracker - Senator Dashboard Module
 * Displays assigned committees and meetings, allows attendance confirmation and notes submission.
 */

/**
 * Gets committees assigned to a senator.
 * @param {string} pid - Senator's PID
 * @param {Array} assignments - Assignments from assignments.json (with override)
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

  if (meetings.length === 0) {
    container.innerHTML = '<div class="empty-state">No meetings scheduled for your committees at this time.</div>';
    return;
  }

  container.innerHTML = meetings.map(meeting => `
    <div class="card meeting-card" data-meeting-id="${meeting.id}">
      <h3>${escapeHtml(meeting.name)}</h3>
      <div class="meeting-meta">
        <span><strong>Committee:</strong> ${escapeHtml(meeting.committee)}</span>
        <span><strong>Date:</strong> ${formatDate(meeting.date)}</span>
        <span><strong>Time:</strong> ${escapeHtml(meeting.time || '')}</span>
        ${meeting.location ? `<span><strong>Location:</strong> ${escapeHtml(meeting.location)}</span>` : ''}
      </div>
      <form class="meeting-submission-form" data-meeting-id="${meeting.id}">
        <div class="form-group">
          <label>
            <input type="checkbox" name="attendance" value="confirmed">
            I attended this meeting
          </label>
        </div>
        <div class="form-group">
          <label for="notes-${meeting.id}">Meeting Notes (text)</label>
          <textarea id="notes-${meeting.id}" name="notes" placeholder="Enter your meeting notes here..."></textarea>
        </div>
        <div class="form-group">
          <label for="attachment-${meeting.id}">Or attach PDF/Word document</label>
          <input type="file" id="attachment-${meeting.id}" name="attachment" accept=".pdf,.doc,.docx" class="file-input">
          <span class="file-hint">PDF or Word (.doc, .docx) — max 2MB</span>
        </div>
        <button type="submit" class="btn btn-primary btn-sm">Submit</button>
      </form>
    </div>
  `).join('');

  // Attach form handlers
  container.querySelectorAll('.meeting-submission-form').forEach(form => {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      const meetingId = this.dataset.meetingId;
      const meeting = meetings.find(m => m.id === meetingId);
      const attendance = this.querySelector('[name="attendance"]').checked;
      const notes = this.querySelector('[name="notes"]').value.trim();
      const fileInput = this.querySelector('[name="attachment"]');
      handleSubmission(session, meeting, attendance, notes, this, fileInput);
    });
  });
}

/** Max attachment size: 2MB (base64 adds ~33% overhead) */
const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024;

/**
 * Handles form submission - saves to localStorage and shows confirmation.
 * Supports optional PDF/Word attachment.
 */
function handleSubmission(session, meeting, attendance, notes, formEl, fileInput) {
  const submission = {
    pid: session.pid,
    committeeName: meeting.committee,
    meetingName: meeting.name,
    meetingDate: meeting.date,
    meetingId: meeting.id,
    timestamp: new Date().toISOString(),
    attendanceConfirmed: attendance,
    notes: notes
  };

  const file = fileInput?.files?.[0];
  if (file) {
    if (file.size > MAX_ATTACHMENT_BYTES) {
      const alertEl = document.createElement('div');
      alertEl.className = 'alert alert-info';
      alertEl.textContent = 'File too large. Maximum size is 2MB.';
      formEl.insertBefore(alertEl, formEl.firstChild);
      setTimeout(() => alertEl.remove(), 4000);
      return;
    }
    const reader = new FileReader();
    reader.onload = function() {
      submission.attachmentName = file.name;
      submission.attachmentData = reader.result;
      saveAndConfirm(submission, formEl);
    };
    reader.readAsDataURL(file);
  } else {
    saveAndConfirm(submission, formEl);
  }
}

function saveAndConfirm(submission, formEl) {
  saveSubmission(submission);

  // Visual confirmation
  const card = formEl.closest('.meeting-card');
  const existingAlert = card.querySelector('.alert-success');
  if (existingAlert) existingAlert.remove();

  const alert = document.createElement('div');
  alert.className = 'alert alert-success';
  alert.textContent = 'Submission received. Thank you!';
  alert.setAttribute('role', 'status');
  formEl.insertBefore(alert, formEl.firstChild);

  // Clear form
  formEl.reset();

  // Remove alert after 5 seconds
  setTimeout(() => alert.remove(), 5000);
}

/**
 * Escapes HTML to prevent XSS.
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Formats date string for display.
 */
function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}
