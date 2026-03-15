const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const initDb = require('./database');

async function startServer() {
  console.log('🔄 Initializing database...');
  const db = await initDb();

  const app = express();
  const PORT = process.env.PORT || 3000;

  // Middleware
  app.use(cors());
  app.use(bodyParser.json());
  app.use(express.static(path.join(__dirname, 'public')));

  // API Routes - pass db instance
  app.use('/api/auth', require('./routes/auth')(db));
  app.use('/api/students', require('./routes/students')(db));
  app.use('/api/classes', require('./routes/classes')(db));
  app.use('/api/attendance', require('./routes/attendance')(db));

  // Serve frontend for all non-API routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  app.listen(PORT, () => {
    console.log(`\n🏫 Smart Classroom Management System`);
    console.log(`✅ Server running at http://localhost:${PORT}`);
    console.log(`📊 Database initialized with sample data`);
    console.log(`Press Ctrl+C to stop\n`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
