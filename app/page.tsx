'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '../lib/i18n/LanguageContext';

interface SportCard {
  title: string;
  description: string;
  icon: string;
  path: string;
  color: string;
}

const sports: SportCard[] = [
  {
    title: "football.title",
    description: "football.description",
    icon: "⚽",
    path: "/football",
    color: "bg-blue-500"
  },
  {
    title: "tennis.title",
    description: "tennis.description",
    icon: "🎾",
    path: "/tennis",
    color: "bg-green-500"
  }
];

export default function Home() {
  const { t } = useLanguage();

  return (
    <main className="flex min-h-screen flex-col items-center p-8 md:p-24 bg-gray-100">
      <h1 className="text-4xl font-bold mb-2 text-center">{t('home.title')}</h1>
      <p className="text-lg text-gray-600 mb-12 text-center">
        {t('home.subtitle')}
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
        {sports.map((sport, index) => (
          <Link 
            href={sport.path} 
            key={index}
            className="group transition-all duration-300 hover:scale-105"
          >
            <div className={`${sport.color} rounded-lg shadow-lg overflow-hidden h-full`}>
              <div className="p-8 text-white flex flex-col h-full">
                <div className="text-5xl mb-4">{sport.icon}</div>
                <h2 className="text-2xl font-bold mb-3">{t(`home.${sport.title}`)}</h2>
                <p className="text-white/80 flex-grow">{t(`home.${sport.description}`)}</p>
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
    </main>
  );
}
