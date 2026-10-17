import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  woredas,
  kebeles,
  traders,
  users,
  auditLogs,
  authenticateUser,
  getUserByUsername,
  getAllTraders,
  getTraderByCode,
  getKebelesByWoreda,
  validateLocation,
  createLegalTrader,
  createInformalTrader,
  executeWorkflowTransition,
  logAudit,
} from './src/data/db.js';
import { exportTradersToExcel, exportTraderCertificatePDF } from './src/services/exportService.js';
import { User, TraderStatus, UserRole } from './src/types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Setup Template Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Core Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser('ht-tmis-secret-key-2026'));

// Serve Static Assets
app.use('/static', express.static(path.join(__dirname, 'static')));

// Helper: Extract client IP address
function getClientIp(req: express.Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || '127.0.0.1';
}

// Global Authentication Middleware
function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const sessionUser = req.cookies.auth_session;
  if (sessionUser) {
    const user = getUserByUsername(sessionUser);
    if (user && user.is_active) {
      (req as any).user = user;
      res.locals.user = user;
    } else {
      res.clearCookie('auth_session');
    }
  }

  res.locals.flashMessage = req.query.flash ? decodeURIComponent(req.query.flash as string) : null;
  res.locals.flashError = req.query.error ? decodeURIComponent(req.query.error as string) : null;
  next();
}

app.use(authMiddleware);

// Middleware: Require Authenticated User
function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = (req as any).user;
  if (!user) {
    return res.redirect('/login');
  }
  next();
}

// Middleware: Require Specific Role(s)
function requireRole(...allowedRoles: UserRole[]) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const user = (req as any).user as User;
    if (!user) {
      return res.redirect('/login');
    }
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).render('login', {
        title: 'Access Forbidden',
        error: `Access Denied: Your role (${user.role.replace(/_/g, ' ')}) does not have permission to access this area.`,
      });
    }
    next();
  };
}

// ==========================================
// 1. ROOT & AUTHENTICATION ROUTES
// ==========================================

// Initial entry point: If not logged in, redirect to /login first!
app.get('/', (req, res) => {
  const user = (req as any).user;
  if (!user) {
    return res.redirect('/login');
  }
  res.redirect('/dashboard');
});

// Login Page
app.get('/login', (req, res) => {
  const user = (req as any).user;
  if (user) {
    return res.redirect('/dashboard');
  }
  res.render('login', {
    title: 'Login',
    error: req.query.error ? decodeURIComponent(req.query.error as string) : null,
    flashMessage: req.query.flash ? decodeURIComponent(req.query.flash as string) : null,
  });
});

// Login Action
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = authenticateUser(username, password);

  if (!user) {
    return res.status(401).render('login', {
      title: 'Login Failed',
      error: 'Invalid username or password. Please use the demo credentials below.',
    });
  }

  // Set session cookie
  res.cookie('auth_session', user.username, {
    httpOnly: true,
    maxAge: 8 * 60 * 60 * 1000, // 8 hours
    sameSite: 'lax',
  });

  logAudit('USER_LOGIN', 'SYSTEM', user.username, getClientIp(req), `User authenticated as ${user.role}`);

  // Redirect to dashboard according to role
  res.redirect('/dashboard');
});

// Quick Role / User Switcher (for easy verification testing)
app.get('/api/switch-user', (req, res) => {
  const targetUsername = req.query.user as string;
  const targetUser = getUserByUsername(targetUsername);
  if (targetUser) {
    res.cookie('auth_session', targetUser.username, {
      httpOnly: true,
      maxAge: 8 * 60 * 60 * 1000,
      sameSite: 'lax',
    });
  }
  res.redirect('/dashboard');
});

// Logout Action
app.get('/logout', (req, res) => {
  const user = (req as any).user;
  if (user) {
    logAudit('USER_LOGOUT', 'SYSTEM', user.username, getClientIp(req), 'User logged out');
  }
  res.clearCookie('auth_session');
  res.redirect('/login?flash=' + encodeURIComponent('You have been logged out successfully.'));
});

