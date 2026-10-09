import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../i18n/context';
import { InformalTraderDetails } from '../../types';

interface RegisterInformalFormProps {
  onSuccess: (traderId: string) => void;
  onCancel: () => void;
}

export const RegisterInformalForm: React.FC<RegisterInformalFormProps> = ({
  onSuccess,
  onCancel,
}) => {
  const { woredas, kebeles, currentUser, registerInformalTrader } = useApp();
  const { t } = useTranslation();

  const [formData, setFormData] = useState<InformalTraderDetails>({
    fullName: '',
    gender: 'FEMALE',
    age: 30,
    nationalIdResidentId: '',
    phoneNumber: '+251 9',
    region: 'Harari Region',
    woredaId: woredas[0]?.id || 1,
    kebeleId: kebeles.find(k => k.woredaId === (woredas[0]?.id || 1))?.id || 1,
    specificLocationMarketArea: '',
    natureOfTradeActivity: 'PETTY_RETAIL',
    estimatedCapitalAssets: 15000,
    reasonForOperatingInformally: 'LACK_OF_CAPITAL',
    enumeratorDataCollectorName: currentUser.fullName,
    dateOfAssessment: new Date().toISOString().split('T')[0],
    formalizationStatusRecommendation: 'READY_FOR_TIN_MICRO_ENTERPRISE',
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
    const reqSuffix = t('val.required', 'is required');
    if (!formData.fullName.trim()) newErrors.fullName = `${t('field.fullName', 'Full Name')} ${reqSuffix}`;
    if (!formData.age || formData.age < 16) newErrors.age = t('val.minAge16', 'Age must be at least 16 years old');
    if (!formData.specificLocationMarketArea.trim()) {
      newErrors.specificLocationMarketArea = `${t('field.specificLocation', 'Specific Location / Market Area')} ${reqSuffix}`;
    }
    if (formData.estimatedCapitalAssets === undefined || formData.estimatedCapitalAssets < 0) {
      newErrors.estimatedCapitalAssets = t('val.positiveCapital', 'Estimated capital must be a positive amount');
    }
    if (!formData.dateOfAssessment) newErrors.dateOfAssessment = `${t('field.dateOfAssessment', 'Date of assessment')} ${reqSuffix}`;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const traderId = registerInformalTrader(formData);
    onSuccess(traderId);
  };

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-header bg-warning text-dark py-3 d-flex justify-content-between align-items-center">
        <div>
          <h4 className="card-title fw-bold mb-0">
            <i className="bi bi-basket2 me-2"></i>
            {t('sidebar.informalAssessment', 'Assess & Register Informal Trader')}
          </h4>
          <small className="text-dark opacity-75">
            {t('brand.fullTitle', 'Harari Region Informal Sector Enumeration')} &amp; {t('dashboard.formalizationPipeline', 'Formalization Pipeline')}
          </small>
        </div>
        <span className="badge bg-dark text-warning fw-bold">{t('type.informalBadge', 'Transition Track')}</span>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card-body p-4">
          <div className="alert alert-warning py-2 px-3 small d-flex align-items-center gap-2 mb-4">
            <i className="bi bi-exclamation-triangle-fill fs-5"></i>
            <div>
              {t('form.informalNotice', 'This assessment records informal traders, evaluates their capital assets, and prepares tailored recommendations for micro-enterprise licensing and tax registration.')}
            </div>
          </div>

          {/* Section 1: Trader Identity */}
          <h6 className="fw-bold text-dark border-bottom pb-2 mb-3">
            {t('form.sec1Informal', '1. Trader Personal Identification')}
          </h6>

          <div className="row g-3 mb-4">
            <div className="col-md-6">
              <label className="form-label fw-semibold">
                {t('field.fullName', 'Trader Full Name')} <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                className={`form-control ${errors.fullName ? 'is-invalid' : ''}`}
                placeholder="e.g. Amina Zeinudin Ibrahim"
                value={formData.fullName}
                onChange={e => setFormData({ ...formData, fullName: e.target.value })}
              />
              {errors.fullName && <div className="invalid-feedback">{errors.fullName}</div>}
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
              </select>
            </div>

            <div className="col-md-3">
              <label className="form-label fw-semibold">
                {t('field.age', 'Age')} <span className="text-danger">*</span>
              </label>
              <input
                type="number"
                min="16"
                max="120"
                className={`form-control ${errors.age ? 'is-invalid' : ''}`}
                value={formData.age}
                onChange={e => setFormData({ ...formData, age: Number(e.target.value) })}
              />
              {errors.age && <div className="invalid-feedback">{errors.age}</div>}
            </div>

            <div className="col-md-6">
              <label className="form-label fw-semibold">{t('field.nationalId', 'National ID / Resident ID Number')}</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. ET-HR-2024-XXXXX or Kebele Resident Card"
                value={formData.nationalIdResidentId || ''}
                onChange={e => setFormData({ ...formData, nationalIdResidentId: e.target.value })}
              />
            </div>

            <div className="col-md-6">
              <label className="form-label fw-semibold">{t('field.phoneNumber', 'Phone Number')}</label>
              <input
                type="text"
                className="form-control"
                placeholder="+251 9X XXX XXXX"
                value={formData.phoneNumber || ''}
                onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })}
              />
            </div>
          </div>

          {/* Section 2: Location & Market Spot */}
          <h6 className="fw-bold text-dark border-bottom pb-2 mb-3">
            {t('form.sec2Informal', '2. Operating Location & Market Site')}
          </h6>

          <div className="row g-3 mb-4">
            <div className="col-md-3">
              <label className="form-label fw-semibold">{t('field.region', 'Region')}</label>
              <input type="text" className="form-control bg-light" value={formData.region} readOnly />
            </div>

            <div className="col-md-3">
              <label className="form-label fw-semibold">{t('field.woreda', 'Woreda')}</label>
              <select className="form-select" value={formData.woredaId} onChange={handleWoredaChange}>
                {woredas.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-3">
              <label className="form-label fw-semibold">{t('field.kebele', 'Kebele')}</label>
              <select
                className="form-select"
                value={formData.kebeleId}
                onChange={e => setFormData({ ...formData, kebeleId: Number(e.target.value) })}
              >
                {availableKebeles.map(k => (
                  <option key={k.id} value={k.id}>
                    {k.name} ({k.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-3">
              <label className="form-label fw-semibold">
                {t('field.specificLocation', 'Specific Location / Market Area')} <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                className={`form-control ${errors.specificLocationMarketArea ? 'is-invalid' : ''}`}
                placeholder="e.g. Shoa Gate Open Perimeter"
                value={formData.specificLocationMarketArea}
                onChange={e => setFormData({ ...formData, specificLocationMarketArea: e.target.value })}
              />
              {errors.specificLocationMarketArea && (
                <div className="invalid-feedback">{errors.specificLocationMarketArea}</div>
              )}
            </div>
          </div>

          {/* Section 3: Trade Activity & Capital */}
          <h6 className="fw-bold text-dark border-bottom pb-2 mb-3">
            {t('form.sec3Informal', '3. Trade Activity & Economic Assessment')}
          </h6>

          <div className="row g-3 mb-4">
            <div className="col-md-4">
              <label className="form-label fw-semibold">{t('field.natureOfTradeActivity', 'Nature of Trade Activity')}</label>
              <select
                className="form-select"
                value={formData.natureOfTradeActivity}
                onChange={e => setFormData({ ...formData, natureOfTradeActivity: e.target.value as any })}
              >
                <option value="STREET_VENDING_OPEN_MARKET">{t('activity.STREET_VENDING_OPEN_MARKET', 'Street Vending / Open Market')}</option>
                <option value="PETTY_RETAIL">{t('activity.PETTY_RETAIL', 'Petty Retail')}</option>
                <option value="HANDCRAFT_INFORMAL_PRODUCTION">{t('activity.HANDCRAFT_INFORMAL_PRODUCTION', 'Handcraft / Informal Production')}</option>
                <option value="OTHER">{t('activity.OTHER', 'Other')}</option>
              </select>
            </div>

            <div className="col-md-4">
              <label className="form-label fw-semibold">
                {t('field.estimatedCapital', 'Estimated Working Capital / Assets (ETB)')} <span className="text-danger">*</span>
              </label>
              <div className="input-group">
                <input
                  type="number"
                  min="0"
                  step="100"
                  className={`form-control ${errors.estimatedCapitalAssets ? 'is-invalid' : ''}`}
                  value={formData.estimatedCapitalAssets}
                  onChange={e => setFormData({ ...formData, estimatedCapitalAssets: Number(e.target.value) })}
                />
                <span className="input-group-text">ETB</span>
              </div>
              {errors.estimatedCapitalAssets && (
                <div className="text-danger small mt-1">{errors.estimatedCapitalAssets}</div>
              )}
            </div>

            <div className="col-md-4">
              <label className="form-label fw-semibold">{t('field.reasonForOperatingInformally', 'Reason for Operating Informally')}</label>
              <select
                className="form-select"
                value={formData.reasonForOperatingInformally}
                onChange={e => setFormData({ ...formData, reasonForOperatingInformally: e.target.value as any })}
              >
                <option value="LACK_OF_CAPITAL">{t('reason.LACK_OF_CAPITAL', 'Lack of Capital')}</option>
                <option value="COMPLEX_BUREAUCRACY">{t('reason.COMPLEX_BUREAUCRACY', 'Complex Bureaucracy')}</option>
                <option value="TEMPORARY_SEASONAL_ACTIVITY">{t('reason.TEMPORARY_SEASONAL_ACTIVITY', 'Temporary / Seasonal Activity')}</option>
                <option value="OTHER">{t('reason.OTHER', 'Other')}</option>
              </select>
            </div>
          </div>

          {/* Section 4: Enumeration & Formalization Recommendation */}
          <h6 className="fw-bold text-dark border-bottom pb-2 mb-3">
            {t('form.sec4Informal', '4. Enumeration Details & Formalization Roadmap')}
          </h6>

          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label fw-semibold">{t('field.enumeratorName', 'Enumerator / Collector Name')}</label>
              <input
                type="text"
                className="form-control bg-light"
                value={formData.enumeratorDataCollectorName}
                readOnly
              />
            </div>

            <div className="col-md-4">
              <label className="form-label fw-semibold">
                {t('field.dateOfAssessment', 'Date of Assessment')} <span className="text-danger">*</span>
              </label>
              <input
                type="date"
                className={`form-control ${errors.dateOfAssessment ? 'is-invalid' : ''}`}
                value={formData.dateOfAssessment}
                onChange={e => setFormData({ ...formData, dateOfAssessment: e.target.value })}
              />
              {errors.dateOfAssessment && (
                <div className="invalid-feedback">{errors.dateOfAssessment}</div>
              )}
            </div>

            <div className="col-md-4">
              <label className="form-label fw-semibold">
                {t('field.formalizationStatusRecommendation', 'Formalization Status Recommendation')} <span className="text-danger">*</span>
              </label>
              <select
                className="form-select border-primary"
                value={formData.formalizationStatusRecommendation}
                onChange={e =>
                  setFormData({
                    ...formData,
                    formalizationStatusRecommendation: e.target.value as any,
                  })
                }
              >
                <option value="READY_FOR_TIN_MICRO_ENTERPRISE">
                  {t('reco.READY_FOR_TIN_MICRO_ENTERPRISE', 'Ready for TIN & Micro-Enterprise Registration')}
                </option>
                <option value="NEEDS_AWARENESS_LEGAL_SUPPORT">
                  {t('reco.NEEDS_AWARENESS_LEGAL_SUPPORT', 'Needs Awareness / Legal Support')}
                </option>
                <option value="FOLLOW_UP_REQUIRED">
                  {t('reco.FOLLOW_UP_REQUIRED', 'Follow-up Required')}
                </option>
              </select>
            </div>
          </div>
        </div>

        <div className="card-footer bg-light p-3 d-flex justify-content-between">
          <button type="button" className="btn btn-outline-secondary" onClick={onCancel}>
            <i className="bi bi-x-circle me-1"></i> {t('common.cancel', 'Cancel')}
          </button>
          <button type="submit" className="btn btn-warning text-dark fw-bold d-flex align-items-center gap-2">
            <i className="bi bi-check2-circle fs-5"></i>
            <span>{t('form.submitAssess', 'Submit Assessment Record')}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
