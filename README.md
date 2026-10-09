# HR-TMIS (Harari Region Trader Management Information System)

A web-based Trader Management Information System for the **Harari People National Regional State Trade & Industry Development Agency**.

## Features

- **Trader Registration**:
  - **Legal Trader Track**: Registration with Trade Name, Owner Name, TIN, Trade Registration Number, Business Sector, Scale (Wholesale/Retail), and Ownership type.
  - **Informal Trader Track**: Assessment with National ID, Market spot, Trade activity, Estimated working capital (ETB), and Formalization roadmap recommendations.
  - Auto-generated Trader Identification Number (`HTT-XXXXXX`).
- **Directorate Verification Workflow**:
  - Review pending applications with role-based actions.
  - Approve or Return with official justification and audit timestamps.
- **Harari Regional Administrative Units**:
  - Territorial hierarchy of 9 Regional Woredas (Amir Nur, Abadir, Shenkor, Jin'Eala, Aboker, Hakim, Sofi, Erer, Dire Teyyara) and their corresponding Kebeles.
- **Reporting & Formalization Analytics**:
  - Breakdown of formal vs. informal commercial sectors.
  - Formalization pipeline metrics (Ready for TIN & Micro-Enterprise, Needs Awareness, Follow-up Required).
  - Working capital evaluation and territorial distribution.
- **Official Documentation**:
  - Printable official Regional Registration Certificate / Dossier.
  - Export CSV of regional trader registry.
  - Full audit trail of registrations, updates, and directorate approvals.
- **Role-Based Profiles**:
  - Data Encoder, Director of Trader Control, Agency Leader, and System Administrator.

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **UI & Styling**: AdminLTE v4, Bootstrap 5, Bootstrap Icons
- **Runtime**: Node.js 22