// ==========================================
// 2. DASHBOARD (ROLE-TAILORED)
// ==========================================

app.get('/dashboard', requireAuth, (req, res) => {
  const user = (req as any).user as User;
  const all = getAllTraders();

  const legalCount = all.filter((t) => t.trader_type === 'LEGAL').length;
  const informalCount = all.filter((t) => t.trader_type === 'INFORMAL').length;
  const draftCount = all.filter((t) => t.status === 'DRAFT').length;
  const submittedCount = all.filter((t) => t.status === 'SUBMITTED').length;
  const underReviewCount = all.filter((t) => t.status === 'UNDER_REVIEW').length;
  const approvedCount = all.filter((t) => t.status === 'APPROVED').length;
  const needsCorrectionCount = all.filter((t) => t.status === 'NEEDS_CORRECTION').length;
  const rejectedCount = all.filter((t) => t.status === 'REJECTED').length;

  const pendingReviewTraders = all.filter((t) =>
    ['SUBMITTED', 'UNDER_REVIEW', 'NEEDS_CORRECTION'].includes(t.status)
  );

  const woredaDistribution = woredas.map((w) => {
    const woredaTraders = all.filter(
      (t) => (t.legal_details?.woreda_id ?? t.informal_details?.woreda_id) === w.id
    );
    const woredaKebeles = kebeles.filter((k) => k.woreda_id === w.id);
    return {
      ...w,
      tradersCount: woredaTraders.length,
      kebelesCount: woredaKebeles.length,
    };
  });

  res.render('dashboard', {
    title: 'Dashboard',
    stats: {
      total: all.length,
      legal: legalCount,
      informal: informalCount,
      draft: draftCount,
      submitted: submittedCount,
      under_review: underReviewCount,
      approved: approvedCount,
      needs_correction: needsCorrectionCount,
      rejected: rejectedCount,
    },
    pendingReviewTraders,
    recentTraders: all,
    woredaDistribution,
  });
});

// ==========================================
// 3. TRADERS REGISTRY & SEARCH (WITH PAGINATION)
// ==========================================

app.get('/traders/', requireAuth, (req, res) => {
  const query = (req.query.query as string) || '';
  const type = (req.query.type as string) || 'ALL';
  const status = (req.query.status as string) || 'ALL';
  const sector = (req.query.sector as string) || 'ALL';
  const woreda_id = req.query.woreda_id ? Number(req.query.woreda_id) : undefined;
  const kebele_id = req.query.kebele_id ? Number(req.query.kebele_id) : undefined;

  const filteredTraders = getAllTraders({ query, type, status, woreda_id, kebele_id, sector });

  // Pagination (25 records per page standard)
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = 25;
  const totalCount = filteredTraders.length;
  const totalPages = Math.ceil(totalCount / limit);
  const paginatedTraders = filteredTraders.slice((page - 1) * limit, page * limit);

  // Preserve query string for pagination links
  const queryParams = new URLSearchParams();
  if (query) queryParams.set('query', query);
  if (type && type !== 'ALL') queryParams.set('type', type);
  if (status && status !== 'ALL') queryParams.set('status', status);
  if (sector && sector !== 'ALL') queryParams.set('sector', sector);
  if (woreda_id) queryParams.set('woreda_id', String(woreda_id));
  if (kebele_id) queryParams.set('kebele_id', String(kebele_id));

  res.render('traders/index', {
    title: 'Traders Registry',
    traders: paginatedTraders,
    woredas,
    totalCount,
    currentPage: page,
    totalPages,
    queryString: queryParams.toString(),
    paginationQuery: queryParams.toString(),
    filters: { query, type, status, woreda_id, kebele_id, sector },
  });
});

// ==========================================
// 4. EXCEL & PDF EXPORT ENDPOINTS
// ==========================================

