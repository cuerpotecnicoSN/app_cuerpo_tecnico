import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { syncGoogleForm, type GoogleFormSyncResult } from '../../services/googleFormSync';

export default function GoogleFormSyncButton() {
  const { t } = useTranslation();
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<GoogleFormSyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setSyncing(true);
    setError(null);
    setResult(null);
    try {
      setResult(await syncGoogleForm());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSyncing(false);
    }
  };

  const open = !!result || !!error;

  return (
    <div className="relative">
      <button
        onClick={run}
        disabled={syncing}
        className="disabled:opacity-60 disabled:cursor-wait px-3.5 py-2 bg-white dark:bg-neutral-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-neutral-700 border border-gray-200 dark:border-white/10 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
      >
        <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
        {syncing ? t('googleFormSync.syncing') : t('googleFormSync.button')}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-[min(22rem,calc(100vw-2rem))] bg-white dark:bg-neutral-900 border border-gray-200 dark:border-white/10 rounded-2xl shadow-xl p-4 text-xs">
          <button
            onClick={() => { setResult(null); setError(null); }}
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-700"
            aria-label={t('common.close', 'Cerrar')}
          >
            <X size={14} />
          </button>

          {error && (
            <div className="flex gap-2 text-red-600 pr-5">
              <AlertTriangle size={16} className="shrink-0" />
              <p className="break-words">{error}</p>
            </div>
          )}

          {result && (
            <div className="space-y-3 pr-5">
              <div className="flex gap-2 text-emerald-700 dark:text-emerald-400 font-bold">
                <CheckCircle2 size={16} className="shrink-0" />
                <p>{t('googleFormSync.done', { imported: result.imported, rows: result.rows })}</p>
              </div>
              {result.skipped > 0 && (
                <p className="text-gray-500">{t('googleFormSync.skipped', { count: result.skipped })}</p>
              )}
              {result.fuzzy.length > 0 && (
                <div className="border-t border-gray-100 dark:border-white/10 pt-3">
                  <p className="font-bold text-gray-800 dark:text-gray-200 mb-1">{t('googleFormSync.fuzzyTitle')}</p>
                  <ul className="space-y-1 max-h-32 overflow-y-auto">
                    {result.fuzzy.map((f) => (
                      <li key={f.written} className="text-gray-700 dark:text-gray-300">
                        «{f.written}» → <span className="font-semibold">{f.player}</span>
                        <span className="text-gray-400"> ({f.score}%)</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {result.unmatched.length > 0 && (
                <div className="border-t border-gray-100 dark:border-white/10 pt-3">
                  <p className="font-bold text-amber-700 dark:text-amber-400 mb-1">{t('googleFormSync.unmatchedTitle')}</p>
                  <p className="text-gray-500 mb-2">{t('googleFormSync.unmatchedHint')}</p>
                  <ul className="space-y-1 max-h-32 overflow-y-auto">
                    {result.unmatched.map((u) => (
                      <li key={u.name + u.email} className="text-gray-700 dark:text-gray-300 break-words">
                        <span className="font-semibold">«{u.name || u.email || '—'}»</span>
                        <span className="text-gray-400"> ({u.responses})</span>
                        {u.suggestion && (
                          <span className="text-gray-500"> · {t('googleFormSync.suggestion', { name: u.suggestion })}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
