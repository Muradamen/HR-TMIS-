import React from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../i18n/context';

interface TraderCertificateModalProps {
  traderId: string | null;
  onClose: () => void;
}

export const TraderCertificateModal: React.FC<TraderCertificateModalProps> = ({
  traderId,
  onClose,
}) => {
  const { getTraderById, getWoredaName, getKebeleName } = useApp();
  const { language, setLanguage, t } = useTranslation();

  if (!traderId) return null;
  const trader = getTraderById(traderId);
  if (!trader) return null;

  const isLegal = trader.traderType === 'LEGAL';
  const legal = trader.legalDetails;
  const informal = trader.informalDetails;

  const handlePrint = () => {
    window.print();
  };

  const woredaId = isLegal ? legal?.woredaId : informal?.woredaId;
  const kebeleId = isLegal ? legal?.kebeleId : informal?.kebeleId;

  const getCurrentLanguageLabel = () => {
    if (language === 'om') return 'Afaan Oromoo';
    if (language === 'am') return 'አማርኛ';
    return 'English';
  };

  return (
    <div
      className="modal fade show d-block"
      tabIndex={-1}
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
    >
      <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content border-0 shadow-lg">
          <div className="modal-header bg-dark text-white no-print">
            <h5 className="modal-title d-flex align-items-center gap-2">
              <i className="bi bi-award text-warning"></i>
              {t('cert.officialDossier', 'Official Regional Registration Dossier')}
            </h5>
            <div className="d-flex align-items-center gap-2">
              {/* Language Switcher for Certificate */}
              <div className="btn-group btn-group-sm" role="group" aria-label="Certificate language">
                <button
                  type="button"
                  className={`btn btn-sm ${
                    language === 'en' ? 'btn-warning text-dark fw-bold' : 'btn-outline-light'
                  }`}
                  onClick={() => setLanguage('en')}
                >
                  English
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${
                    language === 'om' ? 'btn-warning text-dark fw-bold' : 'btn-outline-light'
                  }`}
                  onClick={() => setLanguage('om')}
                >
                  Afaan Oromoo
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${
                    language === 'am' ? 'btn-warning text-dark fw-bold' : 'btn-outline-light'
                  }`}
                  onClick={() => setLanguage('am')}
                >
                  አማርኛ
                </button>
              </div>

              <button className="btn btn-sm btn-primary" onClick={handlePrint}>
                <i className="bi bi-printer me-1"></i> {t('cert.printPdf', 'Print / Save PDF')}
              </button>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={onClose}
              ></button>
            </div>
          </div>

          <div className="modal-body p-4 bg-light">
            <div
              className="printable-certificate bg-white p-5 border rounded shadow-sm mx-auto"
              style={{ maxWidth: '800px' }}
            >
              {/* Header */}
              <div className="text-center border-bottom pb-4 mb-4">
                <div className="d-flex justify-content-center align-items-center gap-3 mb-2">
                  <div
                    className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold"
                    style={{ width: 55, height: 55, fontSize: '1.4rem' }}
                  >
                    HR
                  </div>
                  <div>
                    <h5 className="fw-bold mb-0 text-uppercase tracking-wider">
                      {t('cert.stateHeader', 'Harari People National Regional State')}
                    </h5>
                    <div className="text-muted small fw-semibold">
                      {t('cert.agencyHeader', 'Trade and Industry Development Agency • Trade Registry Directorate')}
                    </div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                      {t('brand.address', 'P.O. Box 24, Harar, Ethiopia')} &bull; Tel: +251 25 666 0145
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  <span className="badge bg-secondary px-3 py-1 font-monospace text-uppercase">
                    {t('cert.docRef', 'Document Ref:')} {trader.traderId}/REG-2026
                  </span>
                </div>
              </div>

              {/* Title */}
              <div className="text-center mb-4">
                <h4 className="fw-bold text-uppercase text-primary text-decoration-underline mb-1">
                  {isLegal
                    ? t('cert.titleLegal', 'Certificate of Legal Trade Registration')
                    : t('cert.titleInformal', 'Informal Trader Assessment & Formalization Record')}
                </h4>
                <p className="text-muted small">
                  {t('cert.ordinanceNotice', 'Issued under the Harari Regional Commercial Registration & Business Licensing Ordinance')}
                </p>
              </div>

              {/* Identification Grid */}
              <div className="row g-3 mb-4">
                <div className="col-sm-6">
                  <div className="border rounded p-3 bg-light">
                    <small className="text-muted text-uppercase d-block fw-bold" style={{ fontSize: '0.7rem' }}>
                      {isLegal ? t('field.tradeName', 'Business Entity / Company Name') : t('field.fullName', 'Trader Full Name')}
                    </small>
                    <div className="fw-bold fs-5 text-dark">
                      {isLegal ? legal?.tradeName : informal?.fullName}
                    </div>
                    {isLegal && (
                      <div className="small text-muted">
                        {t('field.ownerFullName', 'Owner')}: <strong>{legal?.ownerFullName}</strong>
                      </div>
                    )}
                  </div>
                </div>

                <div className="col-sm-6">
                  <div className="border rounded p-3 bg-light">
                    <small className="text-muted text-uppercase d-block fw-bold" style={{ fontSize: '0.7rem' }}>
                      {t('field.traderId', 'Regional System Identifier (TMIS ID)')}
                    </small>
                    <div className="fw-bold fs-5 font-monospace text-primary">
                      {trader.traderId}
                    </div>
                    <div className="small text-muted">
                      {t('common.status', 'Status')}:{' '}
                      <strong className={trader.status === 'APPROVED' ? 'text-success' : 'text-warning'}>
                        {t(`status.${trader.status}`, trader.status)}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Specs Table */}
              <table className="table table-bordered table-sm small mb-4">
                <tbody>
                  <tr>
                    <td className="bg-light fw-bold" style={{ width: '25%' }}>{t('field.region', 'Region / Jurisdiction')}</td>
                    <td style={{ width: '25%' }}>Harari Region</td>
                    <td className="bg-light fw-bold" style={{ width: '25%' }}>{t('field.woreda', 'Woreda')}</td>
                    <td style={{ width: '25%' }}>{woredaId ? getWoredaName(woredaId) : '-'}</td>
                  </tr>
                  <tr>
                    <td className="bg-light fw-bold">{t('field.kebele', 'Kebele')}</td>
                    <td>{kebeleId ? getKebeleName(kebeleId) : '-'}</td>
                    <td className="bg-light fw-bold">{t('field.specificLocation', 'Specific Location')}</td>
                    <td>
                      {isLegal ? legal?.houseNumberPlotId || 'Commercial Zone' : informal?.specificLocationMarketArea}
                    </td>
                  </tr>

                  {isLegal ? (
                    <>
                      <tr>
                        <td className="bg-light fw-bold">{t('field.tin', 'TIN Number')}</td>
                        <td className="font-monospace fw-bold">{legal?.tin}</td>
                        <td className="bg-light fw-bold">{t('field.tradeRegNumber', 'Registration No')}</td>
                        <td className="font-monospace">{legal?.tradeRegistrationNumber}</td>
                      </tr>
                      <tr>
                        <td className="bg-light fw-bold">{t('field.businessSector', 'Business Sector')}</td>
                        <td>{t(`sector.${legal?.businessSector}`, legal?.businessSector.replace(/_/g, ' ') || '')}</td>
                        <td className="bg-light fw-bold">{t('field.tradeScale', 'Trade Scale')}</td>
                        <td>{legal?.tradeScale ? t(`field.${legal.tradeScale.toLowerCase()}`, legal.tradeScale) : ''}</td>
                      </tr>
                      <tr>
                        <td className="bg-light fw-bold">{t('field.businessOwnershipType', 'Ownership Type')}</td>
                        <td>{t(`ownership.${legal?.businessOwnershipType}`, legal?.businessOwnershipType.replace(/_/g, ' ') || '')}</td>
                        <td className="bg-light fw-bold">{t('field.dateOfIssuance', 'Date of Issuance')}</td>
                        <td>{legal?.dateOfIssuance}</td>
                      </tr>
                    </>
                  ) : (
                    <>
                      <tr>
                        <td className="bg-light fw-bold">{t('field.natureOfTradeActivity', 'Trade Activity')}</td>
                        <td colSpan={3}>{t(`activity.${informal?.natureOfTradeActivity}`, informal?.natureOfTradeActivity.replace(/_/g, ' ') || '')}</td>
                      </tr>
                      <tr>
                        <td className="bg-light fw-bold">{t('field.nationalId', 'National / Resident ID')}</td>
                        <td>{informal?.nationalIdResidentId || 'On Record'}</td>
                        <td className="bg-light fw-bold">{t('field.phoneNumber', 'Phone Contact')}</td>
                        <td>{informal?.phoneNumber || '-'}</td>
                      </tr>
                      <tr>
                        <td className="bg-light fw-bold">{t('field.estimatedCapital', 'Estimated Capital Assets')}</td>
                        <td className="fw-bold text-success">{informal?.estimatedCapitalAssets?.toLocaleString()} ETB</td>
                        <td className="bg-light fw-bold">{t('field.dateOfAssessment', 'Assessment Date')}</td>
                        <td>{informal?.dateOfAssessment}</td>
                      </tr>
                      <tr>
                        <td className="bg-light fw-bold">{t('field.formalizationStatusRecommendation', 'Formalization Roadmap')}</td>
                        <td colSpan={3} className="fw-bold text-primary">
                          {t(`reco.${informal?.formalizationStatusRecommendation}`, informal?.formalizationStatusRecommendation.replace(/_/g, ' ') || '')}
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>

              {/* Official Seal and Signatures */}
              <div className="row pt-4 mt-4 border-top text-center">
                <div className="col-4">
                  <div className="small text-muted mb-4">{t('cert.dataEncoder', 'Data Encoder')}</div>
                  <div className="fw-bold small">{trader.registeredBy}</div>
                  <div className="border-bottom mx-auto" style={{ width: '80%' }}></div>
                  <div className="text-muted" style={{ fontSize: '0.65rem' }}>{t('cert.officerSignature', 'Officer Signature')}</div>
                </div>

                <div className="col-4">
                  <div
                    className="border border-danger rounded-circle mx-auto d-flex flex-column align-items-center justify-content-center text-danger p-2"
                    style={{ width: 90, height: 90, opacity: 0.8 }}
                  >
                    <i className="bi bi-patch-check fs-4"></i>
                    <span style={{ fontSize: '0.55rem', fontWeight: 800 }}>HARARI REGION</span>
                    <span style={{ fontSize: '0.5rem' }}>{t('cert.officialSeal', 'OFFICIAL SEAL')}</span>
                  </div>
                </div>

                <div className="col-4">
                  <div className="small text-muted mb-4">{t('cert.directorAuthority', 'Director / Approving Authority')}</div>
                  <div className="fw-bold small">{trader.verifiedBy || 'Dr. Ahmed Hassen'}</div>
                  <div className="border-bottom mx-auto" style={{ width: '80%' }}></div>
                  <div className="text-muted" style={{ fontSize: '0.65rem' }}>{t('cert.authorizedSealSignature', 'Authorized Seal & Signature')}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="modal-footer bg-light no-print">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              {t('common.close', 'Close')}
            </button>
            <button type="button" className="btn btn-primary" onClick={handlePrint}>
              <i className="bi bi-printer me-1"></i> {t('common.print', 'Print Certificate')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
