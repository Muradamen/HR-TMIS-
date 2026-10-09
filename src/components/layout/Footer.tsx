import React from 'react';
import { useTranslation } from '../../i18n/context';

export const Footer: React.FC = () => {
  const { t } = useTranslation();

  return (
    <footer className="app-footer">
      <div>
        <strong>HR-TMIS &copy; 2026</strong> {t('footer.tagline', 'Harari Region Trader Management Information System.')}
      </div>
      <div className="d-none d-sm-inline">
        <span>{t('footer.developedFor', 'Developed for Harari People National Regional State Trade & Industry Development Agency')}</span>
      </div>
    </footer>
  );
};
