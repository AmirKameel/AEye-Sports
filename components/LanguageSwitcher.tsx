'use client';

import { useLanguage } from "../lib/i18n/LanguageContext";

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={() => setLanguage('en')}
        className={`px-3 py-1 rounded ${
          language === 'en'
            ? 'bg-white text-blue-600'
            : 'text-white hover:bg-blue-500'
        }`}
      >
        EN
      </button>
      <button
        onClick={() => setLanguage('ar')}
        className={`px-3 py-1 rounded ${
          language === 'ar'
            ? 'bg-white text-blue-600'
            : 'text-white hover:bg-blue-500'
        }`}
      >
        العربية
      </button>
    </div>
  );
} 