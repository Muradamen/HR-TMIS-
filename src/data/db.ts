import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  Trader,
  TraderType,
  TraderStatus,
  Woreda,
  Kebele,
  User,
  LegalTraderDetails,
  InformalTraderDetails,
  AuditLog,
} from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../../data');
const STORE_PATH = path.join(DATA_DIR, 'tmis_store.json');

export const woredas: Woreda[] = [
  { id: 1, name: 'Amir Nur', code: 'AN', is_active: true },
  { id: 2, name: 'Abadir', code: 'AB', is_active: true },
  { id: 3, name: 'Shenkor', code: 'SH', is_active: true },
  { id: 4, name: "Jin'Eala", code: 'JN', is_active: true },
  { id: 5, name: 'Hakim', code: 'HK', is_active: true },
  { id: 6, name: 'Dire Teyara', code: 'DT', is_active: true },
  { id: 7, name: 'Erer', code: 'ER', is_active: true },
  { id: 8, name: 'Sofi', code: 'SF', is_active: true },
  { id: 9, name: 'Awumer', code: 'AW', is_active: true },
];

export const kebeles: Kebele[] = [
  { id: 101, woreda_id: 1, name: 'Kebele 01 (Harar Jugol)', code: 'AN-01', is_active: true },
  { id: 102, woreda_id: 1, name: 'Kebele 02 (Shoa Gate)', code: 'AN-02', is_active: true },
  { id: 103, woreda_id: 1, name: 'Kebele 03 (Erer Gate)', code: 'AN-03', is_active: true },

  { id: 201, woreda_id: 2, name: 'Kebele 01 (Ras Hotel Area)', code: 'AB-01', is_active: true },
  { id: 202, woreda_id: 2, name: 'Kebele 02 (Stadium Area)', code: 'AB-02', is_active: true },

  { id: 301, woreda_id: 3, name: 'Kebele 01 (Shenkor Central)', code: 'SH-01', is_active: true },
  { id: 302, woreda_id: 3, name: 'Kebele 02 (Botte)', code: 'SH-02', is_active: true },

  { id: 401, woreda_id: 4, name: "Kebele 01 (Jin'Eala North)", code: 'JN-01', is_active: true },
  { id: 402, woreda_id: 4, name: "Kebele 02 (Gidir Magala)", code: 'JN-02', is_active: true },

  { id: 501, woreda_id: 5, name: 'Kebele 01 (Hakim Summit)', code: 'HK-01', is_active: true },
  { id: 502, woreda_id: 5, name: 'Kebele 02 (Arategna)', code: 'HK-02', is_active: true },

  { id: 601, woreda_id: 6, name: 'Kebele 01 (Dire Teyara Rural)', code: 'DT-01', is_active: true },
  { id: 701, woreda_id: 7, name: 'Kebele 01 (Erer Valley)', code: 'ER-01', is_active: true },
  { id: 801, woreda_id: 8, name: 'Kebele 01 (Sofi Agro Market)', code: 'SF-01', is_active: true },
  { id: 901, woreda_id: 9, name: 'Kebele 01 (Awumer Center)', code: 'AW-01', is_active: true },
];

export const users: User[] = [
  {
    id: 1,
    username: 'encoder',
    password: 'encoder12345',
    first_name: 'Dawit',
    last_name: 'Bekele',
    email: 'encoder@harar-trade.gov.et',
    role: 'DATA_ENCODER',
    is_active: true,
  },
  {
    id: 2,
    username: 'director',
    password: 'director12345',
    first_name: 'Tigist',
    last_name: 'Haile',
    email: 'director@harar-trade.gov.et',
    role: 'DIRECTOR_OF_TRADER_CONTROL',
    is_active: true,
  },
  {
    id: 3,
    username: 'admin',
    password: 'admin12345',
    first_name: 'Murad',
    last_name: 'Amen',
    email: 'admin@harar-trade.gov.et',
    role: 'ADMINISTRATOR',
    is_active: true,
  },
  {
    id: 4,
    username: 'leader',
    password: 'leader12345',
    first_name: 'Ambassador',
    last_name: 'Yusuf',
    email: 'leader@harar-trade.gov.et',
    role: 'AGENCY_LEADER',
    is_active: true,
  },
];

