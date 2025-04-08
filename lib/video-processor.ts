import { processVideoFrame, trackObjects } from './roboflow';
import { analyzeTennisCoordinates, analyzeFootballCoordinates } from './openai';
import { Coordinates, updateAnalysisStatus } from './supabase';

// Process video frames at 2 frames per second
const FRAME_RATE = 2;
// Send coordinates to GPT every 5 seconds
const ANALYSIS_INTERVAL = 5;

export async function processVideo(
  videoUrl: string,
  sportType: 'football' | 'tennis',
  analysisId: string,
  onProgress?: (progress: number) => void,
  onComplete?: (result: any) => void
) {
  try {
    // Update status to processing
    await updateAnalysisStatus(analysisId, 'processing');
    
    // For server-side processing, we need to use a different approach
    // We'll simulate the video metadata and processing for now
    const videoMetadata = {
      duration: 60, // seconds
      width: 1280,
      height: 720,
      fps: 30
    };
    
    // Calculate total frames to process
    const totalFrames = Math.floor(videoMetadata.duration * FRAME_RATE);
    const framesPerAnalysis = FRAME_RATE * ANALYSIS_INTERVAL;
    
    // Store all coordinates
    const allCoordinates: Coordinates[] = [];
    // Store analysis results
    const analysisResults: string[] = [];
    
    // Process frames in batches
    for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
      // Calculate the timestamp for this frame
      const timestamp = frameIndex / FRAME_RATE;
      
      try {
        // In a server environment, we can't extract frames from a video directly
        // We would need to use a service like FFmpeg or a cloud function
        // For now, we'll use a placeholder image for testing
        const placeholderBase64 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAIBAQIBAQICAgICAgICAwUDAwMDAwYEBAMFBwYHBwcGBwcICQsJCAgKCAcHCg0KCgsMDAwMBwkODw0MDgsMDAz/2wBDAQICAgMDAwYDAwYMCAcIDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAz/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD9/KKKKAP/2Q==";
        
        // Process the frame with Roboflow
        const frameCoordinates = await processVideoFrame(
          placeholderBase64,
          sportType,
          frameIndex,
          timestamp
        );
        
        allCoordinates.push(frameCoordinates);
        
        // Update progress
        if (onProgress) {
          onProgress((frameIndex / totalFrames) * 100);
        }
        
        // Every ANALYSIS_INTERVAL seconds, analyze the accumulated coordinates
        if ((frameIndex + 1) % framesPerAnalysis === 0 || frameIndex === totalFrames - 1) {
          // Get the coordinates for this batch
          const batchStart = Math.max(0, frameIndex - framesPerAnalysis + 1);
          const batchCoordinates = allCoordinates.slice(batchStart, frameIndex + 1);
          
          // Track objects across frames
          const trackedCoordinates = await trackObjects(batchCoordinates, sportType);
          
          // Analyze the coordinates with GPT
          const analysisResult = sportType === 'tennis'
            ? await analyzeTennisCoordinates(trackedCoordinates, videoMetadata)
            : await analyzeFootballCoordinates(trackedCoordinates, videoMetadata);
          
          if (analysisResult) {
            analysisResults.push(analysisResult);
          }
          
          // Update the analysis status with partial results
          await updateAnalysisStatus(analysisId, 'processing', {
            videoMetadata,
            sportType,
            analysisResults,
            coordinates: allCoordinates
          });
        }
      } catch (error) {
        console.error(`Error processing frame at ${timestamp}s:`, error);
        // Continue with the next frame
      }
    }
    
    // Combine all analysis results
    const finalResult = {
      videoMetadata,
      sportType,
      analysisResults,
      coordinates: allCoordinates
    };
    
    // Update status to completed
    await updateAnalysisStatus(analysisId, 'completed', finalResult);
    
    if (onComplete) {
      onComplete(finalResult);
    }
    
    return finalResult;
  } catch (error: any) {
    console.error('Error processing video:', error);
    
    // Update status to failed
    await updateAnalysisStatus(analysisId, 'failed', { error: error.message || 'Unknown error' });
    
    throw error;
  }
} 