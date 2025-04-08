import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { frames, duration, fps } = req.body;

    // Prepare the prompt for GPT
    const prompt = `Analyze the player's movement in this soccer/football video:
    - Duration: ${duration} seconds
    - FPS: ${fps}
    - Total frames: ${frames.length}
    
    Player positions over time:
    ${frames.map((frame: any, index: number) => 
      `Frame ${index + 1} (${frame.timestamp.toFixed(2)}s): x=${frame.position.x}, y=${frame.position.y}`
    ).join('\n')}
    
    Please provide a detailed analysis of:
    1. Player's movement patterns
    2. Key positions and movements
    3. Notable plays or actions
    4. Overall performance insights`;

    // Get analysis from GPT
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a soccer/football analyst. Analyze the player's movement and provide insights about their performance."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const analysis = completion.choices[0].message.content;

    return res.status(200).json({ analysis });
  } catch (error) {
    console.error('Error analyzing tracking data:', error);
    return res.status(500).json({ error: 'Failed to analyze tracking data' });
  }
} 