export let traders: Trader[] = [];
export let auditLogs: AuditLog[] = [];

// Load or seed persistent store
function initializeStore() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(STORE_PATH)) {
    try {
      const data = JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8'));
      if (Array.isArray(data.traders) && data.traders.length > 0) {
        traders = data.traders;
        auditLogs = data.auditLogs || [];
        return;
      }
    } catch (err) {
      console.warn('Could not parse existing store, reseeding default data:', err);
    }
  }

  // Seed default dataset with required states and HT-YYYY-000001 codes
  traders = [
    {
      id: 1,
      trader_code: 'HT-2026-000001',
      trader_type: 'LEGAL',
      status: 'APPROVED',
      registered_by: 'encoder',
      submitted_at: '2026-10-06T09:00:00Z',
      reviewed_by: 'director',
      reviewed_at: '2026-10-06T10:30:00Z',
      verified_by: 'director',
      verified_at: '2026-10-06T14:00:00Z',
      created_at: '2026-10-06T08:30:00Z',
      updated_at: '2026-10-06T14:00:00Z',
      legal_details: {
        trade_name: 'Jugol Heritage Spices & Coffee Trading PLC',
        owner_full_name: 'Ahmedin Ibrahim Mohammed',
        tin: '0054891243',
        trade_registration_number: 'HR-TR-2026-0842',
        trade_license_number: 'HR-LIC-2026-11940',
        gender: 'MALE',
        age: 38,
        region: 'Harari Region',
        woreda_id: 1,
        kebele_id: 101,
        house_number_plot_id: 'H-421/Jugol',
        business_sector: 'RETAIL_WHOLESALE_GOODS',
        trade_scale: 'WHOLESALE',
        business_ownership_type: 'PLC',
        issuing_institution: 'Harari Trade & Industry Development Bureau',
        date_of_issuance: '2026-02-15',
        data_entered_by: 'Dawit Bekele',
        remarks: 'Compliant with historical Jugol trade zoning bylaws.',
        officer_signature: 'Officer K. Tadesse',
        verification_date: '2026-02-16',
      },
    },
    {
      id: 2,
      trader_code: 'HT-2026-000002',
      trader_type: 'INFORMAL',
      status: 'SUBMITTED',
      registered_by: 'encoder',
      submitted_at: '2026-10-07T11:15:00Z',
      created_at: '2026-10-07T10:45:00Z',
      updated_at: '2026-10-07T11:15:00Z',
      informal_details: {
        full_name: 'Fatuma Ahmed Ali',
        gender: 'FEMALE',
        age: 29,
        national_id_resident_id: 'ET-HR-2024-99812',
        phone_number: '+251 91 523 4819',
        region: 'Harari Region',
        woreda_id: 4,
        kebele_id: 402,
        specific_location_market_area: 'Gidir Magala (Open Vegetable Section, Stall 14)',
        nature_of_trade_activity: 'STREET_VENDING_OPEN_MARKET',
        estimated_capital_assets: 45000.0,
        reason_for_operating_informally: 'LACK_OF_CAPITAL',
        enumerator_data_collector_name: 'Dawit Bekele',
        date_of_assessment: '2026-10-07',
        formalization_status_recommendation: 'READY_FOR_TIN_MICRO_ENTERPRISE',
      },
    },
    {
      id: 3,
      trader_code: 'HT-2026-000003',
      trader_type: 'INFORMAL',
      status: 'UNDER_REVIEW',
      registered_by: 'encoder',
      submitted_at: '2026-10-07T14:20:00Z',
      reviewed_by: 'director',
      reviewed_at: '2026-10-07T15:00:00Z',
      created_at: '2026-10-07T13:30:00Z',
      updated_at: '2026-10-07T15:00:00Z',
      informal_details: {
        full_name: 'Ali Hassan Omer',
        gender: 'MALE',
        age: 34,
        national_id_resident_id: 'ET-HR-2023-44102',
        phone_number: '+251 91 255 4433',
        region: 'Harari Region',
        woreda_id: 1,
        kebele_id: 102,
        specific_location_market_area: 'Shoa Gate Pedestrian Trade Corridor',
        nature_of_trade_activity: 'PETTY_RETAIL',
        estimated_capital_assets: 28000.0,
        reason_for_operating_informally: 'COMPLEX_BUREAUCRACY',
        enumerator_data_collector_name: 'Dawit Bekele',
        date_of_assessment: '2026-10-07',
        formalization_status_recommendation: 'NEEDS_AWARENESS_LEGAL_SUPPORT',
      },
    },
    {
      id: 4,
      trader_code: 'HT-2026-000004',
      trader_type: 'LEGAL',
      status: 'DRAFT',
      registered_by: 'encoder',
      created_at: '2026-10-08T01:10:00Z',
      updated_at: '2026-10-08T01:10:00Z',
      legal_details: {
        trade_name: 'Harar Coffee Roasters & Export Union',
        owner_full_name: 'Merwan Abdulkerim',
        tin: '0071239841',
        trade_registration_number: 'HR-TR-2026-1049',
        trade_license_number: 'HR-LIC-2026-12001',
        gender: 'MALE',
        age: 42,
        region: 'Harari Region',
        woreda_id: 2,
        kebele_id: 201,
        house_number_plot_id: 'Ras Hotel Commercial Strip, No 8',
        business_sector: 'AGRICULTURE_AGRO_PROCESSING',
        trade_scale: 'WHOLESALE',
        business_ownership_type: 'ASSOCIATION_COOPERATIVE',
        issuing_institution: 'Harari Trade & Industry Development Bureau',
        date_of_issuance: '2026-03-01',
        data_entered_by: 'Dawit Bekele',
        remarks: 'Draft pending tax clearance certificate copy.',
        officer_signature: '',
      },
    },
    {
      id: 5,
      trader_code: 'HT-2026-000005',
      trader_type: 'INFORMAL',
      status: 'NEEDS_CORRECTION',
      registered_by: 'encoder',
      submitted_at: '2026-10-07T16:00:00Z',
      reviewed_by: 'director',
      reviewed_at: '2026-10-07T17:30:00Z',
      correction_notes: 'Missing resident national identification number. Please re-interview vendor to obtain Fayda ID or Kebele resident certificate.',
      created_at: '2026-10-07T15:45:00Z',
      updated_at: '2026-10-07T17:30:00Z',
      informal_details: {
        full_name: 'Zahra Kedir Usman',
        gender: 'FEMALE',
        age: 26,
        national_id_resident_id: '',
        phone_number: '+251 94 881 9022',
        region: 'Harari Region',
        woreda_id: 3,
        kebele_id: 301,
        specific_location_market_area: 'Shenkor Central Taxi Station',
        nature_of_trade_activity: 'HANDCRAFT_INFORMAL_PRODUCTION',
        estimated_capital_assets: 18500.0,
        reason_for_operating_informally: 'LACK_OF_CAPITAL',
        enumerator_data_collector_name: 'Dawit Bekele',
        date_of_assessment: '2026-10-07',
        formalization_status_recommendation: 'FOLLOW_UP_REQUIRED',
      },
    },
  ];

  auditLogs = [
    {
      id: 1,
      action: 'SYSTEM_BOOTSTRAP',
      target_id: 'SYSTEM',
      user: 'admin',
      ip_address: '127.0.0.1',
      timestamp: '2026-10-06 08:00:00',
      details: 'System initialized with Harari administrative reference boundaries',
    },
    {
      id: 2,
      action: 'TRADER_SUBMITTED',
      target_id: 'HT-2026-000001',
      user: 'encoder',
      ip_address: '192.168.1.10',
      timestamp: '2026-10-06 09:00:00',
      details: 'Submitted Legal Trader: Jugol Heritage Spices & Coffee Trading PLC',
    },
    {
      id: 3,
      action: 'TRADER_APPROVED',
      target_id: 'HT-2026-000001',
      user: 'director',
      ip_address: '192.168.1.15',
      timestamp: '2026-10-06 14:00:00',
      details: 'Verified and approved trade license and TIN credentials',
    },
    {
      id: 4,
      action: 'CORRECTION_REQUESTED',
      target_id: 'HT-2026-000005',
      user: 'director',
      ip_address: '192.168.1.15',
      timestamp: '2026-10-07 17:30:00',
      details: 'Requested correction: Missing resident national identification number',
    },
  ];

  saveStore();
}