// Excel Export (.xlsx)
app.get('/traders/export/excel', requireAuth, async (req, res) => {
  const user = (req as any).user as User;
  const query = (req.query.query as string) || '';
  const type = (req.query.type as string) || 'ALL';
  const status = (req.query.status as string) || 'ALL';
  const sector = (req.query.sector as string) || 'ALL';
  const woreda_id = req.query.woreda_id ? Number(req.query.woreda_id) : undefined;
  const kebele_id = req.query.kebele_id ? Number(req.query.kebele_id) : undefined;

  const filteredTraders = getAllTraders({ query, type, status, woreda_id, kebele_id, sector });

  logAudit(
    'DATA_EXPORT_EXCEL',
    'REGISTRY',
    user.username,
    getClientIp(req),
    `Exported ${filteredTraders.length} trader records to Excel`
  );

  await exportTradersToExcel(filteredTraders, res);
});

// PDF Registry Report Export (.pdf)
app.get('/traders/export/pdf', requireAuth, (req, res) => {
  const query = (req.query.query as string) || '';
  const type = (req.query.type as string) || 'ALL';
  const status = (req.query.status as string) || 'ALL';
  const filteredTraders = getAllTraders({ query, type, status });
  const sample = filteredTraders[0];
  if (!sample) {
    return res.status(404).send('No records found to export to PDF');
  }
  exportTraderCertificatePDF(sample, res);
});

// PDF Single Certificate Export
app.get('/traders/:trader_code/export/pdf', requireAuth, (req, res) => {
  const trader = getTraderByCode(req.params.trader_code);
  if (!trader) {
    return res.status(404).send('Trader record not found');
  }
  exportTraderCertificatePDF(trader, res);
});

// ==========================================
// 5. REGISTRATION ROUTES (LEGAL & INFORMAL)
// ==========================================

// Step 1: Selection
app.get('/traders/register/', requireAuth, requireRole('DATA_ENCODER', 'ADMINISTRATOR'), (req, res) => {
  res.render('traders/register', { title: 'Register Trader' });
});

app.post('/traders/register/', requireAuth, requireRole('DATA_ENCODER', 'ADMINISTRATOR'), (req, res) => {
  const traderType = req.body.trader_type;
  if (traderType === 'LEGAL') {
    return res.redirect('/traders/register/legal/');
  } else if (traderType === 'INFORMAL') {
    return res.redirect('/traders/register/informal/');
  }
  res.redirect('/traders/register/');
});

// Legal Trader Form
app.get('/traders/register/legal/', requireAuth, requireRole('DATA_ENCODER', 'ADMINISTRATOR'), (req, res) => {
  res.render('traders/register_legal', {
    title: 'Register Legal Trader',
    woredas,
    error: null,
  });
});

app.post('/traders/register/legal/', requireAuth, requireRole('DATA_ENCODER', 'ADMINISTRATOR'), (req, res) => {
  const user = (req as any).user as User;
  const body = req.body;
  const woredaId = Number(body.woreda);
  const kebeleId = Number(body.kebele);

  // SERVER-SIDE LOCATION INTEGRITY CHECK
  if (!validateLocation(woredaId, kebeleId)) {
    return res.status(400).render('traders/register_legal', {
      title: 'Register Legal Trader',
      woredas,
      error: 'Location Integrity Violation: The selected Kebele does not belong to the selected Woreda.',
    });
  }

  const isDraft = body.submit_action === 'draft';
  const newTrader = createLegalTrader(
    {
      trade_name: body.trade_name || 'Unnamed Legal Trade',
      owner_full_name: body.owner_full_name || 'N/A',
      tin: body.tin || 'N/A',
      trade_registration_number: body.trade_registration_number || 'N/A',
      trade_license_number: body.trade_license_number || '',
      gender: body.gender || 'MALE',
      age: Number(body.age) || 30,
      region: 'Harari Region',
      woreda_id: woredaId,
      kebele_id: kebeleId,
      house_number_plot_id: body.house_number_plot_id || '',
      business_sector: body.business_sector || 'GENERAL_TRADE',
      trade_scale: body.trade_scale || 'RETAIL',
      business_ownership_type: body.business_ownership_type || 'SOLE_PROPRIETORSHIP',
      issuing_institution: body.issuing_institution || 'Harari Trade & Industry Development Bureau',
      date_of_issuance: body.date_of_issuance || new Date().toISOString().substring(0, 10),
      data_entered_by: body.data_entered_by || `${user.first_name} ${user.last_name}`,
      remarks: body.remarks || '',
      officer_signature: body.officer_signature || '',
      verification_date: body.verification_date || undefined,
    },
    user.username,
    isDraft,
    getClientIp(req)
  );

  const msg = encodeURIComponent(
    `Legal Trader ${newTrader.trader_code} successfully ${isDraft ? 'saved as Draft' : 'submitted for verification'}.`
  );
  res.redirect(`/traders/${newTrader.trader_code}/?flash=${msg}`);
});

