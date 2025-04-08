import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface FrameData {
  frameNumber: number;
  timestamp: number;
  imageData: string; // base64 encoded image
}

interface VideoInfo {
  name: string;
  duration: number;
  fps: number;
  totalFrames: number;
}

export async function POST(req: Request) {
  try {
    // Parse request body
    const { frames, prompt, videoInfo } = await req.json();

    // Validate required data
    if (!frames || !Array.isArray(frames) || frames.length === 0) {
      return NextResponse.json(
        { error: 'No frames provided for analysis' },
        { status: 400 }
      );
    }

    // Prepare frames for GPT
    const frameDescriptions = frames.map((frame: FrameData, index: number) => {
      return `Frame ${frame.frameNumber} (Time: ${formatTime(frame.timestamp)}):
- This is frame ${index + 1} of ${frames.length} in the selected sequence.
- The image data is attached as base64.`;
    }).join('\n\n');

    // Prepare system prompt with football analysis focus
    const systemPrompt = `You are an expert football performance analyst with deep knowledge of football tactics, formations, player movements, and game situations.

You are analyzing a sequence of frames from a football match video titled "${videoInfo.name}".
Video duration: ${formatTime(videoInfo.duration)}
FPS: ${videoInfo.fps}
Total frames: ${videoInfo.totalFrames}

Your task is to analyze these frames in sequence, understanding that they represent a continuous movement or scenario.
Focus on tactical aspects, player positioning, movement patterns, and potential improvements.
So the user will ask you to analyze the frames provided so you should analyze the frames and provide tactical insights as the following.

Provide your analysis in the following sections:
1. Tactical Insights: Analyze the overall tactical situation, formations, and team structure
2. Player Movements: Identify key player movements, runs, and positioning
3. Formation Analysis: Assess the formation effectiveness and potential vulnerabilities
4. Recommendations: Suggest tactical improvements or training focus areas

Remember that football is dynamic, and each frame connects to the previous and next frames in the sequence.`;

    // Use OpenAI to analyze the frames
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `${prompt || 'Please analyze these football frames and provide tactical insights.'}\n\nHere are the frames to analyze:\n\n${frameDescriptions}`,
            },
            ...frames.map((frame: FrameData) => ({
              type: 'image_url',
              image_url: {
                url: frame.imageData,
                detail: 'high'
              },
            })),
          ] as any, // Type assertion to bypass TypeScript error
        },
      ],
      max_tokens: 2000,
    });

    // Extract analysis from response
    const analysisText = response.choices[0].message.content || '';
    
    // Parse the analysis text to extract the different sections
    const tacticalInsights = extractSection(analysisText, 'Tactical Insights');
    const playerMovements = extractSection(analysisText, 'Player Movements');
    const formationAnalysis = extractSection(analysisText, 'Formation Analysis');
    const recommendations = extractSection(analysisText, 'Recommendations');

    // Return the analysis
    return NextResponse.json({
      tacticalInsights,
      playerMovements,
      formationAnalysis,
      recommendations,
      fullAnalysis: analysisText,
    });
  } catch (error) {
    console.error('Error analyzing frames:', error);
    return NextResponse.json(
      { error: 'Failed to analyze frames' },
      { status: 500 }
    );
  }
}

// Helper function to format time
function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Helper function to extract sections from the analysis
function extractSection(text: string, sectionTitle: string): string {
  const regex = new RegExp(`${sectionTitle}:?([\\s\\S]*?)(?=\\n\\s*\\n\\s*(?:Tactical Insights|Player Movements|Formation Analysis|Recommendations):|$)`, 'i');
  const match = text.match(regex);
  return match ? match[1].trim() : `No ${sectionTitle.toLowerCase()} provided.`;
} 