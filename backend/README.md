# HT-TMIS Backend (Django + PostgreSQL / SQLite3)

This directory contains the complete backend architecture for the **Harari People National Regional State - Trader Management Information System (HT-TMIS)**, fully integrated with **AdminLTE 4**, Bootstrap 5, and SQLite3 / PostgreSQL.

## Architecture & Directory Structure

```
backend/
├── apps/
│   ├── accounts/          # User authentication, roles (Encoder, Director, Admin, Leader), dashboard
│   ├── traders/           # Legal and Informal trader registry, state workflow machine, PDF/Excel export
│   ├── locations/         # Woredas and Kebeles hierarchy with dynamic cascading AJAX
│   ├── reports/           # Formalization analytics & Recharts visualization data
│   └── audit/             # Comprehensive immutable audit trail logging
├── config/
│   ├── settings.py        # Django configuration with iframe compatibility and security
│   ├── urls.py            # Root URL routing
│   ├── wsgi.py            # WSGI application entrypoint
│   └── asgi.py            # ASGI application entrypoint
├── templates/             # Complete AdminLTE 4 templates
│   ├── base.html          # AdminLTE 4 master layout with sidebar, navbar, and overlayscrollbars
│   ├── registration/      # Sign-in and authentication templates
│   ├── dashboard/         # Role-tailored metrics & quick actions
│   ├── traders/           # List, detail, registration forms (legal & informal)
│   ├── reports/           # Formalization reports with Recharts bar chart
│   ├── locations/         # Woredas and Kebeles management
│   └── audit/             # Audit logs and activity stream
├── static/                # Static assets (AdminLTE CSS, JS, Bootstrap Icons, Plugins)
├── data/                  # Seed datasets
├── deployment/            # Production Gunicorn, Nginx, and systemd service configurations
├── manage.py              # Django management utility
└── requirements.txt       # Python dependencies
```

## Running the Backend

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Run Database Migrations
```bash
python manage.py migrate
```

### 3. Seed Initial Data & Demo Accounts
```bash
python manage.py seed_tmis_data
```

### 4. Run the Development Server
```bash
python manage.py runserver 0.0.0.0:8000
```

### 5. Run Unit & Integration Test Suite
```bash
python manage.py test
```

## Demo Credentials & Role Access

| Role | Username | Password | Access Capabilities |
| :--- | :--- | :--- | :--- |
| **Data Encoder** | `encoder` | `encoder12345` | Register traders, edit drafts, submit for review |
| **Director of Trader Control** | `director` | `director12345` | Review, approve, reject, or request corrections |
| **Administrator** | `admin` | `admin12345` | Full system access, audit trail, user & location control |
| **Agency Leader** | `leader` | `leader12345` | Executive view, high-level analytics & reports |
