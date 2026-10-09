import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../i18n/context';
import { UserRole } from '../../types';

interface LoginPageProps {
  onLoginSuccess: (role: UserRole) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { login, users } = useApp();
  const { language, setLanguage, t } = useTranslation();

  const [username, setUsername] = useState('murad.amen');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    setTimeout(() => {
      const result = login(username, password);
      setIsLoading(false);
      if (result.success && result.user) {
        onLoginSuccess(result.user.role);
      } else {
        setError(result.error ? t('auth.invalidCreds', result.error) : t('auth.invalidCreds', 'Invalid credentials'));
      }
    }, 250);
  };

  const handleQuickSelect = (uName: string, uPass: string) => {
    setUsername(uName);
    setPassword(uPass);
    setError(null);
    const result = login(uName, uPass);
    if (result.success && result.user) {
      onLoginSuccess(result.user.role);
    }
  };

  const getCurrentLanguageLabel = () => {
    if (language === 'om') return 'Afaan Oromoo';
    if (language === 'am') return 'አማርኛ';
    return 'English';
  };

  return (
    <div
      className="d-flex flex-column align-items-center justify-content-center min-vh-100 py-4 position-relative"
      style={{
        backgroundColor: '#0f172a',
        backgroundImage:
          'radial-gradient(circle at 50% 20%, rgba(37, 99, 235, 0.15), transparent 50%), radial-gradient(circle at 80% 80%, rgba(16, 185, 129, 0.1), transparent 40%)',
      }}
    >
      {/* Top Bar with Language Selector */}
      <div className="position-absolute top-0 end-0 p-3 z-3">
        <div className="dropdown">
          <button
            className="btn btn-sm btn-dark border border-secondary dropdown-toggle d-flex align-items-center gap-2 py-1 px-3 shadow"
            type="button"
            data-bs-toggle="dropdown"
            aria-expanded="false"
          >
            <i className="bi bi-translate text-info"></i>
            <span className="fw-medium text-light small">{getCurrentLanguageLabel()}</span>
          </button>
          <ul className="dropdown-menu dropdown-menu-end shadow-lg" style={{ minWidth: '180px' }}>
            <li className="dropdown-header text-uppercase small fw-bold">
              <i className="bi bi-globe me-1"></i> {t('nav.language', 'Language')}
            </li>
            <li>
              <button
                className={`dropdown-item d-flex align-items-center justify-content-between py-2 ${
                  language === 'en' ? 'active' : ''
                }`}
                onClick={() => setLanguage('en')}
              >
                <div>
                  <span className="fw-medium">English</span>
                  <small className={`d-block ${language === 'en' ? 'text-white-50' : 'text-muted'}`}>English</small>
                </div>
                {language === 'en' && <i className="bi bi-check-lg ms-2"></i>}
              </button>
            </li>
            <li>
              <button
                className={`dropdown-item d-flex align-items-center justify-content-between py-2 ${
                  language === 'om' ? 'active' : ''
                }`}
                onClick={() => setLanguage('om')}
              >
                <div>
                  <span className="fw-medium">Afaan Oromoo</span>
                  <small className={`d-block ${language === 'om' ? 'text-white-50' : 'text-muted'}`}>Oromo</small>
                </div>
                {language === 'om' && <i className="bi bi-check-lg ms-2"></i>}
              </button>
            </li>
            <li>
              <button
                className={`dropdown-item d-flex align-items-center justify-content-between py-2 ${
                  language === 'am' ? 'active' : ''
                }`}
                onClick={() => setLanguage('am')}
              >
                <div>
                  <span className="fw-medium">አማርኛ</span>
                  <small className={`d-block ${language === 'am' ? 'text-white-50' : 'text-muted'}`}>Amharic</small>
                </div>
                {language === 'am' && <i className="bi bi-check-lg ms-2"></i>}
              </button>
            </li>
          </ul>
        </div>
      </div>

      <div className="container" style={{ maxWidth: '520px' }}>
        {/* Government Header */}
        <div className="text-center mb-4">
          <div
            className="rounded-circle bg-primary text-white d-inline-flex align-items-center justify-content-center shadow-lg mb-3"
            style={{ width: 68, height: 68, fontSize: '1.8rem' }}
          >
            <i className="bi bi-shield-shaded"></i>
          </div>
          <h4 className="text-white fw-bold text-uppercase tracking-wider mb-1">
            {t('auth.headerTitle', 'Harari People National Regional State')}
          </h4>
          <div className="text-info fw-semibold small text-uppercase">
            {t('auth.agencyName', 'Trade & Industry Development Agency')}
          </div>
          <div className="text-white-50 small mt-1">
            {t('auth.systemName', 'Trader Management Information System (HR-TMIS)')}
          </div>
        </div>

        {/* Login Card */}
        <div className="card border-0 shadow-lg rounded-4 overflow-hidden">
          <div className="card-header bg-primary text-white text-center py-3">
            <h5 className="fw-bold mb-0">{t('auth.cardTitle', 'Authorized Officer Login')}</h5>
            <small className="opacity-75">{t('auth.cardSubtitle', 'Sign in to access regional registry records')}</small>
          </div>

          <div className="card-body p-4 p-sm-5 bg-white">
            {error && (
              <div className="alert alert-danger d-flex align-items-center gap-2 py-2 px-3 small mb-4" role="alert">
                <i className="bi bi-exclamation-triangle-fill fs-5"></i>
                <div>{error}</div>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label fw-semibold text-dark small text-uppercase">
                  {t('auth.usernameLabel', 'Username or Official Email')}
                </label>
                <div className="input-group">
                  <span className="input-group-text bg-light text-muted border-end-0">
                    <i className="bi bi-person-fill"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control border-start-0"
                    placeholder="e.g. murad.amen or admin"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="mb-4">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <label className="form-label fw-semibold text-dark small text-uppercase mb-0">
                    {t('auth.passwordLabel', 'System Password')}
                  </label>
                  <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                    {t('auth.defaultHint', 'Default: password123')}
                  </small>
                </div>
                <div className="input-group">
                  <span className="input-group-text bg-light text-muted border-end-0">
                    <i className="bi bi-lock-fill"></i>
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-control border-start-0 border-end-0"
                    placeholder="Enter password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="btn btn-light border border-start-0 text-muted"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    <i className={`bi ${showPassword ? 'bi-eye-slash-fill' : 'bi-eye-fill'}`}></i>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary w-100 py-2 fw-semibold d-flex align-items-center justify-content-center gap-2 shadow-sm"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    <span>{t('auth.authenticating', 'Authenticating...')}</span>
                  </>
                ) : (
                  <>
                    <i className="bi bi-box-arrow-in-right fs-5"></i>
                    <span>{t('auth.signInBtn', 'Sign In to HR-TMIS')}</span>
                  </>
                )}
              </button>
            </form>

            {/* Quick-fill Role Profiles */}
            <div className="mt-4 pt-4 border-top">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="text-muted small fw-bold text-uppercase" style={{ fontSize: '0.72rem' }}>
                  {t('auth.quickSelectTitle', 'Quick Demo Login (Select Role):')}
                </span>
                <span className="badge bg-light text-dark border small">{t('auth.oneClick', 'One-Click')}</span>
              </div>

              <div className="d-grid gap-2">
                {users.map(u => {
                  let roleBadgeColor = 'secondary';
                  let redirectHint = t('auth.redirectDashboard', 'Dashboard');
                  if (u.role === 'DATA_ENCODER') {
                    roleBadgeColor = 'primary';
                    redirectHint = t('auth.redirectTraders', 'Redirects to Traders Registry');
                  } else if (u.role === 'DIRECTOR') {
                    roleBadgeColor = 'danger';
                    redirectHint = t('auth.redirectVerification', 'Redirects to Verification Queue');
                  } else if (u.role === 'AGENCY_LEADER') {
                    roleBadgeColor = 'warning text-dark';
                    redirectHint = t('auth.redirectReports', 'Redirects to Analytics & Reports');
                  } else if (u.role === 'SYSTEM_ADMINISTRATOR') {
                    roleBadgeColor = 'success';
                    redirectHint = t('auth.redirectDashboard', 'Redirects to System Dashboard');
                  }

                  return (
                    <button
                      key={u.id}
                      type="button"
                      className="btn btn-sm btn-outline-light text-start text-dark border d-flex justify-content-between align-items-center p-2 rounded-3 hover-bg-light"
                      onClick={() => handleQuickSelect(u.username, u.password || 'password123')}
                    >
                      <div className="d-flex align-items-center gap-2 overflow-hidden">
                        <i className="bi bi-person-badge text-primary"></i>
                        <div className="text-truncate">
                          <div className="fw-semibold small lh-1">{u.fullName}</div>
                          <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                            {redirectHint}
                          </small>
                        </div>
                      </div>
                      <span className={`badge bg-${roleBadgeColor} small`} style={{ fontSize: '0.65rem' }}>
                        {t(`role.${u.role}`, u.role.replace(/_/g, ' '))}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="card-footer bg-light text-center py-3 border-top small text-muted">
            <i className="bi bi-shield-check text-success me-1"></i>
            {t('auth.footerNotice', 'Official Portal • Harari Region Trade & Industry Records • 2026')}
          </div>
        </div>
      </div>
    </div>
  );
};
