import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, CheckCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import FormText from '../forms/FormText';
import TranslatedText from '../common/TranslatedText';
import type { LText } from '../../services/forms';

export interface AppNotification {
  id: string;
  audience: 'staff' | 'player';
  player_id: string | null;
  player_name: string | null;
  kind: string;
  op: 'INSERT' | 'UPDATE';
  title: string | null;
  title_i18n: LText | null;
  created_at: string;
}

interface Props {
  audience: 'staff' | 'player';
  onOpen: (n: AppNotification) => void;
  /** Estilo del botón (cabecera clara u oscura) */
  dark?: boolean;
}

const POLL_MS = 60_000;
const LIMIT = 40;

const timeAgo = (iso: string, lang: string) => {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
  if (s < 60) return rtf.format(-Math.round(s), 'second');
  if (s < 3600) return rtf.format(-Math.round(s / 60), 'minute');
  if (s < 86400) return rtf.format(-Math.round(s / 3600), 'hour');
  return rtf.format(-Math.round(s / 86400), 'day');
};

export default function NotificationBell({ audience, onOpen, dark }: Props) {
  const { t, i18n } = useTranslation();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [read, setRead] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('notifications').select('*').eq('audience', audience)
      .order('created_at', { ascending: false }).limit(LIMIT);
    const list = (data || []) as AppNotification[];
    setItems(list);
    if (list.length) {
      const { data: reads } = await supabase.from('notification_reads').select('notification_id').in('notification_id', list.map((n) => n.id));
      setRead(new Set((reads || []).map((r) => r.notification_id as string)));
    }
  }, [audience]);

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_MS);
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(id); window.removeEventListener('focus', onFocus); };
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const unread = items.filter((n) => !read.has(n.id));

  const markRead = async (ids: string[]) => {
    if (!ids.length) return;
    setRead((r) => new Set([...r, ...ids]));
    await supabase.from('notification_reads').upsert(ids.map((notification_id) => ({ notification_id })), { onConflict: 'notification_id,user_id', ignoreDuplicates: true });
  };

  const message = (n: AppNotification) =>
    t(`notifications.${audience}.${n.kind}${n.op === 'UPDATE' ? '_updated' : ''}`, {
      name: n.player_name || t('notifications.aPlayer'),
      defaultValue: t(`notifications.${audience}.${n.kind}`, { name: n.player_name || t('notifications.aPlayer'), defaultValue: t('notifications.generic') }),
    });

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={t('notifications.title')}
        className={`relative p-2 rounded-lg transition-colors ${dark ? 'text-white/80 hover:text-white hover:bg-white/10' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10'}`}
      >
        <Bell size={20} />
        {unread.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#db0030] text-white text-[10px] font-black flex items-center justify-center ring-2 ring-white">
            {unread.length > 9 ? '9+' : unread.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[min(92vw,380px)] bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden text-gray-900">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="font-black">{t('notifications.title')}</p>
            {unread.length > 0 && (
              <button onClick={() => markRead(unread.map((n) => n.id))} className="flex items-center gap-1 text-xs font-bold text-[#db0030] hover:underline">
                <CheckCheck size={14} /> {t('notifications.markAll')}
              </button>
            )}
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {!items.length && <p className="text-sm text-gray-400 text-center py-10">{t('notifications.empty')}</p>}
            {items.map((n) => {
              const isUnread = !read.has(n.id);
              return (
                <button
                  key={n.id}
                  onClick={() => { markRead([n.id]); setOpen(false); onOpen(n); }}
                  className={`w-full text-left flex gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 ${isUnread ? 'bg-red-50/40' : ''}`}
                >
                  <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${isUnread ? 'bg-[#db0030]' : 'bg-transparent'}`} />
                  <span className="min-w-0 flex-1">
                    <span className={`block text-sm ${isUnread ? 'font-bold' : 'text-gray-700'}`}>{message(n)}</span>
                    {n.title_i18n ? (
                      <FormText text={n.title_i18n} className="block text-xs text-gray-500 truncate mt-0.5" />
                    ) : n.title ? (
                      <TranslatedText text={n.title} as="span" className="block text-xs text-gray-500 line-clamp-2 mt-0.5" />
                    ) : null}
                    <span className="block text-[11px] text-gray-400 mt-1">{timeAgo(n.created_at, i18n.language || 'es')}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
