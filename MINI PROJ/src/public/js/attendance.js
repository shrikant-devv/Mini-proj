/* ============================================
   ATTENDANCE.JS
   ============================================ */

let attendanceSession = {}; // { student_id: status }

async function initAttendance() {
  document.getElementById('loadAttendanceBtn').addEventListener('click', loadAttendanceSession);
  document.getElementById('markAllPresent').addEventListener('click', () => setAllStatus('present'));
  document.getElementById('markAllAbsent').addEventListener('click', () => setAllStatus('absent'));
  document.getElementById('submitAttendanceBtn').addEventListener('click', submitAttendance);
  const qr = document.getElementById('scanQrBtn');
  const face = document.getElementById('scanFaceBtn');
  if (qr) qr.addEventListener('click', () => window.quickMarkAttendance('qr'));
  if (face) face.addEventListener('click', () => window.quickMarkAttendance('face'));
}

async function loadAttendanceSession() {
  const classId = document.getElementById('attendanceClassSelect').value;
  const date = document.getElementById('attendanceDateInput').value;
  if (!classId) { showToast('Please select a class', 'error'); return; }
  if (!date) { showToast('Please select a date', 'error'); return; }

  const btn = document.getElementById('loadAttendanceBtn');
  btn.innerHTML = '<div class="spinner"></div> Loading...';
  btn.disabled = true;

  try {
    const { data: students } = await api(`/attendance/session?class_id=${classId}&date=${date}`);
    attendanceSession = {};
    students.forEach(s => { attendanceSession[s.student_id] = s.status; });

    const { data: classes } = await api('/classes');
    const cls = classes.find(c => c.id == classId);

    const sessionEl = document.getElementById('attendanceSessionCard');
    sessionEl.classList.remove('hidden');

    document.getElementById('sessionInfo').innerHTML = `
      <strong>${cls ? cls.name + ' – ' + cls.subject : 'Class'}</strong>
      <span> &bull; ${new Date(date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
      <span class="badge badge-blue" style="margin-left:8px">${students.length} Students</span>`;

    renderAttendanceList(students);
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.innerHTML = '<i class="fas fa-users"></i> Load Students';
    btn.disabled = false;
  }
}

function renderAttendanceList(students) {
  const list = document.getElementById('attendanceList');
  list.innerHTML = students.map(s => {
    const initials = s.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    return `
      <div class="attendance-row" id="ar-${s.student_id}">
        <div class="student-info-mini">
          <div class="student-avatar-mini">${initials}</div>
          <div>
            <div class="student-name-mini">${s.name}</div>
            <div class="student-roll-mini">${s.roll_no}</div>
          </div>
        </div>
        <div class="status-toggle">
          <button class="toggle-btn present ${attendanceSession[s.student_id] === 'present' ? 'active' : ''}"
            onclick="setStatus(${s.student_id}, 'present', this)">
            <i class="fas fa-check"></i> Present
          </button>
          <button class="toggle-btn absent ${attendanceSession[s.student_id] === 'absent' ? 'active' : ''}"
            onclick="setStatus(${s.student_id}, 'absent', this)">
            <i class="fas fa-times"></i> Absent
          </button>
          <button class="toggle-btn late ${attendanceSession[s.student_id] === 'late' ? 'active' : ''}"
            onclick="setStatus(${s.student_id}, 'late', this)">
            <i class="fas fa-clock"></i> Late
          </button>
        </div>
      </div>`;
  }).join('');
  updateAttendanceSummary();
}

function setStatus(studentId, status, clickedBtn) {
  attendanceSession[studentId] = status;
  const row = document.getElementById(`ar-${studentId}`);
  row.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
  clickedBtn.classList.add('active');
  updateAttendanceSummary();
}

function setAllStatus(status) {
  Object.keys(attendanceSession).forEach(id => { attendanceSession[id] = status; });
  document.querySelectorAll('.attendance-row').forEach(row => {
    row.querySelectorAll('.toggle-btn').forEach(b => {
      b.classList.remove('active');
      if (b.classList.contains(status)) b.classList.add('active');
    });
  });
  updateAttendanceSummary();
}

function updateAttendanceSummary() {
  const vals = Object.values(attendanceSession);
  const present = vals.filter(v => v === 'present').length;
  const absent = vals.filter(v => v === 'absent').length;
  const late = vals.filter(v => v === 'late').length;
  const total = vals.length;
  const pct = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
  document.getElementById('attendanceSummary').innerHTML = `
    <strong style="color:var(--accent-green)">✓ ${present} Present</strong> &nbsp;
    <strong style="color:var(--accent-red)">✗ ${absent} Absent</strong> &nbsp;
    <strong style="color:var(--accent-orange)">⏰ ${late} Late</strong> &nbsp;
    <span style="color:var(--text-muted)">— ${pct}% attendance rate</span>`;
}

async function submitAttendance() {
  const classId = document.getElementById('attendanceClassSelect').value;
  const date = document.getElementById('attendanceDateInput').value;
  if (!classId || !date || !Object.keys(attendanceSession).length) {
    showToast('Please load students first', 'error'); return;
  }
  const records = Object.entries(attendanceSession).map(([student_id, status]) => ({ student_id: parseInt(student_id), status }));
  const btn = document.getElementById('submitAttendanceBtn');
  btn.innerHTML = '<div class="spinner"></div> Saving...';
  btn.disabled = true;
  try {
    await api('/attendance/mark', { method: 'POST', body: JSON.stringify({ class_id: parseInt(classId), date, records }) });
    showToast(`Attendance saved for ${records.length} students! 🎉`, 'success');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.innerHTML = '<i class="fas fa-save"></i> Save Attendance';
    btn.disabled = false;
  }
}

window.setStatus = setStatus;
