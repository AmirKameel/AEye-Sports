'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { VideoAnalysis } from '@/lib/supabase';

export default function FootballResultsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  
  // Get the video URL from the query parameters if available
  const videoUrlFromQuery = searchParams.get('videoUrl');
  
  const [analysis, setAnalysis] = useState<VideoAnalysis | null>(null);
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
            id,
            user_id: 'client-user',
            video_url: videoUrlFromQuery || '',
            sport_type: 'football',
            analysis_status: 'completed',
            analysis_result: parsedAnalysis,
            created_at: new Date().toISOString()
          };
          
          setAnalysis(analysisObj);
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
      <div className="max-w-4xl mx-auto text-center py-12">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-xl">Loading analysis results...</p>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-100 text-red-700 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-bold mb-2">Error</h2>
          <p>{error || 'Analysis not found'}</p>
        </div>
        <Link 
          href="/football" 
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded"
        >
          Back to Football Analysis
        </Link>
      </div>
    );
  }

  // Handle different analysis statuses
  if (analysis.analysis_status === 'pending' || analysis.analysis_status === 'processing') {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h2 className="text-2xl font-bold mb-2">Analysis in Progress</h2>
        <p className="text-gray-600 mb-6">
          Your football video is currently being analyzed. This may take a few minutes.
        </p>
        <Link 
          href="/football" 
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded"
        >
          Back to Football Analysis
        </Link>
      </div>
    );
  }

  if (analysis.analysis_status === 'failed') {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-100 text-red-700 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-bold mb-2">Analysis Failed</h2>
          <p>
            {analysis.analysis_result?.error || 'There was an error processing your video. Please try again.'}
          </p>
        </div>
        <Link 
          href="/football" 
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded"
        >
          Back to Football Analysis
        </Link>
      </div>
    );
  }

  // Display completed analysis results
  const result = analysis.analysis_result;
  
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Football Analysis Results</h1>
        <Link 
          href="/football" 
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded"
        >
          New Analysis
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Video Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-gray-600">Duration</p>
            <p className="font-medium">{result?.videoMetadata?.duration || 'N/A'} seconds</p>
          </div>
          <div>
            <p className="text-gray-600">Resolution</p>
            <p className="font-medium">{result?.videoMetadata?.width || 'N/A'} x {result?.videoMetadata?.height || 'N/A'}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Analysis Summary</h2>
        {analysis.video_url && (
          <div className="aspect-video bg-black rounded-lg overflow-hidden mb-6">
            <video 
              src={analysis.video_url} 
              controls 
              className="w-full h-full"
            >
              Your browser does not support the video tag.
            </video>
          </div>
        )}
        
        <div className="space-y-6">
          {result?.analysisResults?.map((analysisText: string, index: number) => (
            <div key={index} className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium mb-2">Analysis Segment {index + 1}</h3>
              <p className="whitespace-pre-line">{analysisText}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Event Timeline</h2>
        <div className="space-y-4">
          {/* In a real implementation, you would parse the analysis results to extract events */}
          <div className="flex items-start p-3 border-l-4 border-blue-500">
            <div className="mr-4">
              <div className="text-sm font-medium text-gray-500">00:05</div>
            </div>
            <div>
              <h4 className="font-medium">Pass</h4>
              <p className="text-gray-600">Player 1 to Player 2</p>
            </div>
          </div>
          <div className="flex items-start p-3 border-l-4 border-green-500">
            <div className="mr-4">
              <div className="text-sm font-medium text-gray-500">00:12</div>
            </div>
            <div>
              <h4 className="font-medium">Shot on Goal</h4>
              <p className="text-gray-600">Player 2 attempts a shot</p>
            </div>
          </div>
          <div className="flex items-start p-3 border-l-4 border-yellow-500">
            <div className="mr-4">
              <div className="text-sm font-medium text-gray-500">00:18</div>
            </div>
            <div>
              <h4 className="font-medium">Tackle</h4>
              <p className="text-gray-600">Player 3 tackles Player 4</p>
            </div>
          </div>
          <div className="flex items-start p-3 border-l-4 border-purple-500">
            <div className="mr-4">
              <div className="text-sm font-medium text-gray-500">00:25</div>
            </div>
            <div>
              <h4 className="font-medium">Cross</h4>
              <p className="text-gray-600">Player 5 crosses into the box</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 