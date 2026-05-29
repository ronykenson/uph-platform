// ============================================================
//  routes/auth.js  —  Authentication & Professor Registration
// ============================================================

const express = require('express');
const crypto  = require('crypto');   // built-in Node — no extra package needed
const router  = express.Router();
const db      = require('../config/db');

// Shared helper — every password in this system uses SHA-256
function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

// ------------------------------------------------------------
//  POST /api/auth/login
//  Body: { email, password }
//  Returns: { success, user: { id, name, email, role, ...profileFields } }
// ------------------------------------------------------------
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email et mot de passe requis.' });
  }

  try {
    // Single query — join student AND professor profiles so one round-trip covers all roles
    const [[user]] = await db.query(
      `SELECT u.id, u.name, u.email, u.password, u.role, u.status,
              s.id           AS student_id,
              s.student_code,
              s.faculty      AS student_faculty,
              s.semester     AS student_semester,
              s.phone        AS student_phone,
              p.id           AS prof_id,
              p.department   AS prof_department,
              p.title        AS prof_title,
              p.status       AS prof_status
       FROM   users u
       LEFT JOIN students   s ON s.user_id = u.id
       LEFT JOIN professors p ON p.user_id = u.id
       WHERE  u.email = ?`,
      [email]
    );

    console.log('[login] lookup:', email, '→', user ? `${user.role} / ${user.status}` : 'not found');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect.' });
    }

    // Verify password (SHA-256 only — bcrypt is not used in this system)
    if (sha256(password) !== user.password) {
      console.log('[login] password mismatch for', email);
      return res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect.' });
    }

    // Block accounts that are not yet active
    if (user.status === 'pending') {
      return res.status(403).json({
        success: false,
        message: "Votre compte est en attente d'approbation par un administrateur."
      });
    }
    if (user.status === 'rejected') {
      return res.status(403).json({
        success: false,
        message: "Votre demande de compte a été refusée. Contactez l'administration."
      });
    }

    // Build the safe response object
    const response = {
      id:    user.id,
      name:  user.name,
      email: user.email,
      role:  user.role
    };

    if (user.student_id) {
      response.student_id   = user.student_id;
      response.student_code = user.student_code;
      response.faculty      = user.student_faculty;
      response.semester     = user.student_semester;
      response.phone        = user.student_phone;
    }

    if (user.prof_id) {
      response.prof_id    = user.prof_id;
      response.department = user.prof_department;
      response.title      = user.prof_title;
    }

    console.log('[login] success:', email, user.role);
    res.json({ success: true, user: response });

  } catch (err) {
    console.error('[login] error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ------------------------------------------------------------
//  POST /api/auth/register-professor
//  Body: { name, email, password, department, phone? }
//  Creates user (role=professor, status=pending) + professors row.
//  Professor cannot log in until an admin approves the request.
// ------------------------------------------------------------
router.post('/register-professor', async (req, res) => {
  const { name, email, password, department, phone } = req.body;

  if (!name || !email || !password || !department) {
    return res.status(400).json({
      success: false,
      message: 'Nom, email, mot de passe et département sont obligatoires.'
    });
  }
  if (!email.includes('@')) {
    return res.status(400).json({ success: false, message: 'Email invalide.' });
  }
  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Le mot de passe doit comporter au moins 6 caractères.'
    });
  }

  try {
    // Guard against duplicate email
    const [[existing]] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) {
      return res.status(409).json({ success: false, message: 'Cet email est déjà utilisé.' });
    }

    // Create user with status=pending — cannot log in yet
    const [userResult] = await db.query(
      'INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, ?, ?)',
      [name, email, sha256(password), 'professor', 'pending']
    );
    const userId = userResult.insertId;

    // Create professor profile with status=pending
    await db.query(
      'INSERT INTO professors (user_id, department, phone, status) VALUES (?, ?, ?, ?)',
      [userId, department, phone || null, 'pending']
    );

    console.log(`[register-professor] user=${userId}, email=${email} → pending`);

    res.status(201).json({
      success: true,
      message: "Demande envoyée. Un administrateur doit approuver votre compte avant que vous puissiez vous connecter."
    });

  } catch (err) {
    console.error('[register-professor] error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ------------------------------------------------------------
//  POST /api/auth/change-password
//  Body: { user_id, current_password, new_password }
//  Verifies current password, then updates to new SHA-256 hash.
// ------------------------------------------------------------
router.post('/change-password', async (req, res) => {
  const { user_id, current_password, new_password } = req.body;
  if (!user_id || !current_password || !new_password) {
    return res.status(400).json({ success: false, message: 'Tous les champs sont requis.' });
  }
  if (new_password.length < 8) {
    return res.status(400).json({ success: false, message: 'Le nouveau mot de passe doit comporter au moins 8 caractères.' });
  }
  try {
    const [[user]] = await db.query('SELECT id, password FROM users WHERE id = ?', [user_id]);
    if (!user) return res.status(404).json({ success: false, message: 'Utilisateur introuvable.' });
    if (sha256(current_password) !== user.password) {
      return res.status(401).json({ success: false, message: 'Mot de passe actuel incorrect.' });
    }
    await db.query('UPDATE users SET password = ? WHERE id = ?', [sha256(new_password), user_id]);
    console.log(`[change-password] user=${user_id} → password updated`);
    res.json({ success: true, message: 'Mot de passe modifié avec succès.' });
  } catch (err) {
    console.error('[change-password] error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ------------------------------------------------------------
//  POST /api/auth/forgot-password
//  Body: { email }
//  Generates a 6-digit reset code (10-min TTL), logs it to console.
//  Returns dev_code in response for testing (remove when SMTP is configured).
// ------------------------------------------------------------
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: 'Email requis.' });
  try {
    const [[user]] = await db.query('SELECT id, name, email FROM users WHERE email = ?', [email]);
    if (!user) {
      // Don't reveal whether email exists in production
      return res.json({ success: true, message: 'Si cet email est enregistré, un code a été envoyé.' });
    }
    const code      = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    // Invalidate any prior unused codes for this user
    await db.query('UPDATE password_resets SET used = 1 WHERE user_id = ? AND used = 0', [user.id]);
    await db.query(
      'INSERT INTO password_resets (user_id, email, code, expires_at) VALUES (?, ?, ?, ?)',
      [user.id, user.email, code, expiresAt]
    );
    console.log(`[forgot-password] user=${user.id} email=${user.email} → code=${code} (valid 10 min)`);
    res.json({ success: true, message: 'Code de réinitialisation généré.', dev_code: code });
  } catch (err) {
    console.error('[forgot-password] error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ------------------------------------------------------------
//  POST /api/auth/reset-password
//  Body: { email, code, new_password }
//  Validates code, updates password, marks code as used.
// ------------------------------------------------------------
router.post('/reset-password', async (req, res) => {
  const { email, code, new_password } = req.body;
  if (!email || !code || !new_password) {
    return res.status(400).json({ success: false, message: 'Email, code et nouveau mot de passe requis.' });
  }
  if (new_password.length < 8) {
    return res.status(400).json({ success: false, message: 'Le mot de passe doit comporter au moins 8 caractères.' });
  }
  try {
    const [[reset]] = await db.query(
      `SELECT r.id, r.user_id FROM password_resets r
       WHERE  r.email = ? AND r.code = ? AND r.used = 0 AND r.expires_at > NOW()
       ORDER  BY r.created_at DESC LIMIT 1`,
      [email, code]
    );
    if (!reset) {
      return res.status(400).json({ success: false, message: 'Code invalide ou expiré. Faites une nouvelle demande.' });
    }
    await db.query('UPDATE users          SET password = ? WHERE id = ?', [sha256(new_password), reset.user_id]);
    await db.query('UPDATE password_resets SET used = 1   WHERE id = ?', [reset.id]);
    console.log(`[reset-password] user=${reset.user_id} → password reset successfully`);
    res.json({ success: true, message: 'Mot de passe réinitialisé avec succès.' });
  } catch (err) {
    console.error('[reset-password] error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