// Informal Trader Form
app.get('/traders/register/informal/', requireAuth, requireRole('DATA_ENCODER', 'ADMINISTRATOR'), (req, res) => {
  res.render('traders/register_informal', {
    title: 'Register Informal Trader',
    woredas,
    error: null,
  });
});

app.post('/traders/register/informal/', requireAuth, requireRole('DATA_ENCODER', 'ADMINISTRATOR'), (req, res) => {
  const user = (req as any).user as User;
  const body = req.body;
  const woredaId = Number(body.woreda);
  const kebeleId = Number(body.kebele);

  // SERVER-SIDE LOCATION INTEGRITY CHECK
  if (!validateLocation(woredaId, kebeleId)) {
    return res.status(400).render('traders/register_informal', {
      title: 'Register Informal Trader',
      woredas,
      error: 'Location Integrity Violation: The selected Kebele does not belong to the selected Woreda.',
    });
  }

  const isDraft = body.submit_action === 'draft';
  const newTrader = createInformalTrader(
    {
      full_name: body.full_name || 'N/A',
      gender: body.gender || 'FEMALE',
      age: Number(body.age) || 25,
      national_id_resident_id: body.national_id_resident_id || '',
      phone_number: body.phone_number || '',
      region: 'Harari Region',
      woreda_id: woredaId,
      kebele_id: kebeleId,
      specific_location_market_area: body.specific_location_market_area || 'Market Area',
      nature_of_trade_activity: body.nature_of_trade_activity || 'STREET_VENDING_OPEN_MARKET',
      estimated_capital_assets: Number(body.estimated_capital_assets) || 0,
      reason_for_operating_informally: body.reason_for_operating_informally || 'LACK_OF_CAPITAL',
      enumerator_data_collector_name: body.enumerator_data_collector_name || `${user.first_name} ${user.last_name}`,
      date_of_assessment: body.date_of_assessment || new Date().toISOString().substring(0, 10),
      formalization_status_recommendation:
        body.formalization_status_recommendation || 'READY_FOR_TIN_MICRO_ENTERPRISE',
    },
    user.username,
    isDraft,
    getClientIp(req)
  );

  const msg = encodeURIComponent(
    `Informal Trader ${newTrader.trader_code} successfully ${isDraft ? 'saved as Draft' : 'submitted for verification'}.`
  );
  res.redirect(`/traders/${newTrader.trader_code}/?flash=${msg}`);
});

// ==========================================
// 6. TRADER DOSSIER & WORKFLOW TRANSITIONS
// ==========================================

// Detail Dossier View
app.get('/traders/:trader_code/', requireAuth, (req, res) => {
  const trader = getTraderByCode(req.params.trader_code);
  if (!trader) {
    return res.status(404).send('Trader record not found');
  }

  res.render('traders/detail', {
    title: `Trader ${trader.trader_code}`,
    trader,
    error: req.query.error ? decodeURIComponent(req.query.error as string) : null,
  });
});