export function saveStore() {
  try {
    fs.writeFileSync(
      STORE_PATH,
      JSON.stringify({ traders, auditLogs }, null, 2),
      'utf-8'
    );
  } catch (err) {
    console.error('Failed to save store to disk:', err);
  }
}

// Generate next code in required HT-YYYY-000001 format
export function generateNextTraderCode(): string {
  const year = new Date().getFullYear();
  const prefix = `HT-${year}-`;
  
  let maxSeq = 0;
  for (const t of traders) {
    if (t.trader_code && t.trader_code.startsWith(prefix)) {
      const seqStr = t.trader_code.substring(prefix.length);
      const seqNum = parseInt(seqStr, 10);
      if (!isNaN(seqNum) && seqNum > maxSeq) {
        maxSeq = seqNum;
      }
    }
  }

  const nextSeq = maxSeq + 1;
  return `${prefix}${String(nextSeq).padStart(6, '0')}`;
}

export function getWoredaById(id: number): Woreda | undefined {
  return woredas.find((w) => w.id === id);
}

export function getKebeleById(id: number): Kebele | undefined {
  return kebeles.find((k) => k.id === id);
}

export function getKebelesByWoreda(woredaId: number): Kebele[] {
  return kebeles.filter((k) => k.woreda_id === woredaId);
}

