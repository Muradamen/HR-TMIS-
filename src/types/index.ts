export type TraderType = 'LEGAL' | 'INFORMAL';
export type TraderStatus = 
  | 'PENDING' 
  | 'APPROVED' 
  | 'RETURNED' 
  | 'DRAFT' 
  | 'SUBMITTED' 
  | 'UNDER_REVIEW' 
  | 'NEEDS_CORRECTION' 
  | 'REJECTED' 
  | 'ARCHIVED';

export type UserRole = 
  | 'SYSTEM_ADMINISTRATOR' 
  | 'DATA_ENCODER' 
  | 'DIRECTOR' 
  | 'AGENCY_LEADER';

export interface User {
  id: number;
  username: string;
  password?: string;
  fullName: string;
  email: string;
  role: UserRole;
  department: string;
}

export interface Woreda {
  id: number;
  name: string;
  code: string;
  isActive: boolean;
}

export interface Kebele {
  id: number;
  woredaId: number;
  name: string;
  code: string;
  isActive: boolean;
}

export interface LegalTraderDetails {
  tradeName: string;
  ownerFullName: string;
  tin: string;
  tradeRegistrationNumber: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  age: number;
  region: string;
  woredaId: number;
  kebeleId: number;
  houseNumberPlotId?: string;
  businessSector: 
    | 'GENERAL_TRADE'
    | 'RETAIL_WHOLESALE_GOODS'
    | 'AGRICULTURE_AGRO_PROCESSING'
    | 'MANUFACTURING_PRODUCTION'
    | 'SERVICE_PROVIDER'
    | 'OTHER';
  tradeScale: 'WHOLESALE' | 'RETAIL';
  businessOwnershipType: 
    | 'SOLE_PROPRIETORSHIP'
    | 'PLC'
    | 'PARTNERSHIP'
    | 'ASSOCIATION_COOPERATIVE';
  issuingInstitution: string;
  dateOfIssuance: string;
  dataEnteredBy: string;
  remarks?: string;
  officerSignature?: string;
  verificationDate?: string;
}

export interface InformalTraderDetails {
  fullName: string;
  gender: 'MALE' | 'FEMALE';
  age: number;
  nationalIdResidentId?: string;
  phoneNumber?: string;
  region: string;
  woredaId: number;
  kebeleId: number;
  specificLocationMarketArea: string;
  natureOfTradeActivity: 
    | 'STREET_VENDING_OPEN_MARKET'
    | 'PETTY_RETAIL'
    | 'HANDCRAFT_INFORMAL_PRODUCTION'
    | 'OTHER';
  estimatedCapitalAssets: number;
  reasonForOperatingInformally: 
    | 'LACK_OF_CAPITAL'
    | 'COMPLEX_BUREAUCRACY'
    | 'TEMPORARY_SEASONAL_ACTIVITY'
    | 'OTHER';
  enumeratorDataCollectorName: string;
  dateOfAssessment: string;
  formalizationStatusRecommendation: 
    | 'READY_FOR_TIN_MICRO_ENTERPRISE'
    | 'NEEDS_AWARENESS_LEGAL_SUPPORT'
    | 'FOLLOW_UP_REQUIRED';
}

export interface Trader {
  id: number;
  traderId: string; // HTT-000001
  traderType: TraderType;
  status: TraderStatus;
  registeredBy: string;
  registeredById: number;
  createdAt: string;
  updatedAt: string;
  legalDetails?: LegalTraderDetails;
  informalDetails?: InformalTraderDetails;
  verificationNotes?: string;
  verifiedBy?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  traderId?: string;
  details: string;
}
