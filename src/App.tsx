import React, { useState } from 'react';
import { useApp } from './context/AppContext';
import { useTranslation } from './i18n/context';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { Footer } from './components/layout/Footer';
import { Dashboard } from './components/dashboard/Dashboard';
import { TradersList } from './components/traders/TradersList';
import { RegisterTypeModal } from './components/traders/RegisterTypeModal';
import { RegisterLegalForm } from './components/traders/RegisterLegalForm';
import { RegisterInformalForm } from './components/traders/RegisterInformalForm';
import { TraderDetail } from './components/traders/TraderDetail';
import { TraderCertificateModal } from './components/traders/TraderCertificateModal';
import { LocationsView } from './components/locations/LocationsView';
import { ReportsView } from './components/reports/ReportsView';
import { AuditLogView } from './components/audit/AuditLogView';
import { LoginPage } from './components/auth/LoginPage';
import { TraderType, UserRole } from './types';

export const App: React.FC = () => {
  const { alert, dismissAlert, isAuthenticated, currentUser, recordRecentSearch } = useApp();
  const { t } = useTranslation();

  // Initial view default based on role if already authenticated
  const getInitialViewForRole = (role: UserRole): string => {
    switch (role) {
      case 'DATA_ENCODER':
        return 'traders-all';
      case 'DIRECTOR':
        return 'verification';
      case 'AGENCY_LEADER':
        return 'reports';
      case 'SYSTEM_ADMINISTRATOR':
      default:
        return 'dashboard';
    }
  };

  const [currentView, setCurrentView] = useState<string>(() =>
    getInitialViewForRole(currentUser.role)
  );
  const [selectedTraderId, setSelectedTraderId] = useState<string | null>(null);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [certificateTraderId, setCertificateTraderId] = useState<string | null>(null);

  const getViewTitle = (view: string): string => {
    switch (view) {
      case 'dashboard':
        return t('view.dashboard', 'Dashboard Overview');
      case 'traders-all':
        return t('view.tradersAll', 'All Registered Traders');
      case 'traders-legal':
        return t('view.tradersLegal', 'Legal Traders Registry');
      case 'traders-informal':
        return t('view.tradersInformal', 'Informal Traders Assessment Directory');
      case 'verification':
        return t('view.verification', 'Verification & Approval Queue');
      case 'register-legal':
        return t('view.registerLegal', 'Register Legal Trader');
      case 'register-informal':
        return t('view.registerInformal', 'Informal Trader Assessment');
      case 'trader-detail':
        return t('view.traderDetail', 'Trader Record & Dossier');
      case 'locations':
        return t('view.locations', 'Harari Administrative Locations');
      case 'reports':
        return t('view.reports', 'Reports & Statistical Insights');
      case 'audit':
        return t('view.audit', 'System Audit Trail & Compliance');
      default:
        return view.replace('-', ' ');
    }
  };

  const handleLoginSuccess = (role: UserRole) => {
    const targetView = getInitialViewForRole(role);
    setCurrentView(targetView);
    setSelectedTraderId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // If not authenticated, render the Login Page first
  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  const handleNavigate = (view: string) => {
    setCurrentView(view);
    setSelectedTraderId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectTrader = (traderId: string) => {
    recordRecentSearch(traderId);
    setSelectedTraderId(traderId);
    setCurrentView('trader-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectType = (type: TraderType) => {
    if (type === 'LEGAL') {
      setCurrentView('register-legal');
    } else {
      setCurrentView('register-informal');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRegistrationSuccess = (traderId: string) => {
    setSelectedTraderId(traderId);
    setCurrentView('trader-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrintCertificate = (traderId: string) => {
    setCertificateTraderId(traderId);
  };

  return (
    <div className="app-wrapper">
      {/* Sidebar */}
      <Sidebar
        currentView={currentView}
        onNavigate={handleNavigate}
        onOpenRegisterType={() => setIsRegisterModalOpen(true)}
      />

      {/* Main Container */}
      <div className="app-main">
        {/* Navbar */}
        <Navbar
          onNavigate={handleNavigate}
          onOpenRegisterType={() => setIsRegisterModalOpen(true)}
          onSelectTrader={handleSelectTrader}
        />

        {/* Global Alert / Django Messages Banner */}
        {alert && (
          <div className="px-4 pt-3">
            <div
              className={`alert alert-${alert.type} alert-dismissible fade show shadow-sm mb-0 d-flex align-items-center justify-content-between`}
              role="alert"
            >
              <div className="d-flex align-items-center gap-2">
                <i
                  className={`bi ${
                    alert.type === 'success'
                      ? 'bi-check-circle-fill'
                      : alert.type === 'danger'
                      ? 'bi-exclamation-triangle-fill'
                      : 'bi-info-circle-fill'
                  } fs-5`}
                ></i>
                <span>{alert.message}</span>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={dismissAlert}
                aria-label="Close"
              ></button>
            </div>
          </div>
        )}

        {/* Breadcrumb Header */}
        <div className="app-content-header">
          <div className="d-flex justify-content-between align-items-center">
            <nav aria-label="breadcrumb">
               <ol className="breadcrumb mb-0 small">
                <li className="breadcrumb-item">
                  <a
                    href="#dashboard"
                    className="text-decoration-none text-muted"
                    onClick={e => {
                      e.preventDefault();
                      handleNavigate('dashboard');
                    }}
                  >
                    {t('app.home', 'HR-TMIS Home')}
                  </a>
                </li>
                {currentView !== 'dashboard' && (
                  <li className="breadcrumb-item active text-primary fw-medium" aria-current="page">
                    {getViewTitle(currentView)}
                  </li>
                )}
              </ol>
            </nav>
            <span className="badge bg-light text-muted border small">{t('app.registryBadge', 'Harari Region Registry')}</span>
          </div>
        </div>

        {/* Content View */}
        <div className="app-content">
          {currentView === 'dashboard' && (
            <Dashboard
              onNavigate={handleNavigate}
              onSelectTrader={handleSelectTrader}
              onOpenRegisterType={() => setIsRegisterModalOpen(true)}
            />
          )}

          {currentView === 'traders-all' && (
            <TradersList
              initialTypeFilter="ALL"
              initialStatusFilter="ALL"
              title={getViewTitle('traders-all')}
              onSelectTrader={handleSelectTrader}
              onOpenRegisterType={() => setIsRegisterModalOpen(true)}
              onPrintCertificate={handlePrintCertificate}
            />
          )}

          {currentView === 'traders-legal' && (
            <TradersList
              initialTypeFilter="LEGAL"
              initialStatusFilter="ALL"
              title={getViewTitle('traders-legal')}
              onSelectTrader={handleSelectTrader}
              onOpenRegisterType={() => setIsRegisterModalOpen(true)}
              onPrintCertificate={handlePrintCertificate}
            />
          )}

          {currentView === 'traders-informal' && (
            <TradersList
              initialTypeFilter="INFORMAL"
              initialStatusFilter="ALL"
              title={getViewTitle('traders-informal')}
              onSelectTrader={handleSelectTrader}
              onOpenRegisterType={() => setIsRegisterModalOpen(true)}
              onPrintCertificate={handlePrintCertificate}
            />
          )}

          {currentView === 'verification' && (
            <TradersList
              initialTypeFilter="ALL"
              initialStatusFilter="PENDING"
              title={getViewTitle('verification')}
              onSelectTrader={handleSelectTrader}
              onOpenRegisterType={() => setIsRegisterModalOpen(true)}
              onPrintCertificate={handlePrintCertificate}
            />
          )}

          {currentView === 'register-legal' && (
            <RegisterLegalForm
              onSuccess={handleRegistrationSuccess}
              onCancel={() => handleNavigate('dashboard')}
            />
          )}

          {currentView === 'register-informal' && (
            <RegisterInformalForm
              onSuccess={handleRegistrationSuccess}
              onCancel={() => handleNavigate('dashboard')}
            />
          )}

          {currentView === 'trader-detail' && selectedTraderId && (
            <TraderDetail
              traderId={selectedTraderId}
              onBack={() => handleNavigate('traders-all')}
              onPrintCertificate={handlePrintCertificate}
            />
          )}

          {currentView === 'locations' && <LocationsView />}

          {currentView === 'reports' && <ReportsView />}

          {currentView === 'audit' && <AuditLogView />}
        </div>

        {/* Footer */}
        <Footer />
      </div>

      {/* Register Type Selection Modal */}
      <RegisterTypeModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onSelectType={handleSelectType}
      />

      {/* Official Certificate / Dossier Modal */}
      <TraderCertificateModal
        traderId={certificateTraderId}
        onClose={() => setCertificateTraderId(null)}
      />
    </div>
  );
};
