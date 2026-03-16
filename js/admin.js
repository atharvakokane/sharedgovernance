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
 * Creates a custom dropdown HTML string.
 * @param {string} hiddenId - ID for the hidden input that stores the value
 * @param {Array} options - [{value, label}]
 * @param {string} selectedValue - Currently selected value
 * @param {string} placeholder - Placeholder when nothing selected
 * @returns {string} HTML string
 */
function customDropdownHTML(hiddenId, options, selectedValue, placeholder) {
  const selected = options.find(o => o.value === selectedValue);
  const displayText = selected ? selected.label : placeholder;
  const chevronSvg = '<svg class="chevron" width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M6 8L1 3h10z"/></svg>';
  const optionsHtml = options.map(o => `
    <button type="button" class="custom-dropdown-option ${o.value === selectedValue ? 'selected' : ''}" data-value="${escapeHtml(o.value)}">
      ${escapeHtml(o.label)}
    </button>
  `).join('');
  return `
    <div class="custom-dropdown" data-dropdown-for="${escapeHtml(hiddenId)}">
      <button type="button" class="custom-dropdown-trigger" aria-haspopup="listbox" aria-expanded="false">
        <span class="trigger-text">${escapeHtml(displayText)}</span>
        ${chevronSvg}
      </button>
      <div class="custom-dropdown-panel" role="listbox">
        ${optionsHtml}
      </div>
    </div>
    <input type="hidden" id="${escapeHtml(hiddenId)}" value="${escapeHtml(selectedValue)}">
  `;
}

/**
 * Initializes custom dropdown behavior for a container.
 * @param {HTMLElement} container - Container that has .custom-dropdown elements
 */
function initCustomDropdowns(container) {
  if (!container) return;
  container.querySelectorAll('.custom-dropdown').forEach(dropdown => {
    const hiddenId = dropdown.dataset.dropdownFor;
    const trigger = dropdown.querySelector('.custom-dropdown-trigger');
    const panel = dropdown.querySelector('.custom-dropdown-panel');
    const textEl = dropdown.querySelector('.trigger-text');
    const hiddenInput = document.getElementById(hiddenId);
    if (!trigger || !panel || !hiddenInput) return;

    const close = () => {
      trigger.classList.remove('open');
      panel.classList.remove('open');
      trigger.setAttribute('aria-expanded', 'false');
    };

    const open = () => {
      trigger.classList.add('open');
      panel.classList.add('open');
      trigger.setAttribute('aria-expanded', 'true');
    };

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = panel.classList.contains('open');
      if (isOpen) close();
      else open();
    });

    panel.querySelectorAll('.custom-dropdown-option').forEach(opt => {
      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        const value = opt.dataset.value;
        const label = opt.textContent.trim();
        hiddenInput.value = value;
        textEl.textContent = label;
        panel.querySelectorAll('.custom-dropdown-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        close();
        hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });

    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target)) close();
    });
  });
}

/**
 * Combines actual submissions with missing ones (senators assigned to meetings that passed without submission).
 * @param {Array} submissions - Actual submissions from localStorage
 * @param {Array} assignments - Senator assignments
 * @param {Array} meetings - All meetings
 * @returns {Array} Combined list
 */
function getCombinedSubmissions(submissions, assignments = [], meetings = []) {
  let combined = [...submissions];
  
  if (assignments.length && meetings.length) {
    const today = new Date().toISOString().split('T')[0];
    
    assignments.forEach(assign => {
      const senatorCommittees = assign.committees || [];
      senatorCommittees.forEach(committeeName => {
        const committeeMeetings = meetings.filter(m => m.committee === committeeName);
        committeeMeetings.forEach(meeting => {
          // If meeting date has passed
          if (meeting.date < today) {
            // Check if this senator has a submission for this meeting
            const hasSubmission = submissions.some(s => 
              String(s.pid) === String(assign.pid) && 
              String(s.meetingId) === String(meeting.id)
            );
            
            if (!hasSubmission) {
              combined.push({
                pid: assign.pid,
                committeeName: meeting.committee,
                meetingDate: meeting.date,
                meetingId: meeting.id,
                timestamp: null,
                attendanceConfirmed: false,
                notes: 'MISSING: No submission provided.',
                isMissing: true
              });
            }
          }
        });
      });
    });
  }

  // Sort: most recent first
  combined.sort((a, b) => {
    const dateA = a.meetingDate || '';
    const dateB = b.meetingDate || '';
    if (dateA !== dateB) return dateB.localeCompare(dateA);
    return (b.timestamp || '').localeCompare(a.timestamp || '');
  });

  return combined;
}

/**
 * Renders the submissions table with filter controls.
 * Uses debounced filtering for responsive performance.
 * @param {Array} submissions - All submissions
 * @param {Array} assignments - Optional: Senator assignments to calculate missing submissions
 * @param {Array} meetings - Optional: All meetings to calculate missing submissions
 */