// Validate that Kebele strictly belongs to the specified Woreda
export function validateLocation(woredaId: number, kebeleId: number): boolean {
  const woreda = getWoredaById(woredaId);
  const kebele = getKebeleById(kebeleId);
  if (!woreda || !kebele) return false;
  return kebele.woreda_id === woreda.id;
}

export function authenticateUser(username: string, password: string): User | null {
  const u = users.find(
    (user) =>
      user.username.toLowerCase() === username.toLowerCase().trim() &&
      user.password === password
  );
  return u || null;
}

export function getUserById(id: number): User | undefined {
  return users.find((u) => u.id === id);
}

export function getUserByUsername(username: string): User | undefined {
  return users.find((u) => u.username.toLowerCase() === username.toLowerCase());
}

export function getAllTraders(filters?: {
  query?: string;
  type?: string;
  status?: string;
  woreda_id?: number;
  kebele_id?: number;
  sector?: string;
}): Array<Trader & { woredaName?: string; kebeleName?: string; displayName?: string }> {
  let list = [...traders];

  if (filters?.type && filters.type !== 'ALL') {
    list = list.filter((t) => t.trader_type === filters.type);
  }

  if (filters?.status && filters.status !== 'ALL') {
    list = list.filter((t) => t.status === filters.status);
  }

  if (filters?.woreda_id) {
    list = list.filter((t) => {
      const wId = t.legal_details?.woreda_id ?? t.informal_details?.woreda_id;
      return wId === filters.woreda_id;
    });
  }

  if (filters?.kebele_id) {
    list = list.filter((t) => {
      const kId = t.legal_details?.kebele_id ?? t.informal_details?.kebele_id;
      return kId === filters.kebele_id;
    });
  }

  if (filters?.sector && filters.sector !== 'ALL') {
    list = list.filter((t) => {
      if (t.trader_type === 'LEGAL') {
        return t.legal_details?.business_sector === filters.sector;
      }
      return t.informal_details?.nature_of_trade_activity === filters.sector;
    });
  }

  if (filters?.query) {
    const q = filters.query.toLowerCase().trim();
    list = list.filter((t) => {
      const code = t.trader_code.toLowerCase();
      const tradeName = t.legal_details?.trade_name?.toLowerCase() || '';
      const ownerName = t.legal_details?.owner_full_name?.toLowerCase() || '';
      const informalName = t.informal_details?.full_name?.toLowerCase() || '';
      const tin = t.legal_details?.tin?.toLowerCase() || '';
      const phone = t.informal_details?.phone_number?.toLowerCase() || '';
      const lic = t.legal_details?.trade_license_number?.toLowerCase() || '';

      return (
        code.includes(q) ||
        tradeName.includes(q) ||
        ownerName.includes(q) ||
        informalName.includes(q) ||
        tin.includes(q) ||
        phone.includes(q) ||
        lic.includes(q)
      );
    });
  }

  return list.map((t) => {
    const woredaId = t.legal_details?.woreda_id ?? t.informal_details?.woreda_id;
    const kebeleId = t.legal_details?.kebele_id ?? t.informal_details?.kebele_id;
    const woreda = woredaId ? getWoredaById(woredaId) : undefined;
    const kebele = kebeleId ? getKebeleById(kebeleId) : undefined;
    const displayName =
      t.trader_type === 'LEGAL'
        ? `${t.legal_details?.trade_name} (${t.legal_details?.owner_full_name})`
        : t.informal_details?.full_name || 'N/A';

    return {
      ...t,
      woredaName: woreda?.name || 'N/A',
      kebeleName: kebele?.name || 'N/A',
      displayName,
    };
  });
}

