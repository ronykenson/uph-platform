#!/usr/bin/env node
// ============================================================
//  UPH — Guide Professionnel PDF Generator
//  Usage: node scripts/generate-guide.js
//  Output: UPH_Guide_Professionnel.pdf  (project root)
// ============================================================
'use strict';

const path     = require('path');
const fs       = require('fs');
const { execSync, spawn } = require('child_process');

// ─── Install puppeteer once (isolated directory) ────────────
const PUP_DIR = path.join(__dirname, 'pup');
if (!fs.existsSync(path.join(PUP_DIR, 'node_modules', 'puppeteer'))) {
  console.log('📦  Installing puppeteer (one-time, ~120 MB)…');
  fs.mkdirSync(PUP_DIR, { recursive: true });
  fs.writeFileSync(path.join(PUP_DIR, 'package.json'),
    '{"name":"pup","version":"1.0.0","private":true}');
  execSync('npm install puppeteer@21 --prefer-offline', { cwd: PUP_DIR, stdio: 'inherit' });
  console.log('✅  puppeteer installed.');
}
const puppeteer = require(path.join(PUP_DIR, 'node_modules', 'puppeteer'));

// ─── Paths / constants ────────────────────────────────────────
const ROOT     = path.resolve(__dirname, '..');
const OUT_PDF  = path.join(ROOT, 'UPH_Guide_Professionnel.pdf');
const LOGO_RAW = path.join(ROOT, 'frontend', 'uph-logo.png');
const BASE     = 'http://localhost:3000';

let LOGO_B64 = '';
try { LOGO_B64 = 'data:image/png;base64,' + fs.readFileSync(LOGO_RAW).toString('base64'); } catch {}

// ─── Credentials ─────────────────────────────────────────────
const ADMIN     = { email: 'admin@uph',          pass: 'UPH@2026' };
const DEMO_PROF = { name: 'Dr. Claire Fontaine',  email: 'demo.prof@uph.ht',  pass: 'Demo@2026!', dept: 'Faculté des Sciences Infirmières' };
const DEMO_STD  = { name: 'Marc-André Dupont',    email: 'demo.std@uph.ht',   pass: 'Demo@2026!', dept: 'Faculté des Sciences Infirmières' };

const SHOTS = {};
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─── Screenshot helper ────────────────────────────────────────
async function shot(page, name, opts = {}) {
  await sleep(700);
  const buf = await page.screenshot({ encoding: 'base64', fullPage: false, ...opts });
  SHOTS[name] = 'data:image/png;base64,' + buf;
  process.stdout.write(`  📸  ${name}\n`);
}

async function waitFor(page, sel, timeout = 10000) {
  await page.waitForSelector(sel, { timeout });
}

async function nav(page, url) {
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 20000 });
}

async function jsClick(page, id) {
  await page.evaluate(i => document.getElementById(i)?.click(), id);
}

