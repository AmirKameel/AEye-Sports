import { NextRequest, NextResponse } from 'next/server';
import { processVideo } from '@/lib/video-processor';
import { createAnalysis, updateAnalysisStatus } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const { videoUrl, sportType, userId } = await request.json();

    if (!videoUrl || !sportType || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: videoUrl, sportType, or userId' },
        { status: 400 }
      );
    }

    // Create a new analysis record in the database
    let analysisId;
    
    try {
      // Try to use Supabase
      const { data, error } = await createAnalysis(userId, videoUrl, sportType);
      
      if (error) {
        throw error;
      }
      
      analysisId = data.id;
    } catch (error) {
      // If Supabase fails, use a generated ID for development
      console.warn('Supabase database operation failed, using generated ID for development:', error);
      analysisId = `${sportType}-${uuidv4()}`;
    }

    // Start processing in the background
    // In a production environment, you would use a queue system like AWS SQS or a worker service
    processVideo(videoUrl, sportType, analysisId)
      .catch((error) => {
        console.error('Error processing video:', error);
        updateAnalysisStatus(analysisId, 'failed', { error: error.message || 'Unknown error' });
      });

    // Return the analysis ID immediately
    return NextResponse.json({ analysisId });
  } catch (error: any) {
    console.error('Error in analyze API route:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 