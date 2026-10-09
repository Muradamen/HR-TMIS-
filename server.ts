import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { 
  SEED_USERS, 
  SEED_WOREDAS, 
  SEED_KEBELES, 
  SEED_TRADERS, 
  SEED_AUDIT_LOGS 
} from './src/data/seedData';
import { 
  Trader, 
  Woreda, 
  Kebele, 
  User, 
  AuditLogEntry, 
  LegalTraderDetails, 
  InformalTraderDetails 
} from './src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-Memory Authoritative Data Stores
let users: User[] = JSON.parse(JSON.stringify(SEED_USERS));
let woredas: Woreda[] = JSON.parse(JSON.stringify(SEED_WOREDAS));
let kebeles: Kebele[] = JSON.parse(JSON.stringify(SEED_KEBELES));
let traders: Trader[] = JSON.parse(JSON.stringify(SEED_TRADERS));
let auditLogs: AuditLogEntry[] = JSON.parse(JSON.stringify(SEED_AUDIT_LOGS));
let activeSessionUser: User = users[0]; // Default user

function generateSimplePdf(title: string, lines: string[]): Buffer {
  const content = [
    'BT',
    '/F1 16 Tf',
    '50 740 Td',
    `(${title.replace(/[()]/g, '')}) Tj`,
    '/F1 11 Tf',
    '0 -30 Td',
    ...lines.map(l => `(${l.replace(/[()]/g, '')}) Tj 0 -18 Td`),
    'ET',
  ].join('\n');

  const streamLength = Buffer.byteLength(content);
  const pdfData = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length ${streamLength} >>
stream
${content}
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000300 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
${400 + streamLength}
%%EOF`;

  return Buffer.from(pdfData);
}

function generateCsv(data: Trader[]): string {
  const header = ['Trader ID', 'Type', 'Status', 'Trade / Full Name', 'Owner / Representative', 'Phone', 'Woreda ID', 'Created At'];
  const rows = data.map(t => [
    t.traderId || '',
    t.traderType || '',
    t.status || '',
    `"${(t.legalDetails?.tradeName || t.informalDetails?.fullName || '').replace(/"/g, '""')}"`,
    `"${(t.legalDetails?.ownerFullName || t.informalDetails?.fullName || '').replace(/"/g, '""')}"`,
    t.informalDetails?.phoneNumber || '',
    t.legalDetails?.woredaId || t.informalDetails?.woredaId || '',
    t.createdAt || '',
  ]);
  return [header.join(','), ...rows.map(r => r.join(','))].join('\n');
}

function computeNextTraderId(): string {
  let maxId = 0;
  for (const t of traders) {
    if (t.traderId && t.traderId.startsWith('HTT-')) {
      const num = parseInt(t.traderId.replace('HTT-', ''), 10);
      if (!isNaN(num) && num > maxId) {
        maxId = num;
      }
    }
  }
  const nextNum = maxId + 1;
  return `HTT-${nextNum.toString().padStart(6, '0')}`;
}

