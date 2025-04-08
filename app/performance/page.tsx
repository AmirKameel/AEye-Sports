'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RedirectToFootballPerformance() {
  const router = useRouter();
  
  useEffect(() => {
    router.push('/football/performance');
  }, [router]);
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Redirecting to Football Performance Metrics...</p>
    </div>
  );
} 