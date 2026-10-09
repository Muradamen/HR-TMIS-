import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../i18n/context';
import { TraderType, TraderStatus, Trader } from '../../types';
import { traderService } from '../../services/trader.service';
import { reportsService } from '../../services/reports.service';
import { verificationService } from '../../services/verification.service';

interface TradersListProps {
  initialTypeFilter?: TraderType | 'ALL';
  initialStatusFilter?: TraderStatus | 'ALL';
  title?: string;
  onSelectTrader: (traderId: string) => void;
  onOpenRegisterType: () => void;
  onPrintCertificate: (traderId: string) => void;
}

const BUSINESS_SECTORS = [
  { value: 'GENERAL_TRADE', labelKey: 'sector.GENERAL_TRADE', fallback: 'General Trade' },
  { value: 'RETAIL_WHOLESALE_GOODS', labelKey: 'sector.RETAIL_WHOLESALE_GOODS', fallback: 'Retail & Wholesale Goods' },
  { value: 'AGRICULTURE_AGRO_PROCESSING', labelKey: 'sector.AGRICULTURE_AGRO_PROCESSING', fallback: 'Agriculture & Agro Processing' },
  { value: 'MANUFACTURING_PRODUCTION', labelKey: 'sector.MANUFACTURING_PRODUCTION', fallback: 'Manufacturing & Production' },
  { value: 'SERVICE_PROVIDER', labelKey: 'sector.SERVICE_PROVIDER', fallback: 'Service Provider' },
  { value: 'OTHER', labelKey: 'sector.OTHER', fallback: 'Other' },
];