function renderSubmissionsTable(submissions, assignments = [], meetings = []) {
  const container = document.getElementById('submissionsSection');
  if (!container) return;

  const filterPid = (document.getElementById('filterPid') || {}).value || '';
  const filterCommittee = (document.getElementById('filterCommittee') || {}).value || '';
  const filterAttended = (document.getElementById('filterAttended') || {}).value || '';
  const displaySubmissions = getCombinedSubmissions(submissions, assignments, meetings);

  const committeesFromSubmissions = [...new Set(displaySubmissions.map(s => s.committeeName).filter(Boolean))];
  const committeesFromMeetings = meetings ? [...new Set(meetings.map(m => m.committee).filter(Boolean))] : [];
  const committees = [...new Set([...committeesFromSubmissions, ...committeesFromMeetings])].sort();
  const pidsFromSubmissions = [...new Set(displaySubmissions.map(s => s.pid).filter(Boolean))];
  const pidsFromAssignments = assignments ? assignments.map(a => a.pid).filter(Boolean) : [];
  const pids = [...new Set([...pidsFromSubmissions, ...pidsFromAssignments])].sort();

  let filtered = displaySubmissions;
  if (filterPid) {
    filtered = filtered.filter(s => String(s.pid) === filterPid);
  }
  if (filterCommittee) {
    filtered = filtered.filter(s => String(s.committeeName || '') === filterCommittee);
  }
  if (filterAttended === 'yes') {
    filtered = filtered.filter(s => s.attendanceConfirmed === true);
  } else if (filterAttended === 'no') {
    filtered = filtered.filter(s => s.attendanceConfirmed !== true);
  }

  const pidOptions = [{ value: '', label: 'All PIDs' }, ...pids.map(pid => ({ value: pid, label: pid }))];
  const committeeOptions = [{ value: '', label: 'All Committees' }, ...committees.map(c => ({ value: c, label: c }))];
  const attendedOptions = [
    { value: '', label: 'All' },
    { value: 'yes', label: 'Yes' },
    { value: 'no', label: 'No' }
  ];

  const tableHtml = `
    <div class="filter-bar filter-bar-dropdowns">
      <div class="dropdown-wrap">
        <label for="filterPid" class="dropdown-label">PID</label>
        ${customDropdownHTML('filterPid', pidOptions, filterPid, 'All PIDs')}
      </div>
      <div class="dropdown-wrap">
        <label for="filterCommittee" class="dropdown-label">Committee</label>
        ${customDropdownHTML('filterCommittee', committeeOptions, filterCommittee, 'All Committees')}
      </div>
      <div class="dropdown-wrap">
        <label for="filterAttended" class="dropdown-label">Attended</label>
        ${customDropdownHTML('filterAttended', attendedOptions, filterAttended, 'All')}
      </div>
      <div class="filter-bar-actions">
        <button type="button" class="btn btn-secondary btn-sm" id="clearFilters">Clear</button>
      </div>
    </div>
    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th>PID</th>
            <th>Committee</th>
            <th>Date</th>
            <th>Submitted</th>
            <th>Attended</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.length === 0 
            ? '<tr><td colspan="6" class="empty-state">No submissions found.</td></tr>'
            : filtered.map(s => `
              <tr class="${s.isMissing ? 'row-missing' : ''}">
                <td>${escapeHtml(s.pid)}</td>
                <td>${escapeHtml(s.committeeName || '')}</td>
                <td>${formatDate(s.meetingDate)}</td>
                <td>${s.timestamp ? formatTimestamp(s.timestamp) : '<span style="color: var(--color-danger); font-weight: 600;">Not Submitted</span>'}</td>
                <td>
                  <span style="color: ${s.attendanceConfirmed ? 'var(--color-success)' : 'var(--color-danger)'}; font-weight: 600;">
                    ${s.attendanceConfirmed ? 'Yes' : 'No'}
                  </span>
                </td>
                <td style="${s.isMissing ? 'font-style: italic; color: var(--color-text-muted);' : ''}">
                  ${escapeHtml((s.notes || '').substring(0, 80))}${(s.notes || '').length > 80 ? '...' : ''}
                </td>
              </tr>
            `).join('')}
        </tbody>
      </table>
    </div>
  `;

  container.innerHTML = tableHtml;
  initCustomDropdowns(container);

  const doRender = () => renderSubmissionsTable(getSubmissions(), assignments, meetings);
  ['filterPid', 'filterCommittee', 'filterAttended'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', doRender);
  });
  const clearBtn = document.getElementById('clearFilters');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      document.getElementById('filterPid').value = '';
      document.getElementById('filterCommittee').value = '';
      const fa = document.getElementById('filterAttended');
      if (fa) fa.value = '';
      doRender();
    });
  }

}

/**
 * Renders the assignments management section.
 * @param {Array} assignments - Assignments data
 * @param {Array} meetings - Meetings (for committee list)
 * @param {Array} allowedCommittees - Allowed committees from committees.json
 */
