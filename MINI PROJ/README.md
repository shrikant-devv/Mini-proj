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

## Push to GitHub
Your code is already pushed to `https://github.com/shrikant-devv/Mini-proj`.

## Notes
If classes don't appear in attendance dropdown, log in first and ensure the class data is loaded.
