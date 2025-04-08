'use client';

import { useLanguage } from "../lib/i18n/LanguageContext";
import LanguageSwitcher from "./LanguageSwitcher";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-600 text-white shadow-md">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">AEye Sport</h1>
            <p className="text-blue-100">{t('header.subtitle')}</p>
          </div>
          <LanguageSwitcher />
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
      <footer className="bg-gray-800 text-white py-6">
        <div className="container mx-auto px-4 text-center">
          <p>© {new Date().getFullYear()} AEye Sport. All rights reserved.</p>
          <p className="text-gray-400 text-sm mt-2">
            AEye Team
          </p>
        </div>
      </footer>
    </div>
  );
} 