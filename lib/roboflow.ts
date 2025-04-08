import axios from 'axios';
import { Coordinates } from './supabase';

const ROBOFLOW_API_KEY = process.env.NEXT_PUBLIC_ROBOFLOW_API_KEY;

// Tennis model endpoint
const TENNIS_MODEL = 'tennis-vhrs9/9';

// Football model endpoint (placeholder - replace with actual model when available)
const FOOTBALL_MODEL = 'football-detection/1';

export async function processVideoFrame(
  imageBase64: string, 
  sportType: 'football' | 'tennis',
  frameId: number,
  timestamp: number
): Promise<Coordinates> {
  try {
    const modelId = sportType === 'tennis' ? TENNIS_MODEL : FOOTBALL_MODEL;
    
    // Remove the data:image/jpeg;base64, prefix if present
    const base64Data = imageBase64.includes('base64,') 
      ? imageBase64.split('base64,')[1] 
      : imageBase64;
    
    // Call the Roboflow API
    const response = await axios({
      method: 'POST',
      url: `https://detect.roboflow.com/${modelId}?api_key=${ROBOFLOW_API_KEY}`,
      data: base64Data,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    // Transform Roboflow response to our Coordinates format
    const objects = response.data.predictions.map((pred: any, index: number) => ({
      id: `${pred.class}-${index}`,
      class: pred.class,
      x: pred.x,
      y: pred.y,
      width: pred.width,
      height: pred.height,
      confidence: pred.confidence
    }));
    
    return {
      frame_id: frameId,
      timestamp: timestamp,
      objects: objects
    };
  } catch (error) {
    console.error(`Error processing ${sportType} video frame:`, error);
    throw error;
  }
}

export async function trackObjects(
  coordinates: Coordinates[],
  sportType: 'football' | 'tennis'
): Promise<Coordinates[]> {
  try {
    // Simple tracking logic based on position
    const trackedCoordinates = [...coordinates];
    
    for (let i = 1; i < trackedCoordinates.length; i++) {
      const prevFrame = trackedCoordinates[i-1];
      const currentFrame = trackedCoordinates[i];
      
      currentFrame.objects.forEach((obj, index) => {
        // Find the closest object of the same class in the previous frame
        const prevObjects = prevFrame.objects.filter(o => o.class === obj.class);
        if (prevObjects.length > 0) {
          let minDist = Infinity;
          let closestId = '';
          
          prevObjects.forEach(prevObj => {
            const dist = Math.sqrt(
              Math.pow(prevObj.x - obj.x, 2) + 
              Math.pow(prevObj.y - obj.y, 2)
            );
            
            if (dist < minDist) {
              minDist = dist;
              closestId = prevObj.id;
            }
          });
          
          // If the object is close enough to a previous one, assign the same ID
          if (minDist < 50) { // Threshold distance
            obj.id = closestId;
          }
        }
      });
    }
    
    return trackedCoordinates;
  } catch (error) {
    console.error(`Error tracking ${sportType} objects:`, error);
    throw error;
  }
} 