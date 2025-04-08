import { NextRequest, NextResponse } from 'next/server';
import { createAnalysis, updateAnalysis } from '@/lib/supabase';
import { TennisAnalysisResult } from '@/lib/tennis-tracker';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoUrl, analysisResult, userId = 'anonymous' } = body;
    
    if (!videoUrl || !analysisResult) {
      return NextResponse.json(
        { error: 'Missing required fields: videoUrl and analysisResult' },
        { status: 400 }
      );
    }
    
    // Validate that analysisResult is a valid TennisAnalysisResult
    const isValidResult = validateAnalysisResult(analysisResult);
    if (!isValidResult) {
      return NextResponse.json(
        { error: 'Invalid analysis result format' },
        { status: 400 }
      );
    }
    
    // Create a new analysis record - fixed to match function signature
    const { data, error } = await createAnalysis(
      {
        user_id: userId,
        video_url: videoUrl,
        sport_type: 'tennis',
        analysis_status: 'completed',
        analysis_result: analysisResult,
      },
      videoUrl,  // Pass videoUrl as second parameter to match function signature
      'tennis'   // Pass sportType as third parameter to match function signature
    );
    
    if (error) {
      console.error('Error creating analysis:', error);
      return NextResponse.json(
        { error: 'Failed to save analysis' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      analysisId: data.id,
      message: 'Analysis saved successfully',
    });
    
  } catch (error) {
    console.error('Error saving analysis:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, analysisResult, status } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      );
    }
    
    // Update fields to change
    const updateFields: any = {};
    
    if (analysisResult) {
      // Validate that analysisResult is a valid TennisAnalysisResult
      const isValidResult = validateAnalysisResult(analysisResult);
      if (!isValidResult) {
        return NextResponse.json(
          { error: 'Invalid analysis result format' },
          { status: 400 }
        );
      }
      updateFields.analysis_result = analysisResult;
    }
    
    if (status) {
      if (!['pending', 'processing', 'completed', 'failed'].includes(status)) {
        return NextResponse.json(
          { error: 'Invalid status value' },
          { status: 400 }
        );
      }
      updateFields.analysis_status = status;
    }
    
    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }
    
    // Update the analysis - fixed to match function signature
    const { error } = await updateAnalysis(
      id,                              // First parameter: id
      "dummyParameter",                // Second parameter (p0) as required by function
      { error: null },                 // Third parameter (p1) as required by function
      updateFields                     // Fourth parameter: actual update data
    );
    
    if (error) {
      console.error('Error updating analysis:', error);
      return NextResponse.json(
        { error: 'Failed to update analysis' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Analysis updated successfully',
    });
    
  } catch (error) {
    console.error('Error updating analysis:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// Validate that the analysis result has the required properties
function validateAnalysisResult(result: any): result is TennisAnalysisResult {
  if (!result || typeof result !== 'object') return false;
  
  // Check for required properties
  return (
    result.playerStats && 
    result.shotStats && 
    result.videoMetadata &&
    Array.isArray(result.frames) &&
    typeof result.courtCoverage === 'number'
  );
}
