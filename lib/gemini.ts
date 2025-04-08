import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface GeminiResponse {
  text: string;
}

interface DetectedObject {
  box_2d: number[];
  label: string;
}

// Function to clean and parse Gemini results
function cleanResults(results: string): any {
  // Remove JSON code block markers if present
  let cleaned = results.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.substring(7);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  
  cleaned = cleaned.trim();
  
  try {
    return JSON.parse(cleaned);
  } catch (error) {
    console.error("Error parsing Gemini response:", error);
    return [];
  }
}

// Initialize the Gemini API client
const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "AIzaSyAm-P_r9aXrJ6mOsF9QGW0uxGjgNnVBAIA";
const GEMINI_MODEL = "gemini-2.5-pro-exp-03-25";

// Track API request timestamps for rate limiting
const API_REQUESTS: number[] = [];
const MAX_REQUESTS_PER_MINUTE = 10; // Adjust based on your API tier limits
const REQUEST_WINDOW_MS = 60000; // 1 minute window
const PAUSE_AFTER_REQUESTS = 5; // Pause after every 5 requests
const PAUSE_DURATION_MS = 10000; // Pause for 10 seconds

// Initialize the Generative AI API
// Make sure to set your API key in the .env.local file or environment variables
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Function to perform inference with Gemini model
export async function geminiInference(
  imageData: string, 
  prompt: string, 
  temperature: number = 0.5,
  retryCount: number = 0
): Promise<GeminiResponse> {
  try {
    // Check for rate limiting
    const now = Date.now();
    const recentRequests = API_REQUESTS.filter(timestamp => (now - timestamp) < REQUEST_WINDOW_MS);
    
    // Add forced pause after every PAUSE_AFTER_REQUESTS calls
    if (recentRequests.length > 0 && recentRequests.length % PAUSE_AFTER_REQUESTS === 0) {
      // Check if we've already paused recently
      const lastPauseKey = `last_pause_${Math.floor(recentRequests.length / PAUSE_AFTER_REQUESTS)}`;
      const lastPauseTime = (global as any)[lastPauseKey] || 0;
      
      if (now - lastPauseTime > REQUEST_WINDOW_MS) {
        console.log(`Pausing for ${PAUSE_DURATION_MS/1000} seconds after ${recentRequests.length} requests`);
        await new Promise(resolve => setTimeout(resolve, PAUSE_DURATION_MS));
        (global as any)[lastPauseKey] = now;
      }
    }
    
    // Enforce rate limit and wait if needed
    if (recentRequests.length >= MAX_REQUESTS_PER_MINUTE) {
      // Calculate time to wait before next request
      const oldestRequest = Math.min(...recentRequests);
      const timeToWait = (oldestRequest + REQUEST_WINDOW_MS) - now + 1000; // Add 1000ms buffer
      
      console.log(`Rate limit reached. Waiting ${timeToWait}ms before next request.`);
      await new Promise(resolve => setTimeout(resolve, timeToWait));
      
      // Retry with purged request history after waiting
      return geminiInference(imageData, prompt, temperature, retryCount);
    }
    
    // Track this request
    API_REQUESTS.push(now);
    // Keep only requests from the last minute
    while (API_REQUESTS.length > 0 && (now - API_REQUESTS[0]) > REQUEST_WINDOW_MS) {
      API_REQUESTS.shift();
    }
    
    // Try using the new GoogleGenerativeAI client first
    try {
      // Get the generative model
      const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

      // Strip the prefix if it exists
      const base64Image = imageData.startsWith('data:image') 
        ? imageData.split('base64,')[1] 
        : imageData;

      // Prepare the content parts
      const imagePart = {
        inlineData: {
          data: base64Image,
          mimeType: "image/jpeg",
        },
      };

      console.log(`Calling Gemini API with prompt: ${prompt.substring(0, 100)}...`);

      // Generate content
      const result = await model.generateContent([prompt, imagePart]);
      const response = await result.response;
      return { text: response.text() };
    } catch (googleAIError) {
      console.warn('Google Generative AI client failed, falling back to direct API call:', googleAIError);
      
      // Fallback to direct API call if the client fails
      // Strip the prefix if it exists
      const base64Data = imageData.startsWith('data:image') 
        ? imageData.split('base64,')[1] 
        : imageData;

      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
        {
          contents: [
            {
              parts: [
                { text: prompt },
                { inlineData: { data: base64Data, mimeType: "image/jpeg" } }
              ]
            }
          ],
          generationConfig: {
            temperature: temperature
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': GEMINI_API_KEY
          }
        }
      );

      // Extract the text from the response
      const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      console.log(`Gemini API response (first 100 chars): ${text.substring(0, 100)}...`);
      return { text };
    }
  } catch (error: any) {
    // Handle rate limiting errors with exponential backoff
    if (error?.response?.status === 429 && retryCount < 5) { // Increased max retries from 3 to 5
      const retryDelay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
      console.log(`Rate limit exceeded. Retrying in ${retryDelay}ms (attempt ${retryCount + 1})`);
      
      // Add a longer wait time for 429 errors
      await new Promise(resolve => setTimeout(resolve, Math.max(retryDelay, 5000)));
      return geminiInference(imageData, prompt, temperature, retryCount + 1);
    }
    
    console.error("Error calling Gemini API:", error);
    throw new Error(`Failed to call Gemini API: ${error}`);
  }
}

