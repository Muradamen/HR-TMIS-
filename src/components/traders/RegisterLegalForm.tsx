import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../i18n/context';
import { LegalTraderDetails } from '../../types';

interface RegisterLegalFormProps {
  onSuccess: (traderId: string) => void;
  onCancel: () => void;
}

export const RegisterLegalForm: React.FC<RegisterLegalFormProps> = ({
  onSuccess,
  onCancel,
}) => {
  const { woredas, kebeles, currentUser, registerLegalTrader } = useApp();
  const { t } = useTranslation();

  const [formData, setFormData] = useState<LegalTraderDetails>({
    tradeName: '',
    ownerFullName: '',
    tin: '',
    tradeRegistrationNumber: '',
    gender: 'MALE',
    age: 35,
    region: 'Harari Region',
    woredaId: woredas[0]?.id || 1,
    kebeleId: kebeles.find(k => k.woredaId === (woredas[0]?.id || 1))?.id || 1,
    houseNumberPlotId: '',
    businessSector: 'GENERAL_TRADE',
    tradeScale: 'RETAIL',
    businessOwnershipType: 'SOLE_PROPRIETORSHIP',
    issuingInstitution: 'Harari Region Trade and Industry Development Bureau',
    dateOfIssuance: new Date().toISOString().split('T')[0],
    dataEnteredBy: currentUser.fullName,
    remarks: '',
    officerSignature: currentUser.username,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const availableKebeles = kebeles.filter(k => k.woredaId === formData.woredaId);

  const handleWoredaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const wId = Number(e.target.value);
    const firstKebele = kebeles.find(k => k.woredaId === wId);
    setFormData(prev => ({
      ...prev,
      woredaId: wId,
      kebeleId: firstKebele ? firstKebele.id : 0,
    }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.tradeName.trim()) newErrors.tradeName = `${t('field.tradeName', 'Trade / Company Name')} is required`;
    if (!formData.ownerFullName.trim()) newErrors.ownerFullName = `${t('field.ownerFullName', 'Owner Full Name')} is required`;
    if (!formData.tin.trim()) newErrors.tin = `${t('field.tin', 'Taxpayer Identification Number (TIN)')} is required`;
    if (!formData.tradeRegistrationNumber.trim()) newErrors.tradeRegistrationNumber = `${t('field.tradeRegNumber', 'Trade Registration Number')} is required`;
    if (!formData.age || formData.age < 18) newErrors.age = 'Owner must be at least 18 years old';
    if (!formData.woredaId) newErrors.woredaId = `${t('field.woreda', 'Woreda')} is required`;
    if (!formData.kebeleId) newErrors.kebeleId = `${t('field.kebele', 'Kebele')} is required`;
    if (!formData.dateOfIssuance) newErrors.dateOfIssuance = `${t('field.dateOfIssuance', 'Date of issuance')} is required`;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const traderId = registerLegalTrader(formData);
    onSuccess(traderId);
  };

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-header bg-primary text-white py-3 d-flex justify-content-between align-items-center">
        <div>
          <h4 className="card-title fw-bold mb-0">
            <i className="bi bi-building-add me-2"></i>
            {t('sidebar.legalRegistration', 'Register Legal Trader')}
          </h4>
          <small className="opacity-75">
            {t('brand.fullTitle', 'Harari Region Formal Trade Registry')} &bull; Application Form
          </small>
        </div>
        <span className="badge bg-white text-primary fw-bold">{t('type.legalBadge', 'Formal Sector')}</span>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card-body p-4">
          <div className="alert alert-info py-2 px-3 small d-flex align-items-center gap-2 mb-4">
            <i className="bi bi-info-circle-fill fs-5"></i>
            <div>
              {t('form.autoIdNotice', 'Auto-generated Trader Identification Number (HTT-XXXXXX) will be assigned upon submission. Status will be marked as Pending Verification.')}
            </div>
          </div>

          {/* Section 1: Business Identity */}
          <h6 className="fw-bold text-primary border-bottom pb-2 mb-3">
            {t('form.sec1Legal', '1. Business & Ownership Identity')}
          </h6>

          <div className="row g-3 mb-4">
            <div className="col-md-6">
              <label className="form-label fw-semibold">
                {t('field.tradeName', 'Trade Name / Company Name')} <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                className={`form-control ${errors.tradeName ? 'is-invalid' : ''}`}
                placeholder="e.g. Jugol Heritage Coffee PLC"
                value={formData.tradeName}
                onChange={e => setFormData({ ...formData, tradeName: e.target.value })}
              />
              {errors.tradeName && <div className="invalid-feedback">{errors.tradeName}</div>}
            </div>

            <div className="col-md-6">
              <label className="form-label fw-semibold">
                {t('field.ownerFullName', 'Owner Full Name')} <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                className={`form-control ${errors.ownerFullName ? 'is-invalid' : ''}`}
                placeholder="e.g. Abdulhakim Mohammed Nur"
                value={formData.ownerFullName}
                onChange={e => setFormData({ ...formData, ownerFullName: e.target.value })}
              />
              {errors.ownerFullName && <div className="invalid-feedback">{errors.ownerFullName}</div>}
            </div>

            <div className="col-md-3">
              <label className="form-label fw-semibold">{t('field.gender', 'Gender')}</label>
              <select
                className="form-select"
                value={formData.gender}
                onChange={e => setFormData({ ...formData, gender: e.target.value as any })}
              >
                <option value="MALE">{t('field.male', 'Male')}</option>
                <option value="FEMALE">{t('field.female', 'Female')}</option>
                <option value="OTHER">{t('field.other', 'Other')}</option>
              </select>
            </div>

            <div className="col-md-3">
              <label className="form-label fw-semibold">
                {t('field.age', 'Age')} <span className="text-danger">*</span>
              </label>
              <input
                type="number"
                min="18"
                max="120"
                className={`form-control ${errors.age ? 'is-invalid' : ''}`}
                value={formData.age}
                onChange={e => setFormData({ ...formData, age: Number(e.target.value) })}
              />
              {errors.age && <div className="invalid-feedback">{errors.age}</div>}
            </div>

            <div className="col-md-3">
              <label className="form-label fw-semibold">
                {t('field.tin', 'TIN (Tax ID)')} <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                className={`form-control ${errors.tin ? 'is-invalid' : ''}`}
                placeholder="10-digit TIN"
                value={formData.tin}
                onChange={e => setFormData({ ...formData, tin: e.target.value })}
              />
              {errors.tin && <div className="invalid-feedback">{errors.tin}</div>}
            </div>

            <div className="col-md-3">
              <label className="form-label fw-semibold">
                {t('field.tradeRegNumber', 'Trade Registration No')} <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                className={`form-control ${errors.tradeRegistrationNumber ? 'is-invalid' : ''}`}
                placeholder="HR-TR-YYYY-XXXXX"
                value={formData.tradeRegistrationNumber}
                onChange={e => setFormData({ ...formData, tradeRegistrationNumber: e.target.value })}
              />
              {errors.tradeRegistrationNumber && (
                <div className="invalid-feedback">{errors.tradeRegistrationNumber}</div>
              )}
            </div>
          </div>

          {/* Section 2: Location Information */}
          <h6 className="fw-bold text-primary border-bottom pb-2 mb-3">
            {t('form.sec2Legal', '2. Regional Location & Premises')}
          </h6>

          <div className="row g-3 mb-4">
            <div className="col-md-3">
              <label className="form-label fw-semibold">{t('field.region', 'Region')}</label>
              <input
                type="text"
                className="form-control bg-light"
                value={formData.region}
                readOnly
              />
            </div>

            <div className="col-md-3">
              <label className="form-label fw-semibold">
                {t('field.woreda', 'Woreda')} <span className="text-danger">*</span>
              </label>
              <select
                className={`form-select ${errors.woredaId ? 'is-invalid' : ''}`}
                value={formData.woredaId}
                onChange={handleWoredaChange}
              >
                {woredas.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.code})
                  </option>
                ))}
              </select>
              {errors.woredaId && <div className="invalid-feedback">{errors.woredaId}</div>}
            </div>

            <div className="col-md-3">
              <label className="form-label fw-semibold">
                {t('field.kebele', 'Kebele')} <span className="text-danger">*</span>
              </label>
              <select
                className={`form-select ${errors.kebeleId ? 'is-invalid' : ''}`}
                value={formData.kebeleId}
                onChange={e => setFormData({ ...formData, kebeleId: Number(e.target.value) })}
              >
                {availableKebeles.map(k => (
                  <option key={k.id} value={k.id}>
                    {k.name} ({k.code})
                  </option>
                ))}
              </select>
              {errors.kebeleId && <div className="invalid-feedback">{errors.kebeleId}</div>}
            </div>

            <div className="col-md-3">
              <label className="form-label fw-semibold">{t('field.houseNumberPlotId', 'House Number / Plot ID')}</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. H-104/Jugol or Plot 12"
                value={formData.houseNumberPlotId || ''}
                onChange={e => setFormData({ ...formData, houseNumberPlotId: e.target.value })}
              />
            </div>
          </div>

          {/* Section 3: Business Classification */}
          <h6 className="fw-bold text-primary border-bottom pb-2 mb-3">
            {t('form.sec3Legal', '3. Business Sector & Operational Scale')}
          </h6>

          <div className="row g-3 mb-4">
            <div className="col-md-4">
              <label className="form-label fw-semibold">{t('field.businessSector', 'Business Sector')}</label>
              <select
                className="form-select"
                value={formData.businessSector}
                onChange={e => setFormData({ ...formData, businessSector: e.target.value as any })}
              >
                <option value="GENERAL_TRADE">{t('sector.GENERAL_TRADE', 'General Trade')}</option>
                <option value="RETAIL_WHOLESALE_GOODS">{t('sector.RETAIL_WHOLESALE_GOODS', 'Retail/Wholesale Goods')}</option>
                <option value="AGRICULTURE_AGRO_PROCESSING">{t('sector.AGRICULTURE_AGRO_PROCESSING', 'Agriculture/Agro-processing')}</option>
                <option value="MANUFACTURING_PRODUCTION">{t('sector.MANUFACTURING_PRODUCTION', 'Manufacturing/Production')}</option>
                <option value="SERVICE_PROVIDER">{t('sector.SERVICE_PROVIDER', 'Service Provider')}</option>
                <option value="OTHER">{t('sector.OTHER', 'Other')}</option>
              </select>
            </div>

            <div className="col-md-4">
              <label className="form-label fw-semibold">{t('field.tradeScale', 'Trade Scale')}</label>
              <select
                className="form-select"
                value={formData.tradeScale}
                onChange={e => setFormData({ ...formData, tradeScale: e.target.value as any })}
              >
                <option value="WHOLESALE">{t('field.wholesale', 'Wholesale')}</option>
                <option value="RETAIL">{t('field.retail', 'Retail')}</option>
              </select>
            </div>

            <div className="col-md-4">
              <label className="form-label fw-semibold">{t('field.businessOwnershipType', 'Ownership Type')}</label>
              <select
                className="form-select"
                value={formData.businessOwnershipType}
                onChange={e => setFormData({ ...formData, businessOwnershipType: e.target.value as any })}
              >
                <option value="SOLE_PROPRIETORSHIP">{t('ownership.SOLE_PROPRIETORSHIP', 'Sole Proprietorship')}</option>
                <option value="PLC">{t('ownership.PLC', 'Private Limited Company (PLC)')}</option>
                <option value="PARTNERSHIP">{t('ownership.PARTNERSHIP', 'Partnership')}</option>
                <option value="ASSOCIATION_COOPERATIVE">{t('ownership.ASSOCIATION_COOPERATIVE', 'Association/Cooperative')}</option>
              </select>
            </div>
          </div>

          {/* Section 4: Issuance & Record Details */}
          <h6 className="fw-bold text-primary border-bottom pb-2 mb-3">
            {t('form.sec4Legal', '4. License Issuance & Encoder Verification')}
          </h6>

          <div className="row g-3 mb-4">
            <div className="col-md-4">
              <label className="form-label fw-semibold">{t('field.issuingInstitution', 'Issuing Institution')}</label>
              <input
                type="text"
                className="form-control"
                value={formData.issuingInstitution}
                onChange={e => setFormData({ ...formData, issuingInstitution: e.target.value })}
              />
            </div>

            <div className="col-md-4">
              <label className="form-label fw-semibold">
                {t('field.dateOfIssuance', 'Date of Issuance')} <span className="text-danger">*</span>
              </label>
              <input
                type="date"
                className={`form-control ${errors.dateOfIssuance ? 'is-invalid' : ''}`}
                value={formData.dateOfIssuance}
                onChange={e => setFormData({ ...formData, dateOfIssuance: e.target.value })}
              />
              {errors.dateOfIssuance && (
                <div className="invalid-feedback">{errors.dateOfIssuance}</div>
              )}
            </div>

            <div className="col-md-4">
              <label className="form-label fw-semibold">{t('field.dataEnteredBy', 'Data Entered By')}</label>
              <input
                type="text"
                className="form-control bg-light"
                value={formData.dataEnteredBy}
                readOnly
              />
            </div>

            <div className="col-md-8">
              <label className="form-label fw-semibold">{t('field.remarks', 'Remarks & Special Conditions')}</label>
              <textarea
                className="form-control"
                rows={2}
                placeholder="Additional notes on business activity, warehouse location, special municipal permits..."
                value={formData.remarks || ''}
                onChange={e => setFormData({ ...formData, remarks: e.target.value })}
              ></textarea>
            </div>

            <div className="col-md-4">
              <label className="form-label fw-semibold">{t('field.officerSignature', 'Officer Signature / Seal Ref')}</label>
              <input
                type="text"
                className="form-control"
                placeholder="Officer initial or ID"
                value={formData.officerSignature || ''}
                onChange={e => setFormData({ ...formData, officerSignature: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="card-footer bg-light p-3 d-flex justify-content-between">
          <button type="button" className="btn btn-outline-secondary" onClick={onCancel}>
            <i className="bi bi-x-circle me-1"></i> {t('common.cancel', 'Cancel')}
          </button>
          <button type="submit" className="btn btn-primary d-flex align-items-center gap-2">
            <i className="bi bi-check2-circle fs-5"></i>
            <span>{t('form.submitReg', 'Submit Registration')}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