function renderAssignmentsSection(assignments, meetings, allowedCommittees = []) {
  const container = document.getElementById('assignmentsSection');
  if (!container) return;

  const fromMeetings = [...new Set(meetings.map(m => m.committee).filter(Boolean))];
  const committees = allowedCommittees.length
    ? allowedCommittees
    : [...new Set([...fromMeetings])].sort();

  const pidOpts = [{ value: '', label: 'Select senator...' }, ...assignments.map(a => ({ value: a.pid, label: a.pid }))];
  const committeeOpts = [{ value: '', label: 'Select committee...' }, ...committees.map(c => ({ value: c, label: c }))];

  const html = `
    <div class="filter-bar filter-bar-dropdowns">
      <div class="dropdown-wrap">
        <label for="assignPid" class="dropdown-label">Senator</label>
        ${customDropdownHTML('assignPid', pidOpts, '', 'Select senator...')}
      </div>
      <div class="dropdown-wrap">
        <label for="assignCommittee" class="dropdown-label">Committee</label>
        ${customDropdownHTML('assignCommittee', committeeOpts, '', 'Select committee...')}
      </div>
      <div class="filter-bar-actions">
        <button type="button" class="btn btn-primary btn-sm" id="addAssignment">Add Assignment</button>
        <button type="button" class="btn btn-danger btn-sm" id="removeAssignment">Remove Assignment</button>
      </div>
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
  initCustomDropdowns(container);

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
    renderAssignmentsSection(assignments, meetings, allowedCommittees);
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
      renderAssignmentsSection(assignments, meetings, allowedCommittees);
    }
  });
}

/**
 * Renders the meetings management section.
 * @param {Array} meetings - Meetings data
 * @param {Array} allowedCommittees - Allowed committees from committees.json
 * @param {Function} onMeetingsChange - Callback fired after meetings are changed
 */
function renderMeetingsSection(meetings, allowedCommittees, onMeetingsChange) {
  allowedCommittees = allowedCommittees || [];
  const container = document.getElementById('meetingsSection');
  if (!container) return;

  const committeeOptions = allowedCommittees.map(c => `<option value="${escapeHtml(c)}">`).join('');
  const html = `
    <div class="table-responsive">
      <datalist id="meetingCommitteeList">${committeeOptions}</datalist>
      <table class="data-table">
        <thead>
          <tr>
            <th>Committee / Commission</th>
            <th>Date</th>
            <th>Time</th>
            <th>Location</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${meetings.map(m => `
            <tr data-meeting-id="${escapeHtml(m.id)}">
              <td><input type="text" value="${escapeHtml(m.committee || '')}" data-field="committee" class="inline-edit" list="meetingCommitteeList" placeholder="Select committee"></td>
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
        if (typeof onMeetingsChange === 'function') onMeetingsChange(meetings);
      }
    });
  });

  container.querySelectorAll('.delete-meeting').forEach(btn => {
    btn.addEventListener('click', function() {
      const row = this.closest('tr');
      const id = row.dataset.meetingId;
      const newMeetings = meetings.filter(m => m.id !== id);
      saveMeetingsOverride(newMeetings);
      if (typeof onMeetingsChange === 'function') onMeetingsChange(newMeetings);
      renderMeetingsSection(newMeetings, allowedCommittees, onMeetingsChange);
    });
  });

  document.getElementById('addMeetingBtn').addEventListener('click', () => {
    const newId = generateMeetingId(meetings);
    const committees = allowedCommittees.length
      ? allowedCommittees
      : [...new Set(meetings.map(m => m.committee).filter(Boolean))];
    const committee = committees[0] || 'New Committee';
    meetings.push({
      id: newId,
      committee,
      date: new Date().toISOString().slice(0, 10),
      time: '',
      location: ''
    });
    saveMeetingsOverride(meetings);
    if (typeof onMeetingsChange === 'function') onMeetingsChange(meetings);
    renderMeetingsSection(meetings, allowedCommittees, onMeetingsChange);
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
 * Exports all submissions as a CSV file download.
 * Columns: Senator PID, Committee, Date, Attended, Meeting Notes
 */
function exportSubmissionsCSV(meetings, assignments) {
  const submissions = getSubmissions();
  const combined = getCombinedSubmissions(submissions, assignments, meetings);
  
  if (!combined || !combined.length) {
    alert('No submissions to export.');
    return;
  }

  // Header row
  const headers = ['Senator PID', 'Committee', 'Date', 'Attended', 'Meeting Notes'];
  
  // Convert combined to rows
  const rows = combined.map(s => [
    s.pid || '',
    s.committeeName || '',
    s.meetingDate || '',
    s.attendanceConfirmed ? 'Yes' : 'No',
    (s.notes || '').replace(/\r?\n/g, ' ') // Remove newlines from notes for CSV compatibility
  ]);

  // Combine headers and rows, escaping quotes
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `governance-notes-${new Date().toISOString().slice(0, 10)}.csv`;
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
        if (s.pid && s.committeeName && s.timestamp) {
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
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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
