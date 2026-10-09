import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../i18n/context';

export const AuditLogView: React.FC = () => {
  const { auditLogs } = useApp();
  const { t } = useTranslation();
  const [filterAction, setFilterAction] = useState<string>('ALL');

  const filteredLogs = auditLogs.filter(log => {
    if (filterAction !== 'ALL' && log.action !== filterAction) return false;
    return true;
  });

  const getActionLabel = (act: string) => {
    switch (act) {
      case 'REGISTER_TRADER':
        return t('audit.regAction', 'Registration');
      case 'APPROVE_TRADER':
        return t('audit.approveAction', 'Approval');
      case 'RETURN_TRADER':
        return t('audit.returnAction', 'Return / Correction');
      case 'UPDATE_TRADER':
        return t('audit.updateAction', 'Update');
      case 'DELETE_TRADER':
        return t('audit.deleteAction', 'Deletion');
      default:
        return act.replace(/_/g, ' ');
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h2 className="fw-bold mb-1">{t('audit.title', 'System Audit Trail & Compliance')}</h2>
          <p className="text-muted small mb-0">
            {t('audit.subtitle', 'Immutable log of trader registrations, verification actions, and administrator events')}
          </p>
        </div>

        <select
          className="form-select w-auto"
          value={filterAction}
          onChange={e => setFilterAction(e.target.value)}
        >
          <option value="ALL">{t('audit.allActions', 'All Actions')}</option>
          <option value="REGISTER_TRADER">{t('audit.regAction', 'Trader Registrations')}</option>
          <option value="APPROVE_TRADER">{t('audit.approveAction', 'Approvals')}</option>
          <option value="RETURN_TRADER">{t('audit.returnAction', 'Returns / Rejections')}</option>
          <option value="UPDATE_TRADER">{t('audit.updateAction', 'Updates')}</option>
          <option value="DELETE_TRADER">{t('audit.deleteAction', 'Deletions')}</option>
        </select>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th style={{ width: '180px' }}>{t('audit.colTimestamp', 'Timestamp')}</th>
                <th style={{ width: '160px' }}>{t('audit.colAction', 'Action')}</th>
                <th style={{ width: '130px' }}>{t('audit.colTraderId', 'Trader ID')}</th>
                <th>{t('audit.colDetails', 'Details & Justification')}</th>
                <th style={{ width: '180px' }}>{t('audit.colOfficer', 'Officer / User')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-4 text-muted">
                    {t('audit.noEntries', 'No audit entries matching filter.')}
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => {
                  let badgeClass = 'bg-secondary';
                  if (log.action === 'APPROVE_TRADER') badgeClass = 'bg-success';
                  else if (log.action === 'REGISTER_TRADER') badgeClass = 'bg-primary';
                  else if (log.action === 'RETURN_TRADER') badgeClass = 'bg-danger';
                  else if (log.action === 'UPDATE_TRADER') badgeClass = 'bg-info text-dark';
                  else if (log.action === 'DELETE_TRADER') badgeClass = 'bg-dark text-white';

                  return (
                    <tr key={log.id}>
                      <td className="small text-muted font-monospace">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td>
                        <span className={`badge ${badgeClass} small`}>
                          {getActionLabel(log.action)}
                        </span>
                      </td>
                      <td className="font-monospace fw-bold text-primary">
                        {log.traderId || '-'}
                      </td>
                      <td className="small text-dark">{log.details}</td>
                      <td className="small fw-semibold">{log.user}</td>
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
