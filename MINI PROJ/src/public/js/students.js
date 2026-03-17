/* ============================================
   STUDENTS.JS
   ============================================ */

let allStudentsData = [];
let deleteStudentId = null;

async function initStudents() {
  await loadStudents();
  setupStudentSearch();
  setupStudentForm();
  setupStudentFilters();
}

async function loadStudents(classId = '', search = '') {
  const tbody = document.getElementById('studentsTableBody');
  tbody.innerHTML = `<tr><td colspan="6" class="loading-row"><div class="spinner"></div> Loading students...</td></tr>`;
  try {
    let url = '/students?';
    if (classId) url += `class_id=${classId}&`;
    if (search) url += `search=${encodeURIComponent(search)}&`;
    const { data } = await api(url);
    allStudentsData = data;
    renderStudentsTable(data);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="loading-row" style="color:var(--accent-red)">Error: ${err.message}</td></tr>`;
  }
}

function renderStudentsTable(students) {
  const tbody = document.getElementById('studentsTableBody');
  if (!students.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="loading-row">No students found</td></tr>`;
    return;
  }
  tbody.innerHTML = students.map(s => {
    const pct = s.attendance_pct;
    const pctClass = getPctClass(pct);
    const pctText = pct != null ? `${pct}%` : 'N/A';
    const initials = s.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    return `<tr>
      <td><span class="badge badge-blue">${s.roll_no}</span></td>
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#4f8ef7,#8b5cf6);display:grid;place-items:center;font-size:12px;font-weight:700;color:white;flex-shrink:0">${initials}</div>
          <span style="font-weight:600">${s.name}</span>
        </div>
      </td>
      <td>${s.class_names ? `<span style="color:var(--accent-purple)">${s.class_names}</span>` : '<span style="color:var(--text-muted)">—</span>'}</td>
      <td style="color:var(--text-muted)">${s.email || '—'}</td>
      <td>
        <span class="pct-badge ${pctClass}">${pctText}</span>
        ${s.total_classes ? `<span style="font-size:11px;color:var(--text-muted);margin-left:4px">(${s.total_classes} sessions)</span>` : ''}
      </td>
      <td>
        <div style="display:flex;gap:8px">
          <button class="btn btn-icon btn-edit" onclick="editStudent(${s.id})" title="Edit"><i class="fas fa-edit"></i></button>
          <button class="btn btn-icon btn-delete" onclick="confirmDeleteStudent(${s.id}, '${s.name}')" title="Delete"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function setupStudentSearch() {
  let timer;
  document.getElementById('studentSearch').addEventListener('input', e => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const classId = document.getElementById('studentClassFilter').value;
      loadStudents(classId, e.target.value.trim());
    }, 350);
  });
}

function setupStudentFilters() {
  document.getElementById('studentClassFilter').addEventListener('change', e => {
    const search = document.getElementById('studentSearch').value.trim();
    loadStudents(e.target.value, search);
  });
}

function setupStudentForm() {
  document.getElementById('addStudentBtn').addEventListener('click', () => {
    document.getElementById('studentModalTitle').textContent = 'Add Student';
    document.getElementById('studentId').value = '';
    document.getElementById('studentForm').reset();
    document.getElementById('studentSubmitBtn').textContent = 'Add Student';
    openModal('studentModal');
  });

  document.getElementById('studentForm').addEventListener('submit', async e => {
    e.preventDefault();
    const id = document.getElementById('studentId').value;
    const selectedClassOptions = Array.from(document.getElementById('studentClasses').selectedOptions).map(o => o.value).filter(v => v);
    const payload = {
      name: document.getElementById('studentName').value.trim(),
      roll_no: document.getElementById('studentRoll').value.trim(),
      email: document.getElementById('studentEmail').value.trim(),
      phone: document.getElementById('studentPhone').value.trim(),
      class_ids: selectedClassOptions
    };
    try {
      if (id) {
        await api(`/students/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
        showToast('Student updated successfully!', 'success');
      } else {
        await api('/students', { method: 'POST', body: JSON.stringify(payload) });
        showToast('Student added successfully!', 'success');
      }
      closeModal('studentModal');
      const classId = document.getElementById('studentClassFilter').value;
      const search = document.getElementById('studentSearch').value.trim();
      await loadStudents(classId, search);
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

async function editStudent(id) {
  const student = allStudentsData.find(s => s.id === id);
  if (!student) return;
  document.getElementById('studentModalTitle').textContent = 'Edit Student';
  document.getElementById('studentId').value = student.id;
  document.getElementById('studentName').value = student.name;
  document.getElementById('studentRoll').value = student.roll_no;
  document.getElementById('studentEmail').value = student.email || '';
  document.getElementById('studentPhone').value = student.phone || '';
  const classSelect = document.getElementById('studentClasses');
  Array.from(classSelect.options).forEach(opt => { opt.selected = false; });
  if (student.class_ids) {
    const ids = student.class_ids.split(',');
    Array.from(classSelect.options).forEach(opt => {
      if (ids.includes(opt.value)) opt.selected = true;
    });
  }
  document.getElementById('studentSubmitBtn').textContent = 'Save Changes';
  openModal('studentModal');
}

function confirmDeleteStudent(id, name) {
  deleteStudentId = id;
  document.getElementById('confirmMessage').textContent = `Are you sure you want to delete "${name}"? This will also remove their attendance records.`;
  document.getElementById('confirmDeleteBtn').onclick = async () => {
    try {
      await api(`/students/${deleteStudentId}`, { method: 'DELETE' });
      showToast('Student deleted successfully', 'success');
      closeModal('confirmModal');
      const classId = document.getElementById('studentClassFilter').value;
      await loadStudents(classId);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };
  openModal('confirmModal');
}

window.editStudent = editStudent;
window.confirmDeleteStudent = confirmDeleteStudent;
