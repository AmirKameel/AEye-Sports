'use client';

import Link from 'next/link';
import { useLanguage } from '../lib/i18n/LanguageContext';

export default function NotFound() {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] py-16">
      <h1 className="text-6xl font-bold text-gray-800 mb-4">404</h1>
      <h2 className="text-2xl font-semibold text-gray-700 mb-6">{t('error.pageNotFound')}</h2>
      <p className="text-gray-600 mb-8 text-center max-w-md">
        {t('error.pageNotFoundDescription')}
      </p>
      <Link 
        href="/"
        className="px-6 py-3 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition-colors"
      >
        {t('common.backToHome')}
      </Link>
    </div>
  );
} 