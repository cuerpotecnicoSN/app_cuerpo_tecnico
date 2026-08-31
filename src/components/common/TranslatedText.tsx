import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import DOMPurify from 'dompurify';

// Simple in-memory cache for translations to avoid redundant network requests
const translationCache: Record<string, string> = {};

const freeTranslate = async (text: string, targetLang: string): Promise<string> => {
  if (!text || !text.trim() || targetLang === 'es') return text;
  
  const cacheKey = `${targetLang}:${text}`;
  if (translationCache[cacheKey]) {
    return translationCache[cacheKey];
  }

  try {
    const res = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=es&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`
    );
    const data = await res.json();
    if (Array.isArray(data) && data[0]) {
      const translated = data[0].map((sentence: any) => sentence[0]).join('');
      translationCache[cacheKey] = translated;
      return translated;
    }
    return text;
  } catch (err) {
    console.error("Translation Error:", err);
    return text;
  }
};

interface TranslatedTextProps {
  html?: string;
  text?: string;
  className?: string;
  as?: 'div' | 'span' | 'p';
}

export default function TranslatedText({ html, text, className, as = 'div' }: TranslatedTextProps) {
  const { i18n } = useTranslation();
  const targetLang = i18n.language;
  const originalContent = html || text || '';
  const isHtml = !!html;

  const [displayContent, setDisplayContent] = useState(originalContent);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!originalContent.trim()) {
      setDisplayContent('');
      return;
    }

    if (targetLang === 'es') {
      setDisplayContent(originalContent);
      setLoading(false);
      return;
    }

    let isMounted = true;
    const cacheKey = `${targetLang}:${originalContent}`;

    if (translationCache[cacheKey]) {
      setDisplayContent(translationCache[cacheKey]);
      return;
    }

    setLoading(true);
    
    freeTranslate(originalContent, targetLang).then((translated) => {
      if (isMounted) {
        setDisplayContent(translated);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [originalContent, targetLang]);

  const Component = as;

  if (loading) {
    return (
      <Component className={`${className} animate-pulse opacity-70`}>
        {isHtml ? (
          <div dangerouslySetInnerHTML={{ __html: displayContent }} />
        ) : (
          displayContent
        )}
      </Component>
    );
  }

  return (
    <Component className={className}>
      {isHtml ? (
        <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(displayContent) }} />
      ) : (
        displayContent
      )}
    </Component>
  );
}
