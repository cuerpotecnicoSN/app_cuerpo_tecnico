import { useEffect, useState } from 'react';
import { ExternalLink, FileText, Image as ImageIcon, Link2, Music, Play, Video, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Previsualiza un enlace dentro de la app: vídeos con miniatura y reproductor
 * embebido, audios con reproductor, PDFs/documentos en visor. Lo que no se
 * pueda embeber queda como tarjeta con enlace externo.
 */

export type MediaType = 'video' | 'audio' | 'document' | 'image' | 'link';

export interface MediaInfo {
  type: MediaType;
  /** Origen legible (YouTube, Drive...) */
  source: string;
  /** URL para <iframe> */
  embed?: string;
  /** URL para <video>/<audio>/<img> nativos */
  direct?: string;
  thumb?: string;
  /** Vimeo: la miniatura se pide por oEmbed */
  vimeoUrl?: string;
  /** Altura fija del iframe (audio embebido) */
  height?: number;
}

const VIDEO_EXT = /\.(mp4|webm|mov|m4v|ogv)$/i;
const AUDIO_EXT = /\.(mp3|wav|ogg|oga|m4a|aac|flac|opus)$/i;
const IMAGE_EXT = /\.(jpe?g|png|gif|webp|avif|svg)$/i;
const PDF_EXT = /\.pdf$/i;
const OFFICE_EXT = /\.(docx?|pptx?|xlsx?|odt|rtf|txt|csv)$/i;

/** "1m23s" / "83" -> 83 */
const parseStart = (t: string | null) => {
  if (!t) return 0;
  if (/^\d+$/.test(t)) return Number(t);
  const m = t.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/);
  return m ? Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0) : 0;
};

export function parseMedia(raw: string): MediaInfo {
  let u: URL;
  try { u = new URL(raw); } catch { return { type: 'link', source: raw }; }
  const host = u.hostname.replace(/^(www|m)\./, '');
  const path = u.pathname;

  // YouTube
  const yt = host === 'youtu.be' ? path.slice(1).split('/')[0]
    : /(^|\.)youtube(-nocookie)?\.com$/.test(host)
      ? (u.searchParams.get('v') ?? path.match(/^\/(?:embed|shorts|live|v)\/([\w-]{11})/)?.[1] ?? null)
      : null;
  if (yt && /^[\w-]{11}$/.test(yt)) {
    const start = parseStart(u.searchParams.get('t') ?? u.searchParams.get('start'));
    return {
      type: 'video', source: 'YouTube',
      embed: `https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&rel=0&playsinline=1${start ? `&start=${start}` : ''}`,
      thumb: `https://i.ytimg.com/vi/${yt}/hqdefault.jpg`,
    };
  }

  // Vimeo (incluye enlaces privados vimeo.com/ID/HASH)
  if (host.endsWith('vimeo.com')) {
    const m = path.match(/(?:\/video)?\/(\d+)(?:\/([\da-f]+))?/);
    if (m) {
      const h = m[2] ?? u.searchParams.get('h');
      return { type: 'video', source: 'Vimeo', embed: `https://player.vimeo.com/video/${m[1]}?autoplay=1${h ? `&h=${h}` : ''}`, vimeoUrl: raw };
    }
  }

  // Google Drive (vídeo, audio, PDF... el visor /preview sirve para todo)
  if (host === 'drive.google.com') {
    const id = path.match(/\/file\/d\/([\w-]+)/)?.[1] ?? u.searchParams.get('id');
    if (id) return { type: 'video', source: 'Google Drive', embed: `https://drive.google.com/file/d/${id}/preview`, thumb: `https://drive.google.com/thumbnail?id=${id}&sz=w800` };
  }

  // Google Docs / Slides / Sheets
  if (host === 'docs.google.com') {
    const m = path.match(/^\/(document|presentation|spreadsheets)\/d\/([\w-]+)/);
    if (m) return { type: 'document', source: { document: 'Google Docs', presentation: 'Google Slides', spreadsheets: 'Google Sheets' }[m[1]]!, embed: `https://docs.google.com/${m[1]}/d/${m[2]}/preview` };
  }

  if (host === 'loom.com') {
    const id = path.match(/\/(?:share|embed)\/([\da-f]+)/)?.[1];
    if (id) return { type: 'video', source: 'Loom', embed: `https://www.loom.com/embed/${id}?autoplay=1` };
  }
  if (host === 'streamable.com') {
    const id = path.match(/^\/(?:e\/)?(\w+)/)?.[1];
    if (id) return { type: 'video', source: 'Streamable', embed: `https://streamable.com/e/${id}?autoplay=1` };
  }
  if (host === 'soundcloud.com') {
    return { type: 'audio', source: 'SoundCloud', embed: `https://w.soundcloud.com/player/?url=${encodeURIComponent(raw)}&visual=false&show_comments=false`, height: 166 };
  }

  // Dropbox: ?raw=1 sirve el archivo tal cual
  let direct = raw;
  let source = host;
  if (host.endsWith('dropbox.com')) {
    const d = new URL(raw);
    d.searchParams.delete('dl');
    d.searchParams.set('raw', '1');
    direct = d.href;
    source = 'Dropbox';
  }

  if (VIDEO_EXT.test(path)) return { type: 'video', source, direct };
  if (AUDIO_EXT.test(path)) return { type: 'audio', source, direct };
  if (IMAGE_EXT.test(path)) return { type: 'image', source, direct };
  if (PDF_EXT.test(path)) return { type: 'document', source, embed: direct };
  if (OFFICE_EXT.test(path)) return { type: 'document', source, embed: `https://docs.google.com/viewer?url=${encodeURIComponent(direct)}&embedded=true` };

  return { type: 'link', source };
}