// ─── Setup demo accounts via admin API ───────────────────────
async function setupDemoAccounts(apiPage) {
  const callApi = async (route, body) => {
    const r = await apiPage.evaluate(async (url, data) => {
      const res = await fetch(url, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(data) });
      return res.json();
    }, BASE + route, body);
    return r;
  };

  // Professor demo
  const pr = await callApi('/api/admin/users', {
    name: DEMO_PROF.name, email: DEMO_PROF.email,
    password: DEMO_PROF.pass, role: 'professor', department: DEMO_PROF.dept
  });
  console.log('  Prof demo:', pr.success ? '✅' : '⚠️ ' + pr.message);

  // Student demo
  const sr = await callApi('/api/admin/users', {
    name: DEMO_STD.name, email: DEMO_STD.email,
    password: DEMO_STD.pass, role: 'student', department: DEMO_STD.dept
  });
  console.log('  Std demo:', sr.success ? '✅' : '⚠️ ' + sr.message);

  // Get prof_id for demo professor
  const profList = await apiPage.evaluate(async url => {
    const r = await fetch(url); return r.json();
  }, BASE + '/api/professors');
  const demoProf = profList.data?.find(p => p.email === DEMO_PROF.email);

  // Assign first DSI1 course to demo professor
  if (demoProf) {
    const cList = await apiPage.evaluate(async url => {
      const r = await fetch(url); return r.json();
    }, BASE + '/api/courses');
    const dsiCourse = cList.data?.find(c => c.code.startsWith('DSI1-BIOCHIMIE') || c.code.startsWith('DSI1'));
    if (dsiCourse) {
      await apiPage.evaluate(async (url, body) => {
        await fetch(url, { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
      }, `${BASE}/api/courses/${dsiCourse.id}`, { professor_id: demoProf.id });
      console.log(`  Assigned ${dsiCourse.code} to demo prof ✅`);
    }
  }
  return demoProf;
}

// ─── Main ─────────────────────────────────────────────────────
async function main() {
  // ── Test server ──────────────────────────────────────────────
  let serverProc = null;
  const testConn = await new Promise(res => {
    const http = require('http');
    http.get(BASE, r => res(true)).on('error', () => res(false));
  });
  if (!testConn) {
    console.log('🚀  Starting backend server…');
    serverProc = spawn('node', ['server.js'], {
      cwd: path.join(ROOT, 'backend'),
      env: { ...process.env },
      stdio: 'ignore',
      detached: true,
    });
    await sleep(3000);
  } else {
    console.log('✅  Server already running on', BASE);
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

  try {
    // ── HOMEPAGE ────────────────────────────────────────────────
    console.log('\n📷  Capturing homepage…');
    await nav(page, BASE);
    await shot(page, 'homepage');
    await shot(page, 'homepage-nav', { clip: { x: 0, y: 0, width: 1440, height: 80 } });

    // ── HOMEPAGE - Hero section ──────────────────────────────────
    await shot(page, 'homepage-hero', { clip: { x: 0, y: 0, width: 1440, height: 600 } });

    // ── HOMEPAGE - Faculties ─────────────────────────────────────
    await page.evaluate(() => document.getElementById('faculties')?.scrollIntoView());
    await sleep(500);
    await shot(page, 'homepage-faculties');
    await page.evaluate(() => window.scrollTo(0, 0));

    // ── LOGIN MODAL ──────────────────────────────────────────────
    console.log('\n📷  Capturing login modal…');
    await page.evaluate(() => { window.openModal('login'); });
    await waitFor(page, '#login-modal.active');
    await sleep(500);
    await shot(page, 'login-student-tab');

    // Professor tab
    await page.evaluate(() => { window.setLoginType('professor'); });
    await sleep(300);
    await shot(page, 'login-prof-tab');

    // Admin tab filled
    await page.evaluate(() => { window.setLoginType('admin'); });
    await sleep(300);
    await page.evaluate(() => {
      document.getElementById('login-email').value = 'admin@uph';
      document.getElementById('login-pass').value  = 'UPH@2026';
    });
    await shot(page, 'login-admin-filled');

    // Forgot password
    await page.evaluate(() => { window.showForgotPassword(); });
    await sleep(300);
    await shot(page, 'login-forgot-password');
    await page.evaluate(() => { window.hideForgotPassword(); });
    await sleep(200);
    await page.evaluate(() => { window.setLoginType('admin'); });
    await page.evaluate(() => {
      document.getElementById('login-email').value = 'admin@uph';
      document.getElementById('login-pass').value  = 'UPH@2026';
    });

    // ── ADMIN LOGIN ──────────────────────────────────────────────
    console.log('\n📷  Admin dashboard…');
    await page.evaluate(() => window.doLogin());
    await waitFor(page, '#view-admin.active', 12000);
    await sleep(1500);
    await shot(page, 'admin-dashboard');

    // Setup demo accounts while on admin page
    console.log('\n🔧  Setting up demo accounts…');
    await setupDemoAccounts(page);
    await sleep(1000);

    // Admin sections
    const adminPanels = [
      { id: 'applications',  name: 'admin-applications' },
      { id: 'students',      name: 'admin-students'     },
      { id: 'professors',    name: 'admin-professors'   },
      { id: 'courses',       name: 'admin-courses'      },
      { id: 'account',       name: 'admin-account'      },
      { id: 'activity',      name: 'admin-activity'     },
    ];
    for (const { id, name } of adminPanels) {
      await page.evaluate(p => window.showPanel('admin', p), id);
      await sleep(1200);
      await shot(page, name);
    }

    // Admin - Add course form open
    await page.evaluate(() => window.showPanel('admin', 'courses'));
    await sleep(800);
    await page.evaluate(() => window.showAddCourseForm());
    await sleep(500);
    await shot(page, 'admin-courses-form');
    await page.evaluate(() => window.showAddCourseForm()); // close it

    // ── PROFESSOR DASHBOARD ──────────────────────────────────────
    console.log('\n📷  Professor dashboard…');
    await page.evaluate(() => window.logout());
    await sleep(500);
    await nav(page, BASE);
    await page.evaluate(() => { window.openModal('login'); });
    await waitFor(page, '#login-modal.active');
    await page.evaluate((creds) => {
      window.setLoginType('professor');
      document.getElementById('login-email').value = creds.email;
      document.getElementById('login-pass').value  = creds.pass;
    }, DEMO_PROF);
    await sleep(300);
    await page.evaluate(() => window.doLogin());
    await sleep(3000);
    // Check if we landed on professor view
    const hasProfView = await page.evaluate(() =>
      document.getElementById('view-prof')?.classList.contains('active'));

    if (hasProfView) {
      await shot(page, 'prof-dashboard');
      const profPanels = [
        { id: 'courses',  name: 'prof-courses'  },
        { id: 'students', name: 'prof-students' },
        { id: 'grades',   name: 'prof-grades'   },
        { id: 'profile',  name: 'prof-profile'  },
      ];
      for (const { id, name } of profPanels) {
        await page.evaluate(p => window.showPanel('prof', p), id);
        await sleep(1200);
        await shot(page, name);
      }
      // Profile - change password open
      await page.evaluate(() => window.showPanel('prof', 'profile'));
      await sleep(800);
      await page.evaluate(() => window.toggleChangePass('prof'));
      await sleep(400);
      await shot(page, 'prof-change-password');
    } else {
      console.log('  ⚠️  Could not log in as demo prof — using placeholders');
      SHOTS['prof-dashboard'] = null;
    }

    // ── STUDENT DASHBOARD ────────────────────────────────────────
    console.log('\n📷  Student dashboard…');
    await page.evaluate(() => window.logout());
    await sleep(500);
    await nav(page, BASE);
    await page.evaluate(() => { window.openModal('login'); });
    await waitFor(page, '#login-modal.active');
    await page.evaluate((creds) => {
      window.setLoginType('student');
      document.getElementById('login-email').value = creds.email;
      document.getElementById('login-pass').value  = creds.pass;
    }, DEMO_STD);
    await sleep(300);
    await page.evaluate(() => window.doLogin());
    await sleep(3000);

    const hasStdView = await page.evaluate(() =>
      document.getElementById('view-student')?.classList.contains('active'));

    if (hasStdView) {
      await shot(page, 'std-dashboard');
      const stdPanels = [
        { id: 'enroll',   name: 'std-enroll'  },
        { id: 'grades',   name: 'std-grades'  },
        { id: 'profile',  name: 'std-profile' },
      ];
      for (const { id, name } of stdPanels) {
        await page.evaluate(p => window.showPanel('student', p), id);
        await sleep(1200);
        await shot(page, name);
      }
      // Profile - change password open
      await page.evaluate(() => window.showPanel('student', 'profile'));
      await sleep(800);
      await page.evaluate(() => window.toggleChangePass('std'));
      await sleep(400);
      await shot(page, 'std-change-password');
    } else {
      console.log('  ⚠️  Could not log in as demo student — using placeholders');
    }

    // ── APPLICATION PAGE ─────────────────────────────────────────
    console.log('\n📷  Application page…');
    await page.evaluate(() => window.logout());
    await sleep(400);
    await nav(page, BASE);
    await page.evaluate(() => window.showView('apply'));
    await sleep(800);
    await shot(page, 'apply-page');
    await shot(page, 'apply-form', { clip: { x: 0, y: 80, width: 1440, height: 820 } });

  } catch (err) {
    console.error('❌ Screenshot error:', err.message);
  }

  await browser.close();
  if (serverProc) serverProc.kill();

  // ── Generate PDF ──────────────────────────────────────────────
  console.log('\n🎨  Generating PDF…');
  const html = buildHTML();
  const browser2 = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox'],
  });
  const pdfPage = await browser2.newPage();
  await pdfPage.setContent(html, { waitUntil: 'networkidle0' });
  await pdfPage.pdf({
    path:             OUT_PDF,
    format:           'A4',
    printBackground:  true,
    margin:           { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
    preferCSSPageSize: true,
  });
  await browser2.close();

  console.log('\n✅  PDF généré :', OUT_PDF);
  console.log('   Pages estimées:', Object.keys(SHOTS).length > 0 ? '~20' : '~18');
}

// ═══════════════════════════════════════════════════════════════
//  HTML BUILDER
// ═══════════════════════════════════════════════════════════════
function buildHTML() {
  const C = {
    navy:    '#0a1628',
    navyMid: '#112240',
    gold:    '#c9a84c',
    goldLt:  '#f0d070',
    white:   '#ffffff',
    gray:    '#e8edf5',
    grayDk:  '#94a3b8',
    text:    '#1e293b',
    blue:    '#1565c0',
    blueLt:  '#e3f0ff',
    green:   '#1a7a4a',
    greenLt: '#d4edda',
    red:     '#c0392b',
    redLt:   '#fde8e8',
  };

  // ── Utility: screenshot img or placeholder ─────────────────────
  const img = (key, style = '') => {
    const src = SHOTS[key];
    if (!src) return `<div style="background:#e2e8f0;border-radius:8px;height:200px;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:14px;">[Capture — ${key}]</div>`;
    return `<img src="${src}" style="width:100%;border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,0.15);display:block;${style}" />`;
  };

  // ── Step badge ──────────────────────────────────────────────────
  const step = (n, text) =>
    `<div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:12px;">
       <div style="min-width:28px;height:28px;border-radius:50%;background:${C.gold};color:${C.navy};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex-shrink:0;">${n}</div>
       <div style="padding-top:4px;font-size:14px;color:${C.text};line-height:1.6;">${text}</div>
     </div>`;

  // ── Info box ────────────────────────────────────────────────────
  const info = (text, color = C.blueLt, border = C.blue) =>
    `<div style="background:${color};border-left:4px solid ${border};border-radius:6px;padding:12px 16px;font-size:13px;color:${C.text};margin:12px 0;line-height:1.6;">${text}</div>`;

  // ── Section header (inside page) ────────────────────────────────
  const sectionHdr = (icon, title, sub = '') =>
    `<div style="border-bottom:2px solid ${C.gold};padding-bottom:10px;margin-bottom:20px;">
       <div style="font-size:22px;font-weight:800;color:${C.navy};letter-spacing:-0.5px;">${icon} ${title}</div>
       ${sub ? `<div style="font-size:13px;color:${C.grayDk};margin-top:4px;">${sub}</div>` : ''}
     </div>`;

  // ── Caption ─────────────────────────────────────────────────────
  const caption = text =>
    `<div style="font-size:12px;color:${C.grayDk};text-align:center;margin-top:8px;font-style:italic;">${text}</div>`;

  // ── 2-col layout ────────────────────────────────────────────────
  const cols = (left, right, leftW = '55%') =>
    `<div style="display:grid;grid-template-columns:${leftW} 1fr;gap:20px;align-items:start;">${left}${right}</div>`;

  // ── Page wrapper ────────────────────────────────────────────────
  const page = (content, bg = C.white, pad = '30px 35px') =>
    `<div style="width:210mm;min-height:297mm;background:${bg};padding:${pad};box-sizing:border-box;page-break-after:always;position:relative;font-family:'Segoe UI',Arial,sans-serif;">${content}</div>`;

  // ── Running footer ───────────────────────────────────────────────
  const footer = (label, pageNum) =>
    `<div style="position:absolute;bottom:18px;left:35px;right:35px;display:flex;justify-content:space-between;align-items:center;border-top:1px solid #e2e8f0;padding-top:8px;">
       <span style="font-size:10px;color:${C.grayDk};">Guide UPH — ${label}</span>
       <span style="font-size:10px;color:${C.grayDk};">Page ${pageNum}</span>
     </div>`;

  // ══════════════════════════════════════════════════════════════
  //  PAGE 1 — COVER
  // ══════════════════════════════════════════════════════════════
  const p1 = page(`
    <!-- Background gradient overlay -->
    <div style="position:absolute;inset:0;background:linear-gradient(160deg,${C.navy} 0%,#112240 60%,#0d1a34 100%);"></div>
    <!-- Gold accent bar top -->
    <div style="position:absolute;top:0;left:0;right:0;height:6px;background:linear-gradient(90deg,${C.gold},${C.goldLt},${C.gold});"></div>
    <!-- Decorative circles -->
    <div style="position:absolute;top:-80px;right:-80px;width:320px;height:320px;border-radius:50%;border:1px solid rgba(201,168,76,0.15);"></div>
    <div style="position:absolute;top:-40px;right:-40px;width:200px;height:200px;border-radius:50%;border:1px solid rgba(201,168,76,0.1);"></div>
    <div style="position:absolute;bottom:80px;left:-60px;width:250px;height:250px;border-radius:50%;border:1px solid rgba(255,255,255,0.05);"></div>

    <div style="position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:260mm;text-align:center;">
      <!-- Logo -->
      ${LOGO_B64 ? `<img src="${LOGO_B64}" style="height:110px;width:110px;object-fit:contain;margin-bottom:28px;filter:drop-shadow(0 4px 16px rgba(0,0,0,0.5));"/>` :
        `<div style="width:90px;height:90px;border-radius:50%;background:linear-gradient(135deg,${C.gold},${C.goldLt});display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:900;color:${C.navy};margin-bottom:28px;">UPH</div>`}

      <!-- Badge -->
      <div style="background:rgba(201,168,76,0.15);border:1px solid rgba(201,168,76,0.4);border-radius:100px;padding:6px 20px;font-size:12px;color:${C.goldLt};letter-spacing:2px;text-transform:uppercase;margin-bottom:24px;">Document Officiel • Version 1.0</div>

      <!-- Title -->
      <h1 style="font-size:32px;font-weight:900;color:white;margin:0 0 12px;line-height:1.15;letter-spacing:-0.5px;">Guide Professionnel<br>d'Utilisation</h1>

      <!-- Gold line -->
      <div style="width:80px;height:3px;background:linear-gradient(90deg,${C.gold},${C.goldLt});border-radius:2px;margin:16px 0;"></div>

      <!-- Subtitle -->
      <h2 style="font-size:20px;font-weight:300;color:${C.goldLt};margin:0 0 8px;letter-spacing:1px;">Plateforme Universitaire UPH</h2>
      <p style="font-size:15px;color:rgba(255,255,255,0.6);margin:0 0 40px;letter-spacing:0.5px;">Administration &nbsp;•&nbsp; Professeurs &nbsp;•&nbsp; Étudiants</p>

      <!-- Role badges -->
      <div style="display:flex;gap:12px;justify-content:center;margin-bottom:50px;">
        <div style="background:rgba(21,101,192,0.3);border:1px solid rgba(21,101,192,0.5);border-radius:8px;padding:8px 18px;font-size:13px;color:#90caf9;">🛡️ Administrateur</div>
        <div style="background:rgba(26,122,74,0.3);border:1px solid rgba(26,122,74,0.5);border-radius:8px;padding:8px 18px;font-size:13px;color:#86efac;">👨‍🏫 Professeur</div>
        <div style="background:rgba(201,168,76,0.15);border:1px solid rgba(201,168,76,0.4);border-radius:8px;padding:8px 18px;font-size:13px;color:${C.goldLt};">🎓 Étudiant</div>
      </div>

      <!-- Divider -->
      <div style="width:100%;height:1px;background:rgba(255,255,255,0.1);margin-bottom:30px;"></div>

      <!-- Footer info -->
      <div style="display:flex;gap:40px;justify-content:center;">
        <div style="text-align:center;">
          <div style="font-size:11px;color:rgba(255,255,255,0.4);letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;">Développé par</div>
          <div style="font-size:16px;font-weight:700;color:${C.goldLt};">FlexxNetwork</div>
        </div>
        <div style="width:1px;background:rgba(255,255,255,0.1);"></div>
        <div style="text-align:center;">
          <div style="font-size:11px;color:rgba(255,255,255,0.4);letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;">Université</div>
          <div style="font-size:16px;font-weight:700;color:white;">Polyvalente d'Haïti</div>
        </div>
        <div style="width:1px;background:rgba(255,255,255,0.1);"></div>
        <div style="text-align:center;">
          <div style="font-size:11px;color:rgba(255,255,255,0.4);letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;">Session</div>
          <div style="font-size:16px;font-weight:700;color:white;">2025 – 2026</div>
        </div>
      </div>
    </div>
    <!-- Gold accent bar bottom -->
    <div style="position:absolute;bottom:0;left:0;right:0;height:4px;background:linear-gradient(90deg,${C.gold},${C.goldLt},${C.gold});"></div>
  `, C.navy, '0');

  // ══════════════════════════════════════════════════════════════
  //  PAGE 2 — TABLE DES MATIÈRES
  // ══════════════════════════════════════════════════════════════
  const tocItem = (n, title, sub, pg) =>
    `<div style="display:flex;align-items:center;padding:10px 0;border-bottom:1px dashed #e2e8f0;">
       <div style="min-width:32px;height:32px;border-radius:6px;background:${C.navy};color:${C.gold};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;margin-right:14px;">${n}</div>
       <div style="flex:1;">
         <div style="font-size:15px;font-weight:600;color:${C.text};">${title}</div>
         <div style="font-size:12px;color:${C.grayDk};">${sub}</div>
       </div>
       <div style="font-size:13px;font-weight:600;color:${C.navy};min-width:20px;text-align:right;">${pg}</div>
     </div>`;

  const p2 = page(`
    <!-- Header bar -->
    <div style="background:${C.navy};margin:-30px -35px 28px;padding:22px 35px;display:flex;align-items:center;gap:14px;">
      ${LOGO_B64 ? `<img src="${LOGO_B64}" style="height:36px;width:36px;object-fit:contain;"/>` : `<div style="width:36px;height:36px;border-radius:50%;background:${C.gold};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;color:${C.navy};">UPH</div>`}
      <div>
        <div style="font-size:18px;font-weight:700;color:white;">Guide Professionnel UPH</div>
        <div style="font-size:12px;color:${C.goldLt};">Table des Matières</div>
      </div>
    </div>

    ${tocItem('01','Introduction','Présentation de la plateforme et des rôles','3')}
    ${tocItem('02','Guide Administrateur','Connexion · Tableau de bord · Gestion complète','4–8')}
    ${tocItem('03','Guide Professeur','Connexion · Cours · Étudiants · Notes','9–12')}
    ${tocItem('04','Guide Étudiant','Candidature · Connexion · Cours · Profil','13–16')}
    ${tocItem('05','Gestion des Mots de Passe','Changement · Réinitialisation · Sécurité','17')}
    ${tocItem('06','Workflow Complet','Du test à la note — étape par étape','18')}
    ${tocItem('07','Contact & Support','FlexxNetwork · Assistance technique','19')}

    <div style="margin-top:28px;background:${C.blueLt};border-radius:10px;padding:20px;">
      <div style="font-size:14px;font-weight:700;color:${C.navy};margin-bottom:10px;">📌 Accès rapide — URL de la plateforme</div>
      <div style="font-family:monospace;font-size:15px;color:${C.blue};background:white;border:1px solid #bee3f8;padding:8px 14px;border-radius:6px;display:inline-block;">http://2.24.113.4:3000</div>
      <div style="margin-top:10px;font-size:13px;color:${C.text};">Accessible depuis tout navigateur moderne (Chrome, Firefox, Edge)</div>
    </div>

    <div style="margin-top:16px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
      <div style="background:${C.navy};border-radius:10px;padding:16px;text-align:center;">
        <div style="font-size:24px;margin-bottom:6px;">🛡️</div>
        <div style="font-size:13px;font-weight:700;color:${C.goldLt};">Administrateur</div>
        <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:4px;">Contrôle total du système</div>
      </div>
      <div style="background:${C.navy};border-radius:10px;padding:16px;text-align:center;">
        <div style="font-size:24px;margin-bottom:6px;">👨‍🏫</div>
        <div style="font-size:13px;font-weight:700;color:${C.goldLt};">Professeur</div>
        <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:4px;">Cours · Étudiants · Notes</div>
      </div>
      <div style="background:${C.navy};border-radius:10px;padding:16px;text-align:center;">
        <div style="font-size:24px;margin-bottom:6px;">🎓</div>
        <div style="font-size:13px;font-weight:700;color:${C.goldLt};">Étudiant</div>
        <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:4px;">Inscription · Notes · Profil</div>
      </div>
    </div>
    ${footer('Table des Matières', 2)}
  `);

  // ══════════════════════════════════════════════════════════════
  //  PAGE 3 — INTRODUCTION
  // ══════════════════════════════════════════════════════════════
  const p3 = page(`
    ${sectionHdr('📖','Introduction','Découverte de la plateforme universitaire UPH')}

    <div style="font-size:14px;color:${C.text};line-height:1.7;margin-bottom:20px;">
      La <strong>Plateforme Universitaire UPH</strong> est un système de gestion académique intégré, développé spécialement pour l'<strong>Université Polyvalente d'Haïti</strong>. Elle centralise toutes les opérations administratives, pédagogiques et étudiantes en un seul outil professionnel.
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">
      <div style="background:${C.blueLt};border-radius:10px;padding:16px;">
        <div style="font-size:15px;font-weight:700;color:${C.navy};margin-bottom:10px;">🏛️ Modules Principaux</div>
        <ul style="margin:0;padding-left:18px;font-size:13px;color:${C.text};line-height:1.8;">
          <li>Gestion des candidatures & inscriptions</li>
          <li>Gestion des professeurs & cours</li>
          <li>Tableau de bord statistique</li>
          <li>Saisie et consultation des notes</li>
          <li>Emplois du temps</li>
          <li>Messagerie interne</li>
          <li>Gestion des mots de passe</li>
        </ul>
      </div>
      <div style="background:${C.greenLt};border-radius:10px;padding:16px;">
        <div style="font-size:15px;font-weight:700;color:${C.green};margin-bottom:10px;">✅ Avantages Clés</div>
        <ul style="margin:0;padding-left:18px;font-size:13px;color:${C.text};line-height:1.8;">
          <li>Interface moderne & intuitive</li>
          <li>Base de données MySQL sécurisée</li>
          <li>Accessible depuis tout navigateur</li>
          <li>Données en temps réel</li>
          <li>Gestion multi-campus</li>
          <li>Sécurité renforcée (SHA-256)</li>
          <li>Compatible mobile & desktop</li>
        </ul>
      </div>
    </div>

    <div style="margin-bottom:16px;">${img('homepage-hero')}</div>
    ${caption('Page d\'accueil de la Plateforme Universitaire UPH — accessible sur navigateur')}

    ${info('💡 <strong>Accès à la plateforme :</strong> Ouvrez votre navigateur et rendez-vous sur <code style="background:white;padding:1px 6px;border-radius:4px;">http://2.24.113.4:3000</code>. Cliquez sur <strong>"Se Connecter"</strong> en haut à droite pour accéder à votre espace.', C.blueLt, C.blue)}

    ${footer('Introduction', 3)}
  `);

  // ══════════════════════════════════════════════════════════════
  //  PAGE 4 — CONNEXION & ACCUEIL
  // ══════════════════════════════════════════════════════════════
  const p4 = page(`
    <div style="background:${C.navy};margin:-30px -35px 24px;padding:14px 35px;"><div style="font-size:11px;color:${C.goldLt};letter-spacing:2px;text-transform:uppercase;">Section 02</div><div style="font-size:20px;font-weight:700;color:white;">Guide Administrateur</div></div>

    ${sectionHdr('🔐','Connexion à la Plateforme')}

    ${cols(
      `<div>
        ${step(1, 'Ouvrez votre navigateur et accédez à l\'URL de la plateforme.')}
        ${step(2, 'Cliquez sur le bouton <strong style="color:${C.navy};">Se Connecter</strong> en haut à droite de la page d\'accueil.')}
        ${step(3, 'Dans la fenêtre de connexion, cliquez sur l\'onglet <strong>🛠️ Admin</strong>.')}
        ${step(4, 'Saisissez votre email <code style="background:${C.gray};padding:1px 5px;border-radius:3px;">admin@uph</code> et votre mot de passe.')}
        ${step(5, 'Cochez <em>Se souvenir de moi</em> pour rester connecté.')}
        ${step(6, 'Cliquez sur <strong style="color:${C.navy};">Se Connecter</strong>.')}
        ${info('🔑 <strong>Identifiants par défaut :</strong><br>Email : <code>admin@uph</code><br>Mot de passe : <code>UPH@2026</code>', C.goldLt.replace('#f0d070','#fdf5e1'), C.gold)}
      </div>`,
      `<div>
        ${img('login-admin-filled')}
        ${caption('Fenêtre de connexion — onglet Admin rempli')}
      </div>`
    )}

    <div style="margin-top:16px;">
      ${img('admin-dashboard')}
      ${caption('Tableau de bord Administrateur — vue d\'ensemble après connexion')}
    </div>
    ${footer('Guide Administrateur — Connexion', 4)}
  `);

  // ══════════════════════════════════════════════════════════════
  //  PAGE 5 — ADMIN CANDIDATURES
  // ══════════════════════════════════════════════════════════════
  const p5 = page(`
    <div style="background:${C.navy};margin:-30px -35px 24px;padding:14px 35px;"><div style="font-size:11px;color:${C.goldLt};letter-spacing:2px;text-transform:uppercase;">Section 02</div><div style="font-size:20px;font-weight:700;color:white;">Guide Administrateur</div></div>

    ${sectionHdr('📋','Approbation des Candidatures Étudiantes','Les étudiants soumettent leur candidature en ligne — vous les validez ici.')}

    ${img('admin-applications')}
    ${caption('Liste des candidatures reçues — statut Pending / Approuvé / Refusé')}

    <div style="margin-top:18px;display:grid;grid-template-columns:1fr 1fr;gap:16px;">
      <div>
        <div style="font-size:14px;font-weight:700;color:${C.navy};margin-bottom:12px;">Approuver un étudiant</div>
        ${step(1, 'Allez dans <strong>Candidatures</strong> dans le menu latéral.')}
        ${step(2, 'Filtrez par statut <strong>"En Attente"</strong> pour voir les nouvelles demandes.')}
        ${step(3, 'Cliquez sur <strong style="color:${C.green};">✓ Approuver</strong> pour valider la candidature.')}
        ${step(4, 'Le compte étudiant est créé automatiquement avec un code unique (ex: UPH-2026-001).')}
        ${step(5, 'Communiquez les identifiants à l\'étudiant.')}
      </div>
      <div>
        <div style="font-size:14px;font-weight:700;color:${C.navy};margin-bottom:12px;">Filtrer les dossiers</div>
        ${step(1, 'Utilisez le menu déroulant <strong>"Tous"</strong> pour filtrer par statut.')}
        ${step(2, 'Statut <strong>En Attente</strong> : à traiter en priorité.')}
        ${step(3, 'Statut <strong>Approuvé</strong> : étudiant actif sur la plateforme.')}
        ${step(4, 'Statut <strong>Refusé</strong> : candidature non retenue.')}
        ${info('⚡ Après approbation, l\'étudiant peut immédiatement se connecter avec ses identifiants et s\'inscrire aux cours.', C.greenLt, C.green)}
      </div>
    </div>
    ${footer('Guide Administrateur — Candidatures', 5)}
  `);

  // ══════════════════════════════════════════════════════════════
  //  PAGE 6 — ADMIN ÉTUDIANTS & PROFESSEURS
  // ══════════════════════════════════════════════════════════════
  const p6 = page(`
    <div style="background:${C.navy};margin:-30px -35px 24px;padding:14px 35px;"><div style="font-size:11px;color:${C.goldLt};letter-spacing:2px;text-transform:uppercase;">Section 02</div><div style="font-size:20px;font-weight:700;color:white;">Guide Administrateur</div></div>

    ${sectionHdr('👥','Gestion des Étudiants & Professeurs')}

    ${cols(
      `<div>
        <div style="font-size:13px;font-weight:700;color:${C.navy};background:${C.gray};padding:8px 12px;border-radius:6px;margin-bottom:12px;">🎓 Étudiants Inscrits</div>
        ${img('admin-students')}
        ${caption('Liste complète des étudiants actifs dans MySQL')}
      </div>`,
      `<div>
        <div style="font-size:13px;font-weight:700;color:${C.navy};background:${C.gray};padding:8px 12px;border-radius:6px;margin-bottom:12px;">👨‍🏫 Professeurs</div>
        ${img('admin-professors')}
        ${caption('Gestion des professeurs — approbation des nouvelles demandes')}
      </div>`
    )}

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px;">
      <div>
        <div style="font-size:13px;font-weight:700;color:${C.navy};margin-bottom:8px;">Créer un compte manuellement</div>
        ${step(1, 'Cliquez <strong>"+ Ajouter"</strong> dans Étudiants ou Professeurs.')}
        ${step(2, 'Remplissez Prénom, Nom, Email, Mot de passe.')}
        ${step(3, 'Sélectionnez la Faculté / Département.')}
        ${step(4, 'Le compte est activé immédiatement.')}
      </div>
      <div>
        <div style="font-size:13px;font-weight:700;color:${C.navy};margin-bottom:8px;">Approuver un professeur</div>
        ${step(1, 'Un professeur peut s\'auto-inscrire via "Créer un compte".')}
        ${step(2, 'Son compte apparaît avec le badge <strong>En attente</strong>.')}
        ${step(3, 'Cliquez <strong style="color:${C.green};">✓ Approuver</strong> pour activer.')}
        ${step(4, 'Le professeur peut maintenant se connecter.')}
      </div>
    </div>
    ${footer('Guide Administrateur — Étudiants & Professeurs', 6)}
  `);

  // ══════════════════════════════════════════════════════════════
  //  PAGE 7 — ADMIN COURS
  // ══════════════════════════════════════════════════════════════
  const p7 = page(`
    <div style="background:${C.navy};margin:-30px -35px 24px;padding:14px 35px;"><div style="font-size:11px;color:${C.goldLt};letter-spacing:2px;text-transform:uppercase;">Section 02</div><div style="font-size:20px;font-weight:700;color:white;">Guide Administrateur</div></div>

    ${sectionHdr('📚','Gestion des Cours','Assignation de professeurs · Modification des crédits · Création de cours')}

    ${img('admin-courses')}
    ${caption('Tableau de gestion des cours — 162 cours disponibles dans 5 programmes')}

    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-top:16px;">
      <div style="background:${C.blueLt};border-radius:8px;padding:12px;">
        <div style="font-size:12px;font-weight:700;color:${C.blue};margin-bottom:8px;">👨‍🏫 Assigner un Professeur</div>
        ${step(1, 'Dans la colonne <em>Professeur</em>, cliquez sur le menu déroulant.')}
        ${step(2, 'Sélectionnez le professeur souhaité.')}
        ${step(3, 'La sauvegarde est automatique (toast vert).')}
      </div>
      <div style="background:${C.greenLt};border-radius:8px;padding:12px;">
        <div style="font-size:12px;font-weight:700;color:${C.green};margin-bottom:8px;">✏️ Modifier les Crédits</div>
        ${step(1, 'Dans la colonne <em>Crédits</em>, cliquez sur le nombre.')}
        ${step(2, 'Saisissez la nouvelle valeur (1–9).')}
        ${step(3, 'Cliquez ailleurs pour sauvegarder.')}
      </div>
      <div style="background:${C.gray};border-radius:8px;padding:12px;">
        <div style="font-size:12px;font-weight:700;color:${C.navy};margin-bottom:8px;">➕ Créer un Cours</div>
        ${step(1, 'Cliquez <strong>"+ Nouveau Cours"</strong>.')}
        ${step(2, 'Remplissez Code, Nom, Faculté, Crédits.')}
        ${step(3, 'Définissez le max d\'étudiants et le statut.')}
      </div>
    </div>

    <div style="margin-top:14px;">${img('admin-courses-form')}</div>
    ${caption('Formulaire de création de nouveau cours')}
    ${footer('Guide Administrateur — Cours', 7)}
  `);

  // ══════════════════════════════════════════════════════════════
  //  PAGE 8 — ADMIN SÉCURITÉ & ACTIVITÉ
  // ══════════════════════════════════════════════════════════════
  const p8 = page(`
    <div style="background:${C.navy};margin:-30px -35px 24px;padding:14px 35px;"><div style="font-size:11px;color:${C.goldLt};letter-spacing:2px;text-transform:uppercase;">Section 02</div><div style="font-size:20px;font-weight:700;color:white;">Guide Administrateur</div></div>

    ${sectionHdr('🔐','Sécurité & Activité du Système')}

    ${cols(
      `<div>
        ${img('admin-account')}
        ${caption('Panneau "Mon Compte" — changement de mot de passe admin')}
        <div style="margin-top:14px;">
          <div style="font-size:13px;font-weight:700;color:${C.navy};margin-bottom:8px;">Changer son mot de passe</div>
          ${step(1, 'Cliquez sur <strong>"🔐 Mon Compte"</strong> dans le menu.')}
          ${step(2, 'Saisissez votre mot de passe actuel.')}
          ${step(3, 'Entrez le nouveau mot de passe (min. 8 caractères).')}
          ${step(4, 'Confirmez et cliquez <strong>"Modifier"</strong>.')}
        </div>
      </div>`,
      `<div>
        ${img('admin-activity')}
        ${caption('Journal d\'activité — historique de toutes les actions')}
        <div style="margin-top:14px;">
          ${info('📊 <strong>Statistiques en temps réel</strong><br>Le tableau de bord affiche automatiquement le nombre d\'étudiants actifs, de professeurs, de candidatures en attente et de cours actifs.', C.blueLt, C.blue)}
          ${info('🔒 <strong>Sécurité :</strong> Tous les mots de passe sont stockés en SHA-256. Aucun mot de passe n\'est lisible dans la base de données.', C.gray, C.grayDk)}
        </div>
      </div>`
    )}
    ${footer('Guide Administrateur — Sécurité', 8)}
  `);

  // ══════════════════════════════════════════════════════════════
  //  PAGE 9 — GUIDE PROFESSEUR — CONNEXION & DASHBOARD
  // ══════════════════════════════════════════════════════════════
  const p9 = page(`
    <div style="background:${C.blue};margin:-30px -35px 24px;padding:14px 35px;"><div style="font-size:11px;color:#90caf9;letter-spacing:2px;text-transform:uppercase;">Section 03</div><div style="font-size:20px;font-weight:700;color:white;">Guide Professeur</div></div>

    ${sectionHdr('👨‍🏫','Connexion & Tableau de Bord Professeur')}

    ${cols(
      `<div>
        ${step(1, 'Sur la page d\'accueil, cliquez sur <strong>Se Connecter</strong>.')}
        ${step(2, 'Sélectionnez l\'onglet <strong>👨‍🏫 Professeur</strong>.')}
        ${step(3, 'Saisissez votre email et mot de passe fournis par l\'administration.')}
        ${step(4, 'Cliquez <strong>Se Connecter</strong>.')}
        ${info('⚠️ Si votre compte indique <em>"En attente"</em>, contactez l\'administrateur pour validation.', '#fff8e1', C.gold)}
        <div style="margin-top:14px;">
          <div style="font-size:13px;font-weight:700;color:${C.navy};margin-bottom:8px;">Tableau de bord — statistiques</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <div style="background:${C.blueLt};border-radius:6px;padding:10px;text-align:center;"><div style="font-size:18px;font-weight:700;color:${C.blue};">📚</div><div style="font-size:11px;color:${C.blue};">Cours Assignés</div></div>
            <div style="background:${C.greenLt};border-radius:6px;padding:10px;text-align:center;"><div style="font-size:18px;font-weight:700;color:${C.green};">👥</div><div style="font-size:11px;color:${C.green};">Étudiants</div></div>
            <div style="background:#fdf5e1;border-radius:6px;padding:10px;text-align:center;"><div style="font-size:18px;font-weight:700;color:${C.gold};">📝</div><div style="font-size:11px;color:${C.gold};">Notes Saisies</div></div>
            <div style="background:${C.redLt};border-radius:6px;padding:10px;text-align:center;"><div style="font-size:18px;font-weight:700;color:${C.red};">⏳</div><div style="font-size:11px;color:${C.red};">À Évaluer</div></div>
          </div>
        </div>
      </div>`,
      `<div>
        ${img('login-prof-tab')}
        ${caption('Fenêtre de connexion — onglet Professeur')}
        <div style="margin-top:14px;">
          ${img('prof-dashboard') || img('admin-dashboard')}
          ${caption('Tableau de bord professeur après connexion')}
        </div>
      </div>`
    )}
    ${footer('Guide Professeur — Connexion', 9)}
  `);

  // ══════════════════════════════════════════════════════════════
  //  PAGE 10 — GUIDE PROFESSEUR — COURS & ÉTUDIANTS
  // ══════════════════════════════════════════════════════════════
  const p10 = page(`
    <div style="background:${C.blue};margin:-30px -35px 24px;padding:14px 35px;"><div style="font-size:11px;color:#90caf9;letter-spacing:2px;text-transform:uppercase;">Section 03</div><div style="font-size:20px;font-weight:700;color:white;">Guide Professeur</div></div>

    ${sectionHdr('📚','Mes Cours & Mes Étudiants')}

    ${cols(
      `<div>
        <div style="font-size:13px;font-weight:700;color:${C.navy};margin-bottom:10px;">📚 Mes Cours assignés</div>
        ${img('prof-courses')}
        ${caption('Liste des cours assignés par l\'administrateur')}
        <div style="margin-top:10px;font-size:13px;color:${C.text};line-height:1.6;">
          Chaque cours affiche : le <strong>code</strong>, l'<strong>intitulé</strong>, le nombre de <strong>crédits</strong> et les <strong>étudiants inscrits</strong>.<br><br>
          <em>Si aucun cours n'apparaît, contactez l'admin pour l'assignation.</em>
        </div>
      </div>`,
      `<div>
        <div style="font-size:13px;font-weight:700;color:${C.navy};margin-bottom:10px;">👥 Liste des Étudiants</div>
        ${img('prof-students')}
        ${caption('Tous les étudiants inscrits dans vos cours')}
        <div style="margin-top:10px;">
          ${step(1, 'Cliquez sur <strong>Mes Étudiants</strong> dans le menu.')}
          ${step(2, 'Filtrez par cours via le menu en haut à droite.')}
          ${step(3, 'La dernière note de chaque étudiant est affichée.')}
        </div>
      </div>`
    )}
    ${footer('Guide Professeur — Cours & Étudiants', 10)}
  `);

  // ══════════════════════════════════════════════════════════════
  //  PAGE 11 — GUIDE PROFESSEUR — SAISIE DES NOTES
  // ══════════════════════════════════════════════════════════════
  const p11 = page(`
    <div style="background:${C.blue};margin:-30px -35px 24px;padding:14px 35px;"><div style="font-size:11px;color:#90caf9;letter-spacing:2px;text-transform:uppercase;">Section 03</div><div style="font-size:20px;font-weight:700;color:white;">Guide Professeur</div></div>

    ${sectionHdr('📝','Saisie des Notes','Notation de 0 à 20 par cours et par étudiant')}

    ${img('prof-grades')}
    ${caption('Interface de saisie des notes — liste des étudiants inscrits avec champ de note')}

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px;">
      <div>
        <div style="font-size:13px;font-weight:700;color:${C.navy};margin-bottom:10px;">Comment saisir les notes</div>
        ${step(1, 'Cliquez sur <strong>Saisie des Notes</strong> dans le menu gauche.')}
        ${step(2, 'Choisissez un cours dans le menu déroulant.')}
        ${step(3, 'La liste des étudiants inscrits apparaît automatiquement.')}
        ${step(4, 'Pour chaque étudiant, saisissez la note dans le champ (0–20).')}
        ${step(5, 'Ajoutez optionnellement une appréciation (ex: "Très Bien").')}
        ${step(6, 'Cliquez sur <strong style="color:${C.green};">💾 Sauvegarder</strong>.')}
        ${step(7, 'La note est enregistrée dans MySQL et visible par l\'étudiant.')}
      </div>
      <div>
        <div style="font-size:13px;font-weight:700;color:${C.navy};margin-bottom:10px;">Barème de notation</div>
        <div style="border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;">
          ${[['16–20','Très Bien','#1a7a4a','#d4edda'],['14–15.5','Bien','#1565c0','#e3f0ff'],['12–13.5','Assez Bien','#c9a84c','#fdf5e1'],['10–11.5','Passable','#e67e22','#fff3e0'],['0–9.5','Insuffisant','#c0392b','#fde8e8']].map(([r,m,c,bg]) =>
            `<div style="display:flex;padding:7px 12px;background:${bg};border-bottom:1px solid rgba(0,0,0,0.05);">
               <span style="min-width:60px;font-family:monospace;font-size:12px;color:${c};font-weight:700;">${r}</span>
               <span style="font-size:13px;color:${C.text};font-weight:500;">${m}</span>
             </div>`).join('')}
        </div>
        ${info('🔄 Les notes peuvent être modifiées à tout moment — le système fait une mise à jour (UPSERT).', C.blueLt, C.blue)}
      </div>
    </div>
    ${footer('Guide Professeur — Notes', 11)}
  `);

  // ══════════════════════════════════════════════════════════════
  //  PAGE 12 — GUIDE PROFESSEUR — PROFIL & SÉCURITÉ
  // ══════════════════════════════════════════════════════════════
  const p12 = page(`
    <div style="background:${C.blue};margin:-30px -35px 24px;padding:14px 35px;"><div style="font-size:11px;color:#90caf9;letter-spacing:2px;text-transform:uppercase;">Section 03</div><div style="font-size:20px;font-weight:700;color:white;">Guide Professeur</div></div>

    ${sectionHdr('👤','Profil Professeur & Sécurité')}

    ${cols(
      `<div>
        ${img('prof-profile')}
        ${caption('Profil professeur avec section de changement de mot de passe')}
      </div>`,
      `<div>
        <div style="font-size:13px;font-weight:700;color:${C.navy};margin-bottom:10px;">Changer son mot de passe</div>
        ${step(1, 'Allez dans <strong>Mon Profil</strong> (icône 👤 dans le menu).')}
        ${step(2, 'Cliquez sur <strong>"Changer le mot de passe"</strong>.')}
        ${step(3, 'Saisissez votre mot de passe actuel.')}
        ${step(4, 'Entrez et confirmez le nouveau mot de passe (min. 8 caractères).')}
        ${step(5, 'Cliquez <strong>"🔐 Modifier"</strong>.')}

        ${info('✅ Le nouveau mot de passe est actif immédiatement. Lors de la prochaine connexion, utilisez le nouveau mot de passe.', C.greenLt, C.green)}

        <div style="margin-top:16px;">
          <div style="font-size:13px;font-weight:700;color:${C.navy};margin-bottom:10px;">Afficher/Masquer le mot de passe</div>
          <p style="font-size:13px;color:${C.text};line-height:1.6;">
            Cliquez sur l'icône 👁️ à droite du champ mot de passe pour afficher ou masquer ce que vous tapez. L'icône devient 🙈 quand le texte est visible.
          </p>
        </div>
      </div>`
    )}

    ${img('prof-change-password') ? `<div style="margin-top:14px;">${img('prof-change-password')}${caption('Formulaire de changement de mot de passe — ouvert dans le profil professeur')}</div>` : ''}
    ${footer('Guide Professeur — Profil', 12)}
  `);

  // ══════════════════════════════════════════════════════════════
  //  PAGE 13 — GUIDE ÉTUDIANT — CANDIDATURE
  // ══════════════════════════════════════════════════════════════
  const p13 = page(`
    <div style="background:${C.green};margin:-30px -35px 24px;padding:14px 35px;"><div style="font-size:11px;color:#86efac;letter-spacing:2px;text-transform:uppercase;">Section 04</div><div style="font-size:20px;font-weight:700;color:white;">Guide Étudiant</div></div>

    ${sectionHdr('📋','Soumettre une Candidature','Première étape pour accéder à la plateforme')}

    ${cols(
      `<div>
        ${step(1, 'Sur la page d\'accueil, cliquez sur <strong>"📋 Déposer une Candidature"</strong>.')}
        ${step(2, 'Remplissez le formulaire : Nom, Prénom, Email, Téléphone.')}
        ${step(3, 'Choisissez votre <strong>Faculté</strong> dans la liste (7 facultés disponibles).')}
        ${step(4, 'Sélectionnez votre niveau d\'études (Licence, Master, etc.).')}
        ${step(5, 'Ajoutez votre diplôme précédent et votre établissement scolaire.')}
        ${step(6, 'Rédigez votre lettre de motivation (optionnel).')}
        ${step(7, 'Cliquez sur <strong>"📤 Soumettre ma Candidature"</strong>.')}
        ${info('⏳ Votre dossier sera examiné par l\'administration. Vous recevrez vos identifiants de connexion une fois approuvé.', '#fff8e1', C.gold)}
      </div>`,
      `<div>
        ${img('apply-form')}
        ${caption('Formulaire de candidature — remplissez toutes les informations')}
      </div>`
    )}

    <div style="margin-top:16px;background:${C.navy};border-radius:10px;padding:16px;display:flex;gap:20px;">
      <div style="flex:1;text-align:center;"><div style="font-size:20px;">📋</div><div style="font-size:12px;color:${C.goldLt};font-weight:600;margin-top:4px;">Candidature</div><div style="font-size:11px;color:rgba(255,255,255,0.5);">Soumission en ligne</div></div>
      <div style="display:flex;align-items:center;color:${C.gold};">→</div>
      <div style="flex:1;text-align:center;"><div style="font-size:20px;">⏳</div><div style="font-size:12px;color:${C.goldLt};font-weight:600;margin-top:4px;">Examen</div><div style="font-size:11px;color:rgba(255,255,255,0.5);">Par l'administrateur</div></div>
      <div style="display:flex;align-items:center;color:${C.gold};">→</div>
      <div style="flex:1;text-align:center;"><div style="font-size:20px;">✅</div><div style="font-size:12px;color:${C.goldLt};font-weight:600;margin-top:4px;">Approbation</div><div style="font-size:11px;color:rgba(255,255,255,0.5);">Compte créé</div></div>
      <div style="display:flex;align-items:center;color:${C.gold};">→</div>
      <div style="flex:1;text-align:center;"><div style="font-size:20px;">🔐</div><div style="font-size:12px;color:${C.goldLt};font-weight:600;margin-top:4px;">Connexion</div><div style="font-size:11px;color:rgba(255,255,255,0.5);">Avec vos identifiants</div></div>
    </div>
    ${footer('Guide Étudiant — Candidature', 13)}
  `);

  // ══════════════════════════════════════════════════════════════
  //  PAGE 14 — GUIDE ÉTUDIANT — CONNEXION & DASHBOARD
  // ══════════════════════════════════════════════════════════════
  const p14 = page(`
    <div style="background:${C.green};margin:-30px -35px 24px;padding:14px 35px;"><div style="font-size:11px;color:#86efac;letter-spacing:2px;text-transform:uppercase;">Section 04</div><div style="font-size:20px;font-weight:700;color:white;">Guide Étudiant</div></div>

    ${sectionHdr('🎓','Connexion & Tableau de Bord Étudiant')}

    ${cols(
      `<div>
        ${img('login-student-tab')}
        ${caption('Fenêtre de connexion — onglet Étudiant')}
      </div>`,
      `<div>
        ${step(1, 'Cliquez sur <strong>Se Connecter</strong> puis sélectionnez l\'onglet <strong>🎓 Étudiant</strong>.')}
        ${step(2, 'Entrez l\'email et le mot de passe communiqués par l\'administration.')}
        ${step(3, 'Cochez <em>Se souvenir de moi</em> pour une connexion rapide.')}
        ${step(4, 'Cliquez <strong>Se Connecter</strong> → vous accédez à votre espace personnel.')}
        ${info('🎓 Après connexion, vous avez accès à : <br>• Vos cours disponibles<br>• Vos notes<br>• Votre emploi du temps<br>• Votre profil étudiant', C.greenLt, C.green)}
      </div>`
    )}

    <div style="margin-top:16px;">
      ${img('std-dashboard')}
      ${caption('Tableau de bord étudiant — vue d\'ensemble avec statistiques et informations académiques')}
    </div>
    ${footer('Guide Étudiant — Connexion', 14)}
  `);

  // ══════════════════════════════════════════════════════════════
  //  PAGE 15 — GUIDE ÉTUDIANT — INSCRIPTION AUX COURS & NOTES
  // ══════════════════════════════════════════════════════════════
  const p15 = page(`
    <div style="background:${C.green};margin:-30px -35px 24px;padding:14px 35px;"><div style="font-size:11px;color:#86efac;letter-spacing:2px;text-transform:uppercase;">Section 04</div><div style="font-size:20px;font-weight:700;color:white;">Guide Étudiant</div></div>

    ${sectionHdr('📚','Inscription aux Cours & Consultation des Notes')}

    ${cols(
      `<div>
        <div style="font-size:13px;font-weight:700;color:${C.navy};margin-bottom:10px;">S'inscrire à un cours</div>
        ${img('std-enroll')}
        ${caption('Catalogue de cours avec filtre par programme')}
        <div style="margin-top:10px;">
          ${step(1, 'Allez dans <strong>S\'inscrire aux Cours</strong>.')}
          ${step(2, 'Filtrez par programme : DSI, DSA, GC, ADM, DSE.')}
          ${step(3, 'Cliquez sur <strong class="btn-gold">S\'inscrire</strong> sur un cours disponible.')}
          ${step(4, 'Un badge vert <strong>✓ Inscrit</strong> confirme l\'inscription.')}
        </div>
      </div>`,
      `<div>
        <div style="font-size:13px;font-weight:700;color:${C.navy};margin-bottom:10px;">Consulter ses notes</div>
        ${img('std-grades')}
        ${caption('Bulletin de notes — barres de progression colorées')}
        <div style="margin-top:10px;">
          ${step(1, 'Allez dans <strong>Mes Notes</strong> dans le menu.')}
          ${step(2, 'Vos notes s\'affichent par cours avec mention.')}
          ${step(3, 'La barre colorée indique le niveau : vert = Très Bien, bleu = Bien, orange = Passable, rouge = Insuffisant.')}
        </div>
        ${info('📊 Les notes sont saisies par vos professeurs. Contactez votre professeur si une note est manquante.', C.blueLt, C.blue)}
      </div>`
    )}
    ${footer('Guide Étudiant — Cours & Notes', 15)}
  `);

  // ══════════════════════════════════════════════════════════════
  //  PAGE 16 — GUIDE ÉTUDIANT — PROFIL & SÉCURITÉ
  // ══════════════════════════════════════════════════════════════
  const p16 = page(`
    <div style="background:${C.green};margin:-30px -35px 24px;padding:14px 35px;"><div style="font-size:11px;color:#86efac;letter-spacing:2px;text-transform:uppercase;">Section 04</div><div style="font-size:20px;font-weight:700;color:white;">Guide Étudiant</div></div>

    ${sectionHdr('👤','Profil Étudiant & Sécurité')}

    ${cols(
      `<div>
        ${img('std-profile')}
        ${caption('Profil étudiant avec photo et informations académiques')}
      </div>`,
      `<div>
        <div style="font-size:13px;font-weight:700;color:${C.navy};margin-bottom:10px;">Modifier son profil</div>
        ${step(1, 'Allez dans <strong>Mon Profil</strong>.')}
        ${step(2, 'Cliquez <strong>"✏️ Modifier mon Profil"</strong>.')}
        ${step(3, 'Mettez à jour téléphone et adresse.')}
        ${step(4, 'Cliquez <strong>"Choisir une photo"</strong> pour mettre à jour votre photo (JPG, PNG, max 5 Mo).')}
        ${step(5, 'Sauvegardez les modifications.')}

        <div style="margin-top:14px;">
          <div style="font-size:13px;font-weight:700;color:${C.navy};margin-bottom:10px;">Changer son mot de passe</div>
          ${step(1, 'Dans Mon Profil, cliquez <strong>"Changer le mot de passe"</strong>.')}
          ${step(2, 'Entrez l\'ancien mot de passe, puis le nouveau (min. 8 car.).')}
          ${step(3, 'Confirmez et cliquez <strong>"🔐 Modifier"</strong>.')}
        </div>
      </div>`
    )}

    ${img('std-change-password') ? `<div style="margin-top:14px;">${img('std-change-password')}${caption('Section de changement de mot de passe dans le profil étudiant')}</div>` : ''}
    ${footer('Guide Étudiant — Profil', 16)}
  `);

  // ══════════════════════════════════════════════════════════════
  //  PAGE 17 — SÉCURITÉ & MOT DE PASSE OUBLIÉ
  // ══════════════════════════════════════════════════════════════
  const p17 = page(`
    <div style="background:#6d28d9;margin:-30px -35px 24px;padding:14px 35px;"><div style="font-size:11px;color:#c4b5fd;letter-spacing:2px;text-transform:uppercase;">Section 05</div><div style="font-size:20px;font-weight:700;color:white;">Gestion des Mots de Passe</div></div>

    ${sectionHdr('🔑','Mot de Passe Oublié — Réinitialisation','Procédure de récupération d\'accès en 3 étapes')}

    ${cols(
      `<div>
        ${img('login-forgot-password')}
        ${caption('Formulaire de réinitialisation — saisie de l\'email')}
        <div style="margin-top:12px;">
          ${step(1, 'Sur la fenêtre de connexion, cliquez <strong>"Mot de passe oublié ?"</strong>.')}
          ${step(2, 'Saisissez votre adresse email UPH.')}
          ${step(3, 'Cliquez <strong>"📤 Envoyer le code"</strong>.')}
          ${step(4, 'Un code à 6 chiffres est généré et affiché (visible en doré).')}
          ${step(5, 'Saisissez ce code dans le champ prévu.')}
          ${step(6, 'Entrez et confirmez votre nouveau mot de passe (min. 8 car.).')}
          ${step(7, 'Cliquez <strong>"✅ Réinitialiser"</strong> → connexion avec le nouveau mot de passe.')}
        </div>
      </div>`,
      `<div>
        <div style="font-size:13px;font-weight:700;color:${C.navy};margin-bottom:14px;">🔒 Bonnes Pratiques de Sécurité</div>

        <div style="background:#f5f3ff;border-radius:8px;padding:14px;margin-bottom:12px;">
          <div style="font-size:12px;font-weight:700;color:#6d28d9;margin-bottom:8px;">✅ Mot de passe sécurisé</div>
          <ul style="margin:0;padding-left:16px;font-size:12px;color:${C.text};line-height:1.7;">
            <li>Minimum <strong>8 caractères</strong></li>
            <li>Mélangez lettres, chiffres et symboles</li>
            <li>Ne partagez jamais votre mot de passe</li>
            <li>Changez-le régulièrement</li>
          </ul>
        </div>

        <div style="background:#f0fdf4;border-radius:8px;padding:14px;margin-bottom:12px;">
          <div style="font-size:12px;font-weight:700;color:${C.green};margin-bottom:8px;">👁️ Bouton Afficher/Masquer</div>
          <p style="margin:0;font-size:12px;color:${C.text};line-height:1.6;">Cliquez sur l'icône 👁️ pour voir ce que vous tapez. Pratique pour vérifier votre saisie sans erreur.</p>
        </div>

        <div style="background:#fdf5e1;border-radius:8px;padding:14px;">
          <div style="font-size:12px;font-weight:700;color:${C.gold};margin-bottom:8px;">💾 Se souvenir de moi</div>
          <p style="margin:0;font-size:12px;color:${C.text};line-height:1.6;">Cochez cette option pour pré-remplir votre email et rôle lors de la prochaine connexion. Le mot de passe n'est <strong>jamais</strong> sauvegardé.</p>
        </div>

        ${info('🔐 <strong>Stockage sécurisé :</strong> Tous les mots de passe sont hachés avec SHA-256. Même l\'administrateur ne peut pas lire votre mot de passe.', '#f5f3ff', '#6d28d9')}
      </div>`
    )}
    ${footer('Sécurité & Mots de Passe', 17)}
  `);

  // ══════════════════════════════════════════════════════════════
  //  PAGE 18 — WORKFLOW COMPLET
  // ══════════════════════════════════════════════════════════════
  const wfStep = (n, actor, icon, title, desc, color = C.navy) =>
    `<div style="display:flex;gap:14px;margin-bottom:16px;align-items:flex-start;">
       <div style="min-width:36px;height:36px;border-radius:50%;background:${color};color:white;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;flex-shrink:0;">${n}</div>
       <div style="flex:1;background:white;border:1px solid #e2e8f0;border-radius:8px;padding:12px;">
         <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
           <span style="font-size:16px;">${icon}</span>
           <span style="font-size:10px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:${color};">${actor}</span>
         </div>
         <div style="font-size:13px;font-weight:700;color:${C.text};">${title}</div>
         <div style="font-size:12px;color:${C.grayDk};margin-top:2px;">${desc}</div>
       </div>
     </div>`;

  const p18 = page(`
    <div style="background:linear-gradient(135deg,${C.navy},#1a3a5c);margin:-30px -35px 24px;padding:14px 35px;"><div style="font-size:11px;color:${C.goldLt};letter-spacing:2px;text-transform:uppercase;">Section 06</div><div style="font-size:20px;font-weight:700;color:white;">Workflow Complet — Test du Système</div></div>

    ${sectionHdr('🔄','Flux de Test Complet','Du premier étudiant à la première note — guide pas à pas')}

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
      <div>
        ${wfStep(1,'Étudiant','📋','Soumettre une candidature','Remplir le formulaire sur la page d\'accueil et soumettre.', C.gold)}
        ${wfStep(2,'Admin','✅','Approuver la candidature','Dans Candidatures → cliquer ✓ Approuver. Compte créé automatiquement.', C.navy)}
        ${wfStep(3,'Admin','👨‍🏫','Créer/approuver un professeur','Via Admin → Professeurs ou approbation d\'un auto-inscrit.', C.navy)}
        ${wfStep(4,'Admin','📚','Assigner un cours au professeur','Dans Admin → Cours → menu déroulant Professeur → sauvegarder.', C.navy)}
      </div>
      <div>
        ${wfStep(5,'Étudiant','🎓','Se connecter','Login avec les identifiants reçus → onglet Étudiant.', C.gold)}
        ${wfStep(6,'Étudiant','📝','S\'inscrire au cours','S\'inscrire aux Cours → filtrer DSI → cliquer S\'inscrire.', C.gold)}
        ${wfStep(7,'Professeur','👨‍🏫','Se connecter','Login avec identifiants → onglet Professeur.', C.blue)}
        ${wfStep(8,'Professeur','📊','Saisir les notes','Saisie des Notes → sélectionner le cours → entrer note → Sauvegarder.', C.blue)}
        ${wfStep(9,'Étudiant','🏆','Voir sa note','Mes Notes → la note apparaît avec mention et barre colorée.', C.green)}
      </div>
    </div>

    <div style="margin-top:14px;background:${C.navy};border-radius:10px;padding:16px;display:flex;align-items:center;gap:16px;">
      <div style="font-size:28px;">🎯</div>
      <div>
        <div style="font-size:14px;font-weight:700;color:${C.goldLt};">Résultat attendu</div>
        <div style="font-size:12px;color:rgba(255,255,255,0.7);margin-top:4px;">L'étudiant voit sa note dans son tableau de bord. Le professeur voit l'étudiant dans "Mes Étudiants". L'admin voit toutes les statistiques à jour dans son tableau de bord.</div>
      </div>
    </div>
    ${footer('Workflow Complet', 18)}
  `);

  // ══════════════════════════════════════════════════════════════
  //  PAGE 19 — PAGE FINALE
  // ══════════════════════════════════════════════════════════════
  const p19 = page(`
    <div style="position:absolute;inset:0;background:linear-gradient(160deg,${C.navy} 0%,#112240 60%,#0d1a34 100%);"></div>
    <div style="position:absolute;top:0;left:0;right:0;height:5px;background:linear-gradient(90deg,${C.gold},${C.goldLt},${C.gold});"></div>
    <div style="position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:270mm;text-align:center;padding:40px;">

      ${LOGO_B64 ? `<img src="${LOGO_B64}" style="height:80px;width:80px;object-fit:contain;margin-bottom:24px;opacity:0.9;"/>` :
        `<div style="width:70px;height:70px;border-radius:50%;background:linear-gradient(135deg,${C.gold},${C.goldLt});display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:900;color:${C.navy};margin-bottom:24px;">UPH</div>`}

      <div style="font-size:28px;margin-bottom:16px;">🎓</div>
      <h2 style="font-size:26px;font-weight:700;color:white;margin:0 0 12px;">Merci de votre confiance</h2>
      <div style="width:60px;height:2px;background:${C.gold};border-radius:1px;margin:0 auto 16px;"></div>
      <p style="font-size:15px;color:rgba(255,255,255,0.65);max-width:500px;line-height:1.7;margin:0 0 40px;">
        La Plateforme Universitaire UPH a été conçue pour moderniser et simplifier la gestion académique de l'Université Polyvalente d'Haïti. Notre équipe reste disponible pour tout support technique.
      </p>

      <div style="background:rgba(201,168,76,0.15);border:1px solid rgba(201,168,76,0.3);border-radius:14px;padding:28px 40px;max-width:460px;margin-bottom:40px;">
        <div style="font-size:22px;font-weight:800;color:${C.goldLt};margin-bottom:6px;">FlexxNetwork</div>
        <div style="font-size:13px;color:rgba(255,255,255,0.5);margin-bottom:20px;letter-spacing:1px;">DÉVELOPPEMENT & SUPPORT TECHNIQUE</div>
        <div style="display:flex;flex-direction:column;gap:8px;text-align:left;">
          <div style="font-size:13px;color:rgba(255,255,255,0.7);">📧 &nbsp;giletkenson@gmail.com</div>
          <div style="font-size:13px;color:rgba(255,255,255,0.7);">🌍 &nbsp;Haïti / International</div>
          <div style="font-size:13px;color:rgba(255,255,255,0.7);">💻 &nbsp;Plateforme : http://2.24.113.4:3000</div>
        </div>
      </div>

      <div style="display:flex;gap:24px;justify-content:center;flex-wrap:wrap;">
        <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:10px 18px;font-size:12px;color:rgba(255,255,255,0.5);">Version 1.0 — 2026</div>
        <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:10px 18px;font-size:12px;color:rgba(255,255,255,0.5);">Session 2025–2026</div>
        <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:10px 18px;font-size:12px;color:rgba(255,255,255,0.5);">Confidentiel UPH</div>
      </div>
    </div>
    <div style="position:absolute;bottom:0;left:0;right:0;height:4px;background:linear-gradient(90deg,${C.gold},${C.goldLt},${C.gold});"></div>
  `, C.navy, '0');

  // ── Assemble HTML ──────────────────────────────────────────────
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width">
<title>Guide Professionnel UPH</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #f0f0f0; font-family: 'Segoe UI', Arial, sans-serif; }
  @page { size: A4; margin: 0; }
  @media print {
    body { background: white; }
    .no-print { display: none !important; }
  }
</style>
</head>
<body>
${p1}${p2}${p3}${p4}${p5}${p6}${p7}${p8}${p9}${p10}${p11}${p12}${p13}${p14}${p15}${p16}${p17}${p18}${p19}
</body>
</html>`;
}

// ─── Run ──────────────────────────────────────────────────────
main().catch(err => {
  console.error('\n❌ Fatal error:', err.message);
  process.exit(1);
});
