/* ============================================
   CLASSES.JS
   ============================================ */

let allClassesData = [];
let deleteClassId = null;

async function initClasses() {
  await loadClasses();
  setupClassForm();
}

async function loadClasses() {
  const grid = document.getElementById('classesGrid');
  grid.innerHTML = `<div class="loading-card"><div class="spinner"></div> Loading classes...</div>`;
  try {
    const { data } = await api('/classes');
    allClassesData = data;
    renderClassCards(data);
  } catch (err) {
    grid.innerHTML = `<div class="loading-card" style="color:var(--accent-red)">Error: ${err.message}</div>`;
  }
}

const classIcons = ['fa-code', 'fa-database', 'fa-globe', 'fa-microchip', 'fa-brain', 'fa-network-wired', 'fa-layer-group', 'fa-server'];
const classColors = [
  'linear-gradient(135deg,#4f8ef7,#06b6d4)',
  'linear-gradient(135deg,#8b5cf6,#ec4899)',
  'linear-gradient(135deg,#10b981,#06b6d4)',
  'linear-gradient(135deg,#f59e0b,#ef4444)',
  'linear-gradient(135deg,#6366f1,#8b5cf6)',
  'linear-gradient(135deg,#14b8a6,#10b981)',
];

function renderClassCards(classes) {
  const grid = document.getElementById('classesGrid');
  if (!classes.length) {
    grid.innerHTML = `<div class="loading-card">No classes found. Click "Add Class" to create one.</div>`;
    return;
  }
  grid.innerHTML = classes.map((c, i) => {
    const icon = classIcons[i % classIcons.length];
    const color = classColors[i % classColors.length];
    const pct = c.avg_attendance;
    return `
      <div class="class-card">
        <div class="class-card-header">
          <div class="class-card-icon" style="background:${color}"><i class="fas ${icon}"></i></div>
          <div class="class-card-actions">
            <button class="btn btn-icon btn-edit" onclick="editClass(${c.id})" title="Edit"><i class="fas fa-edit"></i></button>
            <button class="btn btn-icon btn-delete" onclick="confirmDeleteClass(${c.id}, '${c.name}')" title="Delete"><i class="fas fa-trash"></i></button>
          </div>
        </div>
        <h3>${c.name}</h3>
        <span class="subject-tag">${c.subject}</span>
        <div class="class-card-meta">
          <div class="class-meta-row"><i class="fas fa-chalkboard-teacher"></i> ${c.teacher}</div>
          ${c.room ? `<div class="class-meta-row"><i class="fas fa-door-open"></i> ${c.room}</div>` : ''}
          ${c.schedule ? `<div class="class-meta-row"><i class="fas fa-clock"></i> ${c.schedule}</div>` : ''}
        </div>
        <div class="class-card-footer">
          <span class="student-count-badge"><i class="fas fa-users" style="margin-right:6px"></i>${c.student_count || 0} Students</span>
          ${pct != null ? `<span class="pct-badge ${getPctClass(pct)}">${pct}% Attendance</span>` : '<span style="color:var(--text-muted);font-size:12px">No attendance data</span>'}
        </div>
      </div>`;
  }).join('');
}

function setupClassForm() {
  document.getElementById('addClassBtn').addEventListener('click', () => {
    document.getElementById('classModalTitle').textContent = 'Add Class';
    document.getElementById('classId').value = '';
    document.getElementById('classForm').reset();
    document.getElementById('classSubmitBtn').textContent = 'Add Class';
    openModal('classModal');
  });

  document.getElementById('classForm').addEventListener('submit', async e => {
    e.preventDefault();
    const id = document.getElementById('classId').value;
    const payload = {
      name: document.getElementById('className').value.trim(),
      subject: document.getElementById('classSubject').value.trim(),
      teacher: document.getElementById('classTeacher').value.trim(),
      room: document.getElementById('classRoom').value.trim(),
      schedule: document.getElementById('classSchedule').value.trim()
    };
    try {
      if (id) {
        await api(`/classes/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
        showToast('Class updated!', 'success');
      } else {
        await api('/classes', { method: 'POST', body: JSON.stringify(payload) });
        showToast('Class added!', 'success');
        await populateClassSelects();
      }
      closeModal('classModal');
      await loadClasses();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

async function editClass(id) {
  const cls = allClassesData.find(c => c.id === id);
  if (!cls) return;
  document.getElementById('classModalTitle').textContent = 'Edit Class';
  document.getElementById('classId').value = cls.id;
  document.getElementById('className').value = cls.name;
  document.getElementById('classSubject').value = cls.subject;
  document.getElementById('classTeacher').value = cls.teacher;
  document.getElementById('classRoom').value = cls.room || '';
  document.getElementById('classSchedule').value = cls.schedule || '';
  document.getElementById('classSubmitBtn').textContent = 'Save Changes';
  openModal('classModal');
}

function confirmDeleteClass(id, name) {
  deleteClassId = id;
  document.getElementById('confirmMessage').textContent = `Delete class "${name}"? Students in this class will be unassigned.`;
  document.getElementById('confirmDeleteBtn').onclick = async () => {
    try {
      await api(`/classes/${deleteClassId}`, { method: 'DELETE' });
      showToast('Class deleted', 'success');
      closeModal('confirmModal');
      await loadClasses();
      await populateClassSelects();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };
  openModal('confirmModal');
}

window.editClass = editClass;
window.confirmDeleteClass = confirmDeleteClass;
