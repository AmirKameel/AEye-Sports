'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RedirectToFootballFormation() {
  const router = useRouter();
  
  useEffect(() => {
    router.push('/football/formation');
  }, [router]);
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Redirecting to Football Formation...</p>
    </div>
  );
} 