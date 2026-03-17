const express = require('express');

module.exports = function(db) {
  const router = express.Router();

  // GET all students
  router.get('/', (req, res) => {
    try {
      const { class_id, search } = req.query;
      let sql = `
        SELECT s.id, s.name, s.roll_no, s.email, s.phone, s.class_id, s.created_at,
          (SELECT GROUP_CONCAT(DISTINCT c.name || ' - ' || c.subject) FROM student_classes sc
            JOIN classes c ON sc.class_id = c.id WHERE sc.student_id = s.id) as class_names,
          (SELECT GROUP_CONCAT(DISTINCT sc.class_id) FROM student_classes sc WHERE sc.student_id = s.id) as class_ids,
          (SELECT COUNT(*) FROM attendance a WHERE a.student_id = s.id) as total_classes,
          (SELECT SUM(CASE WHEN a.status = 'present' OR a.status = 'late' THEN 1 ELSE 0 END) FROM attendance a WHERE a.student_id = s.id) as attended
        FROM students s
      `;
      const conditions = [];
      const params = [];
      if (class_id) {
        sql += ' JOIN student_classes sc ON sc.student_id = s.id';
        conditions.push('sc.class_id = ?');
        params.push(class_id);
      }
      if (search) {
        conditions.push('(s.name LIKE ? OR s.roll_no LIKE ? OR s.email LIKE ?)');
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }
      if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
      sql += ' GROUP BY s.id ORDER BY s.name';
      const students = db.prepare(sql).all(...params);
      students.forEach(s => {
        s.class_names = s.class_names || '';
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
      const { name, roll_no, email, phone, class_ids } = req.body;
      console.log('create student payload', { name, roll_no, class_ids });
      if (!name || !roll_no) return res.status(400).json({ success: false, error: 'Name and Roll No are required' });
      const existing = db.prepare('SELECT id FROM students WHERE roll_no = ?').get(roll_no);
      if (existing) return res.status(400).json({ success: false, error: 'Roll number already exists' });
      const firstClassId = Array.isArray(class_ids) && class_ids.length ? class_ids[0] : null;
      const result = db.prepare('INSERT INTO students (name, roll_no, email, phone, class_id) VALUES (?, ?, ?, ?, ?)').run(name, roll_no, email || '', phone || '', firstClassId || null);
      const studentId = result.lastInsertRowid;
      if (Array.isArray(class_ids)) {
        class_ids.forEach(cid => {
          db.prepare('INSERT OR IGNORE INTO student_classes (student_id, class_id) VALUES (?, ?)').run(studentId, cid);
        });
      } else if (firstClassId) {
        db.prepare('INSERT OR IGNORE INTO student_classes (student_id, class_id) VALUES (?, ?)').run(studentId, firstClassId);
      }
      const student = db.prepare('SELECT * FROM students WHERE id = ?').get(studentId);
      res.status(201).json({ success: true, data: student, message: 'Student added successfully' });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // PUT update student
  router.put('/:id', (req, res) => {
    try {
      const { name, roll_no, email, phone, class_ids } = req.body;
      const existing = db.prepare('SELECT id FROM students WHERE id = ?').get(req.params.id);
      if (!existing) return res.status(404).json({ success: false, error: 'Student not found' });
      const dup = db.prepare('SELECT id FROM students WHERE roll_no = ? AND id != ?').get(roll_no, req.params.id);
      if (dup) return res.status(400).json({ success: false, error: 'Roll number already exists' });
      const firstClassId = Array.isArray(class_ids) && class_ids.length ? class_ids[0] : null;
      db.prepare('UPDATE students SET name=?, roll_no=?, email=?, phone=?, class_id=? WHERE id=?').run(name, roll_no, email || '', phone || '', firstClassId || null, req.params.id);
      // student_classes mapping
      db.prepare('DELETE FROM student_classes WHERE student_id = ?').run(req.params.id);
      if (Array.isArray(class_ids)) {
        class_ids.forEach(cid => {
          db.prepare('INSERT OR IGNORE INTO student_classes (student_id, class_id) VALUES (?, ?)').run(req.params.id, cid);
        });
      } else if (firstClassId) {
        db.prepare('INSERT OR IGNORE INTO student_classes (student_id, class_id) VALUES (?, ?)').run(req.params.id, firstClassId);
      }
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
      db.prepare('DELETE FROM student_classes WHERE student_id = ?').run(req.params.id);
      db.prepare('DELETE FROM students WHERE id = ?').run(req.params.id);
      res.json({ success: true, message: 'Student deleted successfully' });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
};
