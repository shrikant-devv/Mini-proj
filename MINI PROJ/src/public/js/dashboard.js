/* ============================================
   DASHBOARD.JS
   ============================================ */

let weeklyChartInstance = null;
let todayChartInstance = null;
let dashboardLoaded = false;

async function initDashboard() {
  console.log('[Dashboard] initDashboard');
  if (dashboardLoaded) return;
  dashboardLoaded = true;
  await loadDashboardStats();
  await loadClassOverview();
}

async function loadDashboardStats() {
  try {
    console.log('[Dashboard] loadDashboardStats');
    const apiResp = await api('/attendance/summary');
    const data = apiResp.data || { totalStudents: 0, totalClasses: 0, today: { total: 0, present: 0, absent: 0, late: 0 }, weeklyTrend: [] };

    // Stat cards
    animateValue('stat-students', 0, data.totalStudents || 0, 800);
    animateValue('stat-classes', 0, data.totalClasses || 0, 800);

    const present = data.today?.present || 0;
    const absent = data.today?.absent || 0;
    const late = data.today?.late || 0;
    const total = data.today?.total || 0;

    animateValue('stat-present', 0, present, 800);
    animateValue('stat-absent', 0, absent, 800);

    document.getElementById('stat-present-pct').textContent = total > 0 ? `${Math.round((present / total) * 100)}% Rate` : 'No data today';
    document.getElementById('stat-late-count').textContent = `${late} Late`;

    // Weekly data
    const dates = data.weeklyTrend?.map?.(d => fmtDate(d.date)) || [];
    const presentData = data.weeklyTrend?.map?.(d => d.present || 0) || [];
    const totalData = data.weeklyTrend?.map?.(d => d.total || 0) || [];
    const absentData = totalData.map((t, i) => t - (presentData[i] || 0));

    try {
      if (weeklyChartInstance) weeklyChartInstance.destroy();
      const wCtx = document.getElementById('weeklyChart').getContext('2d');
      if (window.Chart) {
        weeklyChartInstance = new Chart(wCtx, {
          type: 'bar',
          data: {
            labels: dates,
            datasets: [
              { label: 'Present', data: presentData, backgroundColor: 'rgba(16,185,129,0.7)', borderRadius: 6, borderSkipped: false },
              { label: 'Absent', data: absentData, backgroundColor: 'rgba(239,68,68,0.5)', borderRadius: 6, borderSkipped: false }
            ]
          },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#94a3b8', font: { family: 'Inter', size: 12 } } }, tooltip: { mode: 'index' } }, scales: { x: { stacked: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#64748b', font: { family: 'Inter' } } }, y: { stacked: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#64748b', font: { family: 'Inter' } } } } }
        });
      }
    } catch (chartErr) {
      console.error('[Dashboard] weekly chart error', chartErr);
    }

    try {
      if (todayChartInstance) todayChartInstance.destroy();
      const tCtx = document.getElementById('todayChart').getContext('2d');
      if (window.Chart) {
        todayChartInstance = new Chart(tCtx, {
          type: 'doughnut',
          data: {
            labels: ['Present', 'Absent', 'Late'],
            datasets: [{ data: [present - late, absent, late], backgroundColor: ['rgba(16,185,129,0.8)', 'rgba(239,68,68,0.8)', 'rgba(245,158,11,0.8)'], borderColor: ['#10b981', '#ef4444', '#f59e0b'], borderWidth: 2, hoverOffset: 6 }]
          },
          options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', font: { family: 'Inter', size: 12 }, padding: 16 } }, tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed}` } } } }
        });
      }
    } catch (chartErr) {
      console.error('[Dashboard] today chart error', chartErr);
    }
  } catch (err) {
    console.error('[Dashboard] loadDashboardStats error', err);
    showToast('Failed to load dashboard stats', 'error');
  }
}

async function loadClassOverview() {
  try {
    const { data: classes } = await api('/classes');
    const grid = document.getElementById('classOverviewGrid');
    if (!classes.length) { grid.innerHTML = '<p style="color:var(--text-muted)">No classes found</p>'; return; }

    grid.innerHTML = classes.map(c => {
      const pct = c.avg_attendance || 0;
      const fillClass = pct >= 75 ? 'high' : pct >= 50 ? 'mid' : 'low';
      return `
        <div class="class-overview-card">
          <h4>${c.name}</h4>
          <div class="subject">${c.subject} &bull; ${c.teacher}</div>
          <div class="class-meta-row"><i class="fas fa-users"></i> ${c.student_count || 0} Students</div>
          <div class="progress-bar-wrap">
            <div class="progress-label">
              <span>Avg. Attendance</span>
              <span class="${getPctClass(pct)}">${pct ? pct + '%' : 'N/A'}</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill ${fillClass}" style="width:${pct || 0}%"></div>
            </div>
          </div>
        </div>`;
    }).join('');
  } catch (_) {}
}

function animateValue(id, start, end, duration) {
  const el = document.getElementById(id);
  if (!el) return;
  const range = end - start;
  const startTime = performance.now();
  const step = (ts) => {
    const progress = Math.min((ts - startTime) / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(start + range * ease);
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
