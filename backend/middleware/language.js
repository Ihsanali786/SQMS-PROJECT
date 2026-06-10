// backend/middleware/language.js
const enTranslations = require('../locales/en.json');
const urTranslations = require('../locales/ur.json');

const translations = {
  en: enTranslations,
  ur: urTranslations
};

const getTranslation = (lang = 'en') => {
  return translations[lang] || translations.en;
};

const languageMiddleware = (req, res, next) => {
  const lang = req.headers['accept-language']?.split(',')[0]?.substring(0, 2) || 'en';
  req.t = (key) => {
    const translation = getTranslation(lang);
    return translation[key] || key;
  };
  next();
};

module.exports = { languageMiddleware, getTranslation };