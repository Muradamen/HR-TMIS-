export type TraderType = 'LEGAL' | 'INFORMAL';

export type TraderStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'NEEDS_CORRECTION'
  | 'REJECTED'
  | 'ARCHIVED';

export type UserRole =
  | 'DATA_ENCODER'
  | 'DIRECTOR_OF_TRADER_CONTROL'
  | 'ADMINISTRATOR'
  | 'AGENCY_LEADER';

export interface User {
  id: number;
  username: string;
  password: string; // Stored securely
  first_name: string;
  last_name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
}

export interface Woreda {
  id: number;
  name: string;
  code: string;
  is_active: boolean;
}

export interface Kebele {
  id: number;
  woreda_id: number;
  name: string;
  code: string;
  is_active: boolean;
}

export interface LegalTraderDetails {
  trade_name: string;
  owner_full_name: string;
  tin: string;
  trade_registration_number: string;
  trade_license_number: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  age: number;
  region: string;
  woreda_id: number;
  kebele_id: number;
  house_number_plot_id: string;
  business_sector:
    | 'GENERAL_TRADE'
    | 'RETAIL_WHOLESALE_GOODS'
    | 'AGRICULTURE_AGRO_PROCESSING'
    | 'MANUFACTURING_PRODUCTION'
    | 'SERVICE_PROVIDER'
    | 'OTHER';
  trade_scale: 'WHOLESALE' | 'RETAIL';
  business_ownership_type:
    | 'SOLE_PROPRIETORSHIP'
    | 'PLC'
    | 'PARTNERSHIP'
    | 'ASSOCIATION_COOPERATIVE';
  issuing_institution: string;
  date_of_issuance: string;
  data_entered_by: string;
  remarks: string;
  officer_signature: string;
  verification_date?: string;
}

export interface InformalTraderDetails {
  full_name: string;
  gender: 'MALE' | 'FEMALE';
  age: number;
  national_id_resident_id: string;
  phone_number: string;
  region: string;
  woreda_id: number;
  kebele_id: number;
  specific_location_market_area: string;
  nature_of_trade_activity:
    | 'STREET_VENDING_OPEN_MARKET'
    | 'PETTY_RETAIL'
    | 'HANDCRAFT_INFORMAL_PRODUCTION'
    | 'OTHER';
  estimated_capital_assets: number;
  reason_for_operating_informally:
    | 'LACK_OF_CAPITAL'
    | 'COMPLEX_BUREAUCRACY'
    | 'TEMPORARY_SEASONAL_ACTIVITY'
    | 'OTHER';
  enumerator_data_collector_name: string;
  date_of_assessment: string;
  formalization_status_recommendation:
    | 'READY_FOR_TIN_MICRO_ENTERPRISE'
    | 'NEEDS_AWARENESS_LEGAL_SUPPORT'
    | 'FOLLOW_UP_REQUIRED';
}

export interface Trader {
  id: number;
  trader_code: string; // HT-YYYY-000001
  trader_type: TraderType;
  status: TraderStatus;
  registered_by: string;
  submitted_at?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  verified_by?: string;
  verified_at?: string;
  correction_notes?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  legal_details?: LegalTraderDetails;
  informal_details?: InformalTraderDetails;
}

export interface AuditLog {
  id: number;
  action: string;
  target_id: string;
  user: string;
  ip_address: string;
  timestamp: string;
  details: string;
}
