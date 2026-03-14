/* ============================================
   REPORTS.JS
   ============================================ */

let trendChartInstance = null;
let classChartInstance = null;
let lastReportData = null;

async function initReports() {
  document.getElementById('generateReportBtn').addEventListener('click', generateReport);
  document.getElementById('exportCsvBtn').addEventListener('click', exportCsv);
  // Auto-generate with defaults
  await generateReport();
}

async function generateReport() {
  const classId = document.getElementById('reportClassFilter').value;
  const from = document.getElementById('reportFrom').value;
  const to = document.getElementById('reportTo').value;

  const btn = document.getElementById('generateReportBtn');
  btn.innerHTML = '<div class="spinner"></div> Generating...';
  btn.disabled = true;

  try {
    let url = '/attendance/analytics?';
    if (classId) url += `class_id=${classId}&`;
    if (from) url += `from=${from}&`;
    if (to) url += `to=${to}&`;
    const { data } = await api(url);
    lastReportData = data;
    renderTrendChart(data.trend);
    renderClassChart(data.classStats);
    renderStudentStatsTable(data.studentStats);
    renderLowAttendanceAlerts(data.studentStats);
  } catch (err) {
    showToast('Failed to generate report: ' + err.message, 'error');
  } finally {
    btn.innerHTML = '<i class="fas fa-chart-bar"></i> Generate Report';
    btn.disabled = false;
  }
}

function renderTrendChart(trend) {
  if (trendChartInstance) trendChartInstance.destroy();
  const ctx = document.getElementById('trendChart').getContext('2d');
  if (!trend.length) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.fillStyle = '#64748b'; ctx.textAlign = 'center'; ctx.font = '14px Inter';
    ctx.fillText('No data for selected range', ctx.canvas.width / 2, 120);
    return;
  }

  const gradient = ctx.createLinearGradient(0, 0, 0, 240);
  gradient.addColorStop(0, 'rgba(79,142,247,0.4)');
  gradient.addColorStop(1, 'rgba(79,142,247,0.01)');

  trendChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: trend.map(d => fmtDate(d.date)),
      datasets: [{
        label: 'Attendance %',
        data: trend.map(d => d.pct),
        borderColor: '#4f8ef7',
        backgroundColor: gradient,
        borderWidth: 2.5,
        pointBackgroundColor: '#4f8ef7',
        pointBorderColor: '#0a0b1a',
        pointBorderWidth: 2,
        pointRadius: 5,
        tension: 0.4, fill: true
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#94a3b8', font: { family: 'Inter', size: 12 } } },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.parsed.y}% (${trend[ctx.dataIndex]?.present || 0}/${trend[ctx.dataIndex]?.total || 0})`
          }
        }
      },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#64748b', font: { family: 'Inter' } } },
        y: {
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: { color: '#64748b', font: { family: 'Inter' }, callback: v => v + '%' },
          min: 0, max: 100,
          afterDataLimits: scale => { scale.max = 100; }
        }
      }
    }
  });
}

function renderClassChart(classStats) {
  if (classChartInstance) classChartInstance.destroy();
  const ctx = document.getElementById('classChart').getContext('2d');
  if (!classStats.length) return;
  const colors = ['rgba(79,142,247,0.8)', 'rgba(139,92,246,0.8)', 'rgba(16,185,129,0.8)', 'rgba(245,158,11,0.8)', 'rgba(239,68,68,0.8)', 'rgba(6,182,212,0.8)'];
  classChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: classStats.map(c => c.name),
      datasets: [{
        label: 'Avg Attendance %',
        data: classStats.map(c => c.avg_pct || 0),
        backgroundColor: classStats.map((_, i) => colors[i % colors.length]),
        borderRadius: 8, borderSkipped: false,
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: c => ` ${c.parsed.x}% (${classStats[c.dataIndex]?.sessions || 0} sessions)` } }
      },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#64748b', callback: v => v + '%', font: { family: 'Inter' } }, min: 0, max: 100 },
        y: { grid: { display: false }, ticks: { color: '#94a3b8', font: { family: 'Inter' } } }
      }
    }
  });
}

function renderStudentStatsTable(stats) {
  const tbody = document.getElementById('studentStatsBody');
  if (!stats.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="loading-row">No attendance data found</td></tr>`;
    return;
  }
  tbody.innerHTML = stats.map(s => {
    const pct = s.pct;
    const pctClass = getPctClass(pct);
    return `<tr>
      <td><span class="badge badge-blue">${s.roll_no}</span></td>
      <td style="font-weight:600">${s.name}</td>
      <td style="color:var(--accent-purple)">${s.class_name}</td>
      <td style="text-align:center">${s.total_classes || 0}</td>
      <td style="text-align:center;color:var(--accent-green)">${s.attended || 0}</td>
      <td style="text-align:center;color:var(--accent-red)">${s.absents || 0}</td>
      <td style="text-align:center;color:var(--accent-orange)">${s.lates || 0}</td>
      <td>
        <span class="pct-badge ${pctClass}" style="font-size:14px">${pct != null ? pct + '%' : 'N/A'}</span>
        ${pct != null && pct < 75 ? '<span style="margin-left:8px;font-size:12px;color:var(--accent-red)">⚠ Low</span>' : ''}
      </td>
    </tr>`;
  }).join('');
}

function renderLowAttendanceAlerts(stats) {
  const lowStudents = stats.filter(s => s.pct != null && s.pct < 75);
  const section = document.getElementById('lowAttendanceSection');
  const list = document.getElementById('lowAttendanceList');
  if (!lowStudents.length) { section.classList.add('hidden'); return; }
  section.classList.remove('hidden');
  list.innerHTML = lowStudents.map(s => `
    <div class="low-alert-card">
      <div class="student-info-mini">
        <div class="student-avatar-mini" style="background:linear-gradient(135deg,#ef4444,#f59e0b)">${s.name.substring(0, 2).toUpperCase()}</div>
        <div>
          <div class="student-name-mini">${s.name}</div>
          <div class="student-roll-mini">${s.roll_no} &bull; ${s.class_name}</div>
        </div>
      </div>
      <div>
        <span class="pct-pill">${s.pct}%</span>
        <span style="font-size:12px;color:var(--text-muted);margin-left:8px">${s.attended}/${s.total_classes} classes attended</span>
      </div>
    </div>`).join('');
}

function exportCsv() {
  if (!lastReportData || !lastReportData.studentStats.length) {
    showToast('Generate a report first before exporting', 'error'); return;
  }
  const rows = [['Roll No', 'Name', 'Class', 'Total Classes', 'Attended', 'Absent', 'Late', 'Attendance %']];
  lastReportData.studentStats.forEach(s => {
    rows.push([s.roll_no, s.name, s.class_name, s.total_classes || 0, s.attended || 0, s.absents || 0, s.lates || 0, s.pct != null ? s.pct + '%' : 'N/A']);
  });
  const csv = rows.map(r => r.map(cell => `"${cell}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url;
  const from = document.getElementById('reportFrom').value || 'all';
  const to = document.getElementById('reportTo').value || 'time';
  a.download = `attendance_report_${from}_to_${to}.csv`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('CSV exported successfully!', 'success');
}
