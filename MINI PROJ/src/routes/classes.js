const express = require('express');

module.exports = function(db) {
  const router = express.Router();

  // GET all classes
  router.get('/', (req, res) => {
    try {
      const classes = db.prepare('SELECT * FROM classes ORDER BY name').all();
      // Get student counts and avg attendance separately for sql.js compatibility
      classes.forEach(c => {
        const sc = db.prepare('SELECT COUNT(*) as cnt FROM students WHERE class_id = ?').get(c.id);
        c.student_count = sc ? sc.cnt : 0;
        const att = db.prepare(`
          SELECT COUNT(*) as total,
            SUM(CASE WHEN status IN ('present','late') THEN 1 ELSE 0 END) as present_cnt
          FROM attendance WHERE class_id = ?
        `).get(c.id);
        c.avg_attendance = (att && att.total > 0)
          ? Math.round((att.present_cnt / att.total) * 1000) / 10
          : null;
      });
      res.json({ success: true, data: classes });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET single class
  router.get('/:id', (req, res) => {
    try {
      const cls = db.prepare('SELECT * FROM classes WHERE id = ?').get(req.params.id);
      if (!cls) return res.status(404).json({ success: false, error: 'Class not found' });
      res.json({ success: true, data: cls });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST create class
  router.post('/', (req, res) => {
    try {
      const { name, subject, teacher, room, schedule } = req.body;
      if (!name || !subject || !teacher) return res.status(400).json({ success: false, error: 'Name, subject and teacher are required' });
      const result = db.prepare('INSERT INTO classes (name, subject, teacher, room, schedule) VALUES (?, ?, ?, ?, ?)').run(name, subject, teacher, room || '', schedule || '');
      const cls = db.prepare('SELECT * FROM classes WHERE id = ?').get(result.lastInsertRowid);
      res.status(201).json({ success: true, data: cls, message: 'Class added successfully' });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // PUT update class
  router.put('/:id', (req, res) => {
    try {
      const { name, subject, teacher, room, schedule } = req.body;
      const existing = db.prepare('SELECT id FROM classes WHERE id = ?').get(req.params.id);
      if (!existing) return res.status(404).json({ success: false, error: 'Class not found' });
      db.prepare('UPDATE classes SET name=?, subject=?, teacher=?, room=?, schedule=? WHERE id=?').run(name, subject, teacher, room || '', schedule || '', req.params.id);
      const updated = db.prepare('SELECT * FROM classes WHERE id = ?').get(req.params.id);
      res.json({ success: true, data: updated, message: 'Class updated successfully' });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // DELETE class
  router.delete('/:id', (req, res) => {
    try {
      const existing = db.prepare('SELECT id FROM classes WHERE id = ?').get(req.params.id);
      if (!existing) return res.status(404).json({ success: false, error: 'Class not found' });
      db.prepare('DELETE FROM attendance WHERE class_id = ?').run(req.params.id);
      db.prepare('UPDATE students SET class_id = NULL WHERE class_id = ?').run(req.params.id);
      db.prepare('DELETE FROM classes WHERE id = ?').run(req.params.id);
      res.json({ success: true, message: 'Class deleted successfully' });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
};
