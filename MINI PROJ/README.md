# EduTrack Smart Classroom

A smart classroom management system built with Node.js/Express + SQLite (sql.js) and a vanilla JS dashboard.

## Features
- JWT authentication + role-based access (admin/professor/student/parent)
- Attendance marking with class/date session
- OCR-based bulk attendance extraction and auto-marking
- Dashboard analytics for attendance trends, class summaries, and student reports

## Quick Start
```bash
cd src
npm install
npm start
```

Open `http://localhost:3000` in browser.

## Seed Users
Use these accounts:
- `admin@edutrack.com` / `admin123` (admin)
- `prof@edutrack.com` / `prof123` (professor)
- `student@edutrack.com` / `student123` (student)
- `parent@edutrack.com` / `parent123` (parent)

## OCR Attendance Extraction Format
In Mark Attendance page, upload image and click Extract:
- Each line should contain `roll_no status`, e.g.:
  - `CSA001 present`
  - `CSA002 absent`
  - `CSA003 late`

Then the app auto-maps roll_no to students and submits attendance.

## APIs (for reference)
- `POST /api/auth/login` { email, password }
- `GET /api/classes`
- `POST /api/attendance/mark` { class_id, date, records }

## Architecture & Key Files
- Backend: `src/server.js`, `src/database.js`, `src/routes/*`
- Frontend SPA: `src/public/index.html`, `src/public/js/app.js`, `src/public/js/attendance.js`
- Database persistence: `src/classroom.db` using `sql.js`
- Auth: `POST /api/auth/login` in `src/routes/auth.js` with `bcryptjs`/JWT

## How to Run Locally
```bash
cd src
npm install
npm start
```
Then open `http://localhost:3000`.

## Common Debug Steps
1. If UI remains blank, check browser console for JS errors.
2. If API errors appear, verify server logs and that `/api/classes` returns 200.
3. If login fails, use seeded credentials and re-run with fresh DB (delete `src/classroom.db`).

## GitHub
Your code is available at: `https://github.com/shrikant-devv/Mini-proj`

## More Notes
- The Mark Attendance page requires class loaded from dropdown before loading students.
- OCR extraction expects clear roll_no + status lines and then auto-marks via backend.

