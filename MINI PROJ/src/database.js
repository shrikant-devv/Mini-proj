const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'classroom.db');

// We export a promise that resolves to a db-like object with .prepare() interface
// using sql.js synchronous API wrapped with file persistence

let _db = null;
const dbReadyCallbacks = [];
let dbReady = false;

// Simple persistence: save DB to disk on every write
function saveDb() {
  if (!_db || !_db._db) return;
  try {
    const data = _db._db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  } catch (e) {
    console.error('DB save error:', e.message);
  }
}

// Wrapper to give a similar API to better-sqlite3
function createWrapper(sqlJsDb) {
  const db = {
    _db: sqlJsDb,
    export() { return sqlJsDb.export(); },
    pragma(sql) { sqlJsDb.run(`PRAGMA ${sql}`); },
    exec(sql) { sqlJsDb.run(sql); saveDb(); },
    prepare(sql) {
      return {
        _sql: sql,
        run(...params) {
          const stmt = sqlJsDb.prepare(sql);
          try {
            stmt.run(params);
            saveDb();
            // Get last insert rowid
            const rowIdResult = sqlJsDb.exec('SELECT last_insert_rowid() as id');
            const lastInsertRowid = rowIdResult[0]?.values[0][0] || 0;
            const changesResult = sqlJsDb.exec('SELECT changes() as cnt');
            const changes = changesResult[0]?.values[0][0] || 0;
            return { lastInsertRowid, changes };
          } finally { stmt.free(); }
        },
        get(...params) {
          const stmt = sqlJsDb.prepare(sql);
          try {
            stmt.bind(params);
            if (stmt.step()) {
              const row = stmt.getAsObject();
              return row;
            }
            return undefined;
          } finally { stmt.free(); }
        },
        all(...params) {
          const results = [];
          const stmt = sqlJsDb.prepare(sql);
          try {
            stmt.bind(params);
            while (stmt.step()) {
              results.push(stmt.getAsObject());
            }
            return results;
          } finally { stmt.free(); }
        }
      };
    },
    transaction(fn) {
      return (args) => {
        sqlJsDb.run('BEGIN TRANSACTION');
        try {
          fn(args);
          sqlJsDb.run('COMMIT');
          saveDb();
        } catch (e) {
          sqlJsDb.run('ROLLBACK');
          throw e;
        }
      };
    }
  };
  return db;
}

// Schema setup
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    teacher TEXT NOT NULL,
    room TEXT DEFAULT '',
    schedule TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    roll_no TEXT NOT NULL UNIQUE,
    email TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    class_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    class_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, class_id, date)
  );
`;

function seedData(db) {
  const countResult = db._db.exec("SELECT COUNT(*) as cnt FROM classes");
  const count = countResult[0]?.values[0][0] || 0;
  if (count > 0) return;

  // Insert 3 classes
  db._db.run("INSERT INTO classes (name,subject,teacher,room,schedule) VALUES ('CS-A','Data Structures','Prof. Sharma','Room 101','Mon/Wed/Fri - 9:00 AM')");
  db._db.run("INSERT INTO classes (name,subject,teacher,room,schedule) VALUES ('CS-B','Database Management','Prof. Verma','Room 102','Tue/Thu - 10:00 AM')");
  db._db.run("INSERT INTO classes (name,subject,teacher,room,schedule) VALUES ('CS-C','Web Technologies','Prof. Patil','Room 103','Mon/Wed - 11:00 AM')");

  const classRows = db._db.exec("SELECT id FROM classes ORDER BY id");
  const classIds = classRows[0]?.values?.map(r => r[0]) || [1, 2, 3];

  const students = [
    ['Aarav Mehta','CSA001','aarav@email.com','9876543210',classIds[0]],
    ['Priya Sharma','CSA002','priya@email.com','9876543211',classIds[0]],
    ['Rohan Gupta','CSA003','rohan@email.com','9876543212',classIds[0]],
    ['Sneha Patel','CSA004','sneha@email.com','9876543213',classIds[0]],
    ['Vikram Singh','CSA005','vikram@email.com','9876543214',classIds[0]],
    ['Ananya Joshi','CSA006','ananya@email.com','9876543215',classIds[0]],
    ['Karan Desai','CSA007','karan@email.com','9876543216',classIds[0]],
    ['Meera Iyer','CSA008','meera@email.com','9876543217',classIds[0]],
    ['Rahul Nair','CSB001','rahul@email.com','9876543220',classIds[1]],
    ['Divya Reddy','CSB002','divya@email.com','9876543221',classIds[1]],
    ['Arjun Kumar','CSB003','arjun@email.com','9876543222',classIds[1]],
    ['Pooja Yadav','CSB004','pooja@email.com','9876543223',classIds[1]],
    ['Siddharth Roy','CSB005','siddharth@email.com','9876543224',classIds[1]],
    ['Kavya Pillai','CSB006','kavya@email.com','9876543225',classIds[1]],
    ['Neha Tiwari','CSC001','neha@email.com','9876543230',classIds[2]],
    ['Aditya Mishra','CSC002','aditya@email.com','9876543231',classIds[2]],
    ['Riya Kapoor','CSC003','riya@email.com','9876543232',classIds[2]],
    ['Ishaan Bose','CSC004','ishaan@email.com','9876543233',classIds[2]],
    ['Shruti Das','CSC005','shruti@email.com','9876543234',classIds[2]],
  ];

  students.forEach(s => {
    db._db.run(`INSERT INTO students (name,roll_no,email,phone,class_id) VALUES (?,?,?,?,?)`, s);
  });

  // Seed attendance for last 14 days
  const studentRowsRes = db._db.exec("SELECT id, class_id FROM students");
  const studentRows = studentRowsRes[0];
  if (!studentRows || !studentRows.values) { saveDb(); return; }
  const stList = studentRows.values.map(r => ({ id: r[0], class_id: r[1] }));
  const statuses = ['present','present','present','present','absent','late','present','present'];

  for (let d = 13; d >= 0; d--) {
    const date = new Date();
    date.setDate(date.getDate() - d);
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    const dateStr = date.toISOString().split('T')[0];
    stList.forEach((s, idx) => {
      const status = statuses[(idx + d) % statuses.length];
      try {
        db._db.run(`INSERT OR IGNORE INTO attendance (student_id,class_id,date,status) VALUES (?,?,?,?)`, [s.id, s.class_id, dateStr, status]);
      } catch (_) {}
    });
  }
  saveDb();
}

// Initialize synchronously using sql.js
async function initDb() {
  const SQL = await initSqlJs();
  let sqlJsDb;
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    sqlJsDb = new SQL.Database(fileBuffer);
  } else {
    sqlJsDb = new SQL.Database();
  }
  sqlJsDb.run("PRAGMA journal_mode=MEMORY");
  sqlJsDb.run(SCHEMA);
  _db = createWrapper(sqlJsDb);
  seedData(_db);
  saveDb();
  return _db;
}

module.exports = initDb;
