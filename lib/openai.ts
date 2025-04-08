import OpenAI from 'openai';
import { Coordinates } from './supabase';

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Only for development - in production use API routes
});

export async function analyzeTennisCoordinates(coordinates: Coordinates[], videoMetadata: any) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: "You are a professional tennis analyst. Analyze the provided coordinates of players and ball to extract insights about player movement, speed, and tactics."
        },
        {
          role: "user",
          content: `Analyze these tennis player and ball coordinates from a video. Calculate player speeds, distances covered, and provide tactical insights. Video metadata: ${JSON.stringify(videoMetadata)}. Coordinates data: ${JSON.stringify(coordinates)}`
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error analyzing tennis coordinates:', error);
    throw error;
  }
}

export async function analyzeFootballCoordinates(coordinates: Coordinates[], videoMetadata: any) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: "You are a professional football analyst. Analyze the provided coordinates of players and ball to extract insights about player movement, events, and tactics."
        },
        {
          role: "user",
          content: `Analyze these football player and ball coordinates from a video. Detect events like passes, shots, tackles, and crosses. Identify player movements and provide tactical insights. Video metadata: ${JSON.stringify(videoMetadata)}. Coordinates data: ${JSON.stringify(coordinates)}`
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error analyzing football coordinates:', error);
    throw error;
  }
} 