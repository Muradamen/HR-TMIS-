import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../i18n/context';
import { TraderType, TraderStatus } from '../../types';

interface TradersListProps {
  initialTypeFilter?: TraderType | 'ALL';
  initialStatusFilter?: TraderStatus | 'ALL';
  title?: string;
  onSelectTrader: (traderId: string) => void;
  onOpenRegisterType: () => void;
  onPrintCertificate: (traderId: string) => void;
}

export const TradersList: React.FC<TradersListProps> = ({
  initialTypeFilter = 'ALL',
  initialStatusFilter = 'ALL',
  title = 'Traders Directory',
  onSelectTrader,
  onOpenRegisterType,
  onPrintCertificate,
}) => {
  const { traders, woredas, getWoredaName, getKebeleName, currentUser, verifyTrader, showAlert } = useApp();
  const { t } = useTranslation();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TraderType | 'ALL'>(initialTypeFilter);
  const [statusFilter, setStatusFilter] = useState<TraderStatus | 'ALL'>(initialStatusFilter);
  const [woredaFilter, setWoredaFilter] = useState<string>('ALL');

  const getTranslatedTitle = () => {
    if (title === 'All Registered Traders' || title === 'Traders Directory') {
      return t('list.titleAll', 'All Registered Traders');
    }
    if (title === 'Legal Traders Registry') {
      return t('list.titleLegal', 'Legal Traders Registry');
    }
    if (title === 'Informal Traders Assessment Directory') {
      return t('list.titleInformal', 'Informal Traders Assessment Directory');
    }
    if (title === 'Verification & Approval Queue') {
      return t('list.titleVerification', 'Verification & Approval Queue');
    }
    return title;
  };

  const filteredTraders = traders.filter(tTrader => {
    // Type Filter
    if (typeFilter !== 'ALL' && tTrader.traderType !== typeFilter) return false;

    // Status Filter
    if (statusFilter !== 'ALL' && tTrader.status !== statusFilter) return false;

    // Woreda Filter
    const traderWoredaId =
      tTrader.traderType === 'LEGAL'
        ? tTrader.legalDetails?.woredaId
        : tTrader.informalDetails?.woredaId;
    if (woredaFilter !== 'ALL' && traderWoredaId !== Number(woredaFilter)) return false;

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const idMatch = tTrader.traderId.toLowerCase().includes(q);
      const nameMatch =
        tTrader.traderType === 'LEGAL'
          ? tTrader.legalDetails?.tradeName.toLowerCase().includes(q) ||
            tTrader.legalDetails?.ownerFullName.toLowerCase().includes(q) ||
            tTrader.legalDetails?.tin.toLowerCase().includes(q)
          : tTrader.informalDetails?.fullName.toLowerCase().includes(q) ||
            tTrader.informalDetails?.phoneNumber?.toLowerCase().includes(q) ||
            tTrader.informalDetails?.nationalIdResidentId?.toLowerCase().includes(q);
      return idMatch || nameMatch;
    }

    return true;
  });

  const exportCSV = (exportAll = false) => {
    const dataToExport = exportAll ? traders : filteredTraders;

    if (dataToExport.length === 0) {
      showAlert('warning', 'No trader records available to export.');
      return;
    }

    const headers = [
      'Trader ID',
      'Trader Type',
      'Status',
      'Entity Name / Full Name',
      'Owner Full Name',
      'TIN',
      'Trade Registration Number',
      'National ID / Resident ID',
      'Phone Number',
      'Gender',
      'Age',
      'Region',
      'Woreda',
      'Kebele',
      'Specific Address / Market Area',
      'Business Sector / Trade Activity',
      'Trade Scale',
      'Ownership Type',
      'Estimated Capital Assets (ETB)',
      'Reason For Operating Informally',
      'Formalization Recommendation',
      'Issuing Institution / Enumerator',
      'Date of Issuance / Assessment',
      'Registered By',
      'Date Registered',
      'Verification Status',
      'Verification Notes',
      'Verified By'
    ];

    const rows = dataToExport.map(tTrader => {
      const isLegal = tTrader.traderType === 'LEGAL';
      const legal = tTrader.legalDetails;
      const informal = tTrader.informalDetails;

      const woredaId = isLegal ? legal?.woredaId : informal?.woredaId;
      const kebeleId = isLegal ? legal?.kebeleId : informal?.kebeleId;

      return [
        tTrader.traderId,
        tTrader.traderType,
        tTrader.status,
        isLegal ? (legal?.tradeName || '') : (informal?.fullName || ''),
        isLegal ? (legal?.ownerFullName || '') : (informal?.fullName || ''),
        isLegal ? (legal?.tin || '') : '',
        isLegal ? (legal?.tradeRegistrationNumber || '') : '',
        !isLegal ? (informal?.nationalIdResidentId || '') : '',
        !isLegal ? (informal?.phoneNumber || '') : '',
        isLegal ? (legal?.gender || '') : (informal?.gender || ''),
        isLegal ? (legal?.age ?? '') : (informal?.age ?? ''),
        isLegal ? (legal?.region || 'Harari Region') : (informal?.region || 'Harari Region'),
        woredaId ? getWoredaName(woredaId) : '',
        kebeleId ? getKebeleName(kebeleId) : '',
        isLegal ? (legal?.houseNumberPlotId || '') : (informal?.specificLocationMarketArea || ''),
        isLegal ? (legal?.businessSector?.replace(/_/g, ' ') || '') : (informal?.natureOfTradeActivity?.replace(/_/g, ' ') || ''),
        isLegal ? (legal?.tradeScale || '') : '',
        isLegal ? (legal?.businessOwnershipType?.replace(/_/g, ' ') || '') : '',
        !isLegal ? (informal?.estimatedCapitalAssets ?? '') : '',
        !isLegal ? (informal?.reasonForOperatingInformally?.replace(/_/g, ' ') || '') : '',
        !isLegal ? (informal?.formalizationStatusRecommendation?.replace(/_/g, ' ') || '') : '',
        isLegal ? (legal?.issuingInstitution || '') : (informal?.enumeratorDataCollectorName || ''),
        isLegal ? (legal?.dateOfIssuance || '') : (informal?.dateOfAssessment || ''),
        tTrader.registeredBy || '',
        new Date(tTrader.createdAt).toLocaleDateString(),
        tTrader.status,
        tTrader.verificationNotes || '',
        tTrader.verifiedBy || ''
      ];
    });

    // Escape CSV values
    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.map(escapeCsv).join(','), ...rows.map(r => r.map(escapeCsv).join(','))].join('\r\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `harari_region_traders_registry_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showAlert('success', `Exported ${dataToExport.length} trader records to CSV successfully.`);
  };

  const isVerifier =
    currentUser.role === 'DIRECTOR' ||
    currentUser.role === 'AGENCY_LEADER' ||
    currentUser.role === 'SYSTEM_ADMINISTRATOR';

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h2 className="fw-bold mb-1">{getTranslatedTitle()}</h2>
          <p className="text-muted small mb-0">
            {t('list.showing', 'Showing')} {filteredTraders.length} {t('list.of', 'of')} {traders.length} {t('list.recordsInRegistry', 'records in Harari Region registry')}
          </p>
        </div>
        <div className="d-flex gap-2">
          {/* Export to CSV Button */}
          <div className="btn-group">
            <button
              className="btn btn-outline-success d-flex align-items-center gap-2 shadow-sm"
              onClick={() => exportCSV(false)}
              title="Download currently filtered registry data as CSV"
            >
              <i className="bi bi-file-earmark-excel-fill text-success fs-6"></i>
              <span className="fw-medium">{t('list.exportCsv', 'Export to CSV')}</span>
            </button>
            <button
              type="button"
              className="btn btn-outline-success dropdown-toggle dropdown-toggle-split"
              data-bs-toggle="dropdown"
              aria-expanded="false"
              title="Export options"
            >
              <span className="visually-hidden">Toggle Dropdown</span>
            </button>
            <ul className="dropdown-menu dropdown-menu-end shadow-sm">
              <li>
                <button className="dropdown-item d-flex align-items-center gap-2" onClick={() => exportCSV(false)}>
                  <i className="bi bi-funnel"></i>
                  <span>{t('list.exportFiltered', 'Export Filtered')} ({filteredTraders.length})</span>
                </button>
              </li>
              <li>
                <button className="dropdown-item d-flex align-items-center gap-2" onClick={() => exportCSV(true)}>
                  <i className="bi bi-database-down"></i>
                  <span>{t('list.exportEntire', 'Export Entire Registry')} ({traders.length})</span>
                </button>
              </li>
            </ul>
          </div>

          <button className="btn btn-primary d-flex align-items-center gap-1 shadow-sm" onClick={onOpenRegisterType}>
            <i className="bi bi-person-plus-fill"></i>
            <span>{t('nav.registerTrader', 'Register Trader')}</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-2 align-items-center">
            {/* Search */}
            <div className="col-lg-4 col-md-6">
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0">
                  <i className="bi bi-search text-muted"></i>
                </span>
                <input
                  type="text"
                  className="form-control border-start-0"
                  placeholder={t('nav.searchPlaceholder', 'Search by ID, Name, TIN, Phone...')}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button className="btn btn-outline-secondary border-start-0" onClick={() => setSearchQuery('')}>
                    <i className="bi bi-x"></i>
                  </button>
                )}
              </div>
            </div>

            {/* Type Filter */}
            <div className="col-lg-2 col-md-3 col-6">
              <select
                className="form-select"
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value as TraderType | 'ALL')}
              >
                <option value="ALL">{t('list.allTypes', 'All Trader Types')}</option>
                <option value="LEGAL">{t('list.legalOnly', 'Legal Traders Only')}</option>
                <option value="INFORMAL">{t('list.informalOnly', 'Informal Traders Only')}</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="col-lg-2 col-md-3 col-6">
              <select
                className="form-select"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as TraderStatus | 'ALL')}
              >
                <option value="ALL">{t('list.allStatuses', 'All Statuses')}</option>
                <option value="PENDING">{t('list.pendingOnly', 'Pending Verification')}</option>
                <option value="APPROVED">{t('list.approvedOnly', 'Approved')}</option>
                <option value="RETURNED">{t('list.returnedOnly', 'Returned')}</option>
              </select>
            </div>

            {/* Woreda Filter */}
            <div className="col-lg-3 col-md-6 col-8">
              <select
                className="form-select"
                value={woredaFilter}
                onChange={e => setWoredaFilter(e.target.value)}
              >
                <option value="ALL">{t('list.allWoredas', 'All Harari Woredas')}</option>
                {woredas.map(w => (
                  <option key={w.id} value={w.id.toString()}>
                    {w.name} ({w.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Reset Filters */}
            <div className="col-lg-1 col-md-6 col-4 text-end">
              <button
                className="btn btn-light border w-100"
                onClick={() => {
                  setSearchQuery('');
                  setTypeFilter('ALL');
                  setStatusFilter('ALL');
                  setWoredaFilter('ALL');
                }}
                title={t('common.reset', 'Reset filters')}
              >
                <i className="bi bi-arrow-counterclockwise"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th style={{ width: '130px' }}>{t('field.traderId', 'Trader ID')}</th>
                <th>{t('common.details', 'Trader / Company Details')}</th>
                <th>{t('common.category', 'Category')}</th>
                <th>{t('field.woreda', 'Woreda')} &amp; {t('field.kebele', 'Kebele')}</th>
                <th>{t('common.status', 'Verification Status')}</th>
                <th>{t('field.registeredBy', 'Registered By')}</th>
                <th className="text-end" style={{ width: '170px' }}>{t('common.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredTraders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-5 text-muted">
                    <i className="bi bi-inbox fs-1 d-block mb-2"></i>
                    <div className="fw-medium">{t('list.noMatching', 'No traders match your filter criteria')}</div>
                    <small>{t('list.noMatchingHint', 'Try clearing your search terms or register a new trader')}</small>
                  </td>
                </tr>
              ) : (
                filteredTraders.map(tTrader => {
                  const isLegal = tTrader.traderType === 'LEGAL';
                  const primaryName = isLegal ? tTrader.legalDetails?.tradeName : tTrader.informalDetails?.fullName;
                  const secondaryInfo = isLegal
                    ? `${t('field.ownerFullName', 'Owner')}: ${tTrader.legalDetails?.ownerFullName} | TIN: ${tTrader.legalDetails?.tin}`
                    : `${t('field.natureOfTradeActivity', 'Activity')}: ${t(`activity.${tTrader.informalDetails?.natureOfTradeActivity}`, tTrader.informalDetails?.natureOfTradeActivity?.replace(/_/g, ' ') || '')} | Cap: ${tTrader.informalDetails?.estimatedCapitalAssets?.toLocaleString()} ETB`;
                  const woredaId = isLegal ? tTrader.legalDetails?.woredaId : tTrader.informalDetails?.woredaId;
                  const kebeleId = isLegal ? tTrader.legalDetails?.kebeleId : tTrader.informalDetails?.kebeleId;

                  return (
                    <tr key={tTrader.traderId}>
                      <td>
                        <button
                          className="btn btn-link p-0 text-decoration-none fw-bold text-primary font-monospace"
                          onClick={() => onSelectTrader(tTrader.traderId)}
                        >
                          {tTrader.traderId}
                        </button>
                        <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                          {new Date(tTrader.createdAt).toLocaleDateString()}
                        </div>
                      </td>

                      <td>
                        <div className="fw-semibold text-dark">{primaryName}</div>
                        <div className="text-muted small text-truncate" style={{ maxWidth: '300px' }}>
                          {secondaryInfo}
                        </div>
                      </td>

                      <td>
                        <span
                          className={`badge ${
                            isLegal ? 'bg-success' : 'bg-warning text-dark'
                          }`}
                        >
                          {t(`type.${tTrader.traderType}`, tTrader.traderType)}
                        </span>
                      </td>

                      <td className="small">
                        <div className="fw-medium">{woredaId ? getWoredaName(woredaId) : '-'}</div>
                        <div className="text-muted">{kebeleId ? getKebeleName(kebeleId) : ''}</div>
                      </td>

                      <td>
                        {tTrader.status === 'APPROVED' && (
                          <span className="badge bg-success d-inline-flex align-items-center gap-1">
                            <i className="bi bi-check-circle-fill"></i> {t('status.APPROVED', 'Approved')}
                          </span>
                        )}
                        {tTrader.status === 'PENDING' && (
                          <span className="badge bg-warning text-dark d-inline-flex align-items-center gap-1">
                            <i className="bi bi-clock-fill"></i> {t('status.PENDING', 'Pending')}
                          </span>
                        )}
                        {tTrader.status === 'RETURNED' && (
                          <span className="badge bg-danger d-inline-flex align-items-center gap-1">
                            <i className="bi bi-arrow-return-left"></i> {t('status.RETURNED', 'Returned')}
                          </span>
                        )}
                      </td>

                      <td className="small text-muted">
                        <div>{tTrader.registeredBy}</div>
                      </td>

                      <td className="text-end">
                        <div className="btn-group btn-group-sm">
                          <button
                            className="btn btn-light border"
                            onClick={() => onSelectTrader(tTrader.traderId)}
                            title={t('common.view', 'View full record')}
                          >
                            <i className="bi bi-eye"></i>
                          </button>
                          <button
                            className="btn btn-light border text-primary"
                            onClick={() => onPrintCertificate(tTrader.traderId)}
                            title={t('common.print', 'Print registration certificate')}
                          >
                            <i className="bi bi-printer"></i>
                          </button>
                          {isVerifier && tTrader.status === 'PENDING' && (
                            <button
                              className="btn btn-light border text-success"
                              onClick={() => verifyTrader(tTrader.traderId, 'APPROVED', 'Fast approved from list')}
                              title={t('list.quickApprove', 'Quick Approve')}
                            >
                              <i className="bi bi-check-lg"></i>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
