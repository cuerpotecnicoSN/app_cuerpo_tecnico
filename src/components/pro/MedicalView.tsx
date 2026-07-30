
import { useTranslation } from 'react-i18next';

export default function MedicalView() {
  const { t } = useTranslation();
  return (
    <div className="p-8 text-center text-red-400 bg-red-900/20 border border-red-500/50 rounded-xl my-4">
        <h2 className="text-xl font-bold mb-2">{t('pro.moduleIncomplete.title')}</h2>
        <p dangerouslySetInnerHTML={{ __html: t('pro.moduleIncomplete.message', { moduleName: 'MedicalView' }) }} />
        <p>{t('pro.moduleIncomplete.instruction')}</p>
    </div>
  );
}
