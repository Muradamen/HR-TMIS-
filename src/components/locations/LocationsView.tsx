import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../i18n/context';

export const LocationsView: React.FC = () => {
  const { woredas, kebeles, traders, addWoreda, addKebele, currentUser } = useApp();
  const { t } = useTranslation();

  const [selectedWoredaId, setSelectedWoredaId] = useState<number>(woredas[0]?.id || 1);
  const [newWoredaName, setNewWoredaName] = useState('');
  const [newWoredaCode, setNewWoredaCode] = useState('');
  const [showAddWoreda, setShowAddWoreda] = useState(false);

  const [newKebeleName, setNewKebeleName] = useState('');
  const [newKebeleCode, setNewKebeleCode] = useState('');
  const [showAddKebele, setShowAddKebele] = useState(false);

  const currentWoreda = woredas.find(w => w.id === selectedWoredaId);
  const currentKebeles = kebeles.filter(k => k.woredaId === selectedWoredaId);

  const getWoredaTraderCount = (wId: number) => {
    return traders.filter(t => {
      const traderWId = t.traderType === 'LEGAL' ? t.legalDetails?.woredaId : t.informalDetails?.woredaId;
      return traderWId === wId;
    }).length;
  };

  const getKebeleTraderCount = (kId: number) => {
    return traders.filter(t => {
      const traderKId = t.traderType === 'LEGAL' ? t.legalDetails?.kebeleId : t.informalDetails?.kebeleId;
      return traderKId === kId;
    }).length;
  };

  const handleCreateWoreda = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWoredaName.trim() || !newWoredaCode.trim()) return;
    addWoreda(newWoredaName.trim(), newWoredaCode.trim().toUpperCase());
    setNewWoredaName('');
    setNewWoredaCode('');
    setShowAddWoreda(false);
  };

  const handleCreateKebele = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKebeleName.trim() || !newKebeleCode.trim()) return;
    addKebele(selectedWoredaId, newKebeleName.trim(), newKebeleCode.trim().toUpperCase());
    setNewKebeleName('');
    setNewKebeleCode('');
    setShowAddKebele(false);
  };

  const canManage =
    currentUser.role === 'SYSTEM_ADMINISTRATOR' || currentUser.role === 'DIRECTOR';

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h2 className="fw-bold mb-1">{t('locations.title', 'Harari Administrative Locations')}</h2>
          <p className="text-muted small mb-0">
            {t('locations.subtitle', 'Woreda & Kebele territorial divisions in Harari People National Regional State')}
          </p>
        </div>

        {canManage && (
          <div className="d-flex gap-2">
            <button
              className="btn btn-outline-primary d-flex align-items-center gap-1"
              onClick={() => setShowAddWoreda(true)}
            >
              <i className="bi bi-plus-circle"></i> {t('locations.addWoreda', 'Add Woreda')}
            </button>
            <button
              className="btn btn-primary d-flex align-items-center gap-1"
              onClick={() => setShowAddKebele(true)}
            >
              <i className="bi bi-plus-circle"></i> {t('locations.addKebele', 'Add Kebele to Active Woreda')}
            </button>
          </div>
        )}
      </div>

      <div className="row g-4">
        {/* Left: Woreda List */}
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
              <h5 className="mb-0 fw-bold">{t('locations.woredasHeading', 'Regional Woredas')}</h5>
              <span className="badge bg-primary rounded-pill">{woredas.length}</span>
            </div>
            <div className="list-group list-group-flush">
              {woredas.map(w => {
                const count = getWoredaTraderCount(w.id);
                const isSelected = w.id === selectedWoredaId;
                return (
                  <button
                    key={w.id}
                    className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center py-3 ${
                      isSelected ? 'bg-primary text-white active' : ''
                    }`}
                    onClick={() => setSelectedWoredaId(w.id)}
                  >
                    <div>
                      <div className="fw-bold">{w.name}</div>
                      <small className={isSelected ? 'text-white-50' : 'text-muted'}>
                        {t('locations.code', 'Code:')} {w.code}
                      </small>
                    </div>
                    <span
                      className={`badge rounded-pill ${
                        isSelected ? 'bg-white text-primary' : 'bg-secondary'
                      }`}
                    >
                      {count} {t('locations.traders', 'traders')}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Selected Woreda & Kebeles */}
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
              <div>
                <h5 className="mb-0 fw-bold">
                  {currentWoreda?.name} {t('field.woreda', 'Woreda')} &bull; {t('locations.kebelesHeading', 'Kebeles')}
                </h5>
                <small className="text-muted">
                  {t('locations.code', 'Administrative Code:')} <strong>{currentWoreda?.code}</strong>
                </small>
              </div>
              <span className="badge bg-info text-dark">
                {currentKebeles.length} {t('locations.kebelesRegistered', 'Kebeles registered')}
              </span>
            </div>

            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>{t('locations.kebeleName', 'Kebele Name')}</th>
                    <th>{t('locations.kebeleCode', 'Kebele Code')}</th>
                    <th>{t('common.status', 'Status')}</th>
                    <th>{t('locations.traders', 'Registered Traders')}</th>
                  </tr>
                </thead>
                <tbody>
                  {currentKebeles.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-4 text-muted">
                        {t('locations.noKebeles', 'No kebeles configured for this woreda yet.')}
                      </td>
                    </tr>
                  ) : (
                    currentKebeles.map(k => {
                      const kTraders = getKebeleTraderCount(k.id);
                      return (
                        <tr key={k.id}>
                          <td className="fw-semibold text-dark">{k.name}</td>
                          <td className="font-monospace small">{k.code}</td>
                          <td>
                            <span className="badge bg-success-subtle text-success border border-success-subtle">
                              {t('locations.active', 'Active')}
                            </span>
                          </td>
                          <td>
                            <span className="badge bg-secondary rounded-pill">
                              {kTraders} {t('locations.traders', 'traders')}
                            </span>
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
      </div>

      {/* Add Woreda Modal */}
      {showAddWoreda && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title fw-bold">{t('locations.modalAddWoredaTitle', 'Add New Harari Woreda')}</h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowAddWoreda(false)}
                ></button>
              </div>
              <form onSubmit={handleCreateWoreda}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label fw-semibold">{t('locations.woredaName', 'Woreda Name')}</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Hakim Gara"
                      value={newWoredaName}
                      onChange={e => setNewWoredaName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">{t('locations.woredaCode', 'Administrative Code')}</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. HG-10"
                      value={newWoredaCode}
                      onChange={e => setNewWoredaCode(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="modal-footer bg-light">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowAddWoreda(false)}
                  >
                    {t('common.cancel', 'Cancel')}
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {t('common.save', 'Save')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Kebele Modal */}
      {showAddKebele && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title fw-bold">
                  {t('locations.modalAddKebeleTitle', 'Add New Kebele')} &bull; {currentWoreda?.name}
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowAddKebele(false)}
                ></button>
              </div>
              <form onSubmit={handleCreateKebele}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label fw-semibold">{t('locations.kebeleName', 'Kebele Name')}</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Kebele 04"
                      value={newKebeleName}
                      onChange={e => setNewKebeleName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">{t('locations.kebeleCode', 'Kebele Code')}</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. AN-K04"
                      value={newKebeleCode}
                      onChange={e => setNewKebeleCode(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="modal-footer bg-light">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowAddKebele(false)}
                  >
                    {t('common.cancel', 'Cancel')}
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {t('common.save', 'Save')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
