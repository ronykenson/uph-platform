require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');

const authRouter         = require('./routes/auth');
const adminRouter        = require('./routes/admin');
const applicationsRouter = require('./routes/applications');
const studentsRouter     = require('./routes/students');
const professorsRouter   = require('./routes/professors');
const coursesRouter      = require('./routes/courses');
const gradesRouter       = require('./routes/grades');
const schedulesRouter    = require('./routes/schedules');
const enrollmentsRouter  = require('./routes/enrollments');

const app  = express();
const PORT = process.env.PORT || 3000;

// Ensure uploads directory exists on every startup
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 Created uploads/ directory');
}

// CORS — allow same-origin (served by Express) + localhost for local dev
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [])
];
app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (same-origin, curl, mobile apps)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS: ' + origin));
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend (same origin — no CORS needed for API calls)
app.use(express.static(path.join(__dirname, '../frontend')));

// Serve uploaded student photos
app.use('/uploads', express.static(uploadsDir));

// Health check
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'UPH Backend API running',
    version: '1.0.0'
  });
});

app.use('/api/auth',         authRouter);
app.use('/api/admin',        adminRouter);
app.use('/api/applications', applicationsRouter);
app.use('/api/students',     studentsRouter);
app.use('/api/professors',   professorsRouter);
app.use('/api/courses',      coursesRouter);
app.use('/api/grades',       gradesRouter);
app.use('/api/schedules',    schedulesRouter);
app.use('/api/enrollments',  enrollmentsRouter);

// 404 for unknown API routes
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.url}` });
});

// Catch-all: serve frontend for any non-API route (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.message);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log('');
  console.log('🚀 UPH Backend — Running');
  console.log(`👉 http://localhost:${PORT}`);
  console.log(`🗄️  Database: ${process.env.DB_NAME || 'uph_database'} @ ${process.env.DB_HOST || 'localhost'}`);
  console.log('');
});
