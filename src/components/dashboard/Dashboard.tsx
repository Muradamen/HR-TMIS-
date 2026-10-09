import React, { useEffect, useState } from 'react';
import { reportsService } from '../../services/reports.service';
import type { DashboardMetrics } from '../../services/reports.service';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../i18n/context';

interface DashboardProps {
  onNavigate: (view: string) => void;
  onSelectTrader: (traderId: string) => void;
  onOpenRegisterType: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onNavigate,
  onSelectTrader,
  onOpenRegisterType,
}) => {
  const { traders, getWoredaName, getKebeleName, getRecentTraderObjects, clearRecentSearches, currentUser } = useApp();
  const { t } = useTranslation();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);

  useEffect(() => {
    let active = true;
    reportsService.getDashboardMetrics()
      .then(data => { if (active) setMetrics(data); })
      .catch(() => { if (active) setMetrics(null); });
    return () => { active = false; };
  }, [currentUser.id, currentUser.role]);

  const totalTraders = metrics?.totalTraders ?? traders.length;
  const legalTraders = traders.filter(t => t.traderType === 'LEGAL');
  const informalTraders = traders.filter(t => t.traderType === 'INFORMAL');
  const pendingTraders = traders.filter(t => ['PENDING', 'SUBMITTED', 'UNDER_REVIEW'].includes(t.status));
  const approvedTraders = traders.filter(t => t.status === 'APPROVED');
  const returnedTraders = traders.filter(t => t.status === 'RETURNED');

  // Informal Metrics
  const legalCount = metrics?.legalCount ?? legalTraders.length;
  const informalCount = metrics?.informalCount ?? informalTraders.length;
  const pendingCount = metrics?.pendingCount ?? pendingTraders.length;
  const approvedCount = metrics?.approvedCount ?? approvedTraders.length;
  const returnedCount = metrics?.returnedCount ?? returnedTraders.length;
  const readyForTIN = metrics?.readyForTinCount ?? informalTraders.filter(
    t => t.informalDetails?.formalizationStatusRecommendation === 'READY_FOR_TIN_MICRO_ENTERPRISE'
  ).length;

  const totalInformalCapital = metrics?.totalInformalCapital ?? informalTraders.reduce(
    (sum, t) => sum + (t.informalDetails?.estimatedCapitalAssets || 0),
    0
  );

  const recentTraders = [...traders].slice(0, 5);
  const recentSearches = getRecentTraderObjects();

  return (
    <div>
      {/* Page Title & Breadcrumb */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1">{t('dashboard.title', 'Executive Dashboard')}</h2>
          <p className="text-muted small mb-0">
            {t('dashboard.subtitle', 'Regional Overview of Trader Formalization & Registration in Harari State')}
          </p>
        </div>
        <div className="d-flex gap-2">
          {currentUser.role === 'DATA_ENCODER' && (
          <button
            className="btn btn-primary d-flex align-items-center gap-2 shadow-sm"
            onClick={onOpenRegisterType}
          >
            <i className="bi bi-plus-lg"></i>
            <span>{t('nav.registerTrader', 'Register Trader')}</span>
          </button>
          )}
        </div>
      </div>

      {/* KPI Stat Boxes (AdminLTE Small Box pattern) */}
      <div className="row g-3 mb-4">
        <div className="col-lg-3 col-6">
          <div className="small-box bg-primary">
            <div className="inner">
              <h3>{totalTraders}</h3>
              <p>{t('dashboard.totalTraders', 'Total Registered Traders')}</p>
            </div>
            <div className="icon">
              <i className="bi bi-people-fill"></i>
            </div>
            <a
              className="small-box-footer"
              onClick={() => onNavigate('traders-all')}
            >
              {t('dashboard.viewDirectory', 'View directory')} <i className="bi bi-arrow-right-circle"></i>
            </a>
          </div>
        </div>

        <div className="col-lg-3 col-6">
          <div className="small-box bg-success">
            <div className="inner">
              <h3>{legalCount}</h3>
              <p>{t('dashboard.legalTraders', 'Legal & Formal Traders')}</p>
            </div>
            <div className="icon">
              <i className="bi bi-building-check"></i>
            </div>
            <a
              className="small-box-footer"
              onClick={() => onNavigate('traders-legal')}
            >
              {t('dashboard.viewLegal', 'View legal')} <i className="bi bi-arrow-right-circle"></i>
            </a>
          </div>
        </div>

        <div className="col-lg-3 col-6">
          <div className="small-box bg-warning text-dark">
            <div className="inner">
              <h3>{informalCount}</h3>
              <p>{t('dashboard.informalTraders', 'Informal Traders Captured')}</p>
            </div>
            <div className="icon">
              <i className="bi bi-basket2-fill"></i>
            </div>
            <a
              className="small-box-footer text-dark"
              onClick={() => onNavigate('traders-informal')}
            >
              {t('dashboard.viewInformal', 'View informal')} <i className="bi bi-arrow-right-circle"></i>
            </a>
          </div>
        </div>

        <div className="col-lg-3 col-6">
          <div className="small-box bg-danger">
            <div className="inner">
              <h3>{pendingCount}</h3>
              <p>{t('dashboard.pendingVerification', 'Pending Verification')}</p>
            </div>
            <div className="icon">
              <i className="bi bi-hourglass-split"></i>
            </div>
            <a
              className="small-box-footer"
              onClick={() => onNavigate('verification')}
            >
              {t('dashboard.reviewQueue', 'Review queue')} <i className="bi bi-arrow-right-circle"></i>
            </a>
          </div>
        </div>
      </div>

      {/* Secondary Metrics / Highlight Cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="card h-100 border-0 shadow-sm border-start border-4 border-info">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="text-muted small fw-medium text-uppercase">
                    {t('dashboard.formalizationPipeline', 'Formalization Pipeline')}
                  </div>
                  <h4 className="fw-bold mb-0 mt-1">{readyForTIN} {t('common.records', 'Traders')}</h4>
                  <small className="text-success fw-medium">
                    <i className="bi bi-check-circle-fill me-1"></i>
                    {t('reco.READY_FOR_TIN_MICRO_ENTERPRISE', 'Ready for TIN & Micro-Enterprise')}
                  </small>
                </div>
                <div className="bg-info bg-opacity-10 text-info p-3 rounded-circle">
                  <i className="bi bi-award-fill fs-4"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card h-100 border-0 shadow-sm border-start border-4 border-primary">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="text-muted small fw-medium text-uppercase">
                    {t('dashboard.capturedCapital', 'Captured Informal Capital')}
                  </div>
                  <h4 className="fw-bold mb-0 mt-1">
                    {totalInformalCapital.toLocaleString()} ETB
                  </h4>
                  <small className="text-muted">
                    {t('field.estimatedCapital', 'Estimated working assets')}
                  </small>
                </div>
                <div className="bg-primary bg-opacity-10 text-primary p-3 rounded-circle">
                  <i className="bi bi-cash-stack fs-4"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card h-100 border-0 shadow-sm border-start border-4 border-success">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="text-muted small fw-medium text-uppercase">
                    {t('dashboard.approvalRate', 'Verification Approval Rate')}
                  </div>
                  <h4 className="fw-bold mb-0 mt-1">
                    {totalTraders > 0 ? Math.round((approvedCount / totalTraders) * 100) : 0}%
                  </h4>
                  <small className="text-muted">
                    {approvedCount} {t('status.APPROVED', 'approved')}, {returnedCount} {t('status.RETURNED', 'returned')}
                  </small>
                </div>
                <div className="bg-success bg-opacity-10 text-success p-3 rounded-circle">
                  <i className="bi bi-graph-up-arrow fs-4"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Searches Section (stores and displays last 5 traders searched by current user to improve navigation speed) */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2">
            <div className="bg-primary bg-opacity-10 text-primary p-2 rounded-circle">
              <i className="bi bi-clock-history fs-5"></i>
            </div>
            <div>
              <div className="d-flex align-items-center gap-2">
                <h5 className="mb-0 fw-bold">{t('dashboard.recentSearches', 'Recent Searches')}</h5>
                <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill">
                  {recentSearches.length} / 5
                </span>
                <span className="badge bg-light text-muted border small d-none d-sm-inline">
                  {currentUser.fullName}
                </span>
              </div>
              <small className="text-muted">
                {t('dashboard.recentSearchesDesc', 'Traders searched and accessed by current user for fast re-navigation.')}
              </small>
            </div>
          </div>
          {recentSearches.length > 0 && (
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1 shadow-xs"
              onClick={clearRecentSearches}
              title={t('dashboard.clearHistory', 'Clear History')}
            >
              <i className="bi bi-trash3"></i>
              <span>{t('dashboard.clearHistory', 'Clear History')}</span>
            </button>
          )}
        </div>
        <div className="card-body p-3">
          {recentSearches.length === 0 ? (
            <div className="text-center py-4 text-muted">
              <i className="bi bi-search text-secondary fs-3 d-block mb-2"></i>
              <div className="fw-medium text-dark">{t('dashboard.noRecentSearches', 'No recent searches recorded yet')}</div>
              <small className="text-muted">
                {t('dashboard.noRecentSearchesHint', 'Search for traders using the top navigation search bar or directory to see them here.')}
              </small>
            </div>
          ) : (
            <div className="row g-2">
              {recentSearches.map(rTrader => {
                const isLegal = rTrader.traderType === 'LEGAL';
                const displayName = isLegal
                  ? rTrader.legalDetails?.tradeName
                  : rTrader.informalDetails?.fullName;
                const subDetail = isLegal
                  ? `${t('field.ownerFullName', 'Owner')}: ${rTrader.legalDetails?.ownerFullName || '-'} • TIN: ${rTrader.legalDetails?.tin || '-'}`
                  : `${t('field.natureOfTradeActivity', 'Activity')}: ${t(`activity.${rTrader.informalDetails?.natureOfTradeActivity}`, rTrader.informalDetails?.natureOfTradeActivity?.replace(/_/g, ' ') || '')}`;
                const woredaId = isLegal ? rTrader.legalDetails?.woredaId : rTrader.informalDetails?.woredaId;
                const kebeleId = isLegal ? rTrader.legalDetails?.kebeleId : rTrader.informalDetails?.kebeleId;

                return (
                  <div key={rTrader.traderId} className="col-lg col-md-4 col-sm-6">
                    <div
                      className="border rounded-3 p-3 h-100 bg-white shadow-xs d-flex flex-column justify-content-between position-relative hover-shadow"
                      onClick={() => onSelectTrader(rTrader.traderId)}
                      style={{ cursor: 'pointer', transition: 'all 0.15s ease-in-out' }}
                      role="button"
                      tabIndex={0}
                    >
                      <div>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span className="badge bg-primary-subtle text-primary border border-primary-subtle font-monospace fw-bold" style={{ fontSize: '0.72rem' }}>
                            {rTrader.traderId}
                          </span>
                          <span
                            className={`badge ${
                              rTrader.status === 'APPROVED'
                                ? 'bg-success'
                                : rTrader.status === 'PENDING'
                                ? 'bg-warning text-dark'
                                : 'bg-danger'
                            }`}
                            style={{ fontSize: '0.65rem' }}
                          >
                            {t(`status.${rTrader.status}`, rTrader.status)}
                          </span>
                        </div>
                        <h6 className="fw-bold mb-1 text-dark text-truncate" title={displayName} style={{ fontSize: '0.88rem' }}>
                          {displayName}
                        </h6>
                        <div className="small text-muted text-truncate mb-2" style={{ fontSize: '0.75rem' }}>
                          {subDetail}
                        </div>
                      </div>
                      <div className="d-flex justify-content-between align-items-center pt-2 border-top text-muted small" style={{ fontSize: '0.72rem' }}>
                        <span className="text-truncate">
                          <i className="bi bi-geo-alt me-1 text-secondary"></i>
                          {woredaId ? getWoredaName(woredaId) : '-'}
                          {kebeleId ? `, ${getKebeleName(kebeleId)}` : ''}
                        </span>
                        <span className="text-primary fw-medium ms-1 flex-shrink-0">
                          <i className="bi bi-box-arrow-up-right"></i>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Main Row: Recent Registrations & Quick Actions */}
      <div className="row g-3">
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white d-flex justify-content-between align-items-center py-3">
              <h5 className="mb-0 fw-bold">{t('dashboard.recentRegistrations', 'Recent Registrations')}</h5>
              <button
                className="btn btn-sm btn-outline-primary"
                onClick={() => onNavigate('traders-all')}
              >
                {t('dashboard.viewAll', 'View All Registrations')}
              </button>
            </div>
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>{t('field.traderId', 'Trader ID')}</th>
                    <th>{t('field.tradeName', 'Name / Trade Name')}</th>
                    <th>{t('common.category', 'Type')}</th>
                    <th>{t('field.woreda', 'Woreda')} &amp; {t('field.kebele', 'Kebele')}</th>
                    <th>{t('common.status', 'Status')}</th>
                    <th className="text-end">{t('common.actions', 'Action')}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTraders.map(tItem => {
                    const displayName =
                      tItem.traderType === 'LEGAL'
                        ? tItem.legalDetails?.tradeName
                        : tItem.informalDetails?.fullName;
                    const woredaId =
                      tItem.traderType === 'LEGAL'
                        ? tItem.legalDetails?.woredaId
                        : tItem.informalDetails?.woredaId;
                    const kebeleId =
                      tItem.traderType === 'LEGAL'
                        ? tItem.legalDetails?.kebeleId
                        : tItem.informalDetails?.kebeleId;

                    return (
                      <tr key={tItem.traderId}>
                        <td className="fw-semibold text-primary">{tItem.traderId}</td>
                        <td>
                          <div className="fw-medium">{displayName}</div>
                          <div className="small text-muted">
                            {tItem.traderType === 'LEGAL'
                              ? `${t('field.ownerFullName', 'Owner')}: ${tItem.legalDetails?.ownerFullName}`
                              : `${t('field.natureOfTradeActivity', 'Activity')}: ${t(`activity.${tItem.informalDetails?.natureOfTradeActivity}`, tItem.informalDetails?.natureOfTradeActivity?.replace(/_/g, ' ') || '')}`}
                          </div>
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              tItem.traderType === 'LEGAL' ? 'bg-success' : 'bg-warning text-dark'
                            }`}
                          >
                            {t(`type.${tItem.traderType}`, tItem.traderType)}
                          </span>
                        </td>
                        <td className="small">
                          <div>{woredaId ? getWoredaName(woredaId) : '-'}</div>
                          <div className="text-muted">{kebeleId ? getKebeleName(kebeleId) : ''}</div>
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              tItem.status === 'APPROVED'
                                ? 'bg-success'
                                : tItem.status === 'PENDING'
                                ? 'bg-warning text-dark'
                                : 'bg-danger'
                            }`}
                          >
                            {t(`status.${tItem.status}`, tItem.status)}
                          </span>
                        </td>
                        <td className="text-end">
                          <button
                            className="btn btn-sm btn-light border"
                            onClick={() => onSelectTrader(tItem.traderId)}
                          >
                            <i className="bi bi-eye"></i> {t('common.view', 'View')}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Side Panel: Formalization Breakdown & Quick Actions */}
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm mb-3">
            <div className="card-header bg-white py-3">
              <h5 className="mb-0 fw-bold">{t('dashboard.formalizationPipeline', 'Formalization Pipeline')}</h5>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <div className="d-flex justify-content-between small mb-1">
                  <span className="fw-medium text-success">{t('reco.READY_FOR_TIN_MICRO_ENTERPRISE', 'Ready for TIN & Micro-Enterprise')}</span>
                  <span className="fw-bold">{readyForTIN}</span>
                </div>
                <div className="progress" style={{ height: 8 }}>
                  <div
                    className="progress-bar bg-success"
                    style={{
                      width: informalCount > 0 ? `${(readyForTIN / informalCount) * 100}%` : '0%',
                    }}
                  ></div>
                </div>
              </div>

              <div className="mb-3">
                <div className="d-flex justify-content-between small mb-1">
                  <span className="fw-medium text-warning">{t('reco.NEEDS_AWARENESS_LEGAL_SUPPORT', 'Needs Awareness / Legal Support')}</span>
                  <span className="fw-bold">
                    {
                      informalTraders.filter(
                        t => t.informalDetails?.formalizationStatusRecommendation === 'NEEDS_AWARENESS_LEGAL_SUPPORT'
                      ).length
                    }
                  </span>
                </div>
                <div className="progress" style={{ height: 8 }}>
                  <div
                    className="progress-bar bg-warning"
                    style={{
                      width:
                        informalCount > 0
                          ? `${
                              (informalTraders.filter(
                                t => t.informalDetails?.formalizationStatusRecommendation === 'NEEDS_AWARENESS_LEGAL_SUPPORT'
                              ).length /
                                informalCount) *
                              100
                            }%`
                          : '0%',
                    }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="d-flex justify-content-between small mb-1">
                  <span className="fw-medium text-danger">{t('reco.FOLLOW_UP_REQUIRED', 'Follow-up Required')}</span>
                  <span className="fw-bold">
                    {
                      informalTraders.filter(
                        t => t.informalDetails?.formalizationStatusRecommendation === 'FOLLOW_UP_REQUIRED'
                      ).length
                    }
                  </span>
                </div>
                <div className="progress" style={{ height: 8 }}>
                  <div
                    className="progress-bar bg-danger"
                    style={{
                      width:
                        informalCount > 0
                          ? `${
                              (informalTraders.filter(
                                t => t.informalDetails?.formalizationStatusRecommendation === 'FOLLOW_UP_REQUIRED'
                              ).length /
                                informalCount) *
                              100
                            }%`
                          : '0%',
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <div className="card border-0 shadow-sm bg-primary text-white">
            <div className="card-body p-4">
              <h5 className="fw-bold mb-2">{t('dashboard.shortcuts', 'Registration Shortcuts')}</h5>
              <p className="small opacity-75 mb-3">
                {t('dashboard.shortcutsDesc', 'Select category to register a business or document an informal vendor in Harari Region.')}
              </p>
              <div className="d-grid gap-2">
                <button
                  className="btn btn-light fw-medium d-flex align-items-center justify-content-center gap-2"
                  onClick={() => onNavigate('register-legal')}
                >
                  <i className="bi bi-building-add text-primary"></i>
                  {t('dashboard.regLegalBtn', 'Register Legal Trader')}
                </button>
                <button
                  className="btn btn-outline-light fw-medium d-flex align-items-center justify-content-center gap-2"
                  onClick={() => onNavigate('register-informal')}
                >
                  <i className="bi bi-person-plus"></i>
                  {t('dashboard.assessInformalBtn', 'Assess Informal Trader')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