// Function to analyze multiple images with Gemini
export async function geminiInferenceMultiFrame(contentParts: any[]): Promise<GeminiResponse> {
  try {
    // Get the generative model
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

    console.log(`Calling Gemini API with ${contentParts.length} content parts`);
    
    // Generate content with multiple images
    const result = await model.generateContent(contentParts);
    const response = await result.response;
    return { text: response.text() };
  } catch (error) {
    console.error('Error in multi-frame Gemini inference:', error);
    throw error;
  }
}

// Function to detect objects in an image
export async function detectObjectsWithGemini(imageBase64: string): Promise<DetectedObject[]> {
  const prompt = `
    Detect the 2d bounding boxes of objects in image.
    Focus on detecting tennis players (can be multiple players), tennis balls, tennis rackets, and court lines.
    If there are multiple players, assign each player a unique ID (player1, player2, etc.).
    Return just box_2d and labels, no additional text.
  `;

  const response = await geminiInference(imageBase64, prompt);
  const results = cleanResults(response.text);
  
  return Array.isArray(results) ? results : [];
}

// Function to analyze player movements and techniques
export async function analyzeTennisMatch(imageBase64: string): Promise<string> {
  const prompt = `
    You are a professional tennis analyst. Analyze this tennis frame.
    
    If there are multiple players visible in the frame, analyze EACH player separately with unique IDs (player1, player2).
    
    For EACH player, identify:
    1. The player's position, posture, and technique
    2. The ball position and likely trajectory
    3. The type of shot being played (serve, forehand, backhand, volley, etc.)
    4. Provide feedback on player's form and technique
    
    IMPORTANT: All speed measurements should be in km/h (not m/s).
    
    Format your response as JSON with these fields:
    {
      "players": [
        {
          "id": "player1",
          "playerPosition": "description",
          "ballPosition": "description",
          "shotType": "type of shot",
          "techniqueFeedback": "detailed feedback",
          "estimatedSpeed": "speed in km/h"
        },
        {
          "id": "player2",
          "playerPosition": "description",
          "ballPosition": "description",
          "shotType": "type of shot",
          "techniqueFeedback": "detailed feedback",
          "estimatedSpeed": "speed in km/h"
        }
      ]
    }
    
    Note: If only one player is visible, return just one player object in the array.
  `;

  const response = await geminiInference(imageBase64, prompt, 0.7);
  return response.text;
} 