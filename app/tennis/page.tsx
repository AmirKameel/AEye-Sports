'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '../../lib/i18n/LanguageContext';

interface FeatureCard {
  title: string;
  description: string;
  icon: string;
  path: string;
  color: string;
}

const features: FeatureCard[] = [
  {
    title: "features.videoAnalysis.title",
    description: "features.videoAnalysis.description",
    icon: "🎥",
    path: "/tennis/video-analysis",
    color: "bg-green-500"
  },
  {
    title: "features.playerAnalysis.title",
    description: "features.playerAnalysis.description",
    icon: "🎾",
    path: "/tennis/player-analysis",
    color: "bg-purple-500"
  }
];

export default function TennisPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/" className="text-blue-500 hover:underline flex items-center gap-2">
            <span>←</span> {t('common.backToHome')}
          </Link>
        </div>
        
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">{t('tennis.title')}</h2>
          <p className="text-gray-600">{t('tennis.subtitle')}</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((feature, index) => (
            <Link 
              href={feature.path} 
              key={index}
              className="group transition-all duration-300 hover:scale-105"
            >
              <div className={`${feature.color} rounded-lg shadow-lg overflow-hidden h-full`}>
                <div className="p-8 text-white flex flex-col h-full">
                  <div className="text-5xl mb-4">{feature.icon}</div>
                  <h3 className="text-2xl font-bold mb-3">{t(`tennis.${feature.title}`)}</h3>
                  <p className="text-white/80 flex-grow">{t(`tennis.${feature.description}`)}</p>
                  <div className="mt-6 flex justify-end">
                    <span className="text-white group-hover:translate-x-2 transition-transform duration-300">
                      {t('common.getStarted')} →
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
} 
