/**
 * VT Shared Governance Tracker - Admin Dashboard Module
 * Cabinet control center: view submissions, manage assignments, manage meetings.
 */

// Debounce helper - delays rapid filter input to avoid blocking re-renders
function debounce(fn, ms) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), ms);
  };
}

/**
 * Renders the submissions table with filter controls.
 * Uses debounced filtering for responsive performance.
 * @param {Array} submissions - All submissions
 */
function renderSubmissionsTable(submissions) {
  const container = document.getElementById('submissionsSection');
  if (!container) return;

  const filterPid = (document.getElementById('filterPid') || {}).value || '';
  const filterCommittee = (document.getElementById('filterCommittee') || {}).value || '';
  const filterMeeting = (document.getElementById('filterMeeting') || {}).value || '';

  let filtered = submissions;
  if (filterPid) {
    filtered = filtered.filter(s => String(s.pid).toLowerCase().includes(filterPid.toLowerCase()));
  }
  if (filterCommittee) {
    filtered = filtered.filter(s => String(s.committeeName || '').toLowerCase().includes(filterCommittee.toLowerCase()));
  }
  if (filterMeeting) {
    filtered = filtered.filter(s => String(s.meetingName || '').toLowerCase().includes(filterMeeting.toLowerCase()));
  }

  const tableHtml = `
    <div class="filter-bar">
      <input type="text" id="filterPid" placeholder="Filter by PID" value="${escapeHtml(filterPid)}">
      <input type="text" id="filterCommittee" placeholder="Filter by Committee" value="${escapeHtml(filterCommittee)}">
      <input type="text" id="filterMeeting" placeholder="Filter by Meeting" value="${escapeHtml(filterMeeting)}">
      <button type="button" class="btn btn-secondary btn-sm" id="clearFilters">Clear</button>
    </div>
    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th>PID</th>
            <th>Committee</th>
            <th>Meeting</th>
            <th>Date</th>
            <th>Submitted</th>
            <th>Attended</th>
            <th>Notes / Document</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.length === 0 
            ? '<tr><td colspan="7" class="empty-state">No submissions found.</td></tr>'
            : filtered.map(s => {
              const notesDisplay = s.attachmentName 
                ? `<a href="#" class="doc-download" data-index="${submissions.indexOf(s)}" title="Download ${escapeHtml(s.attachmentName)}">📄 ${escapeHtml(s.attachmentName)}</a>`
                : escapeHtml((s.notes || '').substring(0, 50)) + ((s.notes || '').length > 50 ? '...' : '');
              return `
              <tr>
                <td>${escapeHtml(s.pid)}</td>
                <td>${escapeHtml(s.committeeName || '')}</td>
                <td>${escapeHtml(s.meetingName || '')}</td>
                <td>${formatDate(s.meetingDate)}</td>
                <td>${formatTimestamp(s.timestamp)}</td>
                <td>${s.attendanceConfirmed ? 'Yes' : 'No'}</td>
                <td>${notesDisplay}</td>
              </tr>
            `}).join('')}
        </tbody>
      </table>
    </div>
  `;

  container.innerHTML = tableHtml;

  // Debounced filter - 200ms delay prevents blocking on every keystroke
  const debouncedRender = debounce(() => renderSubmissionsTable(getSubmissions()), 200);
  ['filterPid', 'filterCommittee', 'filterMeeting'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', debouncedRender);
  });
  const clearBtn = document.getElementById('clearFilters');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      document.getElementById('filterPid').value = '';
      document.getElementById('filterCommittee').value = '';
      document.getElementById('filterMeeting').value = '';
      renderSubmissionsTable(getSubmissions());
    });
  }

  // Document download handlers
  container.querySelectorAll('.doc-download').forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const idx = parseInt(this.dataset.index, 10);
      const subs = getSubmissions();
      const sub = subs[idx];
      if (sub && sub.attachmentData && sub.attachmentName) {
        const a = document.createElement('a');
        a.href = sub.attachmentData;
        a.download = sub.attachmentName;
        a.click();
      }
    });
  });
}

/**
 * Renders the assignments management section.
 * @param {Array} assignments - Assignments data
 * @param {Array} meetings - Meetings (for committee list)
 */
