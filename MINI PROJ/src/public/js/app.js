/* ============================================
   APP.JS - Core Navigation & Utilities
   ============================================ */

const API_BASE = '/api';

// ---- API Helper ----
async function api(path, options = {}) {
  try {
    const res = await fetch(API_BASE + path, {
      headers: { 'Content-Type': 'application/json' },
      ...options
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

// ---- Populate class selectors globally ----
async function populateClassSelects() {
  try {
    const { data } = await api('/classes');
    const selects = ['studentClassFilter', 'attendanceClassSelect', 'reportClassFilter', 'studentClass'];
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
  populateClassSelects();
  navigateTo('dashboard');
});

// Expose globally
window.api = api;
window.showToast = showToast;
window.openModal = openModal;
window.closeModal = closeModal;
window.fmtDate = fmtDate;
window.getPctClass = getPctClass;
window.populateClassSelects = populateClassSelects;
