'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RedirectToFootballVideoAnalysis() {
  const router = useRouter();
  
  useEffect(() => {
    router.push('/football/video-analysis');
  }, [router]);
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Redirecting to Football Video Analysis...</p>
    </div>
  );
} 