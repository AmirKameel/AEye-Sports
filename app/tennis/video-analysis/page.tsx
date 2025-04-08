'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '../../../lib/i18n/LanguageContext';
import TennisVideoAnalysis from '@/components/TennisVideoAnalysis';

export default function TennisVideoAnalysisPage() {
  const { t } = useLanguage();
  
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/tennis" className="text-blue-500 hover:underline flex items-center gap-2">
            <span>←</span> {t('common.backToTennis')}
          </Link>
        </div>
        
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">{t('tennis.pages.videoAnalysis.title')}</h2>
          <p className="text-gray-600">{t('tennis.pages.videoAnalysis.subtitle')}</p>
        </div>
        
        <TennisVideoAnalysis />
      </div>
    </div>
  );
} 