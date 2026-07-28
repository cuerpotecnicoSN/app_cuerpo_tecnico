import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import esTranslation from './locales/es/translation.json';
import enTranslation from './locales/en/translation.json';
import itTranslation from './locales/it/translation.json';

const resources = {
  es: { translation: esTranslation },
  en: { translation: enTranslation },
  it: { translation: itTranslation }
};

const savedLanguage = localStorage.getItem('language') || 'es';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLanguage, // idioma por defecto o guardado
    fallbackLng: "es",
    interpolation: {
      escapeValue: false // react ya es seguro frente a xss
    }
  });

export default i18n;
