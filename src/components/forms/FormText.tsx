import { useTranslation } from 'react-i18next';
import TranslatedText from '../common/TranslatedText';
import type { Lang, LText } from '../../services/forms';

const ORDER: Lang[] = ['es', 'it', 'en'];

export const useLang = (): Lang => {
  const { i18n } = useTranslation();
  const l = (i18n.language || 'es').slice(0, 2);
  return (ORDER as string[]).includes(l) ? (l as Lang) : 'es';
};

/** Texto en el idioma pedido o, si falta, el primero disponible (y si es otro idioma, lo indica). */
export const pickText = (text: LText | undefined, lang: Lang): { value: string; exact: boolean } => {
  if (!text) return { value: '', exact: true };
  if (text[lang]?.trim()) return { value: text[lang]!, exact: true };
  for (const l of ORDER) if (text[l]?.trim()) return { value: text[l]!, exact: false };
  return { value: '', exact: true };
};

/** Al editar en un idioma, ese texto pasa a ser el original: el resto se traduce solo al mostrarlo. */
export const setText = (lang: Lang, value: string): LText => ({ [lang]: value });

interface Props {
  text?: LText;
  className?: string;
  as?: 'div' | 'span' | 'p' | 'h2' | 'h3';
}

/** Muestra un texto del formulario en el idioma de la app (traducción automática si no existe). */
export default function FormText({ text, className, as = 'span' }: Props) {
  const lang = useLang();
  const { value, exact } = pickText(text, lang);
  if (!value) return null;
  const C = as;
  return <C className={className}>{exact ? value : <TranslatedText text={value} as="span" />}</C>;
}
