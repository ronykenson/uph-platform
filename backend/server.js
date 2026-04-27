require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const path    = require('path');

const authRouter         = require('./routes/auth');
const adminRouter        = require('./routes/admin');
const applicationsRouter = require('./routes/applications');
const studentsRouter     = require('./routes/students');
const professorsRouter   = require('./routes/professors');
const coursesRouter      = require('./routes/courses');
const gradesRouter       = require('./routes/grades');
const schedulesRouter    = require('./routes/schedules');
const enrollmentsRouter  = require('./routes/enrollments');

console.log('applications:', typeof applicationsRouter);
console.log('students:', typeof studentsRouter);
console.log('professors:', typeof professorsRouter);
console.log('courses:', typeof coursesRouter);
console.log('grades:', typeof gradesRouter);
console.log('schedules:', typeof schedulesRouter);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend/index.html at http://localhost:3000
// This avoids the file:// → localhost block (Chrome Private Network Access).
app.use(express.static(path.join(__dirname, '../frontend')));

// Serve uploaded student photos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'UPH Backend API running',
    routes: {
      applications: '/api/applications',
      students: '/api/students',
      professors: '/api/professors',
      courses: '/api/courses',
      grades: '/api/grades',
      schedules: '/api/schedules'
    }
  });
});

app.use('/api/auth',         authRouter);
app.use('/api/admin',        adminRouter);
app.use('/api/applications', applicationsRouter);
app.use('/api/students', studentsRouter);
app.use('/api/professors', professorsRouter);
app.use('/api/courses', coursesRouter);
app.use('/api/grades', gradesRouter);
app.use('/api/schedules',    schedulesRouter);
app.use('/api/enrollments', enrollmentsRouter);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.url}`
  });
});

app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: err.message
  });
});

app.listen(PORT, () => {
  console.log('');
  console.log('🚀 UPH Backend API — Running');
  console.log(`👉 http://localhost:${PORT}`);
  console.log('');
});