import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Dictionaries
const resources = {
  es: {
    translation: {
      "welcome": "Bienvenido al Dashboard",
      "dashboard": "Panel Principal",
      "myTeam": "Mi Equipo",
      "planning": "Planificación",
      "matches": "Partidos",
      "tracking": "Seguimiento",
      "reports": "Informes",
      "settings": "Configuración",
      "login": "Iniciar Sesión",
      "logout": "Cerrar Sesión",
      "email": "Correo Electrónico",
      "password": "Contraseña"
    }
  },
  en: {
    translation: {
      "welcome": "Welcome to the Dashboard",
      "dashboard": "Dashboard",
      "myTeam": "My Team",
      "planning": "Planning",
      "matches": "Matches",
      "tracking": "Tracking",
      "reports": "Reports",
      "settings": "Settings",
      "login": "Login",
      "logout": "Logout",
      "email": "Email",
      "password": "Password"
    }
  },
  it: {
    translation: {
      "welcome": "Benvenuto nella Dashboard",
      "dashboard": "Pannello Principale",
      "myTeam": "La mia Squadra",
      "planning": "Pianificazione",
      "matches": "Partite",
      "tracking": "Monitoraggio",
      "reports": "Rapporti",
      "settings": "Impostazioni",
      "login": "Accedi",
      "logout": "Disconnetti",
      "email": "Email",
      "password": "Password"
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "es", // idioma por defecto
    fallbackLng: "es",
    interpolation: {
      escapeValue: false // react ya es seguro frente a xss
    }
  });

export default i18n;