// Workflow Transition Action (Enforces State Machine & Self-Approval Prevention)
app.post('/traders/:trader_code/transition', requireAuth, (req, res) => {
  const user = (req as any).user as User;
  const targetStatus = req.body.target_status as TraderStatus;
  const notes = req.body.notes as string;

  const result = executeWorkflowTransition(
    req.params.trader_code,
    targetStatus,
    user,
    getClientIp(req),
    notes
  );

  if (!result.success) {
    const err = encodeURIComponent(result.message || 'Workflow action rejected.');
    return res.redirect(`/traders/${req.params.trader_code}/?error=${err}`);
  }

  const msg = encodeURIComponent(`Workflow action completed: Status transitioned to ${targetStatus}.`);
  res.redirect(`/traders/${req.params.trader_code}/?flash=${msg}`);
});

// ==========================================
// 7. LOCATIONS, REPORTS & AUDIT TRAIL
// ==========================================

// Locations Directory
app.get('/locations/', requireAuth, (req, res) => {
  res.render('locations/index', {
    title: 'Locations - Woredas & Kebeles',
    woredas,
    kebeles,
  });
});

// Formalization Reports
app.get('/reports/', requireAuth, (req, res) => {
  const all = getAllTraders();
  const informal = all.filter((t) => t.trader_type === 'INFORMAL');

  const readyForTin = informal.filter(
    (t) => t.informal_details?.formalization_status_recommendation === 'READY_FOR_TIN_MICRO_ENTERPRISE'
  ).length;

  const needsAwareness = informal.filter(
    (t) => t.informal_details?.formalization_status_recommendation === 'NEEDS_AWARENESS_LEGAL_SUPPORT'
  ).length;

  const followUp = informal.filter(
    (t) => t.informal_details?.formalization_status_recommendation === 'FOLLOW_UP_REQUIRED'
  ).length;

  const totalInformalCapital = informal.reduce(
    (acc, t) => acc + (t.informal_details?.estimated_capital_assets || 0),
    0
  );
  const avgInformalCapital = informal.length > 0 ? totalInformalCapital / informal.length : 0;

  const woredaStats = woredas.map((w) => {
    const list = all.filter(
      (t) => (t.legal_details?.woreda_id ?? t.informal_details?.woreda_id) === w.id
    );
    return {
      name: w.name,
      code: w.code,
      kebelesCount: kebeles.filter((k) => k.woreda_id === w.id).length,
      legalCount: list.filter((t) => t.trader_type === 'LEGAL').length,
      informalCount: list.filter((t) => t.trader_type === 'INFORMAL').length,
      totalCount: list.length,
    };
  });

  res.render('reports/index', {
    title: 'Formalization Reports',
    recommendations: { readyForTin, needsAwareness, followUp },
    totalInformalCapital,
    avgInformalCapital,
    woredaStats,
  });
});

// Regulatory Audit Trail
app.get('/audit/', requireAuth, requireRole('ADMINISTRATOR', 'DIRECTOR_OF_TRADER_CONTROL', 'AGENCY_LEADER'), (req, res) => {
  res.render('audit/index', {
    title: 'Audit Trail',
    logs: auditLogs,
  });
});

// Dynamic Dependent Kebele API
app.get('/api/kebeles', (req, res) => {
  const woredaId = Number(req.query.woreda_id);
  if (!woredaId) return res.json([]);
  res.json(getKebelesByWoreda(woredaId));
});

// Admin shortcut
app.use('/admin', (req, res) => {
  res.redirect('/traders/');
});

// 404 Handler
app.use((req, res) => {
  res.status(404).send('Resource not found');
});

// Listen on 0.0.0.0:3000
app.listen(PORT, '0.0.0.0', () => {
  console.log(`HT-TMIS server running on http://0.0.0.0:${PORT}`);
});
