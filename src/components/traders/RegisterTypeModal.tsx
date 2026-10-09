import React, { useState } from 'react';
import { useTranslation } from '../../i18n/context';
import { TraderType } from '../../types';

interface RegisterTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectType: (type: TraderType) => void;
}

export const RegisterTypeModal: React.FC<RegisterTypeModalProps> = ({
  isOpen,
  onClose,
  onSelectType,
}) => {
  const { t } = useTranslation();
  const [selectedType, setSelectedType] = useState<TraderType>('LEGAL');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSelectType(selectedType);
    onClose();
  };

  return (
    <div
      className="modal fade show d-block"
      tabIndex={-1}
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content border-0 shadow">
          <div className="modal-header bg-light">
            <h5 className="modal-title fw-bold">
              <i className="bi bi-person-plus-fill text-primary me-2"></i>
              {t('sidebar.registerNewTrader', 'Register New Trader')}
            </h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body p-4">
              <p className="text-muted small mb-3">
                {t('dashboard.shortcutsDesc', 'Please select the trader category you want to register in Harari Region:')}
              </p>

              <div className="d-flex flex-column gap-3">
                {/* Legal Option */}
                <div
                  className={`border rounded-3 p-3 cursor-pointer transition ${
                    selectedType === 'LEGAL'
                      ? 'border-primary bg-primary bg-opacity-10 shadow-sm'
                      : 'border-light-subtle hover-bg-light'
                  }`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedType('LEGAL')}
                >
                  <div className="d-flex align-items-center gap-3">
                    <input
                      type="radio"
                      className="form-check-input mt-0"
                      name="trader_type"
                      checked={selectedType === 'LEGAL'}
                      onChange={() => setSelectedType('LEGAL')}
                    />
                    <div>
                      <div className="fw-bold text-dark d-flex align-items-center gap-2">
                        <span>{t('type.LEGAL', 'Legal Trader')}</span>
                        <span className="badge bg-success small">{t('type.legalBadge', 'Licensed')}</span>
                      </div>
                      <small className="text-muted d-block">
                        {t('type.legalModalDesc', 'Formal businesses with TIN, trade registration certificate, trade scale (Wholesale/Retail), and institutional issuance.')}
                      </small>
                    </div>
                  </div>
                </div>

                {/* Informal Option */}
                <div
                  className={`border rounded-3 p-3 cursor-pointer transition ${
                    selectedType === 'INFORMAL'
                      ? 'border-warning bg-warning bg-opacity-10 shadow-sm'
                      : 'border-light-subtle hover-bg-light'
                  }`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedType('INFORMAL')}
                >
                  <div className="d-flex align-items-center gap-3">
                    <input
                      type="radio"
                      className="form-check-input mt-0"
                      name="trader_type"
                      checked={selectedType === 'INFORMAL'}
                      onChange={() => setSelectedType('INFORMAL')}
                    />
                    <div>
                      <div className="fw-bold text-dark d-flex align-items-center gap-2">
                        <span>{t('type.INFORMAL', 'Informal Trader')}</span>
                        <span className="badge bg-warning text-dark small">{t('type.informalBadge', 'Assessment & Formalization')}</span>
                      </div>
                      <small className="text-muted d-block">
                        {t('type.informalModalDesc', 'Street vendors, open market operators, and artisans under economic assessment for Micro-Enterprise formalization.')}
                      </small>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer bg-light">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                {t('common.cancel', 'Cancel')}
              </button>
              <button type="submit" className="btn btn-primary d-flex align-items-center gap-2">
                <span>{t('common.confirm', 'Continue to Registration')}</span>
                <i className="bi bi-arrow-right"></i>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
