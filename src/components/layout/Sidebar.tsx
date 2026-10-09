import React from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../i18n/context';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onOpenRegisterType: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  onOpenRegisterType,
}) => {
  const { currentUser, traders } = useApp();
  const { t } = useTranslation();

  const legalCount = traders.filter(t => t.traderType === 'LEGAL').length;
  const informalCount = traders.filter(t => t.traderType === 'INFORMAL').length;
  const pendingCount = traders.filter(t => ['PENDING', 'SUBMITTED', 'UNDER_REVIEW'].includes(t.status)).length;

  return (
    <aside className="app-sidebar shadow">
      {/* Brand */}
      <div className="app-sidebar-brand d-flex align-items-center gap-2">
        <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center" style={{ width: 34, height: 34 }}>
          <i className="bi bi-shop-window fs-6"></i>
        </div>
        <div style={{ lineHeight: 1.1 }}>
          <div className="text-white fw-bold tracking-wide">HR-TMIS</div>
          <small className="text-muted" style={{ fontSize: '0.68rem' }}>
            {t('brand.agency', 'Harari Region Trade Bureau')}
          </small>
        </div>
      </div>

      {/* User Info Bar */}
      <div className="p-3 border-bottom border-secondary border-opacity-25 d-flex align-items-center gap-2 bg-dark bg-opacity-25">
        <div className="rounded-circle bg-secondary d-flex align-items-center justify-content-center text-white" style={{ width: 36, height: 36 }}>
          <i className="bi bi-person-badge fs-5"></i>
        </div>
        <div className="overflow-hidden">
          <div className="text-white fw-semibold small text-truncate">{currentUser.fullName}</div>
          <div className="text-info text-truncate" style={{ fontSize: '0.72rem' }}>
            {t(`role.${currentUser.role}`, currentUser.role.replace(/_/g, ' '))}
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="sidebar-wrapper flex-grow-1 overflow-auto py-2">
        <ul className="nav flex-column">
          <li className="nav-header">{t('sidebar.mainMenu', 'Main Menu')}</li>

          {currentUser.role !== 'SYSTEM_ADMINISTRATOR' && (
<li className="nav-item">
            <button
              className={`nav-link w-100 text-start border-0 bg-transparent ${
                currentView === 'dashboard' ? 'active' : ''
              }`}
              onClick={() => onNavigate('dashboard')}
            >
              <i className="bi bi-speedometer2"></i>
              <span>{t('sidebar.dashboard', 'Dashboard Overview')}</span>
            </button>
          </li>
)}

          <li className="nav-header">{t('sidebar.traderMgmt', 'Trader Management')}</li>

          <li className="nav-item">
            <button
              className={`nav-link w-100 text-start border-0 bg-transparent justify-content-between ${
                currentView === 'traders-all' ? 'active' : ''
              }`}
              onClick={() => onNavigate('traders-all')}
            >
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-people-fill"></i>
                <span>{t('sidebar.allTraders', 'All Traders')}</span>
              </div>
              <span className="badge bg-secondary rounded-pill">{traders.length}</span>
            </button>
          </li>

          <li className="nav-item">
            <button
              className={`nav-link w-100 text-start border-0 bg-transparent justify-content-between ${
                currentView === 'traders-legal' ? 'active' : ''
              }`}
              onClick={() => onNavigate('traders-legal')}
            >
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-building-check text-success"></i>
                <span>{t('sidebar.legalTraders', 'Legal Traders')}</span>
              </div>
              <span className="badge bg-success bg-opacity-75 rounded-pill">{legalCount}</span>
            </button>
          </li>

          <li className="nav-item">
            <button
              className={`nav-link w-100 text-start border-0 bg-transparent justify-content-between ${
                currentView === 'traders-informal' ? 'active' : ''
              }`}
              onClick={() => onNavigate('traders-informal')}
            >
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-basket2-fill text-warning"></i>
                <span>{t('sidebar.informalTraders', 'Informal Traders')}</span>
              </div>
              <span className="badge bg-warning text-dark rounded-pill">{informalCount}</span>
            </button>
          </li>

          {currentUser.role === 'DIRECTOR' && (
<li className="nav-item">
            <button
              className={`nav-link w-100 text-start border-0 bg-transparent justify-content-between ${
                currentView === 'verification' ? 'active' : ''
              }`}
              onClick={() => onNavigate('verification')}
            >
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-shield-check text-info"></i>
                <span>{t('sidebar.verificationQueue', 'Verification Queue')}</span>
              </div>
              {pendingCount > 0 && (
                <span className="badge bg-danger rounded-pill">{pendingCount}</span>
              )}
            </button>
          </li>
)}

          {currentUser.role === 'DATA_ENCODER' && (
          <li className="nav-header">{t('sidebar.registrationActions', 'Registration Actions')}</li>

          <li className="nav-item">
            <button
              className="nav-link w-100 text-start border-0 bg-transparent"
              onClick={onOpenRegisterType}
            >
              <i className="bi bi-plus-circle-fill text-primary"></i>
              <span>{t('sidebar.registerNewTrader', 'Register New Trader')}</span>
            </button>
          </li>

          <li className="nav-item ps-3">
            <button
              className={`nav-link w-100 text-start border-0 bg-transparent small ${
                currentView === 'register-legal' ? 'active' : ''
              }`}
              onClick={() => onNavigate('register-legal')}
            >
              <i className="bi bi-file-earmark-plus"></i>
              <span>{t('sidebar.legalRegistration', 'Legal Registration')}</span>
            </button>
          </li>

          <li className="nav-item ps-3">
            <button
              className={`nav-link w-100 text-start border-0 bg-transparent small ${
                currentView === 'register-informal' ? 'active' : ''
              }`}
              onClick={() => onNavigate('register-informal')}
            >
              <i className="bi bi-file-earmark-person"></i>
              <span>{t('sidebar.informalAssessment', 'Informal Assessment')}</span>
            </button>
          </li>
          )}

          <li className="nav-header">{t('sidebar.adminReports', 'Administration & Reports')}</li>

          <li className="nav-item">
            <button
              className={`nav-link w-100 text-start border-0 bg-transparent ${
                currentView === 'locations' ? 'active' : ''
              }`}
              onClick={() => onNavigate('locations')}
            >
              <i className="bi bi-geo-alt-fill text-danger"></i>
              <span>{t('sidebar.harariLocations', 'Harari Locations')}</span>
            </button>
          </li>

          {currentUser.role !== 'SYSTEM_ADMINISTRATOR' && (
<li className="nav-item">
            <button
              className={`nav-link w-100 text-start border-0 bg-transparent ${
                currentView === 'reports' ? 'active' : ''
              }`}
              onClick={() => onNavigate('reports')}
            >
              <i className="bi bi-bar-chart-fill text-cyan"></i>
              <span>{t('sidebar.reportsAnalytics', 'Reports & Analytics')}</span>
            </button>
          </li>
)}

          {currentUser.role !== 'DATA_ENCODER' && (
<li className="nav-item">
            <button
              className={`nav-link w-100 text-start border-0 bg-transparent ${
                currentView === 'audit' ? 'active' : ''
              }`}
              onClick={() => onNavigate('audit')}
            >
              <i className="bi bi-journal-text text-secondary"></i>
              <span>{t('sidebar.auditTrail', 'Audit Trail')}</span>
            </button>
          </li>
)}
        </ul>
      </div>

      <div className="p-3 border-top border-secondary border-opacity-25 small text-muted text-center" style={{ fontSize: '0.75rem' }}>
        <div>{t('auth.headerTitle', 'Regional State of Harari')}</div>
        <div>{t('auth.agencyName', 'Trade & Industry Agency')}</div>
      </div>
    </aside>
  );
};