function renderAssignmentsSection(assignments, meetings) {
  const container = document.getElementById('assignmentsSection');
  if (!container) return;

  const committees = [...new Set(meetings.map(m => m.committee).filter(Boolean))].sort();

  const html = `
    <div class="filter-bar">
      <input type="text" id="assignPid" placeholder="Senator PID" list="pidList">
      <datalist id="pidList">
        ${assignments.map(a => `<option value="${escapeHtml(a.pid)}">`).join('')}
      </datalist>
      <input type="text" id="assignCommittee" placeholder="Committee name" list="committeeList">
      <datalist id="committeeList">
        ${committees.map(c => `<option value="${escapeHtml(c)}">`).join('')}
      </datalist>
      <button type="button" class="btn btn-primary btn-sm" id="addAssignment">Add Assignment</button>
      <button type="button" class="btn btn-danger btn-sm" id="removeAssignment">Remove Assignment</button>
    </div>
    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr><th>PID</th><th>Committees</th></tr>
        </thead>
        <tbody>
          ${assignments.map(a => `
            <tr>
              <td>${escapeHtml(a.pid)}</td>
              <td>${(a.committees || []).join(', ')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  container.innerHTML = html;

  document.getElementById('addAssignment').addEventListener('click', () => {
    const pid = document.getElementById('assignPid').value.trim();
    const committee = document.getElementById('assignCommittee').value.trim();
    if (!pid || !committee) return;
    const idx = assignments.findIndex(a => String(a.pid) === String(pid));
    if (idx >= 0) {
      const committees = assignments[idx].committees || [];
      if (!committees.includes(committee)) {
        committees.push(committee);
        assignments[idx].committees = committees.sort();
      }
    } else {
      assignments.push({ pid, committees: [committee] });
    }
    saveAssignmentsOverride(assignments);
    renderAssignmentsSection(assignments, meetings);
  });

  document.getElementById('removeAssignment').addEventListener('click', () => {
    const pid = document.getElementById('assignPid').value.trim();
    const committee = document.getElementById('assignCommittee').value.trim();
    if (!pid || !committee) return;
    const idx = assignments.findIndex(a => String(a.pid) === String(pid));
    if (idx >= 0) {
      const committees = (assignments[idx].committees || []).filter(c => c !== committee);
      if (committees.length) {
        assignments[idx].committees = committees;
      } else {
        assignments.splice(idx, 1);
      }
      saveAssignmentsOverride(assignments);
      renderAssignmentsSection(assignments, meetings);
    }
  });
}

/**
 * Renders the meetings management section.
 * @param {Array} meetings - Meetings data
 */
function renderMeetingsSection(meetings) {
  const container = document.getElementById('meetingsSection');
  if (!container) return;

  const html = `
    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th>Committee</th>
            <th>Meeting Name</th>
            <th>Date</th>
            <th>Time</th>
            <th>Location</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${meetings.map(m => `
            <tr data-meeting-id="${escapeHtml(m.id)}">
              <td><input type="text" value="${escapeHtml(m.committee || '')}" data-field="committee" class="inline-edit"></td>
              <td><input type="text" value="${escapeHtml(m.name || '')}" data-field="name" class="inline-edit"></td>
              <td><input type="date" value="${escapeHtml(m.date || '')}" data-field="date" class="inline-edit"></td>
              <td><input type="text" value="${escapeHtml(m.time || '')}" data-field="time" class="inline-edit" placeholder="e.g. 2:00 PM"></td>
              <td><input type="text" value="${escapeHtml(m.location || '')}" data-field="location" class="inline-edit"></td>
              <td><button type="button" class="btn btn-danger btn-sm delete-meeting">Remove</button></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    <div style="margin-top: 1rem;">
      <button type="button" class="btn btn-primary" id="addMeetingBtn">Add New Meeting</button>
    </div>
  `;

  container.innerHTML = html;

  // Inline edit - save on blur
  container.querySelectorAll('.inline-edit').forEach(input => {
    input.addEventListener('change', function() {
      const row = this.closest('tr');
      const id = row.dataset.meetingId;
      const meeting = meetings.find(m => m.id === id);
      if (meeting) {
        meeting[this.dataset.field] = this.value;
        saveMeetingsOverride(meetings);
      }
    });
  });

  container.querySelectorAll('.delete-meeting').forEach(btn => {
    btn.addEventListener('click', function() {
      const row = this.closest('tr');
      const id = row.dataset.meetingId;
      const newMeetings = meetings.filter(m => m.id !== id);
      saveMeetingsOverride(newMeetings);
      renderMeetingsSection(newMeetings);
    });
  });

  document.getElementById('addMeetingBtn').addEventListener('click', () => {
    const newId = generateMeetingId(meetings);
    const committees = [...new Set(meetings.map(m => m.committee))];
    const committee = committees[0] || 'New Committee';
    meetings.push({
      id: newId,
      committee,
      name: 'New Meeting',
      date: new Date().toISOString().slice(0, 10),
      time: '',
      location: ''
    });
    saveMeetingsOverride(meetings);
    renderMeetingsSection(meetings);
  });
}

/**
 * Exports all submissions as a JSON file download.
 */
function exportSubmissionsJSON() {
  const submissions = getSubmissions();
  const blob = new Blob([JSON.stringify(submissions, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `governance-submissions-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Exports submissions as a PDF document.
 */
function exportSubmissionsPDF() {
  if (typeof jspdf === 'undefined') {
    alert('PDF library loading. Please try again in a moment.');
    return;
  }
  const submissions = getSubmissions();
  const doc = new jspdf.jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  doc.setFontSize(14);
  doc.text('VT Shared Governance - Submissions', 14, 22);
  const headers = [['PID', 'Committee', 'Meeting', 'Date', 'Submitted', 'Attended', 'Notes']];
  const rows = submissions.map(s => [
    s.pid || '',
    (s.committeeName || '').substring(0, 22),
    (s.meetingName || '').substring(0, 22),
    formatDate(s.meetingDate),
    (formatTimestamp(s.timestamp) || '').substring(0, 10),
    s.attendanceConfirmed ? 'Yes' : 'No',
    (s.attachmentName || s.notes || '').substring(0, 35)
  ]);
  if (typeof doc.autoTable === 'function') {
    doc.autoTable({ head: headers, body: rows, startY: 30, styles: { fontSize: 7 } });
  } else {
    doc.setFontSize(8);
    let y = 40;
    rows.forEach((row, i) => {
      doc.text(row.join(' | '), 14, y);
      y += 10;
    });
  }
  doc.save(`governance-submissions-${new Date().toISOString().slice(0, 10)}.pdf`);
}

/**
 * Exports submissions as a Word document (.doc).
 */
function exportSubmissionsWord() {
  const submissions = getSubmissions();
  const rows = submissions.map(s => `
    <tr>
      <td>${escapeHtml(s.pid || '')}</td>
      <td>${escapeHtml(s.committeeName || '')}</td>
      <td>${escapeHtml(s.meetingName || '')}</td>
      <td>${formatDate(s.meetingDate)}</td>
      <td>${formatTimestamp(s.timestamp)}</td>
      <td>${s.attendanceConfirmed ? 'Yes' : 'No'}</td>
      <td>${escapeHtml(s.attachmentName || s.notes || '')}</td>
    </tr>
  `).join('');
  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head><meta charset="utf-8"><title>Governance Submissions</title></head>
<body>
<h1>VT Shared Governance - Submissions</h1>
<table border="1" cellpadding="4" cellspacing="0" style="border-collapse:collapse;width:100%">
<thead><tr><th>PID</th><th>Committee</th><th>Meeting</th><th>Date</th><th>Submitted</th><th>Attended</th><th>Notes/Document</th></tr></thead>
<tbody>${rows}</tbody>
</table>
</body>
</html>`;
  const blob = new Blob(['\ufeff' + html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `governance-submissions-${new Date().toISOString().slice(0, 10)}.doc`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Imports submissions from a JSON file and merges with existing.
 * @param {File} file - JSON file from Export
 * @param {Function} onRefresh - Callback to refresh the submissions table
 */
function importSubmissions(file, onRefresh) {
  const reader = new FileReader();
  reader.onload = function() {
    try {
      const imported = JSON.parse(reader.result);
      if (!Array.isArray(imported)) throw new Error('Invalid format');
      const existing = getSubmissions();
      const merged = [...existing];
      imported.forEach(s => {
        if (s.pid && s.meetingName && s.timestamp) {
          const duplicate = merged.some(m => 
            m.pid === s.pid && m.meetingId === s.meetingId && m.timestamp === s.timestamp
          );
          if (!duplicate) merged.push(s);
        }
      });
      localStorage.setItem(GOV_STORAGE_KEYS.SUBMISSIONS, JSON.stringify(merged));
      if (onRefresh) onRefresh();
      alert(`Imported ${imported.length} submissions. Total: ${merged.length}`);
    } catch (e) {
      alert('Invalid file. Please select a valid submissions JSON export.');
    }
  };
  reader.readAsText(file);
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

function formatTimestamp(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}
