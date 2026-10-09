import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../i18n/context';
import { Trader } from '../../types';

interface NavbarProps {
  onNavigate: (view: string) => void;
  onOpenRegisterType: () => void;
  onSelectTrader: (traderId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onNavigate,
  onOpenRegisterType,
  onSelectTrader,
}) => {
  const {
    currentUser,
    users,
    setCurrentUser,
    traders,
    getWoredaName,
    getKebeleName,
    resetToDefaults,
    logout,
  } = useApp();

  const { language, setLanguage, t } = useTranslation();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const pendingCount = traders.filter(t => t.status === 'PENDING').length;

  // Global search filtering across Name, Trader ID, and License / Registration / TIN / National ID
  const matchedTraders = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    return traders.filter(t => {
      // 1. Trader ID match (e.g. HTT-000001)
      if (t.traderId.toLowerCase().includes(q)) return true;

      if (t.traderType === 'LEGAL' && t.legalDetails) {
        // 2. Name match (Trade Name or Owner Full Name)
        if (t.legalDetails.tradeName.toLowerCase().includes(q)) return true;
        if (t.legalDetails.ownerFullName.toLowerCase().includes(q)) return true;

        // 3. License number / Trade Registration Number match
        if (t.legalDetails.tradeRegistrationNumber.toLowerCase().includes(q)) return true;

        // 4. TIN match
        if (t.legalDetails.tin.toLowerCase().includes(q)) return true;

        // 5. House / Plot ID
        if (t.legalDetails.houseNumberPlotId?.toLowerCase().includes(q)) return true;
      }

      if (t.traderType === 'INFORMAL' && t.informalDetails) {
        // Name match
        if (t.informalDetails.fullName.toLowerCase().includes(q)) return true;

        // National ID / Resident ID match
        if (t.informalDetails.nationalIdResidentId?.toLowerCase().includes(q)) return true;

        // Phone number
        if (t.informalDetails.phoneNumber?.toLowerCase().includes(q)) return true;

        // Specific location
        if (t.informalDetails.specificLocationMarketArea.toLowerCase().includes(q)) return true;
      }

      return false;
    });
  }, [searchQuery, traders]);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut: Press Escape to close search, / to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
        searchInputRef.current?.blur();
      } else if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelectResult = (traderId: string) => {
    onSelectTrader(traderId);
    setSearchQuery('');
    setIsSearchOpen(false);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (matchedTraders.length === 1) {
      handleSelectResult(matchedTraders[0].traderId);
    } else if (matchedTraders.length > 0) {
      handleSelectResult(matchedTraders[0].traderId);
    }
  };

  const getCurrentLanguageLabel = () => {
    if (language === 'om') return 'Afaan Oromoo';
    if (language === 'am') return 'አማርኛ';
    return 'English';
  };

  return (
    <header className="app-header d-flex align-items-center justify-content-between px-3 gap-2">
      {/* Left: Mobile Toggle & Brand */}
      <div className="d-flex align-items-center gap-2 flex-shrink-0">
        <button
          className="btn btn-sm btn-outline-secondary d-lg-none"
          type="button"
          data-bs-toggle="offcanvas"
          data-bs-target="#sidebarOffcanvas"
        >
          <i className="bi bi-list fs-5"></i>
        </button>
        <div className="d-flex align-items-center gap-2">
          <span className="badge bg-primary text-uppercase px-2 py-1">HR-TMIS</span>
          <span className="fw-semibold text-dark d-none d-xl-inline">
            {t('brand.fullTitle', 'Harari Region Trader Management Information System')}
          </span>
        </div>
      </div>

      {/* Center: Global Search Bar */}
      <div
        ref={searchContainerRef}
        className="position-relative flex-grow-1 mx-2"
        style={{ maxWidth: '440px', minWidth: '170px' }}
      >
        <form onSubmit={handleSearchSubmit}>
          <div className="input-group input-group-sm">
            <span className="input-group-text bg-light border-end-0 text-muted ps-2 pe-1">
              <i className="bi bi-search"></i>
            </span>
            <input
              ref={searchInputRef}
              type="text"
              className="form-control border-start-0 border-end-0 bg-light py-1 shadow-none"
              placeholder={t('nav.searchPlaceholder', 'Search by name, ID, license no, TIN...')}
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              style={{ fontSize: '0.85rem' }}
            />
            {searchQuery ? (
              <button
                type="button"
                className="btn btn-light border border-start-0 text-muted px-2"
                onClick={() => {
                  setSearchQuery('');
                  setIsSearchOpen(false);
                }}
              >
                <i className="bi bi-x-circle-fill"></i>
              </button>
            ) : (
              <span className="input-group-text bg-light border-start-0 text-muted d-none d-sm-inline py-0 px-2">
                <kbd className="bg-white border text-muted small px-1" style={{ fontSize: '0.65rem' }}>
                  /
                </kbd>
              </span>
            )}
          </div>
        </form>

        {/* Search Results Dropdown Popover */}
        {isSearchOpen && searchQuery.trim() && (
          <div
            className="position-absolute start-0 end-0 mt-1 bg-white border rounded-3 shadow-lg overflow-hidden"
            style={{ zIndex: 1055, maxHeight: '420px', overflowY: 'auto' }}
          >
            {/* Header info */}
            <div className="d-flex justify-content-between align-items-center px-3 py-2 bg-light border-bottom small">
              <span className="fw-semibold text-muted text-uppercase" style={{ fontSize: '0.72rem' }}>
                <i className="bi bi-search me-1"></i> {t('nav.searchResults', 'Search Results')}
              </span>
              <span className="badge bg-secondary rounded-pill">
                {matchedTraders.length} {t('nav.found', 'found')}
              </span>
            </div>

            {/* Results List */}
            {matchedTraders.length === 0 ? (
              <div className="p-4 text-center text-muted">
                <i className="bi bi-search text-secondary fs-3 d-block mb-1"></i>
                <div className="fw-medium small text-dark">{t('nav.noResults', 'No matching traders found')}</div>
                <div style={{ fontSize: '0.75rem' }} className="mt-1">
                  "{searchQuery}"
                </div>
              </div>
            ) : (
              <div className="list-group list-group-flush">
                {matchedTraders.map((tTrader: Trader) => {
                  const isLegal = tTrader.traderType === 'LEGAL';
                  const primaryName = isLegal
                    ? tTrader.legalDetails?.tradeName
                    : tTrader.informalDetails?.fullName;
                  const ownerName = isLegal ? tTrader.legalDetails?.ownerFullName : null;
                  const licenseNumber = isLegal
                    ? tTrader.legalDetails?.tradeRegistrationNumber
                    : tTrader.informalDetails?.nationalIdResidentId;
                  const tin = isLegal ? tTrader.legalDetails?.tin : null;
                  const woredaId = isLegal
                    ? tTrader.legalDetails?.woredaId
                    : tTrader.informalDetails?.woredaId;
                  const kebeleId = isLegal
                    ? tTrader.legalDetails?.kebeleId
                    : tTrader.informalDetails?.kebeleId;

                  return (
                    <button
                      key={tTrader.traderId}
                      type="button"
                      className="list-group-item list-group-item-action p-2 px-3 text-start border-bottom hover-bg-light"
                      onClick={() => handleSelectResult(tTrader.traderId)}
                    >
                      <div className="d-flex justify-content-between align-items-start mb-1">
                        <div className="d-flex align-items-center gap-2">
                          <span className="fw-bold font-monospace text-primary small">
                            {tTrader.traderId}
                          </span>
                          <span
                            className={`badge ${
                              isLegal ? 'bg-success' : 'bg-warning text-dark'
                            }`}
                            style={{ fontSize: '0.65rem' }}
                          >
                            {isLegal ? t('type.LEGAL', 'Legal') : t('type.INFORMAL', 'Informal')}
                          </span>
                        </div>
                        <span
                          className={`badge ${
                            tTrader.status === 'APPROVED'
                              ? 'bg-success-subtle text-success border border-success-subtle'
                              : tTrader.status === 'PENDING'
                              ? 'bg-warning-subtle text-warning-emphasis border border-warning-subtle'
                              : 'bg-danger-subtle text-danger border border-danger-subtle'
                          }`}
                          style={{ fontSize: '0.65rem' }}
                        >
                          {t(`status.${tTrader.status}`, tTrader.status)}
                        </span>
                      </div>

                      <div className="fw-semibold text-dark small text-truncate">
                        {primaryName}
                      </div>

                      <div
                        className="text-muted d-flex flex-wrap gap-2 mt-1"
                        style={{ fontSize: '0.72rem' }}
                      >
                        {ownerName && (
                          <span>
                            {t('field.ownerFullName', 'Owner')}: <strong>{ownerName}</strong>
                          </span>
                        )}
                        {tin && (
                          <span>
                            TIN: <code className="text-dark">{tin}</code>
                          </span>
                        )}
                        {licenseNumber && (
                          <span>
                            Lic: <code className="text-dark">{licenseNumber}</code>
                          </span>
                        )}
                        {woredaId && (
                          <span>
                            <i className="bi bi-geo-alt me-0"></i>{' '}
                            {getWoredaName(woredaId)}
                            {kebeleId ? `, ${getKebeleName(kebeleId)}` : ''}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Footer hint */}
            <div className="p-2 bg-light text-center border-top text-muted small" style={{ fontSize: '0.7rem' }}>
              {t('nav.pressEsc', 'Click a trader to open full dossier • Press ESC to dismiss')}
            </div>
          </div>
        )}
      </div>

      {/* Right: Language Selector, Pending Badge, Register, User Switcher, Logout */}
      <div className="d-flex align-items-center gap-2 flex-shrink-0">
        {/* Language Selector Dropdown */}
        <div className="dropdown">
          <button
            className="btn btn-sm btn-light border dropdown-toggle d-flex align-items-center gap-1 py-1 px-2 shadow-sm"
            type="button"
            data-bs-toggle="dropdown"
            aria-expanded="false"
            title={t('nav.language', 'Language')}
          >
            <i className="bi bi-translate text-primary"></i>
            <span className="fw-medium small d-none d-sm-inline">{getCurrentLanguageLabel()}</span>
          </button>
          <ul className="dropdown-menu dropdown-menu-end shadow-sm" style={{ minWidth: '190px' }}>
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

        {/* Quick Pending Badge */}
        {pendingCount > 0 && (
          <button
            className="btn btn-sm btn-outline-warning d-flex align-items-center gap-1 py-1 px-2"
            onClick={() => onNavigate('verification')}
            title="Pending verification queue"
          >
            <i className="bi bi-clock-history"></i>
            <span className="d-none d-md-inline small">{t('nav.pendingQueue', 'Pending:')}</span>
            <span className="badge bg-warning text-dark rounded-pill">{pendingCount}</span>
          </button>
        )}

        {/* Quick Register Button */}
        <button
          className="btn btn-sm btn-primary d-flex align-items-center gap-1 shadow-sm py-1 px-2"
          onClick={onOpenRegisterType}
        >
          <i className="bi bi-person-plus-fill"></i>
          <span className="d-none d-md-inline small">{t('nav.registerTrader', 'Register Trader')}</span>
        </button>

        {/* Role & User Switcher */}
        <div className="dropdown">
          <button
            className="btn btn-sm btn-light border dropdown-toggle d-flex align-items-center gap-2 py-1"
            type="button"
            data-bs-toggle="dropdown"
            aria-expanded="false"
          >
            <i className="bi bi-person-circle text-primary"></i>
            <div className="text-start d-none d-lg-block" style={{ lineHeight: 1.1 }}>
              <div className="fw-medium small">{currentUser.fullName}</div>
              <div className="text-muted" style={{ fontSize: '0.68rem' }}>
                {t(`role.${currentUser.role}`, currentUser.role.replace(/_/g, ' '))}
              </div>
            </div>
          </button>
          <ul className="dropdown-menu dropdown-menu-end shadow-sm" style={{ minWidth: '240px' }}>
            <li className="dropdown-header text-uppercase small fw-bold">{t('nav.activeUser', 'Active User')}</li>
            <li className="px-3 py-1">
              <div className="fw-bold text-dark">{currentUser.fullName}</div>
              <small className="text-muted d-block">{currentUser.email}</small>
              <span className="badge bg-primary-subtle text-primary border border-primary-subtle mt-1 small">
                {t(`role.${currentUser.role}`, currentUser.role.replace(/_/g, ' '))}
              </span>
            </li>
            <li><hr className="dropdown-divider" /></li>
            <li className="dropdown-header text-uppercase small fw-bold">{t('nav.switchUser', 'Switch Role / User')}</li>
            {users.map(u => (
              <li key={u.id}>
                <button
                  className={`dropdown-item d-flex align-items-center justify-content-between py-2 ${
                    u.id === currentUser.id ? 'active' : ''
                  }`}
                  onClick={() => setCurrentUser(u)}
                >
                  <div>
                    <div className="fw-medium">{u.fullName}</div>
                    <small className={u.id === currentUser.id ? 'text-white-50' : 'text-muted'}>
                      {t(`role.${u.role}`, u.role.replace(/_/g, ' '))}
                    </small>
                  </div>
                  {u.id === currentUser.id && <i className="bi bi-check-lg ms-2"></i>}
                </button>
              </li>
            ))}
            <li><hr className="dropdown-divider" /></li>
            <li>
              <button
                className="dropdown-item text-secondary d-flex align-items-center gap-2"
                onClick={resetToDefaults}
              >
                <i className="bi bi-arrow-counterclockwise"></i>
                {t('nav.resetDemo', 'Reset Demo Data')}
              </button>
            </li>
            <li><hr className="dropdown-divider" /></li>
            <li>
              <button
                className="dropdown-item text-danger fw-semibold d-flex align-items-center gap-2"
                onClick={logout}
              >
                <i className="bi bi-box-arrow-right"></i>
                {t('nav.signOut', 'Sign Out')}
              </button>
            </li>
          </ul>
        </div>

        {/* Dedicated Logout Icon Button */}
        <button
          className="btn btn-sm btn-outline-danger d-flex align-items-center gap-1 py-1 px-2"
          onClick={logout}
          title={t('nav.signOut', 'Sign Out')}
        >
          <i className="bi bi-box-arrow-right"></i>
          <span className="d-none d-xl-inline small">{t('common.logout', 'Logout')}</span>
        </button>
      </div>
    </header>
  );
};
