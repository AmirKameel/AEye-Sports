'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { VideoAnalysis } from '@/lib/supabase';
import TennisAnalysisReport from '@/components/TennisAnalysisReport';
import { TennisAnalysisResult } from '@/lib/tennis-tracker';

export default function TennisResultsPage() {
  const { t } = useLanguage();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params?.id as string | undefined;
  if (!id) {
    throw new Error("Invalid or missing 'id' parameter.");
  }
  
  // Get the video URL from the query parameters if available
  const videoUrlFromQuery = searchParams?.get('videoUrl') || null;
  
  const [analysis, setAnalysis] = useState<VideoAnalysis | null>(null);
  const [tennisAnalysis, setTennisAnalysis] = useState<TennisAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalysis() {
      try {
        // First, try to get the analysis from localStorage
        const localStorageKey = `analysis-${id}`;
        const storedAnalysis = localStorage.getItem(localStorageKey);
        
        if (storedAnalysis) {
          // If we have the analysis in localStorage, use it
          const parsedAnalysis = JSON.parse(storedAnalysis);
          
          // Create a VideoAnalysis object from the stored data
          const analysisObj: VideoAnalysis = {
            id: id!,
            user_id: 'client-user',
            video_url: videoUrlFromQuery || '',
            sport_type: 'tennis',
            analysis_status: 'completed',
            analysis_result: parsedAnalysis,
            created_at: new Date().toISOString()
          };
          
          setAnalysis(analysisObj);
          setTennisAnalysis(parsedAnalysis);
          setLoading(false);
          return;
        }
        
        // If not in localStorage, try to fetch from the API
        const response = await fetch(`/api/analysis/${id}`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch analysis');
        }
        
        // If we have a video URL from the query parameters, use it
        if (videoUrlFromQuery && data.analysis) {
          data.analysis.video_url = videoUrlFromQuery;
        }
        
        setAnalysis(data.analysis);
        
        // Check if the analysis result is a TennisAnalysisResult
        if (data.analysis.analysis_result && 
            data.analysis.analysis_result.frames && 
            data.analysis.analysis_result.playerStats) {
          setTennisAnalysis(data.analysis.analysis_result);
        }
      } catch (error: any) {
        console.error('Error fetching analysis:', error);
        setError(error.message || 'Error fetching analysis');
      } finally {
        setLoading(false);
      }
    }

    fetchAnalysis();
  }, [id, videoUrlFromQuery]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-xl">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-100 text-red-700 p-6 rounded-lg mb-6">
            <h2 className="text-xl font-bold mb-2">{t('common.error')}</h2>
            <p>{error || t('tennis.pages.results.analysisNotFound')}</p>
          </div>
          <Link 
            href="/tennis" 
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded"
          >
            {t('common.backToTennis')}
          </Link>
        </div>
      </div>
    );
  }

  // Handle different analysis statuses
  if (analysis.analysis_status === 'pending' || analysis.analysis_status === 'processing') {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold mb-2">{t('tennis.pages.results.analysisInProgress')}</h2>
          <p className="text-gray-600 mb-6">
            {t('tennis.pages.results.analysisWaitMessage')}
          </p>
          <Link 
            href="/tennis" 
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded"
          >
            {t('common.backToTennis')}
          </Link>
        </div>
      </div>
    );
  }

  if (analysis.analysis_status === 'failed') {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-100 text-red-700 p-6 rounded-lg mb-6">
            <h2 className="text-xl font-bold mb-2">{t('tennis.pages.results.analysisFailed')}</h2>
            <p>
              {analysis.analysis_result?.error || t('tennis.pages.results.analysisError')}
            </p>
          </div>
          <Link 
            href="/tennis" 
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded"
          >
            {t('common.backToTennis')}
          </Link>
        </div>
      </div>
    );
  }

  // Display completed analysis results
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">{t('tennis.pages.results.title')}</h1>
          <Link 
            href="/tennis" 
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded"
          >
            {t('tennis.pages.results.newAnalysis')}
          </Link>
        </div>

        {videoUrlFromQuery && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">{t('tennis.pages.results.video')}</h2>
            <div className="aspect-video bg-black rounded-lg overflow-hidden">
              <video 
                src={videoUrlFromQuery} 
                controls 
                className="w-full h-full"
              >
                {t('tennis.pages.results.videoNotSupported')}
              </video>
            </div>
          </div>
        )}
        
        {tennisAnalysis ? (
          <TennisAnalysisReport result={tennisAnalysis} />
        ) : (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">{t('tennis.pages.results.analysisSummary')}</h2>
            <p className="text-gray-600">
              {t('tennis.pages.results.analysisFormatNotAvailable')}
            </p>
            <pre className="bg-gray-100 p-4 rounded-lg mt-4 overflow-auto max-h-96">
              {JSON.stringify(analysis.analysis_result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
} 