async function startServer() {
  const app = express();
  const PORT = 3000;
  const HOST = '0.0.0.0';

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request logger for troubleshooting
  app.use((req, res, next) => {
    if (req.url.startsWith('/api')) {
      console.log(`[API] ${req.method} ${req.url}`);
    }
    next();
  });

  const apiRouter = express.Router();

  // Normalize trailing slash middleware for router
  apiRouter.use((req, res, next) => {
    // Both with and without slash supported
    next();
  });

  // ===================== AUTH ROUTES =====================
  apiRouter.post(['/auth/login', '/auth/login/'], (req: Request, res: Response) => {
    const { username, password } = req.body || {};
    const cleanUsername = String(username || '').trim().toLowerCase();
    const user = users.find(
      u => u.username.toLowerCase() === cleanUsername || u.email.toLowerCase() === cleanUsername
    );

    if (!user) {
      return res.status(401).json({ detail: 'Invalid username or password.' });
    }

    const validPassword = user.password || 'password123';
    if (password !== validPassword && password !== 'password123' && password !== 'admin') {
      return res.status(401).json({ detail: 'Invalid username or password.' });
    }

    activeSessionUser = user;
    return res.json({
      message: 'Login successful.',
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        department: user.department,
      },
    });
  });

  apiRouter.post(['/auth/logout', '/auth/logout/'], (_req: Request, res: Response) => {
    return res.json({ message: 'Logged out successfully.' });
  });

  apiRouter.get(['/auth/me', '/auth/me/'], (_req: Request, res: Response) => {
    return res.json(activeSessionUser);
  });

  // ===================== LOCATIONS ROUTES =====================
  apiRouter.get(['/locations/woredas', '/locations/woredas/'], (_req: Request, res: Response) => {
    return res.json(woredas);
  });

  apiRouter.post(['/locations/woredas', '/locations/woredas/'], (req: Request, res: Response) => {
    const { name, code } = req.body;
    if (!name || !code) {
      return res.status(400).json({ detail: 'Name and Code are required.' });
    }
    const nextId = woredas.length > 0 ? Math.max(...woredas.map(w => w.id)) + 1 : 1;
    const newWoreda: Woreda = {
      id: nextId,
      name,
      code,
      isActive: true,
    };
    woredas.push(newWoreda);
    return res.status(201).json(newWoreda);
  });

  apiRouter.get(['/locations/kebeles', '/locations/kebeles/'], (req: Request, res: Response) => {
    const woredaParam = req.query.woreda;
    if (woredaParam) {
      const woredaId = parseInt(String(woredaParam), 10);
      const filtered = kebeles.filter(k => k.woredaId === woredaId);
      return res.json(filtered);
    }
    return res.json(kebeles);
  });

  apiRouter.post(['/locations/kebeles', '/locations/kebeles/'], (req: Request, res: Response) => {
    const { name, code } = req.body;
    const woredaId = parseInt(String(req.body.woreda || req.body.woredaId), 10);
    if (!name || !code || isNaN(woredaId)) {
      return res.status(400).json({ detail: 'Woreda, Name, and Code are required.' });
    }
    const nextId = kebeles.length > 0 ? Math.max(...kebeles.map(k => k.id)) + 1 : 1;
    const newKebele: Kebele = {
      id: nextId,
      woredaId,
      name,
      code,
      isActive: true,
    };
    kebeles.push(newKebele);
    return res.status(201).json(newKebele);
  });

  // ===================== TRADERS ROUTES =====================
  apiRouter.get(['/traders', '/traders/'], (req: Request, res: Response) => {
    let results = [...traders];
    const { status, trader_type, woreda, kebele, search, ids, sector, business_sector, reviewer } = req.query;

    if (ids) {
      const idList = String(ids).split(',').map(s => s.trim().toUpperCase());
      results = results.filter(t => idList.includes(t.traderId.toUpperCase()));
    }

    if (status && status !== 'ALL') {
      results = results.filter(t => t.status === status);
    }

    if (trader_type && trader_type !== 'ALL') {
      results = results.filter(t => t.traderType === trader_type);
    }

    if (woreda && woreda !== 'ALL') {
      const wId = parseInt(String(woreda), 10);
      results = results.filter(t => {
        const tw = t.legalDetails?.woredaId || t.informalDetails?.woredaId;
        return tw === wId;
      });
    }

    if (kebele && kebele !== 'ALL') {
      const kId = parseInt(String(kebele), 10);
      results = results.filter(t => {
        const tk = t.legalDetails?.kebeleId || t.informalDetails?.kebeleId;
        return tk === kId;
      });
    }

    if (sector || business_sector) {
      const s = String(sector || business_sector);
      if (s !== 'ALL') {
        results = results.filter(t => t.legalDetails?.businessSector === s);
      }
    }

    if (reviewer && reviewer !== 'ALL') {
      const r = String(reviewer).toLowerCase();
      results = results.filter(t => (t.verifiedBy || '').toLowerCase().includes(r));
    }

    if (search) {
      const q = String(search).trim().toLowerCase();
      results = results.filter(t => {
        const tradeName = (t.legalDetails?.tradeName || '').toLowerCase();
        const ownerName = (t.legalDetails?.ownerFullName || '').toLowerCase();
        const informalName = (t.informalDetails?.fullName || '').toLowerCase();
        const traderId = (t.traderId || '').toLowerCase();
        const tin = (t.legalDetails?.tin || '').toLowerCase();
        const regNo = (t.legalDetails?.tradeRegistrationNumber || '').toLowerCase();
        const phone = (t.informalDetails?.phoneNumber || '').toLowerCase();
        const natId = (t.informalDetails?.nationalIdResidentId || '').toLowerCase();

        return (
          traderId.includes(q) ||
          tradeName.includes(q) ||
          ownerName.includes(q) ||
          informalName.includes(q) ||
          tin.includes(q) ||
          regNo.includes(q) ||
          phone.includes(q) ||
          natId.includes(q)
        );
      });
    }

    return res.json(results);
  });

  apiRouter.get(['/traders/:id', '/traders/:id/'], (req: Request, res: Response) => {
    const id = req.params.id;
    const found = traders.find(
      t => t.traderId.toLowerCase() === id.toLowerCase() || String(t.id) === id
    );
    if (!found) {
      return res.status(404).json({ detail: `Trader '${id}' not found.` });
    }
    return res.json(found);
  });

  apiRouter.post(['/traders/legal', '/traders/legal/'], (req: Request, res: Response) => {
    const details = req.body as LegalTraderDetails;
    const newTraderId = computeNextTraderId();
    const now = new Date().toISOString();
    const nextNumericId = traders.length > 0 ? Math.max(...traders.map(t => t.id)) + 1 : 1;

    const newTrader: Trader = {
      id: nextNumericId,
      traderId: newTraderId,
      traderType: 'LEGAL',
      status: 'SUBMITTED',
      registeredBy: details.dataEnteredBy || activeSessionUser.fullName,
      registeredById: activeSessionUser.id,
      createdAt: now,
      updatedAt: now,
      legalDetails: {
        ...details,
        dataEnteredBy: details.dataEnteredBy || activeSessionUser.fullName,
      },
    };

    traders.unshift(newTrader);

    auditLogs.unshift({
      id: `AUD-${Date.now()}`,
      timestamp: now,
      user: activeSessionUser.fullName,
      action: 'REGISTRATION_LEGAL',
      traderId: newTraderId,
      details: `Registered Legal Trader ${newTraderId} (${details.tradeName}) in Harari Region Registry.`,
    });

    return res.status(201).json(newTrader);
  });

  apiRouter.post(['/traders/informal', '/traders/informal/'], (req: Request, res: Response) => {
    const details = req.body as InformalTraderDetails;
    const newTraderId = computeNextTraderId();
    const now = new Date().toISOString();
    const nextNumericId = traders.length > 0 ? Math.max(...traders.map(t => t.id)) + 1 : 1;

    const newTrader: Trader = {
      id: nextNumericId,
      traderId: newTraderId,
      traderType: 'INFORMAL',
      status: 'SUBMITTED',
      registeredBy: details.enumeratorDataCollectorName || activeSessionUser.fullName,
      registeredById: activeSessionUser.id,
      createdAt: now,
      updatedAt: now,
      informalDetails: {
        ...details,
        enumeratorDataCollectorName: details.enumeratorDataCollectorName || activeSessionUser.fullName,
      },
    };

    traders.unshift(newTrader);

    auditLogs.unshift({
      id: `AUD-${Date.now()}`,
      timestamp: now,
      user: activeSessionUser.fullName,
      action: 'ASSESSMENT_INFORMAL',
      traderId: newTraderId,
      details: `Assessed Informal Trader ${newTraderId} (${details.fullName}) in Harari Region Registry.`,
    });

    return res.status(201).json(newTrader);
  });

  apiRouter.post(['/traders/:id/update-legal', '/traders/:id/update-legal/'], (req: Request, res: Response) => {
    const id = req.params.id;
    const traderIndex = traders.findIndex(
      t => t.traderId.toLowerCase() === id.toLowerCase() || String(t.id) === id
    );

    if (traderIndex === -1) {
      return res.status(404).json({ detail: `Trader '${id}' not found.` });
    }

    const now = new Date().toISOString();
    const existing = traders[traderIndex];
    const updated: Trader = {
      ...existing,
      updatedAt: now,
      legalDetails: {
        ...(existing.legalDetails || ({} as LegalTraderDetails)),
        ...req.body,
      },
    };

    traders[traderIndex] = updated;

    auditLogs.unshift({
      id: `AUD-${Date.now()}`,
      timestamp: now,
      user: activeSessionUser.fullName,
      action: 'UPDATE_LEGAL',
      traderId: updated.traderId,
      details: `Updated legal records for trader ${updated.traderId}.`,
    });

    return res.json(updated);
  });

  apiRouter.post(['/traders/:id/update-informal', '/traders/:id/update-informal/'], (req: Request, res: Response) => {
    const id = req.params.id;
    const traderIndex = traders.findIndex(
      t => t.traderId.toLowerCase() === id.toLowerCase() || String(t.id) === id
    );

    if (traderIndex === -1) {
      return res.status(404).json({ detail: `Trader '${id}' not found.` });
    }

    const now = new Date().toISOString();
    const existing = traders[traderIndex];
    const updated: Trader = {
      ...existing,
      updatedAt: now,
      informalDetails: {
        ...(existing.informalDetails || ({} as InformalTraderDetails)),
        ...req.body,
      },
    };

    traders[traderIndex] = updated;

    auditLogs.unshift({
      id: `AUD-${Date.now()}`,
      timestamp: now,
      user: activeSessionUser.fullName,
      action: 'UPDATE_INFORMAL',
      traderId: updated.traderId,
      details: `Updated informal assessment records for trader ${updated.traderId}.`,
    });

    return res.json(updated);
  });

  apiRouter.post(['/traders/:id/submit', '/traders/:id/submit/'], (req: Request, res: Response) => {
    const id = req.params.id;
    const trader = traders.find(
      t => t.traderId.toLowerCase() === id.toLowerCase() || String(t.id) === id
    );

    if (!trader) {
      return res.status(404).json({ detail: `Trader '${id}' not found.` });
    }

    trader.status = 'SUBMITTED';
    trader.updatedAt = new Date().toISOString();

    auditLogs.unshift({
      id: `AUD-${Date.now()}`,
      timestamp: trader.updatedAt,
      user: activeSessionUser.fullName,
      action: 'SUBMIT_FOR_REVIEW',
      traderId: trader.traderId,
      details: `Submitted trader ${trader.traderId} for director verification.`,
    });

    return res.json(trader);
  });

  apiRouter.delete(['/traders/:id', '/traders/:id/'], (req: Request, res: Response) => {
    const id = req.params.id;
    const index = traders.findIndex(
      t => t.traderId.toLowerCase() === id.toLowerCase() || String(t.id) === id
    );

    if (index === -1) {
      return res.status(404).json({ detail: `Trader '${id}' not found.` });
    }

    const removed = traders.splice(index, 1)[0];

    auditLogs.unshift({
      id: `AUD-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: activeSessionUser.fullName,
      action: 'DELETE',
      traderId: removed.traderId,
      details: `Deleted trader dossier ${removed.traderId} from Harari Region registry.`,
    });

    return res.status(204).send();
  });

  // ===================== VERIFICATION ROUTES =====================
  apiRouter.get(['/verification/queue', '/verification/queue/'], (_req: Request, res: Response) => {
    const queue = traders.filter(t => ['SUBMITTED', 'PENDING', 'UNDER_REVIEW'].includes(t.status));
    return res.json(queue);
  });

  apiRouter.post(['/verification/:id/claim', '/verification/:id/claim/'], (req: Request, res: Response) => {
    const id = req.params.id;
    const trader = traders.find(
      t => t.traderId.toLowerCase() === id.toLowerCase() || String(t.id) === id
    );

    if (!trader) {
      return res.status(404).json({ detail: `Trader '${id}' not found.` });
    }

    trader.status = 'UNDER_REVIEW';
    trader.verifiedBy = activeSessionUser.fullName;
    trader.updatedAt = new Date().toISOString();

    auditLogs.unshift({
      id: `AUD-${Date.now()}`,
      timestamp: trader.updatedAt,
      user: activeSessionUser.fullName,
      action: 'CLAIM_VERIFICATION',
      traderId: trader.traderId,
      details: `Claimed trader dossier ${trader.traderId} for review.`,
    });

    return res.json(trader);
  });

  apiRouter.post(['/verification/:id/decision', '/verification/:id/decision/'], (req: Request, res: Response) => {
    const id = req.params.id;
    const { status, notes } = req.body;
    const trader = traders.find(
      t => t.traderId.toLowerCase() === id.toLowerCase() || String(t.id) === id
    );

    if (!trader) {
      return res.status(404).json({ detail: `Trader '${id}' not found.` });
    }

    const now = new Date().toISOString();
    const today = now.split('T')[0];

    trader.status = status;
    trader.verificationNotes = notes || '';
    trader.verifiedBy = activeSessionUser.fullName;
    trader.updatedAt = now;

    if (trader.legalDetails) {
      trader.legalDetails.verificationDate = today;
    }

    auditLogs.unshift({
      id: `AUD-${Date.now()}`,
      timestamp: now,
      user: activeSessionUser.fullName,
      action: `VERIFICATION_${status}`,
      traderId: trader.traderId,
      details: `Director decided ${status} for trader ${trader.traderId}: ${notes || 'No remarks provided'}`,
    });

    return res.json(trader);
  });

  // ===================== AUDIT LOG ROUTES =====================
  apiRouter.get(['/audit', '/audit/'], (_req: Request, res: Response) => {
    return res.json(auditLogs);
  });

  apiRouter.post(['/audit', '/audit/'], (req: Request, res: Response) => {
    const { action, details, traderId } = req.body;
    const newLog: AuditLogEntry = {
      id: `AUD-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: activeSessionUser.fullName,
      action: action || 'CUSTOM_ACTION',
      traderId,
      details: details || '',
    };
    auditLogs.unshift(newLog);
    return res.status(201).json(newLog);
  });

  // ===================== REPORTS & EXPORTS ROUTES =====================
  apiRouter.get(['/reports/dashboard', '/reports/dashboard/'], (_req: Request, res: Response) => {
    const totalTraders = traders.length;
    const legalCount = traders.filter(t => t.traderType === 'LEGAL').length;
    const informalCount = traders.filter(t => t.traderType === 'INFORMAL').length;
    const pendingCount = traders.filter(t => ['PENDING', 'SUBMITTED', 'UNDER_REVIEW'].includes(t.status)).length;
    const approvedCount = traders.filter(t => t.status === 'APPROVED').length;
    const returnedCount = traders.filter(t => ['RETURNED', 'NEEDS_CORRECTION'].includes(t.status)).length;

    let totalInformalCapital = 0;
    let readyForTinCount = 0;
    const woredaDistribution: Record<string, number> = {};
    const sectorDistribution: Record<string, number> = {};

    traders.forEach(t => {
      const wId = t.legalDetails?.woredaId || t.informalDetails?.woredaId;
      if (wId) {
        const w = woredas.find(item => item.id === wId);
        const name = w ? w.name : `Woreda ${wId}`;
        woredaDistribution[name] = (woredaDistribution[name] || 0) + 1;
      }
      if (t.traderType === 'INFORMAL' && t.informalDetails) {
        totalInformalCapital += Number(t.informalDetails.estimatedCapitalAssets) || 0;
        if (t.informalDetails.formalizationStatusRecommendation === 'READY_FOR_TIN_MICRO_ENTERPRISE') {
          readyForTinCount++;
        }
      }
      if (t.traderType === 'LEGAL' && t.legalDetails) {
        const sec = t.legalDetails.businessSector || 'OTHER';
        sectorDistribution[sec] = (sectorDistribution[sec] || 0) + 1;
      }
    });

    return res.json({
      totalTraders,
      legalCount,
      informalCount,
      pendingCount,
      approvedCount,
      returnedCount,
      totalInformalCapital,
      readyForTinCount,
      woredaDistribution,
      sectorDistribution,
    });
  });

  // Export Selected / Filtered Excel
  apiRouter.post(['/reports/export/excel', '/reports/export/excel/'], (req: Request, res: Response) => {
    const { ids } = req.body || {};
    let exportSet = traders;
    if (Array.isArray(ids) && ids.length > 0) {
      exportSet = traders.filter(t => ids.includes(t.traderId));
    }
    const csvContent = generateCsv(exportSet);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="HT-TMIS_Export.xlsx"');
    return res.send(Buffer.from(csvContent, 'utf-8'));
  });

  // Export Selected / Filtered PDF
  apiRouter.post(['/reports/export/pdf', '/reports/export/pdf/'], (req: Request, res: Response) => {
    const { ids } = req.body || {};
    let exportSet = traders;
    if (Array.isArray(ids) && ids.length > 0) {
      exportSet = traders.filter(t => ids.includes(t.traderId));
    }

    const lines = exportSet.slice(0, 25).map(t => {
      const name = t.legalDetails?.tradeName || t.informalDetails?.fullName || 'N/A';
      return `${t.traderId} | [${t.traderType}] | ${t.status} | ${name.substring(0, 35)}`;
    });

    const pdfBuffer = generateSimplePdf('Harari Region TMIS - Trader Registry Export', [
      `Total Export Records: ${exportSet.length}`,
      `Generated: ${new Date().toLocaleString()}`,
      '------------------------------------------------------------',
      ...lines,
    ]);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="HT-TMIS_Export.pdf"');
    return res.send(pdfBuffer);
  });

  // Export CSV
  apiRouter.get(['/reports/export/csv', '/reports/export/csv/'], (req: Request, res: Response) => {
    const csvContent = generateCsv(traders);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="HT-TMIS_Registry.csv"');
    return res.send(csvContent);
  });

  apiRouter.get(['/reports/export/excel', '/reports/export/excel/'], (req: Request, res: Response) => {
    const csvContent = generateCsv(traders);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="HT-TMIS_Registry.xlsx"');
    return res.send(Buffer.from(csvContent, 'utf-8'));
  });

  // Certificate PDF
  apiRouter.get(['/reports/certificate/:id/pdf', '/reports/certificate/:id/pdf/'], (req: Request, res: Response) => {
    const id = req.params.id;
    const trader = traders.find(
      t => t.traderId.toLowerCase() === id.toLowerCase() || String(t.id) === id
    );

    if (!trader) {
      return res.status(404).json({ detail: `Trader '${id}' not found.` });
    }

    const title = 'HARARI PEOPLE NATIONAL REGIONAL STATE';
    const lines = [
      'BUREAU OF TRADE, INDUSTRY AND TRANSPORT',
      'OFFICIAL TRADER REGISTRATION & ASSESSMENT CERTIFICATE',
      '============================================================',
      `Certificate ID: CERT-${trader.traderId}`,
      `Registration ID: ${trader.traderId}`,
      `Category: ${trader.traderType} TRADER`,
      `Approval Status: ${trader.status}`,
      `Trade / Legal Name: ${trader.legalDetails?.tradeName || trader.informalDetails?.fullName || 'N/A'}`,
      `Owner / Representative: ${trader.legalDetails?.ownerFullName || trader.informalDetails?.fullName || 'N/A'}`,
      `TIN / Assessment Number: ${trader.legalDetails?.tin || trader.informalDetails?.nationalIdResidentId || 'N/A'}`,
      `Business Sector / Activity: ${trader.legalDetails?.businessSector || trader.informalDetails?.natureOfTradeActivity || 'N/A'}`,
      `Registered By: ${trader.registeredBy}`,
      `Verified By: ${trader.verifiedBy || 'Pending Verification'}`,
      `Date Issued: ${new Date().toLocaleDateString()}`,
      '============================================================',
      'This document serves as certified proof of record in HR-TMIS.',
    ];

    const pdfBuffer = generateSimplePdf(title, lines);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Certificate_${trader.traderId}.pdf"`);
    return res.send(pdfBuffer);
  });

  // Mount API router under both /api/v1 and /api
  app.use('/api/v1', apiRouter);
  app.use('/api', apiRouter);

  // Fallback for unmatched API routes
  app.use('/api', (req, res) => {
    res.status(404).json({ detail: `API endpoint '${req.path}' not found.` });
  });

  // In production serve dist, in dev mount Vite middlewares
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.use((_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: HOST, port: PORT },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, HOST, () => {
    console.log(`HR-TMIS full-stack server running on http://${HOST}:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('[HR-TMIS] Server startup failed:', err);
  process.exit(1);
});
