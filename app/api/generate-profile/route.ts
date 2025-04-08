import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI with API key from environment variable
const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY || '',
});

export async function POST(request: NextRequest) {
  try {
    const { name, position, team } = await request.json();

    if (!name || !position) {
      return NextResponse.json(
        { error: 'Name and position are required' },
        { status: 400 }
      );
    }

    // Generate player description
    const descriptionPrompt = `Write a detailed description of a ${position} named ${name}${team ? ` who plays for ${team}` : ''}. Include their playing style, key attributes, and notable characteristics. Make it professional and engaging.`;

    const descriptionResponse = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: descriptionPrompt }],
      temperature: 0.7,
      max_tokens: 300,
    });

    // Generate strengths
    const strengthsPrompt = `List 5 key strengths of a ${position} named ${name}${team ? ` who plays for ${team}` : ''}. Focus on technical, tactical, and physical attributes. Make each strength specific and actionable.`;

    const strengthsResponse = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: strengthsPrompt }],
      temperature: 0.7,
      max_tokens: 200,
    });

    // Generate weaknesses
    const weaknessesPrompt = `List 5 areas for improvement for a ${position} named ${name}${team ? ` who plays for ${team}` : ''}. Focus on technical, tactical, and physical attributes. Make each weakness specific and actionable.`;

    const weaknessesResponse = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: weaknessesPrompt }],
      temperature: 0.7,
      max_tokens: 200,
    });

    // Process the responses
    const description = descriptionResponse.choices[0].message.content?.trim() || '';
    const strengths = strengthsResponse.choices[0].message.content
      ?.split('\n')
      .filter(line => line.trim().length > 0)
      .map(line => line.replace(/^\d+\.\s*/, ''))
      .slice(0, 5) || [];
    const weaknesses = weaknessesResponse.choices[0].message.content
      ?.split('\n')
      .filter(line => line.trim().length > 0)
      .map(line => line.replace(/^\d+\.\s*/, ''))
      .slice(0, 5) || [];

    return NextResponse.json({
      description,
      strengths,
      weaknesses,
    });
  } catch (error: any) {
    console.error('Error generating profile:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 