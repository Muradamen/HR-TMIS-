import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../i18n/context';
import { UserRole } from '../../types';

interface LoginPageProps {
  onLoginSuccess: (role: UserRole) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { login } = useApp();
  const { language, setLanguage, t } = useTranslation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [isLangOpen, setIsLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setIsLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const result = await login(username, password);
      if (result.success && result.user) {
        onLoginSuccess(result.user.role);
      } else {
        setError(result.error ? t('auth.invalidCreds', result.error) : t('auth.invalidCreds', 'Invalid credentials'));
      }
    } finally {
      setIsLoading(false);
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
      <div className="position-absolute top-0 end-0 p-3 z-3 d-flex align-items-center gap-2">
        {/* Quick segmented pills */}
        <div className="btn-group btn-group-sm border border-secondary rounded shadow" role="group" aria-label="Language selection">
          <button
            type="button"
            className={`btn btn-sm px-2 py-1 fw-bold ${
              language === 'en' ? 'btn-primary' : 'btn-dark text-secondary'
            }`}
            onClick={() => {
              setLanguage('en');
              setIsLangOpen(false);
            }}
          >
            EN
          </button>
          <button
            type="button"
            className={`btn btn-sm px-2 py-1 fw-bold ${
              language === 'om' ? 'btn-primary' : 'btn-dark text-secondary'
            }`}
            onClick={() => {
              setLanguage('om');
              setIsLangOpen(false);
            }}
          >
            OM
          </button>
          <button
            type="button"
            className={`btn btn-sm px-2 py-1 fw-bold ${
              language === 'am' ? 'btn-primary' : 'btn-dark text-secondary'
            }`}
            onClick={() => {
              setLanguage('am');
              setIsLangOpen(false);
            }}
          >
            አማ
          </button>
        </div>

        {/* Dropdown with full names */}
        <div className="dropdown position-relative" ref={langRef}>
          <button
            className={`btn btn-sm btn-dark border border-secondary d-flex align-items-center gap-2 py-1 px-3 shadow ${
              isLangOpen ? 'active' : ''
            }`}
            type="button"
            onClick={() => setIsLangOpen(!isLangOpen)}
            aria-expanded={isLangOpen}
          >
            <i className="bi bi-translate text-info"></i>
            <span className="fw-medium text-light small">{getCurrentLanguageLabel()}</span>
            <i className={`bi bi-chevron-${isLangOpen ? 'up' : 'down'} text-muted small`}></i>
          </button>
          <ul
            className={`dropdown-menu dropdown-menu-end shadow-lg ${isLangOpen ? 'show' : ''}`}
            style={{ minWidth: '190px', display: isLangOpen ? 'block' : 'none' }}
          >
            <li className="dropdown-header text-uppercase small fw-bold">
              <i className="bi bi-globe me-1"></i> {t('nav.language', 'Language')}
            </li>
            <li>
              <button
                className={`dropdown-item d-flex align-items-center justify-content-between py-2 ${
                  language === 'en' ? 'active' : ''
                }`}
                onClick={() => {
                  setLanguage('en');
                  setIsLangOpen(false);
                }}
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
                onClick={() => {
                  setLanguage('om');
                  setIsLangOpen(false);
                }}
              >
                <div>
                  <span className="fw-medium">Afaan Oromoo</span>
                  <small className={`d-block ${language === 'om' ? 'text-white-50' : 'text-muted'}`}>Oromiffa</small>
                </div>
                {language === 'om' && <i className="bi bi-check-lg ms-2"></i>}
              </button>
            </li>
            <li>
              <button
                className={`dropdown-item d-flex align-items-center justify-content-between py-2 ${
                  language === 'am' ? 'active' : ''
                }`}
                onClick={() => {
                  setLanguage('am');
                  setIsLangOpen(false);
                }}
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
                    placeholder="Username or official email"
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
