const express = require('express');

module.exports = function(db) {
  const router = express.Router();

  // GET all students
  router.get('/', (req, res) => {
    try {
      const { class_id, search } = req.query;
      let sql = `
        SELECT s.id, s.name, s.roll_no, s.email, s.phone, s.class_id, s.created_at,
          c.name as class_name, c.subject,
          COUNT(a.id) as total_classes,
          SUM(CASE WHEN a.status = 'present' OR a.status = 'late' THEN 1 ELSE 0 END) as attended
        FROM students s
        LEFT JOIN classes c ON s.class_id = c.id
        LEFT JOIN attendance a ON s.id = a.student_id
      `;
      const conditions = [];
      const params = [];
      if (class_id) { conditions.push('s.class_id = ?'); params.push(class_id); }
      if (search) {
        conditions.push('(s.name LIKE ? OR s.roll_no LIKE ? OR s.email LIKE ?)');
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }
      if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
      sql += ' GROUP BY s.id ORDER BY s.name';
      const students = db.prepare(sql).all(...params);
      // Compute attendance_pct manually
      students.forEach(s => {
        s.attendance_pct = s.total_classes > 0
          ? Math.round((s.attended / s.total_classes) * 1000) / 10
          : null;
      });
      res.json({ success: true, data: students });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST create student
  router.post('/', (req, res) => {
    try {
      const { name, roll_no, email, phone, class_id } = req.body;
      if (!name || !roll_no) return res.status(400).json({ success: false, error: 'Name and Roll No are required' });
      // Check uniqueness
      const existing = db.prepare('SELECT id FROM students WHERE roll_no = ?').get(roll_no);
      if (existing) return res.status(400).json({ success: false, error: 'Roll number already exists' });
      const result = db.prepare('INSERT INTO students (name, roll_no, email, phone, class_id) VALUES (?, ?, ?, ?, ?)').run(name, roll_no, email || '', phone || '', class_id || null);
      const student = db.prepare('SELECT * FROM students WHERE id = ?').get(result.lastInsertRowid);
      res.status(201).json({ success: true, data: student, message: 'Student added successfully' });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // PUT update student
  router.put('/:id', (req, res) => {
    try {
      const { name, roll_no, email, phone, class_id } = req.body;
      const existing = db.prepare('SELECT id FROM students WHERE id = ?').get(req.params.id);
      if (!existing) return res.status(404).json({ success: false, error: 'Student not found' });
      // Check roll_no uniqueness (exclude current)
      const dup = db.prepare('SELECT id FROM students WHERE roll_no = ? AND id != ?').get(roll_no, req.params.id);
      if (dup) return res.status(400).json({ success: false, error: 'Roll number already exists' });
      db.prepare('UPDATE students SET name=?, roll_no=?, email=?, phone=?, class_id=? WHERE id=?').run(name, roll_no, email || '', phone || '', class_id || null, req.params.id);
      const updated = db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.id);
      res.json({ success: true, data: updated, message: 'Student updated successfully' });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // DELETE student
  router.delete('/:id', (req, res) => {
    try {
      const existing = db.prepare('SELECT id FROM students WHERE id = ?').get(req.params.id);
      if (!existing) return res.status(404).json({ success: false, error: 'Student not found' });
      // Delete attendance first
      db.prepare('DELETE FROM attendance WHERE student_id = ?').run(req.params.id);
      db.prepare('DELETE FROM students WHERE id = ?').run(req.params.id);
      res.json({ success: true, message: 'Student deleted successfully' });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
};
