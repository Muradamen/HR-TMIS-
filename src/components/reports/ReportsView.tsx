import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../i18n/context';

export const ReportsView: React.FC = () => {
  const { traders, woredas, currentUser, showAlert, getWoredaName } = useApp();
  const { t, language, setLanguage } = useTranslation();

  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        exportDropdownRef.current &&
        !exportDropdownRef.current.contains(e.target as Node)
      ) {
        setIsExportDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const total = traders.length;
  const legal = traders.filter(t => t.traderType === 'LEGAL');
  const informal = traders.filter(t => t.traderType === 'INFORMAL');

  const approved = traders.filter(t => t.status === 'APPROVED').length;
  const pending = traders.filter(t => t.status === 'PENDING').length;
  const returned = traders.filter(t => t.status === 'RETURNED').length;

  // Sectors breakdown
  const sectorCounts: Record<string, number> = {};
  legal.forEach(tTrader => {
    const s = tTrader.legalDetails?.businessSector || 'OTHER';
    sectorCounts[s] = (sectorCounts[s] || 0) + 1;
  });

  // Informal Activities
  const activityCounts: Record<string, number> = {};
  informal.forEach(tTrader => {
    const act = tTrader.informalDetails?.natureOfTradeActivity || 'OTHER';
    activityCounts[act] = (activityCounts[act] || 0) + 1;
  });

  // Informal Reasons
  const reasonCounts: Record<string, number> = {};
  informal.forEach(tTrader => {
    const r = tTrader.informalDetails?.reasonForOperatingInformally || 'OTHER';
    reasonCounts[r] = (reasonCounts[r] || 0) + 1;
  });

  // Recommendations
  const recoCounts: Record<string, number> = {
    READY_FOR_TIN_MICRO_ENTERPRISE: 0,
    NEEDS_AWARENESS_LEGAL_SUPPORT: 0,
    FOLLOW_UP_REQUIRED: 0,
  };
  informal.forEach(tTrader => {
    const rec = tTrader.informalDetails?.formalizationStatusRecommendation;
    if (rec && recoCounts[rec] !== undefined) {
      recoCounts[rec]++;
    }
  });

  const totalCapital = informal.reduce(
    (sum, tTrader) => sum + (tTrader.informalDetails?.estimatedCapitalAssets || 0),
    0
  );
  const avgCapital = informal.length > 0 ? Math.round(totalCapital / informal.length) : 0;

  // Escape helper for CSV cells
  const escapeCsv = (val: any): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  // 1. Export Comprehensive Statistical CSV
  const handleExportSummaryCsv = () => {
    setIsExportDropdownOpen(false);

    const dateStr = new Date().toISOString().split('T')[0];
    const generatedTimestamp = new Date().toLocaleString();

    const lines: string[] = [];

    // Header info
    lines.push([escapeCsv(t('brand.agency', 'Harari People Regional State Trade & Industry Development Agency'))].join(','));
    lines.push([escapeCsv(t('reports.officialReport', 'Official Regional Statistical & Analytical Report'))].join(','));
    lines.push([escapeCsv(`${t('reports.generatedDate', 'Report Date')}: ${generatedTimestamp}`), escapeCsv(`${t('reports.preparedBy', 'Prepared by')}: ${currentUser.fullName} (${currentUser.role})`)].join(','));
    lines.push('');

    // Section 1: Executive KPI Metrics
    lines.push([escapeCsv(`=== ${t('reports.executiveSummary', 'Executive Statistical Summary')} ===`), '', ''].join(','));
    lines.push([escapeCsv(t('reports.sector', 'Metric Indicator')), escapeCsv(t('reports.count', 'Value / Count')), escapeCsv(t('reports.share', 'Regional Share / Ratio'))].join(','));
    lines.push([escapeCsv(t('dashboard.totalTraders', 'Total Registered Traders')), escapeCsv(total), escapeCsv('100%')].join(','));
    lines.push([escapeCsv(t('dashboard.legalTraders', 'Formal & Legal Traders')), escapeCsv(legal.length), escapeCsv(`${total > 0 ? Math.round((legal.length / total) * 100) : 0}%`)].join(','));
    lines.push([escapeCsv(t('dashboard.informalTraders', 'Informal Traders Captured')), escapeCsv(informal.length), escapeCsv(`${total > 0 ? Math.round((informal.length / total) * 100) : 0}%`)].join(','));
    lines.push([escapeCsv(t('status.APPROVED', 'Approved & Verified Records')), escapeCsv(approved), escapeCsv(`${total > 0 ? Math.round((approved / total) * 100) : 0}%`)].join(','));
    lines.push([escapeCsv(t('status.PENDING', 'Pending Verification Queue')), escapeCsv(pending), escapeCsv(`${total > 0 ? Math.round((pending / total) * 100) : 0}%`)].join(','));
    lines.push([escapeCsv(t('status.RETURNED', 'Returned for Correction')), escapeCsv(returned), escapeCsv(`${total > 0 ? Math.round((returned / total) * 100) : 0}%`)].join(','));
    lines.push([escapeCsv(t('reports.totalInformalCapital', 'Total Informal Capital Assets (ETB)')), escapeCsv(`${totalCapital.toLocaleString()} ETB`), escapeCsv('-')].join(','));
    lines.push([escapeCsv(t('reports.avgPerVendor', 'Average Capital Assets Per Vendor (ETB)')), escapeCsv(`${avgCapital.toLocaleString()} ETB`), escapeCsv('-')].join(','));
    lines.push('');

    // Section 2: Territorial Woreda Breakdown
    lines.push([escapeCsv(`=== ${t('reports.woredaDistribution', 'Trader Distribution across Harari Woredas')} ===`), '', '', '', '', ''].join(','));
    lines.push([
      escapeCsv(t('field.woreda', 'Woreda')),
      escapeCsv(t('locations.kebeleCode', 'Code')),
      escapeCsv(t('sidebar.legalTraders', 'Legal Traders')),
      escapeCsv(t('sidebar.informalTraders', 'Informal Traders')),
      escapeCsv(t('common.records', 'Total Traders')),
      escapeCsv(t('reports.shareOfTotal', 'Share of Regional Total'))
    ].join(','));

    woredas.forEach(w => {
      const wLegal = legal.filter(tItem => tItem.legalDetails?.woredaId === w.id).length;
      const wInformal = informal.filter(tItem => tItem.informalDetails?.woredaId === w.id).length;
      const wTotal = wLegal + wInformal;
      const share = total > 0 ? Math.round((wTotal / total) * 100) : 0;

      lines.push([
        escapeCsv(w.name),
        escapeCsv(w.code),
        escapeCsv(wLegal),
        escapeCsv(wInformal),
        escapeCsv(wTotal),
        escapeCsv(`${share}%`)
      ].join(','));
    });
    lines.push('');

    // Section 3: Formal Business Sectors
    lines.push([escapeCsv(`=== ${t('reports.formalSectors', 'Formal Business Sectors')} ===`), '', ''].join(','));
    lines.push([escapeCsv(t('reports.sector', 'Sector')), escapeCsv(t('reports.count', 'Count')), escapeCsv(t('reports.share', 'Share (%)'))].join(','));
    Object.entries(sectorCounts).forEach(([sec, cnt]) => {
      const share = legal.length > 0 ? Math.round((cnt / legal.length) * 100) : 0;
      lines.push([
        escapeCsv(t(`sector.${sec}`, sec.replace(/_/g, ' '))),
        escapeCsv(cnt),
        escapeCsv(`${share}%`)
      ].join(','));
    });
    lines.push('');

    // Section 4: Informal Transition Recommendations
    lines.push([escapeCsv(`=== ${t('reports.transitionRecommendations', 'Informal Trader Transition Recommendations')} ===`), '', ''].join(','));
    lines.push([escapeCsv(t('field.formalizationStatusRecommendation', 'Formalization Roadmap')), escapeCsv(t('reports.count', 'Count')), escapeCsv(t('reports.share', 'Share (%)'))].join(','));
    Object.entries(recoCounts).forEach(([rec, cnt]) => {
      const share = informal.length > 0 ? Math.round((cnt / informal.length) * 100) : 0;
      lines.push([
        escapeCsv(t(`reco.${rec}`, rec.replace(/_/g, ' '))),
        escapeCsv(cnt),
        escapeCsv(`${share}%`)
      ].join(','));
    });
    lines.push('');

    // Section 5: Informal Activities
    lines.push([escapeCsv(`=== ${t('reports.informalActivities', 'Informal Sector Trade Activities')} ===`), '', ''].join(','));
    lines.push([escapeCsv(t('field.natureOfTradeActivity', 'Trade Activity')), escapeCsv(t('reports.count', 'Count')), escapeCsv(t('reports.share', 'Share (%)'))].join(','));
    Object.entries(activityCounts).forEach(([act, cnt]) => {
      const share = informal.length > 0 ? Math.round((cnt / informal.length) * 100) : 0;
      lines.push([
        escapeCsv(t(`activity.${act}`, act.replace(/_/g, ' '))),
        escapeCsv(cnt),
        escapeCsv(`${share}%`)
      ].join(','));
    });
    lines.push('');

    // Section 6: Informal Reasons
    lines.push([escapeCsv(`=== ${t('reports.informalReasons', 'Reported Reasons for Operating Informally')} ===`), '', ''].join(','));
    lines.push([escapeCsv(t('field.reasonForOperatingInformally', 'Reported Reason')), escapeCsv(t('reports.count', 'Count')), escapeCsv(t('reports.share', 'Share (%)'))].join(','));
    Object.entries(reasonCounts).forEach(([rsn, cnt]) => {
      const share = informal.length > 0 ? Math.round((cnt / informal.length) * 100) : 0;
      lines.push([
        escapeCsv(t(`reason.${rsn}`, rsn.replace(/_/g, ' '))),
        escapeCsv(cnt),
        escapeCsv(`${share}%`)
      ].join(','));
    });

    // UTF-8 BOM for Excel multi-language compatibility (Amharic & Afaan Oromoo)
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + lines.join('\r\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `harari_region_statistical_summary_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showAlert('success', t('reports.csvExportSuccess', 'Statistical report exported to CSV successfully.'));
  };

  // 2. Export Woreda Breakdown CSV Only
  const handleExportWoredaCsv = () => {
    setIsExportDropdownOpen(false);

    const dateStr = new Date().toISOString().split('T')[0];
    const headers = [
      escapeCsv(t('field.woreda', 'Woreda Name')),
      escapeCsv(t('locations.kebeleCode', 'Woreda Code')),
      escapeCsv(t('sidebar.legalTraders', 'Legal Traders')),
      escapeCsv(t('sidebar.informalTraders', 'Informal Traders')),
      escapeCsv(t('common.records', 'Total Traders')),
      escapeCsv(t('reports.shareOfTotal', 'Share of Regional Total (%)'))
    ];

    const rows = woredas.map(w => {
      const wLegal = legal.filter(tItem => tItem.legalDetails?.woredaId === w.id).length;
      const wInformal = informal.filter(tItem => tItem.informalDetails?.woredaId === w.id).length;
      const wTotal = wLegal + wInformal;
      const share = total > 0 ? Math.round((wTotal / total) * 100) : 0;

      return [
        escapeCsv(w.name),
        escapeCsv(w.code),
        escapeCsv(wLegal),
        escapeCsv(wInformal),
        escapeCsv(wTotal),
        escapeCsv(`${share}%`)
      ].join(',');
    });

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows].join('\r\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `harari_region_woreda_statistics_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showAlert('success', t('reports.csvExportSuccess', 'Statistical report exported to CSV successfully.'));
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      {/* Top Header & Export Action Bar */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h2 className="fw-bold mb-1">{t('reports.title', 'Reports & Analytical Insights')}</h2>
          <p className="text-muted small mb-0">
            {t('reports.subtitle', 'Statistical breakdown of commerce and informal trade in Harari National Regional State')}
          </p>
        </div>

        <div className="d-flex align-items-center gap-2">
          {/* CSV Export Dropdown */}
          <div className="dropdown position-relative" ref={exportDropdownRef}>
            <button
              className={`btn btn-outline-success d-flex align-items-center gap-2 shadow-sm ${
                isExportDropdownOpen ? 'active' : ''
              }`}
              type="button"
              onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
              aria-expanded={isExportDropdownOpen}
              title={t('reports.exportCsv', 'Export CSV')}
            >
              <i className="bi bi-file-earmark-spreadsheet-fill text-success"></i>
              <span className="fw-medium">{t('reports.exportCsv', 'Export CSV')}</span>
              <i className={`bi bi-chevron-${isExportDropdownOpen ? 'up' : 'down'} small ms-1`}></i>
            </button>

            <ul
              className={`dropdown-menu dropdown-menu-end shadow-sm ${isExportDropdownOpen ? 'show' : ''}`}
              style={{ display: isExportDropdownOpen ? 'block' : 'none', minWidth: '240px' }}
            >
              <li className="dropdown-header text-uppercase small fw-bold">
                <i className="bi bi-download me-1"></i> {t('reports.exportCsv', 'CSV Downloads')}
              </li>
              <li>
                <button
                  type="button"
                  className="dropdown-item d-flex align-items-center gap-2 py-2"
                  onClick={handleExportSummaryCsv}
                >
                  <i className="bi bi-journal-text text-primary"></i>
                  <div>
                    <span className="d-block fw-medium">{t('reports.exportCsvSummary', 'Comprehensive Statistical CSV')}</span>
                    <small className="text-muted">KPIs, sectors, woredas & recommendations</small>
                  </div>
                </button>
              </li>
              <li><hr className="dropdown-divider my-1" /></li>
              <li>
                <button
                  type="button"
                  className="dropdown-item d-flex align-items-center gap-2 py-2"
                  onClick={handleExportWoredaCsv}
                >
                  <i className="bi bi-geo-alt text-danger"></i>
                  <div>
                    <span className="d-block fw-medium">{t('reports.exportCsvWoreda', 'Woreda Territorial Breakdown CSV')}</span>
                    <small className="text-muted">Tabular Woreda counts & regional shares</small>
                  </div>
                </button>
              </li>
            </ul>
          </div>

          {/* Official PDF Report Modal / Direct Print Button */}
          <button
            className="btn btn-primary d-flex align-items-center gap-2 shadow-sm"
            onClick={() => setShowPdfModal(true)}
            title={t('reports.exportPdf', 'Export / Save PDF')}
          >
            <i className="bi bi-file-earmark-pdf-fill"></i>
            <span>{t('reports.exportPdf', 'Export / Save PDF')}</span>
          </button>
        </div>
      </div>

      {/* Row 1: High level summary KPI Cards */}
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
                <div className="text-center py-4 text-muted">{t('reports.noLegalTraders', 'No legal traders recorded yet')}</div>
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
                <div className="text-center py-4 text-muted">{t('reports.noInformalTraders', 'No informal assessments recorded yet')}</div>
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

      {/* Row 3: Territorial Woreda Distribution Table */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
          <h5 className="mb-0 fw-bold">{t('reports.woredaDistribution', 'Trader Distribution across Harari Woredas')}</h5>
          <button
            className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
            onClick={handleExportWoredaCsv}
            title={t('reports.exportCsvWoreda', 'Download Woreda CSV')}
          >
            <i className="bi bi-file-earmark-spreadsheet"></i>
            <span>{t('reports.exportCsv', 'CSV')}</span>
          </button>
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
                const wLegal = legal.filter(tItem => tItem.legalDetails?.woredaId === w.id).length;
                const wInformal = informal.filter(tItem => tItem.informalDetails?.woredaId === w.id).length;
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

      {/* Row 4: Informal Sector Activities & Operating Drivers */}
      <div className="row g-4 mb-4">
        {/* Informal Activities */}
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white py-3">
              <h5 className="mb-0 fw-bold">{t('reports.informalActivities', 'Informal Sector Trade Activities')}</h5>
            </div>
            <div className="card-body">
              {Object.keys(activityCounts).length === 0 ? (
                <div className="text-center py-4 text-muted">{t('reports.noInformalTraders', 'No informal assessments recorded yet')}</div>
              ) : (
                Object.entries(activityCounts).map(([act, count]) => {
                  const percent = informal.length > 0 ? Math.round((count / informal.length) * 100) : 0;
                  return (
                    <div key={act} className="mb-3">
                      <div className="d-flex justify-content-between small fw-medium mb-1">
                        <span>{t(`activity.${act}`, act.replace(/_/g, ' '))}</span>
                        <span>{count} ({percent}%)</span>
                      </div>
                      <div className="progress" style={{ height: 8 }}>
                        <div
                          className="progress-bar bg-warning"
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

        {/* Informal Operating Drivers */}
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white py-3">
              <h5 className="mb-0 fw-bold">{t('reports.informalReasons', 'Reported Reasons for Operating Informally')}</h5>
            </div>
            <div className="card-body">
              {Object.keys(reasonCounts).length === 0 ? (
                <div className="text-center py-4 text-muted">{t('reports.noInformalTraders', 'No informal assessments recorded yet')}</div>
              ) : (
                Object.entries(reasonCounts).map(([reason, count]) => {
                  const percent = informal.length > 0 ? Math.round((count / informal.length) * 100) : 0;
                  return (
                    <div key={reason} className="mb-3">
                      <div className="d-flex justify-content-between small fw-medium mb-1">
                        <span>{t(`reason.${reason}`, reason.replace(/_/g, ' '))}</span>
                        <span>{count} ({percent}%)</span>
                      </div>
                      <div className="progress" style={{ height: 8 }}>
                        <div
                          className="progress-bar bg-info"
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
      </div>

      {/* Official PDF Report / Executive Print Modal */}
      {showPdfModal && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}
        >
          <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content border-0 shadow-lg">
              {/* Modal Toolbar (hidden during print) */}
              <div className="modal-header bg-dark text-white no-print py-2">
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-file-earmark-pdf-fill text-danger fs-5"></i>
                  <h5 className="modal-title fw-bold mb-0">
                    {t('reports.officialReport', 'Official Regional Statistical Report')}
                  </h5>
                </div>

                <div className="d-flex align-items-center gap-2">
                  {/* Language Selector for the Report */}
                  <div className="btn-group btn-group-sm" role="group" aria-label="Report Language">
                    <button
                      type="button"
                      className={`btn btn-sm ${
                        language === 'en' ? 'btn-warning text-dark fw-bold' : 'btn-outline-light'
                      }`}
                      onClick={() => setLanguage('en')}
                    >
                      EN
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${
                        language === 'om' ? 'btn-warning text-dark fw-bold' : 'btn-outline-light'
                      }`}
                      onClick={() => setLanguage('om')}
                    >
                      OM
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${
                        language === 'am' ? 'btn-warning text-dark fw-bold' : 'btn-outline-light'
                      }`}
                      onClick={() => setLanguage('am')}
                    >
                      አማ
                    </button>
                  </div>

                  <button
                    className="btn btn-sm btn-outline-light d-flex align-items-center gap-1"
                    onClick={handleExportSummaryCsv}
                  >
                    <i className="bi bi-file-earmark-spreadsheet"></i>
                    <span>{t('reports.exportCsv', 'Export CSV')}</span>
                  </button>

                  <button
                    className="btn btn-sm btn-primary d-flex align-items-center gap-1"
                    onClick={handlePrint}
                  >
                    <i className="bi bi-printer me-1"></i>
                    <span>{t('reports.printReport', 'Print / Save PDF')}</span>
                  </button>

                  <button
                    type="button"
                    className="btn-close btn-close-white ms-2"
                    onClick={() => setShowPdfModal(false)}
                    aria-label="Close"
                  ></button>
                </div>
              </div>

              {/* Modal Body: High-Fidelity Printable Document */}
              <div className="modal-body p-4 bg-light">
                <div
                  className="printable-report bg-white p-5 border rounded shadow-sm mx-auto"
                  style={{ maxWidth: '900px' }}
                >
                  {/* Government Official Header */}
                  <div className="text-center border-bottom pb-4 mb-4">
                    <div className="d-flex justify-content-center align-items-center gap-3 mb-2">
                      <div
                        className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold shadow-sm"
                        style={{ width: 58, height: 58, fontSize: '1.45rem' }}
                      >
                        HR
                      </div>
                      <div className="text-start">
                        <h4 className="fw-bold mb-0 text-uppercase tracking-wider">
                          {t('cert.stateHeader', 'Harari People National Regional State')}
                        </h4>
                        <div className="text-dark fw-semibold small">
                          {t('brand.agency', 'Trade & Industry Development Agency')} &bull; {t('reports.planningHead', 'Directorate of Planning & Statistics')}
                        </div>
                        <div className="text-muted" style={{ fontSize: '0.78rem' }}>
                          {t('brand.address', 'P.O. Box 24, Harar, Ethiopia')} &bull; Tel: +251 25 666 0145
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 d-flex justify-content-between align-items-center small text-muted px-2">
                      <span className="badge bg-secondary font-monospace">
                        REF: HR-TMIS/STAT-2026/Q1
                      </span>
                      <span>
                        <strong>{t('reports.generatedDate', 'Report Date')}:</strong>{' '}
                        {new Date().toLocaleDateString()}
                      </span>
                      <span>
                        <strong>{t('reports.preparedBy', 'Prepared by')}:</strong>{' '}
                        {currentUser.fullName} ({currentUser.role})
                      </span>
                    </div>
                  </div>

                  {/* Title of the Report */}
                  <div className="text-center mb-4">
                    <h4 className="fw-bold text-uppercase text-primary text-decoration-underline mb-1">
                      {t('reports.officialReport', 'Official Regional Statistical & Analytical Report')}
                    </h4>
                    <p className="text-muted small mb-0">
                      {t('reports.subtitle', 'Comprehensive Trader Formalization & Administrative Directory')}
                    </p>
                  </div>

                  {/* 1. Executive Summary Table */}
                  <h6 className="fw-bold text-dark border-bottom pb-1 mb-2">
                    1. {t('reports.executiveSummary', 'Executive Summary & Key Indicators')}
                  </h6>
                  <table className="table table-bordered table-sm small mb-4">
                    <tbody>
                      <tr>
                        <td className="bg-light fw-bold" style={{ width: '35%' }}>{t('dashboard.totalTraders', 'Total Registered Traders')}</td>
                        <td className="fw-bold font-monospace" style={{ width: '25%' }}>{total}</td>
                        <td className="bg-light fw-bold" style={{ width: '20%' }}>{t('reports.formalRatio', 'Formal Sector Ratio')}</td>
                        <td className="fw-bold text-success" style={{ width: '20%' }}>{total > 0 ? Math.round((legal.length / total) * 100) : 0}%</td>
                      </tr>
                      <tr>
                        <td className="bg-light fw-bold">{t('dashboard.legalTraders', 'Formal & Legal Traders')}</td>
                        <td className="font-monospace">{legal.length}</td>
                        <td className="bg-light fw-bold">{t('reports.informalRatio', 'Informal Sector Ratio')}</td>
                        <td className="fw-bold text-warning">{total > 0 ? Math.round((informal.length / total) * 100) : 0}%</td>
                      </tr>
                      <tr>
                        <td className="bg-light fw-bold">{t('dashboard.informalTraders', 'Informal Traders Captured')}</td>
                        <td className="font-monospace">{informal.length}</td>
                        <td className="bg-light fw-bold">{t('reports.approvalIntegrity', 'Verification Approval Rate')}</td>
                        <td className="fw-bold text-info">{total > 0 ? Math.round((approved / total) * 100) : 0}%</td>
                      </tr>
                      <tr>
                        <td className="bg-light fw-bold">{t('reports.totalInformalCapital', 'Total Informal Capital Assets')}</td>
                        <td className="font-monospace fw-bold text-primary">{totalCapital.toLocaleString()} ETB</td>
                        <td className="bg-light fw-bold">{t('reports.avgPerVendor', 'Average Capital per Vendor')}</td>
                        <td className="font-monospace">{avgCapital.toLocaleString()} ETB</td>
                      </tr>
                      <tr>
                        <td className="bg-light fw-bold">{t('status.APPROVED', 'Approved & Verified Records')}</td>
                        <td className="font-monospace text-success">{approved}</td>
                        <td className="bg-light fw-bold">{t('status.PENDING', 'Pending Verification Queue')}</td>
                        <td className="font-monospace text-warning">{pending}</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* 2. Territorial Woreda Breakdown */}
                  <h6 className="fw-bold text-dark border-bottom pb-1 mb-2">
                    2. {t('reports.woredaDistribution', 'Trader Distribution across Harari Woredas')}
                  </h6>
                  <table className="table table-bordered table-sm small mb-4">
                    <thead className="table-light">
                      <tr>
                        <th>{t('field.woreda', 'Woreda')}</th>
                        <th style={{ width: '15%' }}>{t('locations.kebeleCode', 'Code')}</th>
                        <th style={{ width: '20%' }}>{t('sidebar.legalTraders', 'Legal')}</th>
                        <th style={{ width: '20%' }}>{t('sidebar.informalTraders', 'Informal')}</th>
                        <th style={{ width: '15%' }}>{t('common.records', 'Total')}</th>
                        <th style={{ width: '15%' }}>{t('reports.shareOfTotal', 'Regional Share')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {woredas.map(w => {
                        const wLegal = legal.filter(tItem => tItem.legalDetails?.woredaId === w.id).length;
                        const wInformal = informal.filter(tItem => tItem.informalDetails?.woredaId === w.id).length;
                        const wTotal = wLegal + wInformal;
                        const share = total > 0 ? Math.round((wTotal / total) * 100) : 0;

                        return (
                          <tr key={w.id}>
                            <td className="fw-semibold">{w.name}</td>
                            <td className="font-monospace">{w.code}</td>
                            <td>{wLegal}</td>
                            <td>{wInformal}</td>
                            <td className="fw-bold">{wTotal}</td>
                            <td>{share}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* 3. Formal Sectors & Informal Pipeline */}
                  <div className="row g-3 mb-4">
                    <div className="col-sm-6">
                      <h6 className="fw-bold text-dark border-bottom pb-1 mb-2">
                        3. {t('reports.formalSectors', 'Formal Business Sectors')}
                      </h6>
                      <table className="table table-bordered table-sm small mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>{t('reports.sector', 'Sector')}</th>
                            <th style={{ width: '25%' }}>{t('reports.count', 'Count')}</th>
                            <th style={{ width: '25%' }}>{t('reports.share', 'Share')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(sectorCounts).map(([sec, count]) => {
                            const share = legal.length > 0 ? Math.round((count / legal.length) * 100) : 0;
                            return (
                              <tr key={sec}>
                                <td>{t(`sector.${sec}`, sec.replace(/_/g, ' '))}</td>
                                <td className="fw-bold">{count}</td>
                                <td>{share}%</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="col-sm-6">
                      <h6 className="fw-bold text-dark border-bottom pb-1 mb-2">
                        4. {t('reports.transitionRecommendations', 'Transition Recommendations')}
                      </h6>
                      <table className="table table-bordered table-sm small mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>{t('field.formalizationStatusRecommendation', 'Roadmap')}</th>
                            <th style={{ width: '25%' }}>{t('reports.count', 'Count')}</th>
                            <th style={{ width: '25%' }}>{t('reports.share', 'Share')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(recoCounts).map(([rec, count]) => {
                            const share = informal.length > 0 ? Math.round((count / informal.length) * 100) : 0;
                            return (
                              <tr key={rec}>
                                <td>{t(`reco.${rec}`, rec.replace(/_/g, ' '))}</td>
                                <td className="fw-bold">{count}</td>
                                <td>{share}%</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Signatures & Official Authority Block */}
                  <div className="row pt-4 mt-4 border-top text-center">
                    <div className="col-4">
                      <div className="small text-muted mb-4">{t('reports.preparedBy', 'Prepared by')}</div>
                      <div className="fw-bold small">{currentUser.fullName}</div>
                      <div className="border-bottom mx-auto mt-2" style={{ width: '80%' }}></div>
                      <div className="text-muted" style={{ fontSize: '0.68rem' }}>{currentUser.department || 'Trade Registry & Formalization'}</div>
                    </div>

                    <div className="col-4">
                      <div
                        className="border border-danger rounded-circle mx-auto d-flex flex-column align-items-center justify-content-center text-danger p-2"
                        style={{ width: 92, height: 92, opacity: 0.85 }}
                      >
                        <i className="bi bi-patch-check fs-4"></i>
                        <span style={{ fontSize: '0.52rem', fontWeight: 800 }}>HARARI REGION</span>
                        <span style={{ fontSize: '0.48rem' }}>OFFICIAL SEAL</span>
                      </div>
                    </div>

                    <div className="col-4">
                      <div className="small text-muted mb-4">{t('reports.agencyHead', 'Agency Director General')}</div>
                      <div className="fw-bold small">Dr. Ahmed Hassen</div>
                      <div className="border-bottom mx-auto mt-2" style={{ width: '80%' }}></div>
                      <div className="text-muted" style={{ fontSize: '0.68rem' }}>{t('reports.authorizedSign', 'Authorized Seal & Signature')}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer (hidden during print) */}
              <div className="modal-footer bg-light no-print">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowPdfModal(false)}
                >
                  {t('common.close', 'Close')}
                </button>
                <button
                  type="button"
                  className="btn btn-outline-success d-flex align-items-center gap-1"
                  onClick={handleExportSummaryCsv}
                >
                  <i className="bi bi-file-earmark-spreadsheet"></i>
                  <span>{t('reports.exportCsv', 'Export CSV')}</span>
                </button>
                <button
                  type="button"
                  className="btn btn-primary d-flex align-items-center gap-1"
                  onClick={handlePrint}
                >
                  <i className="bi bi-printer me-1"></i>
                  <span>{t('reports.printReport', 'Print / Save PDF')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