export function getTraderByCode(code: string): (Trader & { woredaName?: string; kebeleName?: string }) | undefined {
  const trader = traders.find((t) => t.trader_code.toUpperCase() === code.toUpperCase().trim());
  if (!trader) return undefined;

  const woredaId = trader.legal_details?.woreda_id ?? trader.informal_details?.woreda_id;
  const kebeleId = trader.legal_details?.kebele_id ?? trader.informal_details?.kebele_id;
  const woreda = woredaId ? getWoredaById(woredaId) : undefined;
  const kebele = kebeleId ? getKebeleById(kebeleId) : undefined;

  return {
    ...trader,
    woredaName: woreda?.name,
    kebeleName: kebele?.name,
  };
}

export function createLegalTrader(
  details: LegalTraderDetails,
  registeredBy: string,
  isDraft: boolean,
  ipAddress: string
): Trader {
  const id = traders.length > 0 ? Math.max(...traders.map((t) => t.id)) + 1 : 1;
  const traderCode = generateNextTraderCode();
  const now = new Date().toISOString();
  const status: TraderStatus = isDraft ? 'DRAFT' : 'SUBMITTED';

  const newTrader: Trader = {
    id,
    trader_code: traderCode,
    trader_type: 'LEGAL',
    status,
    registered_by: registeredBy,
    submitted_at: isDraft ? undefined : now,
    created_at: now,
    updated_at: now,
    legal_details: details,
  };

  traders.unshift(newTrader);
  logAudit(
    isDraft ? 'TRADER_DRAFT_CREATED' : 'TRADER_SUBMITTED',
    traderCode,
    registeredBy,
    ipAddress,
    `Registered Legal Trader (${status}): ${details.trade_name} (Owner: ${details.owner_full_name})`
  );
  saveStore();
  return newTrader;
}

export function createInformalTrader(
  details: InformalTraderDetails,
  registeredBy: string,
  isDraft: boolean,
  ipAddress: string
): Trader {
  const id = traders.length > 0 ? Math.max(...traders.map((t) => t.id)) + 1 : 1;
  const traderCode = generateNextTraderCode();
  const now = new Date().toISOString();
  const status: TraderStatus = isDraft ? 'DRAFT' : 'SUBMITTED';

  const newTrader: Trader = {
    id,
    trader_code: traderCode,
    trader_type: 'INFORMAL',
    status,
    registered_by: registeredBy,
    submitted_at: isDraft ? undefined : now,
    created_at: now,
    updated_at: now,
    informal_details: details,
  };

  traders.unshift(newTrader);
  logAudit(
    isDraft ? 'TRADER_DRAFT_CREATED' : 'TRADER_SUBMITTED',
    traderCode,
    registeredBy,
    ipAddress,
    `Registered Informal Trader (${status}): ${details.full_name} (${details.specific_location_market_area})`
  );
  saveStore();
  return newTrader;
}

