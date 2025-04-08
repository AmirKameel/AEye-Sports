import { NextRequest, NextResponse } from 'next/server';
import { getAnalysisById } from '@/lib/supabase';

// For Next.js 15+, we use a simpler approach without the second parameter
export async function GET(request: NextRequest) {
  try {
    // Extract the ID from the URL path
    const pathname = request.nextUrl.pathname;
    const id = pathname.split('/').pop();
    
    if (!id) {
      return NextResponse.json({ error: 'Missing analysis ID' }, { status: 400 });
    }
    
    // Fetch the analysis from the database
    const { data: analysis, error } = await getAnalysisById(id);
    
    if (error || !analysis) {
      return NextResponse.json(
        { error: error?.message || 'Analysis not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      analysis,
      status: analysis.analysis_status,
      result: analysis.analysis_result,
    });
  } catch (error) {
    console.error('Error fetching analysis:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analysis' },
      { status: 500 }
    );
  }
}
