import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Only for development
});

export async function POST(request: NextRequest) {
  try {
    const { coordinates, videoMetadata, sportType } = await request.json();

    if (!coordinates || !videoMetadata || !sportType) {
      return NextResponse.json(
        { error: 'Missing required fields: coordinates, videoMetadata, or sportType' },
        { status: 400 }
      );
    }

    console.log('Received coordinates for analysis:', coordinates.length, 'frames');
    
    // Extract player and ball positions from the coordinates
    const extractedData = coordinates.map((frame: any) => {
      const players = frame.objects.filter((obj: any) => obj.class === 'player');
      const balls = frame.objects.filter((obj: any) => obj.class === 'ball');
      
      return {
        frame_id: frame.frame_id,
        timestamp: frame.timestamp,
        players: players.map((player: any) => ({
          id: player.id,
          x: player.x,
          y: player.y,
          width: player.width,
          height: player.height,
          confidence: player.confidence
        })),
        balls: balls.map((ball: any) => ({
          id: ball.id,
          x: ball.x,
          y: ball.y,
          width: ball.width,
          height: ball.height,
          confidence: ball.confidence
        }))
      };
    });
    
    console.log('Extracted player and ball data:', extractedData);

    let analysisPrompt = '';
    
    if (sportType === 'tennis') {
      analysisPrompt = `You are a professional tennis analyst. Analyze the provided coordinates of players and ball to extract insights about player movement, speed, and tactics.
      
The data contains frames with player and ball positions detected by computer vision. Each frame has:
- frame_id: The frame number
- timestamp: The time in seconds
- players: Array of player objects with x, y coordinates, width, height, and confidence
- balls: Array of ball objects with x, y coordinates, width, height, and confidence

Calculate player speeds, distances covered, and provide tactical insights based on their movements.

Video metadata: ${JSON.stringify(videoMetadata)}
Coordinates data: ${JSON.stringify(extractedData)}

Please provide a detailed analysis including:
1. Player movement patterns and court coverage
2. Speed calculations (in pixels per second)
3. Tactical insights based on positioning
4. Recommendations for improvement`;
    } else {
      analysisPrompt = `You are a professional football analyst. Analyze the provided coordinates of players and ball to extract insights about player movement, events, and tactics.
      
The data contains frames with player and ball positions detected by computer vision. Each frame has:
- frame_id: The frame number
- timestamp: The time in seconds
- players: Array of player objects with x, y coordinates, width, height, and confidence
- balls: Array of ball objects with x, y coordinates, width, height, and confidence

Detect events like passes, shots, tackles, and crosses. Identify player movements and provide tactical insights.

Video metadata: ${JSON.stringify(videoMetadata)}
Coordinates data: ${JSON.stringify(extractedData)}

Please provide a detailed analysis including:
1. Player movement patterns and field coverage
2. Event detection (passes, shots, tackles, etc.)
3. Tactical insights based on team formation and positioning
4. Recommendations for improvement`;
    }

    console.log('Sending prompt to OpenAI');
    
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: sportType === 'tennis' 
            ? "You are a professional tennis analyst. Analyze the provided coordinates of players and ball to extract insights about player movement, speed, and tactics."
            : "You are a professional football analyst. Analyze the provided coordinates of players and ball to extract insights about player movement, events, and tactics."
        },
        {
          role: "user",
          content: analysisPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    console.log('Received response from OpenAI');
    
    return NextResponse.json({ analysis: response.choices[0].message.content });
  } catch (error: any) {
    console.error('Error analyzing coordinates:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 