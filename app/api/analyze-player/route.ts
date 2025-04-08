import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY || ''
});

export async function POST(request: Request) {
  try {
    const { position, description, clubs } = await request.json();

    const prompt = `As a football scout and analyst, analyze this player:
Position: ${position}
Previous Clubs: ${clubs.map((club: { name: string }) => club.name).join(', ')}
Current Info: ${description || 'No description provided'}

Please provide:
1. A list of 5 key strengths based on the position and background
2. A list of 3 areas for improvement (weaknesses)
3. A professional scouting description (2-3 sentences)

Format the response as a JSON object with these exact keys: strengths, weaknesses, description`;

    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-4-turbo-preview",
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');

    return NextResponse.json({
      strengths: result.strengths || [],
      weaknesses: result.weaknesses || [],
      description: result.description || ''
    });

  } catch (error) {
    console.error('Error analyzing player profile:', error);
    return NextResponse.json(
      { error: 'Failed to analyze player profile' },
      { status: 500 }
    );
  }
} 