export const TradersList: React.FC<TradersListProps> = ({
  initialTypeFilter = 'ALL',
  initialStatusFilter = 'ALL',
  title = 'Traders Directory',
  onSelectTrader,
  onOpenRegisterType,
  onPrintCertificate,
}) => {
  const { traders, woredas, kebeles, users, getWoredaName, getKebeleName, currentUser, verifyTrader, showAlert, cacheTraders } = useApp();
  const { t } = useTranslation();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TraderType | 'ALL'>(initialTypeFilter);
  const [statusFilter, setStatusFilter] = useState<TraderStatus | 'ALL'>(initialStatusFilter);
  const [regionFilter, setRegionFilter] = useState<string>('ALL');
  const [woredaFilter, setWoredaFilter] = useState<string>('ALL');
  const [kebeleFilter, setKebeleFilter] = useState<string>('ALL');
  const [sectorFilter, setSectorFilter] = useState<string>('ALL');
  const [reviewerFilter, setReviewerFilter] = useState<string>('ALL');

  // Pagination State
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Server Data & Loading State
  const [displayedTraders, setDisplayedTraders] = useState<Trader[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isBulkApproving, setIsBulkApproving] = useState<boolean>(false);

  // Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // UI Dropdowns
  const [isExportOpen, setIsExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const headerCheckboxRef = useRef<HTMLInputElement>(null);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Click outside listener for export dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setIsExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered Kebeles based on selected Woreda
  const availableKebeles = useMemo(() => {
    if (woredaFilter === 'ALL') {
      return kebeles;
    }
    const woredaIdNum = Number(woredaFilter);
    return kebeles.filter(k => k.woredaId === woredaIdNum);
  }, [kebeles, woredaFilter]);

  // Reviewer options (Directors & Administrators)
  const availableReviewers = useMemo(() => {
    return users.filter(u => u.role === 'DIRECTOR');
  }, [users]);

  // Active filter payload for API and export calls
  const activeFilters = useMemo(() => {
    const f: Record<string, any> = {};
    if (debouncedSearch) f.search = debouncedSearch;
    if (typeFilter !== 'ALL') f.type = typeFilter;
    if (statusFilter !== 'ALL') f.status = statusFilter;
    if (regionFilter !== 'ALL') f.region = regionFilter;
    if (woredaFilter !== 'ALL') f.woreda = woredaFilter;
    if (kebeleFilter !== 'ALL') f.kebele = kebeleFilter;
    if (sectorFilter !== 'ALL') f.sector = sectorFilter;
    if (reviewerFilter !== 'ALL') f.reviewer = reviewerFilter;
    return f;
  }, [debouncedSearch, typeFilter, statusFilter, regionFilter, woredaFilter, kebeleFilter, sectorFilter, reviewerFilter]);

  // Fetch paginated traders from Django REST API with client-side fallback
  const fetchTraders = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, any> = {
        page,
        page_size: pageSize,
        ...activeFilters,
      };
      const response = await traderService.getPaginatedTraders(params);
      setDisplayedTraders(response.results);
      cacheTraders(response.results);
      setTotalCount(response.count);
    } catch (err) {
      console.warn('Backend pagination request failed, applying client-side filter fallback:', err);
      // Fallback to local traders if offline
      let filtered = [...traders];
      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase();
        filtered = filtered.filter(t => {
          const idMatch = t.traderId.toLowerCase().includes(q);
          const nameMatch =
            t.traderType === 'LEGAL'
              ? t.legalDetails?.tradeName?.toLowerCase().includes(q) ||
                t.legalDetails?.ownerFullName?.toLowerCase().includes(q) ||
                t.legalDetails?.tin?.toLowerCase().includes(q) ||
                t.legalDetails?.tradeRegistrationNumber?.toLowerCase().includes(q)
              : t.informalDetails?.fullName?.toLowerCase().includes(q) ||
                t.informalDetails?.phoneNumber?.toLowerCase().includes(q) ||
                t.informalDetails?.nationalIdResidentId?.toLowerCase().includes(q);
          return idMatch || nameMatch;
        });
      }
      if (typeFilter !== 'ALL') filtered = filtered.filter(t => t.traderType === typeFilter);
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'PENDING') {
          filtered = filtered.filter(t => ['PENDING', 'SUBMITTED', 'UNDER_REVIEW'].includes(t.status));
        } else if (statusFilter === 'RETURNED') {
          filtered = filtered.filter(t => ['RETURNED', 'NEEDS_CORRECTION'].includes(t.status));
        } else {
          filtered = filtered.filter(t => t.status === statusFilter);
        }
      }
      if (woredaFilter !== 'ALL') {
        filtered = filtered.filter(t => {
          const wId = t.traderType === 'LEGAL' ? t.legalDetails?.woredaId : t.informalDetails?.woredaId;
          return wId === Number(woredaFilter);
        });
      }
      if (kebeleFilter !== 'ALL') {
        filtered = filtered.filter(t => {
          const kId = t.traderType === 'LEGAL' ? t.legalDetails?.kebeleId : t.informalDetails?.kebeleId;
          return kId === Number(kebeleFilter);
        });
      }
      if (sectorFilter !== 'ALL') {
        filtered = filtered.filter(t => t.traderType === 'LEGAL' && t.legalDetails?.businessSector === sectorFilter);
      }
      setTotalCount(filtered.length);
      const startIdx = (page - 1) * pageSize;
      setDisplayedTraders(filtered.slice(startIdx, startIdx + pageSize));
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, activeFilters, traders, debouncedSearch, typeFilter, statusFilter, woredaFilter, kebeleFilter, sectorFilter, cacheTraders]);

  useEffect(() => {
    fetchTraders();
  }, [fetchTraders]);

  // Checkbox state for header
  const isAllCurrentPageSelected = useMemo(() => {
    return displayedTraders.length > 0 && displayedTraders.every(t => selectedIds.has(t.traderId));
  }, [displayedTraders, selectedIds]);

  const isSomeCurrentPageSelected = useMemo(() => {
    return displayedTraders.some(t => selectedIds.has(t.traderId)) && !isAllCurrentPageSelected;
  }, [displayedTraders, selectedIds, isAllCurrentPageSelected]);

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = isSomeCurrentPageSelected;
    }
  }, [isSomeCurrentPageSelected]);

  // Selection Actions
  const toggleSelectAllCurrentPage = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (isAllCurrentPageSelected) {
        displayedTraders.forEach(t => next.delete(t.traderId));
      } else {
        displayedTraders.forEach(t => next.add(t.traderId));
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const toggleSelectRow = (traderId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(traderId)) {
        next.delete(traderId);
      } else {
        next.add(traderId);
      }
      return next;
    });
  };

  const handleBulkApprove = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      showAlert('warning', t('verification.selectRecords', 'Select at least one pending record.'));
      return;
    }
    if (ids.length > 100) {
      showAlert('warning', t('verification.maxBulk', 'Approve no more than 100 records at once.'));
      return;
    }
    if (!window.confirm(t('verification.confirmBulkApprove', `Approve ${ids.length} selected records?`))) {
      return;
    }

    setIsBulkApproving(true);
    try {
      const result = await verificationService.bulkApproveTraders(ids);
      cacheTraders(result.traders);
      setSelectedIds(new Set());
      showAlert('success', t('verification.bulkApproved', `Successfully approved ${result.approved_count} records.`));
      await fetchTraders();
    } catch (err: any) {
      showAlert('danger', err?.message || t('verification.bulkFailed', 'Bulk approval failed. No records were changed.'));
    } finally {
      setIsBulkApproving(false);
    }
  };

  // Export Selected Handlers
  const handleExportSelectedExcel = async () => {
    if (selectedIds.size === 0) {
      showAlert('warning', t('list.noSelectedError', 'Please select at least one trader record to export.'));
      return;
    }
    setIsExporting(true);
    try {
      await reportsService.exportSelectedExcel(Array.from(selectedIds));
      showAlert('success', `${t('common.export', 'Exported')} ${selectedIds.size} ${t('list.tradersSelected', 'traders to Excel successfully.')}`);
    } catch (err: any) {
      showAlert('danger', err?.message || 'Failed to export selected traders to Excel.');
    } finally {
      setIsExporting(false);
      setIsExportOpen(false);
    }
  };

  const handleExportSelectedPdf = async () => {
    if (selectedIds.size === 0) {
      showAlert('warning', t('list.noSelectedError', 'Please select at least one trader record to export.'));
      return;
    }
    setIsExporting(true);
    try {
      await reportsService.exportSelectedPdf(Array.from(selectedIds));
      showAlert('success', `${t('common.export', 'Exported')} ${selectedIds.size} ${t('list.tradersSelected', 'traders to PDF successfully.')}`);
    } catch (err: any) {
      showAlert('danger', err?.message || 'Failed to export selected traders to PDF.');
    } finally {
      setIsExporting(false);
      setIsExportOpen(false);
    }
  };

  // Export All Filtered Handlers
  const handleExportAllFilteredExcel = async () => {
    setIsExporting(true);
    try {
      await reportsService.exportFilteredExcel(activeFilters);
      showAlert('success', t('reports.csvExportSuccess', 'Exported all filtered traders to Excel successfully.'));
    } catch (err: any) {
      showAlert('danger', err?.message || 'Failed to export filtered traders to Excel.');
    } finally {
      setIsExporting(false);
      setIsExportOpen(false);
    }
  };

  const handleExportAllFilteredPdf = async () => {
    setIsExporting(true);
    try {
      await reportsService.exportFilteredPdf(activeFilters);
      showAlert('success', 'Exported all filtered traders to PDF successfully.');
    } catch (err: any) {
      if (err?.code === 'PDF_LIMIT_EXCEEDED') {
        showAlert('warning', err.message);
      } else {
        showAlert('danger', err?.message || 'Failed to export filtered traders to PDF.');
      }
    } finally {
      setIsExporting(false);
      setIsExportOpen(false);
    }
  };

  const handleExportAllFilteredCsv = async () => {
    setIsExporting(true);
    try {
      await reportsService.downloadCsv(activeFilters);
      showAlert('success', 'Exported all filtered traders to CSV successfully.');
    } catch (err: any) {
      showAlert('danger', err?.message || 'Failed to export filtered traders to CSV.');
    } finally {
      setIsExporting(false);
      setIsExportOpen(false);
    }
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setTypeFilter('ALL');
    setStatusFilter('ALL');
    setRegionFilter('ALL');
    setWoredaFilter('ALL');
    setKebeleFilter('ALL');
    setSectorFilter('ALL');
    setReviewerFilter('ALL');
    setPage(1);
  };

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

  // Operational verification control: strictly Directors only
  const isVerifier = currentUser.role === 'DIRECTOR';

  // Pagination bounds calculation
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startRecord = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRecord = Math.min(page * pageSize, totalCount);

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h2 className="fw-bold mb-1">{getTranslatedTitle()}</h2>
          <p className="text-muted small mb-0">
            {t('list.showing', 'Showing')} {startRecord} - {endRecord} {t('list.of', 'of')} {totalCount} {t('list.recordsInRegistry', 'records in Harari Region registry')}
          </p>
        </div>
        <div className="d-flex gap-2 align-items-center">
          {currentUser.role === 'DIRECTOR' && statusFilter === 'PENDING' && (
            <button
              className="btn btn-success d-flex align-items-center gap-2"
              onClick={handleBulkApprove}
              disabled={selectedIds.size === 0 || selectedIds.size > 100 || isBulkApproving}
              title={t('verification.bulkApproveTitle', 'Approve selected pending records')}
            >
              {isBulkApproving
                ? <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                : <i className="bi bi-check2-all"></i>}
              {t('verification.approveSelected', 'Approve selected')} ({selectedIds.size})
            </button>
          )}
          {/* Export Dropdown Menu */}
          <div className="btn-group position-relative" ref={exportRef}>
            <button
              className="btn btn-outline-success d-flex align-items-center gap-2 shadow-sm"
              onClick={() => setIsExportOpen(!isExportOpen)}
              disabled={isExporting}
              title="Export registry data to Excel, PDF, or CSV"
            >
              {isExporting ? (
                <span className="spinner-border spinner-border-sm text-success" role="status" aria-hidden="true"></span>
              ) : (
                <i className="bi bi-download text-success fs-6"></i>
              )}
              <span className="fw-medium">{isExporting ? t('common.loading', 'Exporting...') : t('common.export', 'Export')}</span>
              <i className="bi bi-chevron-down small"></i>
            </button>
            <ul
              className={`dropdown-menu dropdown-menu-end shadow-sm ${isExportOpen ? 'show' : ''}`}
              style={{ display: isExportOpen ? 'block' : 'none', minWidth: '240px' }}
            >
              <li className="dropdown-header text-uppercase small fw-bold text-muted px-3 py-1">
                {t('list.selectedCount', 'Selected Records')} ({selectedIds.size})
              </li>
              <li>
                <button
                  className="dropdown-item d-flex align-items-center gap-2 py-2"
                  onClick={handleExportSelectedExcel}
                  disabled={selectedIds.size === 0 || isExporting}
                >
                  <i className="bi bi-file-earmark-excel text-success fs-5"></i>
                  <div>
                    <div className="fw-semibold">{t('list.exportSelectedExcel', 'Export Selected to Excel')}</div>
                    <small className="text-muted">{selectedIds.size} {t('list.tradersSelected', 'records')}</small>
                  </div>
                </button>
              </li>
              <li>
                <button
                  className="dropdown-item d-flex align-items-center gap-2 py-2"
                  onClick={handleExportSelectedPdf}
                  disabled={selectedIds.size === 0 || isExporting}
                >
                  <i className="bi bi-file-earmark-pdf text-danger fs-5"></i>
                  <div>
                    <div className="fw-semibold">{t('list.exportSelectedPdf', 'Export Selected to PDF')}</div>
                    <small className="text-muted">{selectedIds.size} {t('list.tradersSelected', 'records')}</small>
                  </div>
                </button>
              </li>
              <li><hr className="dropdown-divider" /></li>
              <li className="dropdown-header text-uppercase small fw-bold text-muted px-3 py-1">
                {t('list.exportFiltered', 'Filtered Results')} ({totalCount})
              </li>
              <li>
                <button
                  className="dropdown-item d-flex align-items-center gap-2 py-2"
                  onClick={handleExportAllFilteredExcel}
                  disabled={isExporting}
                >
                  <i className="bi bi-file-earmark-excel-fill text-success fs-5"></i>
                  <div>
                    <div className="fw-semibold">{t('list.exportAllFilteredExcel', 'Export All Filtered to Excel')}</div>
                    <small className="text-muted">{totalCount} {t('list.recordsInRegistry', 'records')}</small>
                  </div>
                </button>
              </li>
              <li>
                <button
                  className="dropdown-item d-flex align-items-center gap-2 py-2"
                  onClick={handleExportAllFilteredPdf}
                  disabled={isExporting}
                >
                  <i className="bi bi-file-earmark-pdf-fill text-danger fs-5"></i>
                  <div>
                    <div className="fw-semibold">{t('list.exportAllFilteredPdf', 'Export All Filtered to PDF')}</div>
                    <small className="text-muted">{totalCount} {t('list.recordsInRegistry', 'records')}</small>
                  </div>
                </button>
              </li>
              <li>
                <button
                  className="dropdown-item d-flex align-items-center gap-2 py-2"
                  onClick={handleExportAllFilteredCsv}
                  disabled={isExporting}
                >
                  <i className="bi bi-filetype-csv text-primary fs-5"></i>
                  <div>
                    <div className="fw-semibold">{t('list.exportCsv', 'Export All Filtered to CSV')}</div>
                    <small className="text-muted">{totalCount} {t('list.recordsInRegistry', 'records')}</small>
                  </div>
                </button>
              </li>
            </ul>
          </div>

          {currentUser.role === 'DATA_ENCODER' && (
          <button className="btn btn-primary d-flex align-items-center gap-1 shadow-sm" onClick={onOpenRegisterType}>
            <i className="bi bi-person-plus-fill"></i>
            <span>{t('nav.registerTrader', 'Register Trader')}</span>
          </button>
          )}
        </div>
      </div>

      {/* Multi-Field Filter Card */}
      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body p-3">
          <div className="row g-2 align-items-center">
            {/* Search Query */}
            <div className="col-lg-3 col-md-6">
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0">
                  <i className="bi bi-search text-muted"></i>
                </span>
                <input
                  type="text"
                  className="form-control border-start-0"
                  placeholder={t('nav.searchPlaceholder', 'Search by name, ID, TIN, phone...')}
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

            {/* Trader Type */}
            <div className="col-lg-2 col-md-3 col-6">
              <select
                className="form-select form-select-sm"
                value={typeFilter}
                onChange={e => {
                  setTypeFilter(e.target.value as TraderType | 'ALL');
                  setPage(1);
                }}
              >
                <option value="ALL">{t('list.allTypes', 'All Trader Types')}</option>
                <option value="LEGAL">{t('list.legalOnly', 'Legal Traders Only')}</option>
                <option value="INFORMAL">{t('list.informalOnly', 'Informal Traders Only')}</option>
              </select>
            </div>

            {/* Registration Status */}
            <div className="col-lg-2 col-md-3 col-6">
              <select
                className="form-select form-select-sm"
                value={statusFilter}
                onChange={e => {
                  setStatusFilter(e.target.value as TraderStatus | 'ALL');
                  setPage(1);
                }}
              >
                <option value="ALL">{t('list.allStatuses', 'All Statuses')}</option>
                <option value="PENDING">{t('list.pendingOnly', 'Pending Verification')}</option>
                <option value="APPROVED">{t('list.approvedOnly', 'Approved')}</option>
                <option value="UNDER_REVIEW">{t('status.UNDER_REVIEW', 'Under Review')}</option>
                <option value="RETURNED">{t('list.returnedOnly', 'Needs Correction')}</option>
                <option value="REJECTED">{t('status.REJECTED', 'Rejected')}</option>
                <option value="DRAFT">{t('status.DRAFT', 'Draft')}</option>
              </select>
            </div>

            {/* Region Filter */}
            <div className="col-lg-2 col-md-4 col-6">
              <select
                className="form-select form-select-sm"
                value={regionFilter}
                onChange={e => {
                  setRegionFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="ALL">{t('list.allRegions', 'All Regions')}</option>
                <option value="Harari Region">Harari Region</option>
              </select>
            </div>

            {/* Woreda Filter */}
            <div className="col-lg-2 col-md-4 col-6">
              <select
                className="form-select form-select-sm"
                value={woredaFilter}
                onChange={e => {
                  setWoredaFilter(e.target.value);
                  setKebeleFilter('ALL');
                  setPage(1);
                }}
              >
                <option value="ALL">{t('list.allWoredas', 'All Woredas')}</option>
                {woredas.map(w => (
                  <option key={w.id} value={w.id.toString()}>
                    {w.name} ({w.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Reset Button */}
            <div className="col-lg-1 col-md-4 col-12 text-end">
              <button
                className="btn btn-light border w-100 btn-sm text-secondary"
                onClick={handleResetFilters}
                title={t('common.reset', 'Reset filters')}
              >
                <i className="bi bi-arrow-counterclockwise me-1"></i>
                <span>{t('common.reset', 'Reset')}</span>
              </button>
            </div>
          </div>

          {/* Secondary Filter Row */}
          <div className="row g-2 align-items-center mt-1 pt-2 border-top">
            {/* Kebele Filter */}
            <div className="col-lg-3 col-md-4 col-6">
              <select
                className="form-select form-select-sm"
                value={kebeleFilter}
                onChange={e => {
                  setKebeleFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="ALL">{t('list.allKebeles', 'All Kebeles')}</option>
                {availableKebeles.map(k => (
                  <option key={k.id} value={k.id.toString()}>
                    {k.name} ({k.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Business Sector Filter */}
            <div className="col-lg-3 col-md-4 col-6">
              <select
                className="form-select form-select-sm"
                value={sectorFilter}
                onChange={e => {
                  setSectorFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="ALL">{t('list.allSectors', 'All Business Sectors')}</option>
                {BUSINESS_SECTORS.map(s => (
                  <option key={s.value} value={s.value}>
                    {t(s.labelKey, s.fallback)}
                  </option>
                ))}
              </select>
            </div>

            {/* Assigned Reviewer Filter */}
            <div className="col-lg-3 col-md-4 col-12">
              <select
                className="form-select form-select-sm"
                value={reviewerFilter}
                onChange={e => {
                  setReviewerFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="ALL">{t('list.allReviewers', 'All Assigned Reviewers')}</option>
                {availableReviewers.map(r => (
                  <option key={r.id} value={r.username}>
                    {r.fullName} ({t(`role.${r.role}`, 'Director')})
                  </option>
                ))}
              </select>
            </div>

            {/* Page Size Selector */}
            <div className="col-lg-3 col-md-12 col-12 d-flex justify-content-lg-end align-items-center gap-2">
              <label className="text-muted small mb-0">{t('list.perPage', 'Per page')}:</label>
              <select
                className="form-select form-select-sm w-auto"
                value={pageSize}
                onChange={e => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Checkbox Selection Banner Toolbar */}
      {selectedIds.size > 0 && (
        <div className="alert alert-primary d-flex align-items-center justify-content-between py-2 px-3 mb-3 shadow-sm border-primary">
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-check2-circle fs-5 text-primary"></i>
            <span className="fw-bold">
              {selectedIds.size} {t('list.tradersSelected', 'traders selected')}
            </span>
            <span className="text-muted small">
              ({t('list.selectedCount', 'across all pages')})
            </span>
          </div>

          <div className="d-flex gap-2 align-items-center flex-wrap">
            <button
              className="btn btn-sm btn-outline-secondary bg-white"
              onClick={toggleSelectAllCurrentPage}
            >
              {isAllCurrentPageSelected
                ? t('list.deselectAll', 'Deselect Page')
                : t('list.selectAllCurrentPage', 'Select Page')}
            </button>
            <button
              className="btn btn-sm btn-outline-danger bg-white"
              onClick={clearSelection}
            >
              <i className="bi bi-x-circle me-1"></i>
              {t('list.clearSelection', 'Clear Selection')}
            </button>
            <div className="vr d-none d-md-block my-1"></div>
            <button
              className="btn btn-sm btn-success d-flex align-items-center gap-1 shadow-sm"
              onClick={handleExportSelectedExcel}
              disabled={isExporting}
            >
              <i className="bi bi-file-earmark-excel"></i>
              <span>{t('list.exportSelectedExcel', 'Export Selected (Excel)')}</span>
            </button>
            <button
              className="btn btn-sm btn-danger d-flex align-items-center gap-1 shadow-sm"
              onClick={handleExportSelectedPdf}
              disabled={isExporting}
            >
              <i className="bi bi-file-earmark-pdf"></i>
              <span>{t('list.exportSelectedPdf', 'Export Selected (PDF)')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Table Card */}
      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th style={{ width: '42px' }} className="text-center">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    ref={headerCheckboxRef}
                    checked={isAllCurrentPageSelected}
                    onChange={toggleSelectAllCurrentPage}
                    title={t('list.selectAllCurrentPage', 'Select All on Current Page')}
                  />
                </th>
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
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="text-center py-5 text-muted">
                    <div className="spinner-border text-primary spinner-border-sm me-2" role="status"></div>
                    <span>{t('common.loading', 'Loading trader records...')}</span>
                  </td>
                </tr>
              ) : displayedTraders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-5 text-muted">
                    <i className="bi bi-inbox fs-1 d-block mb-2"></i>
                    <div className="fw-medium">{t('list.noMatching', 'No traders match your filter criteria')}</div>
                    <small>{t('list.noMatchingHint', 'Try clearing your search terms or register a new trader')}</small>
                  </td>
                </tr>
              ) : (
                displayedTraders.map(tTrader => {
                  const isLegal = tTrader.traderType === 'LEGAL';
                  const primaryName = isLegal ? tTrader.legalDetails?.tradeName : tTrader.informalDetails?.fullName;
                  const secondaryInfo = isLegal
                    ? `${t('field.ownerFullName', 'Owner')}: ${tTrader.legalDetails?.ownerFullName || '-'} | TIN: ${tTrader.legalDetails?.tin || '-'}`
                    : `${t('field.natureOfTradeActivity', 'Activity')}: ${t(`activity.${tTrader.informalDetails?.natureOfTradeActivity}`, tTrader.informalDetails?.natureOfTradeActivity?.replace(/_/g, ' ') || '')} | Cap: ${tTrader.informalDetails?.estimatedCapitalAssets?.toLocaleString()} ETB`;
                  const woredaId = isLegal ? tTrader.legalDetails?.woredaId : tTrader.informalDetails?.woredaId;
                  const kebeleId = isLegal ? tTrader.legalDetails?.kebeleId : tTrader.informalDetails?.kebeleId;
                  const isSelected = selectedIds.has(tTrader.traderId);

                  return (
                    <tr key={tTrader.traderId} className={isSelected ? 'table-primary bg-opacity-25' : ''}>
                      <td className="text-center">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={isSelected}
                          onChange={() => toggleSelectRow(tTrader.traderId)}
                          aria-label={`Select ${tTrader.traderId}`}
                        />
                      </td>

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
                        {(tTrader.status === 'PENDING' || tTrader.status === 'SUBMITTED') && (
                          <span className="badge bg-warning text-dark d-inline-flex align-items-center gap-1">
                            <i className="bi bi-clock-fill"></i> {t('status.SUBMITTED', 'Submitted')}
                          </span>
                        )}
                        {tTrader.status === 'UNDER_REVIEW' && (
                          <span className="badge bg-info text-dark d-inline-flex align-items-center gap-1">
                            <i className="bi bi-eye-fill"></i> {t('status.UNDER_REVIEW', 'Under Review')}
                          </span>
                        )}
                        {(tTrader.status === 'RETURNED' || tTrader.status === 'NEEDS_CORRECTION') && (
                          <span className="badge bg-danger d-inline-flex align-items-center gap-1">
                            <i className="bi bi-arrow-return-left"></i> {t('status.NEEDS_CORRECTION', 'Needs Correction')}
                          </span>
                        )}
                        {tTrader.status === 'REJECTED' && (
                          <span className="badge bg-secondary d-inline-flex align-items-center gap-1">
                            <i className="bi bi-x-circle-fill"></i> {t('status.REJECTED', 'Rejected')}
                          </span>
                        )}
                        {tTrader.status === 'DRAFT' && (
                          <span className="badge bg-light text-muted border d-inline-flex align-items-center gap-1">
                            <i className="bi bi-pencil-fill"></i> {t('status.DRAFT', 'Draft')}
                          </span>
                        )}
                      </td>

                      <td className="small text-muted">
                        <div>{tTrader.registeredBy || '-'}</div>
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
                          {/* Operational verification: ONLY authorized Directors */}
                          {isVerifier && (tTrader.status === 'PENDING' || tTrader.status === 'SUBMITTED') && (
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

        {/* Server-Side Pagination Bar */}
        <div className="card-footer bg-light py-2 px-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div className="text-muted small">
            {t('list.showing', 'Showing')} <span className="fw-semibold">{startRecord}</span> - <span className="fw-semibold">{endRecord}</span> {t('list.of', 'of')} <span className="fw-semibold">{totalCount}</span> {t('common.records', 'records')} ({t('list.page', 'Page')} {page} {t('list.of', 'of')} {totalPages})
          </div>

          <nav aria-label="Table pagination">
            <ul className="pagination pagination-sm mb-0">
              <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => setPage(1)} disabled={page <= 1} title={t('list.first', 'First')}>
                  <i className="bi bi-chevron-double-left"></i>
                </button>
              </li>
              <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>
                  {t('list.previous', 'Previous')}
                </button>
              </li>

              {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
                let pageNum = page;
                if (totalPages <= 5) {
                  pageNum = idx + 1;
                } else if (page <= 3) {
                  pageNum = idx + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + idx;
                } else {
                  pageNum = page - 2 + idx;
                }
                return (
                  <li key={pageNum} className={`page-item ${page === pageNum ? 'active' : ''}`}>
                    <button className="page-link" onClick={() => setPage(pageNum)}>
                      {pageNum}
                    </button>
                  </li>
                );
              })}

              <li className={`page-item ${page >= totalPages ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                  {t('list.next', 'Next')}
                </button>
              </li>
              <li className={`page-item ${page >= totalPages ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => setPage(totalPages)} disabled={page >= totalPages} title={t('list.last', 'Last')}>
                  <i className="bi bi-chevron-double-right"></i>
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </div>
  );
};