// Strict Workflow Finite State Machine & Self-Approval Prevention
export function executeWorkflowTransition(
  traderCode: string,
  targetStatus: TraderStatus,
  user: User,
  ipAddress: string,
  notes?: string
): { success: boolean; message?: string } {
  const trader = traders.find((t) => t.trader_code === traderCode);
  if (!trader) {
    return { success: false, message: 'Trader not found.' };
  }

  const currentStatus = trader.status;

  // 1. SELF-APPROVAL CHECK (CRITICAL SECURITY INVARIANT)
  if (targetStatus === 'APPROVED' && trader.registered_by.toLowerCase() === user.username.toLowerCase()) {
    return {
      success: false,
      message: 'SELF-APPROVAL PROHIBITED: Directors and officers cannot approve records they registered or submitted themselves. An independent review is required.',
    };
  }

  // 2. ROLE AUTHORIZATION CHECKS
  if (targetStatus === 'SUBMITTED') {
    // Only Creator or Admin can submit a draft or resubmit after correction
    if (user.role !== 'DATA_ENCODER' && user.role !== 'ADMINISTRATOR') {
      return { success: false, message: 'Only Data Encoders or Administrators can submit records for review.' };
    }
  }

  if (['UNDER_REVIEW', 'APPROVED', 'NEEDS_CORRECTION', 'REJECTED'].includes(targetStatus)) {
    // Only Director of Trader Control or Administrator can perform review actions
    if (user.role !== 'DIRECTOR_OF_TRADER_CONTROL' && user.role !== 'ADMINISTRATOR') {
      return { success: false, message: 'Only the Director of Trader Control or Administrator can review, approve, reject, or request corrections.' };
    }
  }

  if (targetStatus === 'ARCHIVED' && user.role !== 'ADMINISTRATOR') {
    return { success: false, message: 'Only Administrators can archive records.' };
  }

  // 3. ALLOWED STATE TRANSITION MATRIX
  const allowedTransitions: Record<TraderStatus, TraderStatus[]> = {
    DRAFT: ['SUBMITTED', 'ARCHIVED'],
    SUBMITTED: ['UNDER_REVIEW', 'NEEDS_CORRECTION', 'REJECTED', 'ARCHIVED'],
    UNDER_REVIEW: ['APPROVED', 'NEEDS_CORRECTION', 'REJECTED', 'ARCHIVED'],
    NEEDS_CORRECTION: ['SUBMITTED', 'ARCHIVED'],
    APPROVED: ['ARCHIVED'],
    REJECTED: ['ARCHIVED'],
    ARCHIVED: [],
  };

  if (!allowedTransitions[currentStatus]?.includes(targetStatus)) {
    return {
      success: false,
      message: `Invalid state transition from ${currentStatus} to ${targetStatus}.`,
    };
  }

  // Apply state change
  const now = new Date().toISOString();
  trader.status = targetStatus;
  trader.updated_at = now;

  if (targetStatus === 'SUBMITTED') {
    trader.submitted_at = now;
  } else if (targetStatus === 'UNDER_REVIEW') {
    trader.reviewed_by = user.username;
    trader.reviewed_at = now;
  } else if (targetStatus === 'APPROVED') {
    trader.verified_by = user.username;
    trader.verified_at = now;
  } else if (targetStatus === 'NEEDS_CORRECTION') {
    trader.correction_notes = notes || 'Additional documentation or corrections required.';
  } else if (targetStatus === 'REJECTED') {
    trader.rejection_reason = notes || 'Rejected by Director of Trader Control.';
  }

  logAudit(
    `WORKFLOW_${targetStatus}`,
    traderCode,
    user.username,
    ipAddress,
    `Transitioned status from ${currentStatus} to ${targetStatus}.${notes ? ` Notes: ${notes}` : ''}`
  );

  saveStore();
  return { success: true };
}

export function logAudit(
  action: string,
  targetId: string,
  user: string,
  ipAddress: string,
  details: string
) {
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
  auditLogs.unshift({
    id: auditLogs.length + 1,
    action,
    target_id: targetId,
    user,
    ip_address: ipAddress || '127.0.0.1',
    timestamp: now,
    details,
  });
  saveStore();
}

// Initialize on module load
initializeStore();
