import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, MessagesSquare, Send, Trash2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import TranslatedText from '../../common/TranslatedText';

interface Msg {
  id: string;
  author_id: string;
  content: string;
  created_at: string;
  author?: { full_name: string | null; role: string | null } | null;
}

/** Chat entre el cuerpo técnico y un jugador. */
export default function PlayerChat({ playerId }: { playerId: string }) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [msgs, setMsgs] = useState<Msg[] | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    const { data, error: e } = await supabase
      .from('player_messages').select('*, author:profiles(full_name, role)')
      .eq('player_id', playerId).order('created_at');
    if (e) { setError(e.message); setMsgs([]); return; }
    setMsgs((data || []) as Msg[]);
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId]);

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'nearest' }); }, [msgs?.length]);

  const send = async () => {
    const content = text.trim();
    if (!content) return;
    setSending(true);
    const { error: e } = await supabase.from('player_messages').insert({ player_id: playerId, content });
    setSending(false);
    if (e) { setError(e.message); return; }
    setText(''); setError(null); load();
  };

  const remove = async (id: string) => {
    if (!confirm(t('playerPlan.chat.confirmDelete'))) return;
    await supabase.from('player_messages').delete().eq('id', id);
    load();
  };

  const fmt = (iso: string) => new Date(iso).toLocaleString(i18n.language, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="mt-8 rounded-2xl border border-gray-200 bg-white overflow-hidden">
      <h3 className="font-bold text-black flex items-center gap-2 px-4 py-3 border-b border-gray-100">
        <MessagesSquare size={16} className="text-[#db0030]" /> {t('playerPlan.chat.title')}
      </h3>
      <div className="max-h-[420px] overflow-y-auto p-4 space-y-3 bg-gray-50/60">
        {!msgs ? <Loader2 className="animate-spin text-gray-400 mx-auto" /> : msgs.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">{t('playerPlan.chat.empty')}</p>
        ) : msgs.map((m) => {
          const mine = m.author_id === user?.id;
          const isPlayerMsg = m.author?.role === 'Jugador';
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`group max-w-[80%] rounded-2xl px-3.5 py-2 ${mine ? 'bg-[#db0030] text-white rounded-br-sm' : 'bg-white border border-gray-200 text-gray-900 rounded-bl-sm'}`}>
                <p className={`text-[11px] font-bold mb-0.5 ${mine ? 'text-white/80' : isPlayerMsg ? 'text-[#db0030]' : 'text-gray-500'}`}>
                  {m.author?.full_name || (isPlayerMsg ? t('playerPlan.player') : t('playerPlan.voice.staff'))}
                </p>
                {mine ? <p className="text-sm whitespace-pre-line">{m.content}</p> : <TranslatedText text={m.content} as="p" className="text-sm whitespace-pre-line" />}
                <p className={`text-[10px] mt-1 flex items-center gap-2 ${mine ? 'text-white/70 justify-end' : 'text-gray-400'}`}>
                  {fmt(m.created_at)}
                  {mine && <button onClick={() => remove(m.id)} aria-label={t('playerPlan.delete')} className="opacity-0 group-hover:opacity-100 hover:text-white"><Trash2 size={12} /></button>}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      {error && <p className="px-4 py-2 text-xs font-semibold text-red-600 bg-red-50">{error}</p>}
      <div className="flex gap-2 p-3 border-t border-gray-100">
        <textarea
          rows={1} value={text} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder={t('playerPlan.chat.placeholder')}
          className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#db0030]"
        />
        <button onClick={send} disabled={sending || !text.trim()} aria-label={t('playerPlan.chat.send')}
          className="px-4 rounded-xl bg-[#db0030] text-white disabled:opacity-50 flex items-center gap-1.5 text-sm font-bold">
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );
}
