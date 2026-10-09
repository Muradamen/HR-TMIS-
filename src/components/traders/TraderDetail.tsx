import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../i18n/context';

interface TraderDetailProps {
  traderId: string;
  onBack: () => void;
  onPrintCertificate: (traderId: string) => void;
}

export const TraderDetail: React.FC<TraderDetailProps> = ({
  traderId,
  onBack,
  onPrintCertificate,
}) => {
  const { getTraderById, getWoredaName, getKebeleName, currentUser, verifyTrader, deleteTrader } = useApp();
  const { t } = useTranslation();
  const trader = getTraderById(traderId);

  const [verificationNotes, setVerificationNotes] = useState('');
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<'APPROVED' | 'RETURNED'>('APPROVED');

  if (!trader) {
    return (
      <div className="card border-0 shadow-sm p-5 text-center">
        <i className="bi bi-exclamation-octagon text-danger fs-1 mb-3"></i>
        <h3>{t('detail.notFoundTitle', 'Trader Record Not Found')}</h3>
        <p className="text-muted">{t('detail.notFoundDesc', 'The requested trader identifier does not exist in registry.')}</p>
        <div>
          <button className="btn btn-primary" onClick={onBack}>
            <i className="bi bi-arrow-left me-1"></i> {t('detail.backToList', 'Return to Directory')}
          </button>
        </div>
      </div>
    );
  }

  const isLegal = trader.traderType === 'LEGAL';
  const legal = trader.legalDetails;
  const informal = trader.informalDetails;

  const isVerifier = currentUser.role === 'DIRECTOR';

  const handleOpenVerify = (status: 'APPROVED' | 'RETURNED') => {
    setPendingStatus(status);
    setVerificationNotes(trader.verificationNotes || '');
    setShowVerifyModal(true);
  };

  const handleConfirmVerify = () => {
    verifyTrader(trader.traderId, pendingStatus, verificationNotes);
    setShowVerifyModal(false);
  };

  const handleDelete = () => {
    if (window.confirm(`${t('confirm.archiveTrader', 'Are you sure you want to archive trader')} ${trader.traderId}?`)) {
      deleteTrader(trader.traderId);
      onBack();
    }
  };

  const woredaId = isLegal ? legal?.woredaId : informal?.woredaId;
  const kebeleId = isLegal ? legal?.kebeleId : informal?.kebeleId;

  return (
    <div>
      {/* Top action bar */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <button className="btn btn-outline-secondary d-flex align-items-center gap-1" onClick={onBack}>
          <i className="bi bi-arrow-left"></i>
          <span>{t('detail.backToList', 'Back to List')}</span>
        </button>

        <div className="d-flex gap-2">
          <button
            className="btn btn-outline-primary d-flex align-items-center gap-1"
            onClick={() => onPrintCertificate(trader.traderId)}
          >
            <i className="bi bi-printer"></i>
            <span>{t('detail.printDossier', 'Print Official Dossier')}</span>
          </button>

          {currentUser.role === 'DATA_ENCODER' && trader.registeredById === currentUser.id && ['DRAFT', 'NEEDS_CORRECTION', 'RETURNED'].includes(trader.status) && (
            <button className="btn btn-outline-danger" onClick={handleDelete} title={t('detail.archiveRecord', 'Archive draft record')}>
              <i className="bi bi-trash"></i>
            </button>
          )}
        </div>
      </div>

      {/* Main Dossier Card */}
      <div className="card border-0 shadow-sm mb-4">
        {/* Header Ribbon */}
        <div className={`card-header py-3 ${isLegal ? 'bg-primary' : 'bg-warning'} text-${isLegal ? 'white' : 'dark'}`}>
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div>
              <div className="d-flex align-items-center gap-2 mb-1">
                <span className="badge bg-white text-dark font-monospace fs-6 px-2 py-1">
                  {trader.traderId}
                </span>
                <span className="badge bg-dark text-white px-2 py-1">
                  {isLegal ? t('type.LEGAL', 'LEGAL TRADER') : t('type.INFORMAL', 'INFORMAL TRADER')}
                </span>
              </div>
              <h3 className="fw-bold mb-0">
                {isLegal ? legal?.tradeName : informal?.fullName}
              </h3>
            </div>

            <div>
              {trader.status === 'APPROVED' && (
                <span className="badge bg-success fs-6 px-3 py-2 d-inline-flex align-items-center gap-1">
                  <i className="bi bi-patch-check-fill"></i> {t('status.APPROVED', 'APPROVED & VERIFIED')}
                </span>
              )}
              {(trader.status === 'PENDING' || trader.status === 'SUBMITTED') && (
                <span className="badge bg-light text-dark fs-6 px-3 py-2 d-inline-flex align-items-center gap-1">
                  <i className="bi bi-clock-history text-warning"></i> {t('status.SUBMITTED', 'SUBMITTED / PENDING')}
                </span>
              )}
              {trader.status === 'UNDER_REVIEW' && (
                <span className="badge bg-info text-dark fs-6 px-3 py-2 d-inline-flex align-items-center gap-1">
                  <i className="bi bi-eye-fill"></i> {t('status.UNDER_REVIEW', 'UNDER REVIEW')}
                </span>
              )}
              {(trader.status === 'RETURNED' || trader.status === 'NEEDS_CORRECTION') && (
                <span className="badge bg-danger fs-6 px-3 py-2 d-inline-flex align-items-center gap-1">
                  <i className="bi bi-exclamation-triangle-fill"></i> {t('status.NEEDS_CORRECTION', 'NEEDS CORRECTION')}
                </span>
              )}
              {trader.status === 'REJECTED' && (
                <span className="badge bg-secondary fs-6 px-3 py-2 d-inline-flex align-items-center gap-1">
                  <i className="bi bi-x-circle-fill"></i> {t('status.REJECTED', 'REJECTED')}
                </span>
              )}
              {trader.status === 'DRAFT' && (
                <span className="badge bg-light text-muted border fs-6 px-3 py-2 d-inline-flex align-items-center gap-1">
                  <i className="bi bi-pencil-fill"></i> {t('status.DRAFT', 'DRAFT')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Verification Alert Banner if present */}
        {trader.verificationNotes && (
          <div
            className={`alert mb-0 rounded-0 border-0 ${
              trader.status === 'APPROVED' ? 'alert-success' : 'alert-danger'
            } d-flex align-items-center gap-2 px-4 py-3`}
          >
            <i className={`bi ${trader.status === 'APPROVED' ? 'bi-check-circle-fill' : 'bi-x-circle-fill'} fs-4`}></i>
            <div>
              <strong>{t('detail.verificationRemarks', 'Verification Remarks by')} {trader.verifiedBy || 'Director'}:</strong>{' '}
              {trader.verificationNotes}
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="card-body p-4">
          <div className="row g-4">
            {/* Column 1: Identity & Demographics */}
            <div className="col-lg-6">
              <h5 className="fw-bold border-bottom pb-2 mb-3 text-secondary">
                <i className="bi bi-person-lines-fill me-2"></i>
                {isLegal ? t('detail.enterpriseDetails', 'Enterprise & Ownership Details') : t('detail.demographics', 'Trader Identity & Demographics')}
              </h5>

              <table className="table table-sm table-borderless">
                <tbody>
                  {isLegal ? (
                    <>
                      <tr>
                        <td className="text-muted" style={{ width: '40%' }}>{t('field.tradeName', 'Trade / Company Name')}:</td>
                        <td className="fw-bold">{legal?.tradeName}</td>
                      </tr>
                      <tr>
                        <td className="text-muted">{t('field.ownerFullName', 'Owner Full Name')}:</td>
                        <td className="fw-semibold">{legal?.ownerFullName}</td>
                      </tr>
                      <tr>
                        <td className="text-muted">{t('field.gender', 'Gender')} &amp; {t('field.age', 'Age')}:</td>
                        <td>{legal ? t(`field.${legal.gender.toLowerCase()}`, legal.gender) : ''} &bull; {legal?.age}</td>
                      </tr>
                      <tr>
                        <td className="text-muted">{t('field.tin', 'TIN (Tax Number)')}:</td>
                        <td className="font-monospace fw-bold text-primary">{legal?.tin}</td>
                      </tr>
                      <tr>
                        <td className="text-muted">{t('field.tradeRegNumber', 'Registration Number')}:</td>
                        <td className="font-monospace">{legal?.tradeRegistrationNumber}</td>
                      </tr>
                      <tr>
                        <td className="text-muted">{t('field.businessOwnershipType', 'Ownership Structure')}:</td>
                        <td>
                          <span className="badge bg-light text-dark border">
                            {legal ? t(`ownership.${legal.businessOwnershipType}`, legal.businessOwnershipType.replace(/_/g, ' ')) : ''}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="text-muted">{t('field.tradeScale', 'Trade Scale')}:</td>
                        <td>
                          <span className="badge bg-info text-dark">
                            {legal ? t(`field.${legal.tradeScale.toLowerCase()}`, legal.tradeScale) : ''}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="text-muted">{t('field.businessSector', 'Business Sector')}:</td>
                        <td className="fw-semibold text-primary">
                          {legal ? t(`sector.${legal.businessSector}`, legal.businessSector.replace(/_/g, ' ')) : ''}
                        </td>
                      </tr>
                    </>
                  ) : (
                    <>
                      <tr>
                        <td className="text-muted" style={{ width: '40%' }}>{t('field.fullName', 'Full Name')}:</td>
                        <td className="fw-bold">{informal?.fullName}</td>
                      </tr>
                      <tr>
                        <td className="text-muted">{t('field.gender', 'Gender')} &amp; {t('field.age', 'Age')}:</td>
                        <td>{informal ? t(`field.${informal.gender.toLowerCase()}`, informal.gender) : ''} &bull; {informal?.age}</td>
                      </tr>
                      <tr>
                        <td className="text-muted">{t('field.nationalId', 'National / Resident ID')}:</td>
                        <td className="font-monospace fw-semibold">
                          {informal?.nationalIdResidentId || t('common.na', 'Not provided')}
                        </td>
                      </tr>
                      <tr>
                        <td className="text-muted">{t('field.phoneNumber', 'Contact Phone')}:</td>
                        <td className="fw-medium text-primary">
                          {informal?.phoneNumber || t('common.na', 'No phone recorded')}
                        </td>
                      </tr>
                      <tr>
                        <td className="text-muted">{t('field.natureOfTradeActivity', 'Nature of Trade Activity')}:</td>
                        <td className="fw-bold text-dark">
                          {informal ? t(`activity.${informal.natureOfTradeActivity}`, informal.natureOfTradeActivity.replace(/_/g, ' ')) : ''}
                        </td>
                      </tr>
                      <tr>
                        <td className="text-muted">{t('field.reasonForOperatingInformally', 'Reason for Informality')}:</td>
                        <td className="text-muted">
                          {informal ? t(`reason.${informal.reasonForOperatingInformally}`, informal.reasonForOperatingInformally.replace(/_/g, ' ')) : ''}
                        </td>
                      </tr>
                      <tr>
                        <td className="text-muted">{t('field.estimatedCapital', 'Estimated Capital / Assets')}:</td>
                        <td className="fw-bold text-success fs-5">
                          {informal?.estimatedCapitalAssets?.toLocaleString()} ETB
                        </td>
                      </tr>
                      <tr>
                        <td className="text-muted">{t('field.formalizationStatusRecommendation', 'Formalization Track')}:</td>
                        <td>
                          <span className="badge bg-primary text-wrap">
                            {informal ? t(`reco.${informal.formalizationStatusRecommendation}`, informal.formalizationStatusRecommendation.replace(/_/g, ' ')) : ''}
                          </span>
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>

            {/* Column 2: Location & Administrative Information */}
            <div className="col-lg-6">
              <h5 className="fw-bold border-bottom pb-2 mb-3 text-secondary">
                <i className="bi bi-geo-alt-fill me-2"></i>
                {t('detail.locationRecords', 'Location & Administrative Records')}
              </h5>

              <table className="table table-sm table-borderless">
                <tbody>
                  <tr>
                    <td className="text-muted" style={{ width: '40%' }}>{t('field.region', 'Administrative Region')}:</td>
                    <td className="fw-semibold">Harari Region</td>
                  </tr>
                  <tr>
                    <td className="text-muted">{t('field.woreda', 'Woreda')}:</td>
                    <td className="fw-bold text-primary">
                      {woredaId ? getWoredaName(woredaId) : '-'}
                    </td>
                  </tr>
                  <tr>
                    <td className="text-muted">{t('field.kebele', 'Kebele')}:</td>
                    <td className="fw-bold">
                      {kebeleId ? getKebeleName(kebeleId) : '-'}
                    </td>
                  </tr>
                  <tr>
                    <td className="text-muted">{t('field.specificLocation', 'Specific Address / Area')}:</td>
                    <td>
                      {isLegal
                        ? legal?.houseNumberPlotId || 'Commercial Zone'
                        : informal?.specificLocationMarketArea}
                    </td>
                  </tr>

                  {isLegal ? (
                    <>
                      <tr>
                        <td className="text-muted">{t('field.issuingInstitution', 'Issuing Institution')}:</td>
                        <td>{legal?.issuingInstitution}</td>
                      </tr>
                      <tr>
                        <td className="text-muted">{t('field.dateOfIssuance', 'Date of Issuance')}:</td>
                        <td>{legal?.dateOfIssuance}</td>
                      </tr>
                      <tr>
                        <td className="text-muted">{t('field.officerSignature', 'Officer Signature / Seal')}:</td>
                        <td className="font-monospace">{legal?.officerSignature || '-'}</td>
                      </tr>
                      {legal?.remarks && (
                        <tr>
                          <td className="text-muted">{t('field.remarks', 'Remarks')}:</td>
                          <td className="small text-muted">{legal?.remarks}</td>
                        </tr>
                      )}
                    </>
                  ) : (
                    <>
                      <tr>
                        <td className="text-muted">{t('field.dateOfAssessment', 'Date of Assessment')}:</td>
                        <td className="fw-semibold">{informal?.dateOfAssessment}</td>
                      </tr>
                      <tr>
                        <td className="text-muted">{t('field.enumeratorName', 'Enumerator / Officer')}:</td>
                        <td>{informal?.enumeratorDataCollectorName}</td>
                      </tr>
                    </>
                  )}

                  <tr>
                    <td className="text-muted">{t('field.registeredBy', 'System Registered By')}:</td>
                    <td>{trader.registeredBy}</td>
                  </tr>
                  <tr>
                    <td className="text-muted">{t('field.createdAt', 'Record Created')}:</td>
                    <td className="small text-muted">
                      {new Date(trader.createdAt).toLocaleString()}
                    </td>
                  </tr>
                  <tr>
                    <td className="text-muted">{t('field.updatedAt', 'Last Updated')}:</td>
                    <td className="small text-muted">
                      {new Date(trader.updatedAt).toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Verification Action Footer */}
        {isVerifier && (
          <div className="card-footer bg-light p-3 border-top">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
              <div>
                <span className="fw-bold me-2">{t('detail.verificationAction', 'Directorate Verification Action:')}</span>
                <small className="text-muted">
                  {t('detail.loggedInAs', 'Logged in as')} <strong>{currentUser.fullName}</strong> ({t(`role.${currentUser.role}`, currentUser.role.replace(/_/g, ' '))})
                </small>
              </div>

              <div className="d-flex gap-2">
                <button
                  className="btn btn-danger btn-sm d-flex align-items-center gap-1"
                  onClick={() => handleOpenVerify('RETURNED')}
                >
                  <i className="bi bi-x-circle"></i>
                  <span>{t('detail.returnApp', 'Return Application')}</span>
                </button>

                <button
                  className="btn btn-success btn-sm d-flex align-items-center gap-1"
                  onClick={() => handleOpenVerify('APPROVED')}
                >
                  <i className="bi bi-check-circle"></i>
                  <span>{t('detail.approveTrader', 'Approve Trader')}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Verification Modal */}
      {showVerifyModal && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div
                className={`modal-header ${
                  pendingStatus === 'APPROVED' ? 'bg-success text-white' : 'bg-danger text-white'
                }`}
              >
                <h5 className="modal-title fw-bold">
                  {pendingStatus === 'APPROVED'
                    ? t('detail.modalApproveTitle', 'Approve Trader Record')
                    : t('detail.modalReturnTitle', 'Return Trader Record')}
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowVerifyModal(false)}
                ></button>
              </div>

              <div className="modal-body p-4">
                <p className="mb-3">
                  {t('detail.modalNotice', 'You are about to mark trader')} <strong>{trader.traderId}</strong> ({isLegal ? legal?.tradeName : informal?.fullName}) as{' '}
                  <span
                    className={`badge ${pendingStatus === 'APPROVED' ? 'bg-success' : 'bg-danger'}`}
                  >
                    {t(`status.${pendingStatus}`, pendingStatus)}
                  </span>.
                </p>

                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    {t('detail.modalJustification', 'Verification Justification & Notes')}
                  </label>
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder={t('detail.modalPlaceholder', 'Provide official remarks, compliance verification status, or required remediation...')}
                    value={verificationNotes}
                    onChange={e => setVerificationNotes(e.target.value)}
                  ></textarea>
                </div>
              </div>

              <div className="modal-footer bg-light">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowVerifyModal(false)}
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="button"
                  className={`btn ${pendingStatus === 'APPROVED' ? 'btn-success' : 'btn-danger'}`}
                  onClick={handleConfirmVerify}
                >
                  {t('common.confirm', 'Confirm')} {t(`status.${pendingStatus}`, pendingStatus)}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
