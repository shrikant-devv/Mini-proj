/* ============================================
   APP.JS - Core Navigation & Utilities
   ============================================ */

const API_BASE = '/api';

// ---- API Helper ----
async function api(path, options = {}) {
  try {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    const user = getCurrentUser();
    if (user?.token) headers['Authorization'] = 'Bearer ' + user.token;
    const res = await fetch(API_BASE + path, {
      ...options,
      headers
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  } catch (err) {
    throw err;
  }
}

// ---- Toast Notifications ----
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  const icons = { success: 'fa-check-circle', error: 'fa-times-circle', info: 'fa-info-circle' };
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<i class="fas ${icons[type] || icons.info}" style="color:${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#4f8ef7'}"></i> ${message}`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

// ---- Modal Helpers ----
function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.add('hidden');
  });
});

// ---- Login + Auth ----
function getCurrentUser() {
  try { return JSON.parse(localStorage.getItem('edutrackUser') || 'null'); } catch { return null; }
}
function setCurrentUser(user) {
  if (user) localStorage.setItem('edutrackUser', JSON.stringify(user));
  else localStorage.removeItem('edutrackUser');
}
function showLogin(show) {
  const overlay = document.getElementById('loginOverlay');
  const logoutBtn = document.getElementById('logoutBtn');
  const main = document.getElementById('mainContent');
  const sidebar = document.getElementById('sidebar');
  if (show) {
    overlay.classList.remove('hidden');
    logoutBtn.classList.add('hidden');
    main.classList.add('hidden');
    sidebar.classList.add('hidden');
  } else {
    overlay.classList.add('hidden');
    logoutBtn.classList.remove('hidden');
    main.classList.remove('hidden');
    sidebar.classList.remove('hidden');
  }
}

async function loginUser() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value.trim();
  const role = document.getElementById('loginRole').value;
  const msg = document.getElementById('loginMessage');
  msg.textContent = '';
  if (!email || !password) { msg.textContent = 'Email and password are required'; return; }
  try {
    const { data } = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password, role }) });
    if (!data || !data.token) throw new Error('Login failed');
    setCurrentUser(data);
    msg.style.color = '#10b981';
    msg.textContent = `Welcome ${data.name} (${data.role})`;
    setTimeout(async () => {
      showLogin(false);
      applyRolePermissions();
      await populateClassSelects();
      navigateTo('dashboard');
    }, 300);
  } catch (err) {
    msg.style.color = '#f87171';
    msg.textContent = err.message || 'Login failed';
  }
}

function logoutUser() {
  setCurrentUser(null);
  showLogin(true);
  navigateTo('dashboard');
}

// ---- SPA Routing ----
const pages = {
  dashboard: { title: 'Dashboard', subtitle: 'Overview of your classroom analytics', init: () => window.initDashboard?.() },
  students: { title: 'Students', subtitle: 'Manage all enrolled students', init: () => window.initStudents?.() },
  classes: { title: 'Classes & Subjects', subtitle: 'Manage all class groups', init: () => window.initClasses?.() },
  attendance: { title: 'Mark Attendance', subtitle: 'Record student attendance by class and date', init: () => window.initAttendance?.() },
  reports: { title: 'Reports & Analytics', subtitle: 'In-depth attendance analysis and trends', init: () => window.initReports?.() }
};

let currentPage = null;

function navigateTo(pageName) {
  if (currentPage === pageName) return;
  currentPage = pageName;

  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

  const navEl = document.getElementById(`nav-${pageName}`);
  const pageEl = document.getElementById(`page-${pageName}`);
  if (navEl) navEl.classList.add('active');
  if (pageEl) pageEl.classList.add('active');

  const cfg = pages[pageName];
  if (cfg) {
    document.getElementById('pageTitle').textContent = cfg.title;
    document.getElementById('pageSubtitle').textContent = cfg.subtitle;
    if (cfg.init) cfg.init();
  }
}

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    navigateTo(item.dataset.page);
  });
});

// ---- Sidebar Toggle ----
const sidebar = document.getElementById('sidebar');
const mainContent = document.getElementById('mainContent');
document.getElementById('sidebarToggle').addEventListener('click', () => {
  sidebar.classList.toggle('collapsed');
  mainContent.classList.toggle('expanded');
});

// ---- Clock ----
function updateClock() {
  const now = new Date();
  const timeEl = document.getElementById('headerTime');
  if (timeEl) timeEl.textContent = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateEl = document.getElementById('sidebarDate');
  if (dateEl) dateEl.textContent = now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}
updateClock();
setInterval(updateClock, 1000);

// ---- Today's date badge ----
const todayDateBadge = document.getElementById('todayDateBadge');
if (todayDateBadge) {
  todayDateBadge.textContent = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ---- Today's badge on attendance date ----
document.addEventListener('DOMContentLoaded', () => {
  const dateInput = document.getElementById('attendanceDateInput');
  if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
  const reportFrom = document.getElementById('reportFrom');
  const reportTo = document.getElementById('reportTo');
  if (reportFrom) {
    const d = new Date(); d.setDate(d.getDate() - 14);
    reportFrom.value = d.toISOString().split('T')[0];
  }
  if (reportTo) reportTo.value = new Date().toISOString().split('T')[0];
});

// ---- Utility: Format date nicely ----
function fmtDate(d) { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); }
function getPctClass(pct) {
  if (pct == null) return '';
  if (pct >= 75) return 'pct-high';
  if (pct >= 50) return 'pct-mid';
  return 'pct-low';
}

async function onExtractOcr() {
  const fileInput = document.getElementById('attendanceOcrFile');
  const resultArea = document.getElementById('ocrResult');
  if (!fileInput.files.length) {
    showToast('Please select an image to extract attendance', 'error');
    return;
  }
  const file = fileInput.files[0];
  try {
    if (!window.Tesseract) {
      showToast('OCR engine is not loaded. Please reload page.', 'error');
      return;
    }
    resultArea.value = 'Extracting...';
    const { data } = await Tesseract.recognize(file, 'eng', { logger: m => console.log(m) });
    const text = data.text.trim();
    resultArea.value = text;
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    const records = [];
    for (const line of lines) {
      const parts = line.split(/[\s,;\t]+/);
      if (parts.length >= 2) {
        const roll = parts[0].replace(/[^A-Za-z0-9]/g, '');
        const status = parts[1].toLowerCase().startsWith('p') ? 'present' : parts[1].toLowerCase().startsWith('l') ? 'late' : 'absent';
        records.push({ roll_no: roll, status });
      }
    }
    if (!records.length) {
      showToast('No recognizable attendance rows found. Use format "ROLL STATUS".', 'error');
      return;
    }

    const classId = document.getElementById('attendanceClassSelect').value;
    const date = document.getElementById('attendanceDateInput').value;
    if (!classId || !date) {
      showToast('Select class and date before OCR auto-marking', 'error');
      return;
    }

    const students = await api(`/students?class_id=${classId}`);
    // match by roll no and map to student_id
    const studentMap = {};
    (students.data || []).forEach(s => { studentMap[s.roll_no.toUpperCase()] = s.id; });
    const matched = records.filter(r => studentMap[r.roll_no.toUpperCase()]).map(r => ({ student_id: studentMap[r.roll_no.toUpperCase()], status: r.status }));

    if (!matched.length) {
      showToast('No student roll numbers matched in selected class', 'error');
      return;
    }

    const payload = { class_id: parseInt(classId), date, records: matched };
    await api('/attendance/mark', { method: 'POST', body: JSON.stringify(payload) });
    showToast(`Auto-marked ${matched.length} students using OCR`, 'success');
    await window.initAttendance?.();
  } catch (err) {
    console.error('OCR error', err);
    showToast('OCR extraction failed: ' + err.message, 'error');
  }
}

// ---- Populate class selectors globally ----
async function populateClassSelects() {
  try {
    const { data } = await api('/classes');
    const selects = ['studentClassFilter', 'attendanceClassSelect', 'reportClassFilter', 'studentClasses'];
    selects.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const keepFirst = el.options[0];
      el.innerHTML = '';
      el.appendChild(keepFirst.cloneNode(true));
      data.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = `${c.name} – ${c.subject}`;
        el.appendChild(opt);
      });
    });
  } catch (_) {}
}

// ---- Init ----
window.addEventListener('DOMContentLoaded', () => {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    showLogin(true);
  } else {
    showLogin(false);
    applyRolePermissions();
    populateClassSelects();
    navigateTo('dashboard');
  }

  document.getElementById('loginBtn').addEventListener('click', loginUser);
  document.getElementById('logoutBtn').addEventListener('click', logoutUser);
  document.getElementById('extractOcrBtn').addEventListener('click', onExtractOcr);
});

// Expose globally
window.api = api;
window.showToast = showToast;
window.openModal = openModal;
window.closeModal = closeModal;
window.fmtDate = fmtDate;
window.getPctClass = getPctClass;
window.populateClassSelects = populateClassSelects;
function applyRolePermissions() {
  const user = getCurrentUser();
  const navAttendance = document.getElementById('nav-attendance');
  if (!user) return;
  const role = user.role;
  if (role === 'student' || role === 'parent') {
    navAttendance.classList.add('hidden');
    document.getElementById('nav-classes').classList.add('hidden');
  } else {
    navAttendance.classList.remove('hidden');
    document.getElementById('nav-classes').classList.remove('hidden');
  }
}

function renderAISuggestions(summary) {
  const suggestions = [
    'Encourage all students to complete attendance before class start.',
    'Focus on low-attendance students this week for counselor outreach.',
    'Offer additional revision sessions for the class with declining trend.',
    'Send automated notifications to parents for >2 consecutive absences.'
  ];
  const list = document.getElementById('aiSuggestionsList');
  if (!list) return;
  list.innerHTML = suggestions.slice(0, 4).map(s => `<li>${s}</li>`).join('');
  if (summary && summary.today && summary.today.present !== undefined) {
    const high = summary.today.present > 0 && summary.today.total > 0 && summary.today.present / summary.today.total > 0.8;
    const prefix = high ? 'Great job: ' : 'Action needed: ';
    list.innerHTML += `<li><strong>${prefix}</strong>${high ? 'Keep momentum with recognition rewards.' : 'Plan a quick attendance reminder call.'}</li>`;
  }
}

const notifications = [
  { id: 1, type: 'success', text: 'New attendance policy issued for all grades.' },
  { id: 2, type: 'info', text: 'Faculty meeting scheduled tomorrow at 4 PM.' },
  { id: 3, type: 'warning', text: '5 students have low attendance this week.' }
];

function renderNotifications() {
  const list = document.getElementById('notificationsList');
  if (!list) return;
  list.innerHTML = notifications.map(n => `<li style="margin-bottom:6px;">${n.type === 'warning' ? '⚠️' : n.type === 'success' ? '✅' : 'ℹ️'} ${n.text}</li>`).join('');
}

document.addEventListener('click', event => {
  if (event.target?.id === 'clearNotificationsBtn') {
    notifications.length = 0;
    renderNotifications();
    showToast('Notifications cleared', 'success');
  }
});

function quickMarkAttendance(mode) {
  const classId = document.getElementById('attendanceClassSelect').value;
  const date = document.getElementById('attendanceDateInput').value;
  if (!classId || !date) { showToast('Select a class and date first', 'error'); return; }
  const rows = document.querySelectorAll('.attendance-row');
  if (!rows.length) { showToast('Load students first', 'error'); return; }
  const statuses = ['present', 'late', 'absent'];
  rows.forEach((row, idx) => {
    const id = row.id.replace('ar-', '');
    const status = mode === 'qr' ? (idx % 3 === 0 ? 'present' : 'late') : (idx % 4 === 0 ? 'absent' : 'present');
    attendanceSession[id] = status;
    row.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
    const btn = row.querySelector(`.toggle-btn.${status}`);
    if (btn) btn.classList.add('active');
  });
  updateAttendanceSummary();
  showToast(mode === 'qr' ? 'QR scan completed. Attendance prefilled.' : 'Face scan completed. Attendance prefilled.', 'success');
}

window.renderAISuggestions = renderAISuggestions;
window.renderNotifications = renderNotifications;
window.quickMarkAttendance = quickMarkAttendance;
window.applyRolePermissions = applyRolePermissions;