const express = require('express');

module.exports = function(db) {
  const router = express.Router();

  // POST - Mark attendance in bulk
  router.post('/mark', (req, res) => {
    try {
      const auth = req.headers.authorization || '';
      if (!auth.startsWith('Bearer ')) return res.status(401).json({ success: false, error: 'Missing token' });
      const token = auth.replace('Bearer ', '');
      const jwt = require('jsonwebtoken');
      const VALID = jwt.verify(token, process.env.JWT_SECRET || 'eduTrackJWTSecret');
      if (!VALID || !['professor','admin'].includes(VALID.role)) return res.status(403).json({ success: false, error: 'Forbidden' });

      const { class_id, date, records } = req.body;
      if (!class_id || !date || !Array.isArray(records)) {
        return res.status(400).json({ success: false, error: 'class_id, date, and records[] are required' });
      }
      records.forEach(r => {
        const existing = db.prepare('SELECT id FROM attendance WHERE student_id=? AND class_id=? AND date=?').get(r.student_id, class_id, date);
        if (existing) {
          db.prepare('UPDATE attendance SET status=? WHERE student_id=? AND class_id=? AND date=?').run(r.status, r.student_id, class_id, date);
        } else {
          db.prepare('INSERT INTO attendance (student_id, class_id, date, status) VALUES (?, ?, ?, ?)').run(r.student_id, class_id, date, r.status);
        }
      });
      res.json({ success: true, message: `Attendance marked for ${records.length} students` });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET - Attendance records with filters
  router.get('/', (req, res) => {
    try {
      const { class_id, date, student_id, from, to } = req.query;
      const records = db.prepare('SELECT * FROM attendance ORDER BY date DESC').all();
      // Filter in JS since sql.js doesn't support complex dynamic SQL well
      let filtered = records;
      if (class_id) filtered = filtered.filter(r => String(r.class_id) === String(class_id));
      if (date) filtered = filtered.filter(r => r.date === date);
      if (student_id) filtered = filtered.filter(r => String(r.student_id) === String(student_id));
      if (from) filtered = filtered.filter(r => r.date >= from);
      if (to) filtered = filtered.filter(r => r.date <= to);
      res.json({ success: true, data: filtered });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET - Dashboard summary
  router.get('/summary', (req, res) => {
    try {
      const totalStudents = db.prepare('SELECT COUNT(*) as cnt FROM students').get().cnt;
      const totalClasses = db.prepare('SELECT COUNT(*) as cnt FROM classes').get().cnt;
      const today = new Date().toISOString().split('T')[0];

      const todayRecords = db.prepare('SELECT status FROM attendance WHERE date = ?').all(today);
      const present = todayRecords.filter(r => r.status === 'present' || r.status === 'late').length;
      const absent = todayRecords.filter(r => r.status === 'absent').length;
      const late = todayRecords.filter(r => r.status === 'late').length;
      const total = todayRecords.length;

      // Weekly trend: get all attendance from last 14 days
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 14);
      const cutoffStr = cutoff.toISOString().split('T')[0];
      const recentRecords = db.prepare('SELECT date, status FROM attendance WHERE date >= ? ORDER BY date').all(cutoffStr);

      // Group by date
      const byDate = {};
      recentRecords.forEach(r => {
        if (!byDate[r.date]) byDate[r.date] = { total: 0, present: 0 };
        byDate[r.date].total++;
        if (r.status === 'present' || r.status === 'late') byDate[r.date].present++;
      });
      const weeklyTrend = Object.entries(byDate)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-7)
        .map(([date, v]) => ({ date, total: v.total, present: v.present }));

      res.json({
        success: true,
        data: { totalStudents, totalClasses, today: { total, present, absent, late }, weeklyTrend }
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET - Analytics
  router.get('/analytics', (req, res) => {
    try {
      const { class_id, from, to } = req.query;

      // All students
      const students = db.prepare('SELECT s.id, s.name, s.roll_no, s.class_id, c.name as class_name FROM students s LEFT JOIN classes c ON s.class_id = c.id').all();
      // All attendance
      let attRecords = db.prepare('SELECT * FROM attendance ORDER BY date').all();
      if (class_id) attRecords = attRecords.filter(r => String(r.class_id) === String(class_id));
      if (from) attRecords = attRecords.filter(r => r.date >= from);
      if (to) attRecords = attRecords.filter(r => r.date <= to);

      // Student stats
      const studentStats = students.map(s => {
        const sRecs = attRecords.filter(r => r.student_id === s.id || String(r.student_id) === String(s.id));
        const total = sRecs.length;
        const attended = sRecs.filter(r => r.status === 'present' || r.status === 'late').length;
        const absents = sRecs.filter(r => r.status === 'absent').length;
        const lates = sRecs.filter(r => r.status === 'late').length;
        return {
          id: s.id, name: s.name, roll_no: s.roll_no, class_name: s.class_name,
          total_classes: total, attended, absents, lates,
          pct: total > 0 ? Math.round((attended / total) * 1000) / 10 : null
        };
      }).sort((a, b) => (a.pct || 0) - (b.pct || 0));

      // Class stats
      const classes = db.prepare('SELECT * FROM classes ORDER BY name').all();
      const classStats = classes.map(c => {
        const cRecs = db.prepare('SELECT * FROM attendance WHERE class_id = ?').all(c.id);
        const sessions = [...new Set(cRecs.map(r => r.date))].length;
        const total = cRecs.length;
        const present = cRecs.filter(r => r.status === 'present' || r.status === 'late').length;
        return {
          id: c.id, name: c.name, subject: c.subject, sessions,
          avg_pct: total > 0 ? Math.round((present / total) * 1000) / 10 : null
        };
      });

      // Trend
      const byDate = {};
      attRecords.forEach(r => {
        if (!byDate[r.date]) byDate[r.date] = { total: 0, present: 0 };
        byDate[r.date].total++;
        if (r.status === 'present' || r.status === 'late') byDate[r.date].present++;
      });
      const trend = Object.entries(byDate)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, v]) => ({
          date, total: v.total, present: v.present,
          pct: v.total > 0 ? Math.round((v.present / v.total) * 1000) / 10 : 0
        }));

      res.json({ success: true, data: { studentStats, classStats, trend } });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET - Session (students + their attendance for a class/date)
  router.get('/session', (req, res) => {
    try {
      const { class_id, date } = req.query;
      if (!class_id || !date) return res.status(400).json({ success: false, error: 'class_id and date required' });

      const students = db.prepare('SELECT id as student_id, name, roll_no FROM students WHERE class_id = ? ORDER BY roll_no').all(class_id);
      const existing = db.prepare('SELECT student_id, status FROM attendance WHERE class_id = ? AND date = ?').all(class_id, date);
      const existingMap = {};
      existing.forEach(r => { existingMap[r.student_id] = r.status; });

      const result = students.map(s => ({
        ...s,
        status: existingMap[s.student_id] || 'absent'
      }));

      res.json({ success: true, data: result });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
};