const ICONS: Record<MediaType, typeof Video> = { video: Video, audio: Music, document: FileText, image: ImageIcon, link: Link2 };

function useVimeoThumb(url?: string) {
  const [thumb, setThumb] = useState<string>();
  useEffect(() => {
    if (!url) return;
    let alive = true;
    fetch(`https://vimeo.com/api/oembed.json?width=800&url=${encodeURIComponent(url)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d?.thumbnail_url) setThumb(d.thumbnail_url); })
      .catch(() => {});
    return () => { alive = false; };
  }, [url]);
  return thumb;
}

export default function MediaPreview({ url, label, compact }: { url: string; label?: string; compact?: boolean }) {
  const { t } = useTranslation();
  const info = parseMedia(url);
  const [open, setOpen] = useState(false);
  const [thumbFailed, setThumbFailed] = useState(false);
  const vimeoThumb = useVimeoThumb(info.vimeoUrl);
  const thumb = info.thumb ?? vimeoThumb;
  const Icon = ICONS[info.type];
  const title = label?.trim() || info.source;
  const width = compact ? 'max-w-md' : 'max-w-3xl';

  const external = (
    <a href={url} target="_blank" rel="noopener noreferrer" className="shrink-0 p-1 text-gray-400 hover:text-[#db0030]" aria-label={t('media.openExternal')} title={t('media.openExternal')}>
      <ExternalLink size={14} />
    </a>
  );
  const caption = (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-white">
      <Icon size={13} className="shrink-0 text-[#db0030]" />
      <span className="font-semibold text-gray-800 truncate">{title}</span>
      {label && <span className="text-gray-400 truncate">· {info.source}</span>}
      <span className="flex-1" />
      {open && info.embed && info.type !== 'audio' && (
        <button className="shrink-0 p-1 text-gray-400 hover:text-black" aria-label={t('media.close')} title={t('media.close')} onClick={() => setOpen(false)}><X size={14} /></button>
      )}
      {external}
    </div>
  );
  const frame = 'w-full rounded-xl overflow-hidden border border-gray-200 bg-white';

  // Vídeo / audio / imagen como archivo directo: reproductor nativo (el navegador saca el primer fotograma)
  if (info.direct && info.type === 'video') {
    return (
      <div className={`${frame} ${width}`}>
        <video controls playsInline preload="metadata" src={`${info.direct}#t=0.1`} className="w-full aspect-video bg-black" />
        {caption}
      </div>
    );
  }
  if (info.direct && info.type === 'audio') {
    return (
      <div className={`${frame} ${width}`}>
        {caption}
        <audio controls preload="metadata" src={info.direct} className="w-full px-2 pb-2" />
      </div>
    );
  }
  if (info.direct && info.type === 'image') {
    return (
      <div className={`${frame} ${width}`}>
        <a href={info.direct} target="_blank" rel="noopener noreferrer"><img src={info.direct} alt={title} loading="lazy" className="w-full max-h-[420px] object-contain bg-gray-50" /></a>
        {caption}
      </div>
    );
  }

  // Audio embebido (SoundCloud): reproductor directamente
  if (info.type === 'audio' && info.embed) {
    return (
      <div className={`${frame} ${width}`}>
        {caption}
        <iframe src={info.embed} title={title} loading="lazy" allow="autoplay" className="w-full border-0" style={{ height: info.height }} />
      </div>
    );
  }

  // Vídeo embebible: miniatura con play -> reproductor en la propia app
  if (info.type === 'video' && info.embed) {
    return (
      <div className={`${frame} ${width}`}>
        <div className="relative w-full aspect-video bg-[#111114]">
          {open ? (
            <iframe
              src={info.embed} title={title}
              allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
              allowFullScreen className="absolute inset-0 w-full h-full border-0"
            />
          ) : (
            <button className="group absolute inset-0 w-full h-full focus-visible:outline-2 focus-visible:outline-[#db0030]" onClick={() => setOpen(true)} aria-label={`${t('media.play')}: ${title}`}>
              {thumb && !thumbFailed
                ? <img src={thumb} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setThumbFailed(true)} className="absolute inset-0 w-full h-full object-cover" />
                : <span className="absolute inset-0 flex items-center justify-center text-white/20"><Video size={64} /></span>}
              <span className="absolute inset-0 bg-black/20 group-hover:bg-black/35 transition-colors" />
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="w-14 h-14 rounded-full bg-[#db0030] text-white flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform motion-reduce:transition-none">
                  <Play size={24} className="ml-1" fill="currentColor" />
                </span>
              </span>
            </button>
          )}
        </div>
        {caption}
      </div>
    );
  }

  // Documento (PDF, Docs, Word...): tarjeta -> visor dentro de la app
  if (info.type === 'document' && info.embed) {
    return (
      <div className={`${frame} ${open ? 'max-w-4xl' : width}`}>
        {open ? (
          <iframe src={info.embed} title={title} className="w-full h-[70vh] border-0 bg-gray-50" />
        ) : (
          <button className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-[#db0030]" onClick={() => setOpen(true)}>
            <span className="shrink-0 w-10 h-10 rounded-lg bg-[#db0030]/10 text-[#db0030] flex items-center justify-center"><FileText size={18} /></span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-gray-900 truncate">{title}</span>
              <span className="block text-xs text-[#db0030] font-bold">{t('media.viewHere')}</span>
            </span>
          </button>
        )}
        {open && caption}
      </div>
    );
  }

  // Enlace sin visor posible (p. ej. Veo, Hudl, webs): se abre fuera
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={`${frame} ${width} flex items-center gap-3 p-3 hover:bg-gray-50`}>
      <span className="shrink-0 w-10 h-10 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center"><Link2 size={18} /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-gray-900 truncate">{title}</span>
        <span className="block text-xs text-gray-500 truncate">{info.source} · {t('media.openExternal')}</span>
      </span>
      <ExternalLink size={14} className="shrink-0 text-gray-400" />
    </a>
  );
}
