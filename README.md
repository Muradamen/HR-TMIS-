# HT-TMIS (Harari Region Trader Management Information System)

A web-based Trader Management Information System for the **Harari People National Regional State Trade & Industry Development Agency**.

## Architecture & Integration

- **Frontend**: React 19, TypeScript, Vite, AdminLTE v4, Bootstrap 5, Bootstrap Icons, OverlayScrollbars.
- **Backend**: Django 5.1.7, Django REST Framework 3.15, Session Authentication & CSRF protection, LocaleMiddleware.
- **Database**: PostgreSQL in production; SQLite is permitted only for local development/testing when `DJANGO_DEBUG=True`. Production requires `DATABASE_URL`.
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

Official active administrative hierarchy: Region → Woreda → Kebele. Woreda is location/reference data, not a user or role.

1. Amir Nur (`AN-01`)
2. Abadir (`AB-02`)
3. Shenkor (`SH-03`)
4. Jin'Eala (`JN-04`)
5. Hakim (`HK-06`)
6. Sofi (`SF-07`)
7. Erer (`ER-08`)
8. Dire Teyara (`DT-09`)

Legacy Aboker records are retained for historical trader links but the Woreda is inactive in the current reference list.

## Running the Application

### Local development

Run Django and Vite in separate terminals. The React app calls Django through Vite's `/api` proxy; the Express/in-memory API has been removed.

**Terminal 1 — Django backend**
```bash
cd backend
# For local-only development, set DJANGO_DEBUG=True and DJANGO_SECRET_KEY in your environment.
python manage.py migrate
python manage.py runserver 127.0.0.1:8000
```

**Terminal 2 — React frontend**
```bash
npm install
npm run dev
```

Open `http://localhost:3000`. For a remote Django development server, set `DJANGO_API_PROXY_TARGET` to its URL before running Vite.

### Checks and tests

```bash
cd backend
python manage.py check
python manage.py makemigrations --check --dry-run
python manage.py test
```

Frontend checks:
```bash
npm run lint
npm run build
```

### Production deployment

- Configure a strong, private `DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS`, `DATABASE_URL`, `CORS_ALLOWED_ORIGINS`, and `CSRF_TRUSTED_ORIGINS`.
- Set `DJANGO_DEBUG=False`; production settings refuse to start without a secret key and database URL.
- Run Django migrations as a deployment step, then run Gunicorn behind NGINX.
- Run `npm run build`; serve the generated `dist/` directory as static files from NGINX.
- Configure NGINX to proxy `/api/` to Gunicorn. Do not run an Express backend or use the Vite preview server as the production application.
- Never commit real secrets, database passwords, or demo-account passwords.
