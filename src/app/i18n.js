import i18next from "i18next";
import { initReactI18next } from "react-i18next";

i18next.use(initReactI18next).init({
  fallbackLng: "en", // Default language
  supportedLngs: ["en", "fr", "de"], // Supported languages
  interpolation: {
    escapeValue: false, // React already handles escaping
  },
  resources: {
    en: {
      common: {
        welcome: "Welcome",
        cart: "Your Cart",
        arrival: "New Arrivals",
      },
    },
    fr: {
      common: {
        welcome: "Bienvenue",
        cart: "Votre Panier",
        arrival: "Nouvel Arrivage",
      },
    },
    de: {
      common: { welcome: "Willkommen", cart: "Ihr Warenkorb" },
    },
  },
});

export default i18next;
