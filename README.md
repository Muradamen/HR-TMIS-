# HT-TMIS (Harari Region Trader Management Information System)

A web-based Trader Management Information System for the **Harari People National Regional State Trade & Industry Development Agency**.

## Architecture & Integration

- **Frontend**: React 19, TypeScript, Vite, AdminLTE v4, Bootstrap 5, Bootstrap Icons, OverlayScrollbars.
- **Backend**: Django 5.1.7, Django REST Framework 3.15, Session Authentication & CSRF protection, LocaleMiddleware.
- **Database**: PostgreSQL (with automatic SQLite fallback for dev/testing), Django ORM with transactions and integrity constraints.
- **Reporting & Exports**:
  - `openpyxl` for localized Excel (.xlsx) workbooks.
  - ReportLab with `FreeSerif` font supporting Ethiopic (Amharic) and Latin (English & Afaan Oromoo diacritics).
  - Localized CSV exports with UTF-8 BOM (`\uFEFF`) and spreadsheet formula injection protection.

## Multilingual Internationalization (Trilingual)

Full native support across three official regional languages:
- **English** (`en`)
- **Afaan Oromoo** (`om`)
- **Amharic / አማርኛ** (`am`)

- Controlled segmented buttons (`EN`, `OM`, `አማ`) and dropdown selectors.
- Synchronized with `django_language` cookie and `Accept-Language` headers.
- Canonical database values preserved, with localized presentation labels and standardized API error codes (`INVALID_WOREDA_KEBELE_COMBINATION`, `DUPLICATE_TIN`, `CONFLICT_OF_INTEREST`, etc.).

## Separation of Duties & Workflow

1. **Groups**:
   - `DATA_ENCODER`: Trader registration, assessments, and draft submissions.
   - `DIRECTOR_OF_TRADER_CONTROL`: Queue claims, verification review, approval, rejection, and return for correction. Self-approval is strictly blocked on the server.
   - `ADMINISTRATOR`: User and system management. Operational approval/rejection powers are denied.
   - `AGENCY_LEADER`: Regional reporting, compliance monitoring, and statistical analytics.

2. **Workflow States**:
   - `DRAFT` → `SUBMITTED` → `UNDER_REVIEW` → `APPROVED` / `NEEDS_CORRECTION` / `REJECTED` / `ARCHIVED`.

3. **Formalization Pipeline**:
   - Distinct from legal registration approval:
   - `NOT_ASSESSED`, `READY_FOR_FORMALIZATION`, `NEEDS_SUPPORT`, `FOLLOW_UP_REQUIRED`, `FORMALIZED`.

## Harari Administrative Locations

Official administrative hierarchy with strict server-side validation:
1. Amir Nur (`AN-01`)
2. Abadir (`AB-02`)
3. Shenkor (`SH-03`)
4. Jin'Eala (`JN-04`)
5. Aboker (`AK-05`)
6. Hakim (`HK-06`)
7. Sofi (`SF-07`)
8. Erer (`ER-08`)
9. Dire Teyyara (`DT-09`)

## Running the Application

### Development (Single Command)
```bash
npm run dev
```
Starts:
1. Django migrations & authoritative seed data
2. Django REST Framework API on `127.0.0.1:8001`
3. Vite dev server on `0.0.0.0:3000` with `/api` proxy

### Running Tests
```bash
# Automated Django integration test suite
npm run test:backend

# Frontend linting
npm run lint

# Production build
npm run build
```
