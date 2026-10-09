import React from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../i18n/context';

export const ReportsView: React.FC = () => {
  const { traders, woredas } = useApp();
  const { t } = useTranslation();

  const total = traders.length;
  const legal = traders.filter(t => t.traderType === 'LEGAL');
  const informal = traders.filter(t => t.traderType === 'INFORMAL');

  const approved = traders.filter(t => t.status === 'APPROVED').length;
  const pending = traders.filter(t => t.status === 'PENDING').length;
  const returned = traders.filter(t => t.status === 'RETURNED').length;

  // Sectors breakdown
  const sectorCounts: Record<string, number> = {};
  legal.forEach(t => {
    const s = t.legalDetails?.businessSector || 'OTHER';
    sectorCounts[s] = (sectorCounts[s] || 0) + 1;
  });

  // Informal Activities
  const activityCounts: Record<string, number> = {};
  informal.forEach(t => {
    const act = t.informalDetails?.natureOfTradeActivity || 'OTHER';
    activityCounts[act] = (activityCounts[act] || 0) + 1;
  });

  // Informal Reasons
  const reasonCounts: Record<string, number> = {};
  informal.forEach(t => {
    const r = t.informalDetails?.reasonForOperatingInformally || 'OTHER';
    reasonCounts[r] = (reasonCounts[r] || 0) + 1;
  });

  // Recommendations
  const recoCounts: Record<string, number> = {
    READY_FOR_TIN_MICRO_ENTERPRISE: 0,
    NEEDS_AWARENESS_LEGAL_SUPPORT: 0,
    FOLLOW_UP_REQUIRED: 0,
  };
  informal.forEach(t => {
    const rec = t.informalDetails?.formalizationStatusRecommendation;
    if (rec && recoCounts[rec] !== undefined) {
      recoCounts[rec]++;
    }
  });

  const totalCapital = informal.reduce(
    (sum, t) => sum + (t.informalDetails?.estimatedCapitalAssets || 0),
    0
  );
  const avgCapital = informal.length > 0 ? Math.round(totalCapital / informal.length) : 0;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h2 className="fw-bold mb-1">{t('reports.title', 'Reports & Analytical Insights')}</h2>
          <p className="text-muted small mb-0">
            {t('reports.subtitle', 'Statistical breakdown of commerce and informal trade in Harari National Regional State')}
          </p>
        </div>

        <button className="btn btn-outline-primary d-flex align-items-center gap-1" onClick={() => window.print()}>
          <i className="bi bi-printer"></i>
          <span>{t('reports.printReport', 'Print Statistical Report')}</span>
        </button>
      </div>

      {/* Row 1: High level summary */}
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card border-0 shadow-sm p-3">
            <small className="text-muted text-uppercase fw-semibold">{t('reports.formalRatio', 'Formal Sector Ratio')}</small>
            <h3 className="fw-bold text-success mb-1">
              {total > 0 ? Math.round((legal.length / total) * 100) : 0}%
            </h3>
            <div className="small text-muted">{legal.length} {t('list.of', 'of')} {total} {t('reports.licensedTraders', 'traders licensed')}</div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm p-3">
            <small className="text-muted text-uppercase fw-semibold">{t('reports.informalRatio', 'Informal Sector Ratio')}</small>
            <h3 className="fw-bold text-warning mb-1">
              {total > 0 ? Math.round((informal.length / total) * 100) : 0}%
            </h3>
            <div className="small text-muted">{informal.length} {t('reports.pipelineTraders', 'captured in transition pipeline')}</div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm p-3">
            <small className="text-muted text-uppercase fw-semibold">{t('reports.totalInformalCapital', 'Total Informal Capital')}</small>
            <h3 className="fw-bold text-primary mb-1">
              {totalCapital.toLocaleString()} ETB
            </h3>
            <div className="small text-muted">{t('reports.avgPerVendor', 'Average per vendor')}: {avgCapital.toLocaleString()} ETB</div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm p-3">
            <small className="text-muted text-uppercase fw-semibold">{t('reports.approvalIntegrity', 'Approval Integrity')}</small>
            <h3 className="fw-bold text-info mb-1">
              {approved} / {total}
            </h3>
            <div className="small text-muted">
              {pending} {t('reports.pendingReview', 'pending verification')} &bull; {returned} {t('reports.returnedReview', 'returned')}
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Charts and Distributions */}
      <div className="row g-4 mb-4">
        {/* Formal Sectors */}
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white py-3">
              <h5 className="mb-0 fw-bold">{t('reports.formalSectors', 'Formal Business Sectors')}</h5>
            </div>
            <div className="card-body">
              {Object.keys(sectorCounts).length === 0 ? (
                <div className="text-center py-4 text-muted">No legal traders recorded yet</div>
              ) : (
                Object.entries(sectorCounts).map(([sector, count]) => {
                  const percent = Math.round((count / legal.length) * 100);
                  return (
                    <div key={sector} className="mb-3">
                      <div className="d-flex justify-content-between small fw-medium mb-1">
                        <span>{t(`sector.${sector}`, sector.replace(/_/g, ' '))}</span>
                        <span>{count} ({percent}%)</span>
                      </div>
                      <div className="progress" style={{ height: 10 }}>
                        <div
                          className="progress-bar bg-primary"
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Formalization Recommendations */}
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white py-3">
              <h5 className="mb-0 fw-bold">{t('reports.transitionRecommendations', 'Informal Trader Transition Recommendations')}</h5>
            </div>
            <div className="card-body">
              {informal.length === 0 ? (
                <div className="text-center py-4 text-muted">No informal assessments recorded yet</div>
              ) : (
                <>
                  <div className="mb-3">
                    <div className="d-flex justify-content-between small fw-medium mb-1">
                      <span className="text-success fw-bold">
                        {t('reco.READY_FOR_TIN_MICRO_ENTERPRISE', 'Ready for TIN & Micro-Enterprise')}
                      </span>
                      <span>
                        {recoCounts.READY_FOR_TIN_MICRO_ENTERPRISE} (
                        {Math.round((recoCounts.READY_FOR_TIN_MICRO_ENTERPRISE / informal.length) * 100)}%)
                      </span>
                    </div>
                    <div className="progress" style={{ height: 10 }}>
                      <div
                        className="progress-bar bg-success"
                        style={{
                          width: `${(recoCounts.READY_FOR_TIN_MICRO_ENTERPRISE / informal.length) * 100}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="d-flex justify-content-between small fw-medium mb-1">
                      <span className="text-warning fw-bold">
                        {t('reco.NEEDS_AWARENESS_LEGAL_SUPPORT', 'Needs Awareness & Legal Support')}
                      </span>
                      <span>
                        {recoCounts.NEEDS_AWARENESS_LEGAL_SUPPORT} (
                        {Math.round((recoCounts.NEEDS_AWARENESS_LEGAL_SUPPORT / informal.length) * 100)}%)
                      </span>
                    </div>
                    <div className="progress" style={{ height: 10 }}>
                      <div
                        className="progress-bar bg-warning"
                        style={{
                          width: `${(recoCounts.NEEDS_AWARENESS_LEGAL_SUPPORT / informal.length) * 100}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="d-flex justify-content-between small fw-medium mb-1">
                      <span className="text-danger fw-bold">
                        {t('reco.FOLLOW_UP_REQUIRED', 'Follow-up Required')}
                      </span>
                      <span>
                        {recoCounts.FOLLOW_UP_REQUIRED} (
                        {Math.round((recoCounts.FOLLOW_UP_REQUIRED / informal.length) * 100)}%)
                      </span>
                    </div>
                    <div className="progress" style={{ height: 10 }}>
                      <div
                        className="progress-bar bg-danger"
                        style={{
                          width: `${(recoCounts.FOLLOW_UP_REQUIRED / informal.length) * 100}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Territorial Woreda Distribution */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header bg-white py-3">
          <h5 className="mb-0 fw-bold">{t('reports.woredaDistribution', 'Trader Distribution across Harari Woredas')}</h5>
        </div>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>{t('field.woreda', 'Woreda')}</th>
                <th>{t('locations.kebeleCode', 'Code')}</th>
                <th>{t('sidebar.legalTraders', 'Legal Traders')}</th>
                <th>{t('sidebar.informalTraders', 'Informal Traders')}</th>
                <th>{t('common.records', 'Total Traders')}</th>
                <th>{t('reports.shareOfTotal', 'Share of Regional Total')}</th>
              </tr>
            </thead>
            <tbody>
              {woredas.map(w => {
                const wLegal = legal.filter(t => t.legalDetails?.woredaId === w.id).length;
                const wInformal = informal.filter(t => t.informalDetails?.woredaId === w.id).length;
                const wTotal = wLegal + wInformal;
                const share = total > 0 ? Math.round((wTotal / total) * 100) : 0;

                return (
                  <tr key={w.id}>
                    <td className="fw-semibold">{w.name}</td>
                    <td className="font-monospace small">{w.code}</td>
                    <td>
                      <span className="badge bg-success-subtle text-success">{wLegal}</span>
                    </td>
                    <td>
                      <span className="badge bg-warning-subtle text-warning-emphasis">{wInformal}</span>
                    </td>
                    <td className="fw-bold">{wTotal}</td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <div className="progress flex-grow-1" style={{ height: 6 }}>
                          <div
                            className="progress-bar bg-primary"
                            style={{ width: `${share}%` }}
                          ></div>
                        </div>
                        <span className="small text-muted">{share}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
