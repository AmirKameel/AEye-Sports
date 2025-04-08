'use client';

import React from 'react';
import Link from 'next/link';
import PerformanceAnalysis from '@/components/PerformanceAnalysis';

export default function VideoAnalysisPage() {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/football" className="text-blue-500 hover:underline flex items-center gap-2">
            <span>←</span> Back to Football
          </Link>
        </div>
        
        <PerformanceAnalysis />
      </div>
    </div>
  );
} 