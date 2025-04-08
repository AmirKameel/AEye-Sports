'use client';

import { useState, useRef, useEffect } from 'react';
import axios from 'axios';

interface VideoAnalyzerProps {
  videoUrl: string;
  sportType: 'football' | 'tennis';
  onProgress: (progress: number) => void;
  onComplete: (result: any) => void;
  onError: (error: string) => void;
}

// Tennis model endpoint - using the specific model provided
const TENNIS_MODEL = 'tennis-vhrs9/9';

// Football model endpoint (placeholder - replace with actual model when available)
const FOOTBALL_MODEL = 'football-detection/1';

// Process video frames at 2 frames per second
const FRAME_RATE = 2;
// Send coordinates to GPT every 5 seconds
const ANALYSIS_INTERVAL = 5;

export default function VideoAnalyzer({ 
  videoUrl, 
  sportType, 
  onProgress, 
  onComplete, 
  onError 
}: VideoAnalyzerProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [coordinates, setCoordinates] = useState<any[]>([]);
  const [analysisResults, setAnalysisResults] = useState<string[]>([]);
  
  // Start processing when component mounts
  useEffect(() => {
    if (videoUrl && !isProcessing) {
      startProcessing();
    }
    
    return () => {
      // Clean up any resources if needed
    };
  }, [videoUrl]);
  
  // Extract a frame from the video at a specific time
  const extractFrame = async (time: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!videoRef.current || !canvasRef.current) {
        reject(new Error('Video or canvas not available'));
        return;
      }
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (!context) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Seek to the specified time
      video.currentTime = time;
      
      // When seeking is complete, capture the frame
      const handleSeeked = () => {
        // Draw the video frame to the canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert canvas to base64 image
        const base64Image = canvas.toDataURL('image/jpeg');
        
        // Remove event listener
        video.removeEventListener('seeked', handleSeeked);
        
        resolve(base64Image);
      };
      
      // Add event listener for when seeking is complete
      video.addEventListener('seeked', handleSeeked);
    });
  };
  
  // Process a video frame using Roboflow API
  const processFrame = async (imageBase64: string, frameId: number, timestamp: number) => {
    try {
      const modelId = sportType === 'tennis' ? TENNIS_MODEL : FOOTBALL_MODEL;
      
      // Remove the data:image/jpeg;base64, prefix
      const base64Data = imageBase64.split('base64,')[1];
      
      // Call the Roboflow API
      const response = await axios({
        method: 'POST',
        url: `https://detect.roboflow.com/${modelId}?api_key=${process.env.NEXT_PUBLIC_ROBOFLOW_API_KEY}`,
        data: base64Data,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      console.log('Roboflow API response:', response.data);
      
      // Transform Roboflow response to our format
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
      console.error(`Error processing frame:`, error);
      throw error;
    }
  };
  
  // Track objects across frames
  const trackObjects = (frames: any[]) => {
    const trackedFrames = [...frames];
    
    for (let i = 1; i < trackedFrames.length; i++) {
      const prevFrame = trackedFrames[i-1];
      const currentFrame = trackedFrames[i];
      
      currentFrame.objects.forEach((obj: any) => {
        // Only track players and ball, not court or net
        if (obj.class !== 'player' && obj.class !== 'ball') {
          return;
        }
        
        // Find the closest object of the same class in the previous frame
        const prevObjects = prevFrame.objects.filter((o: any) => o.class === obj.class);
        if (prevObjects.length > 0) {
          let minDist = Infinity;
          let closestId = '';
          
          prevObjects.forEach((prevObj: any) => {
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
          if (minDist < 100) { // Increased threshold for tennis players
            obj.id = closestId;
          }
        }
      });
    }
    
    return trackedFrames;
  };
  
  // Analyze coordinates using OpenAI
  const analyzeCoordinates = async (coords: any[], videoMetadata: any) => {
    try {
      console.log('Sending coordinates to analyze:', coords);
      
      // Call our API endpoint that will use OpenAI
      const response = await fetch('/api/analyze-coordinates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          coordinates: coords,
          videoMetadata,
          sportType
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to analyze coordinates');
      }
      
      const data = await response.json();
      return data.analysis;
    } catch (error) {
      console.error('Error analyzing coordinates:', error);
      throw error;
    }
  };
  
  // Start processing the video
  const startProcessing = async () => {
    if (!videoRef.current) return;
    
    setIsProcessing(true);
    
    try {
      const video = videoRef.current;
      
      // Wait for video metadata to load
      if (!video.duration) {
        await new Promise<void>((resolve) => {
          const handleLoadedMetadata = () => {
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            resolve();
          };
          video.addEventListener('loadedmetadata', handleLoadedMetadata);
        });
      }
      
      // Video metadata
      const videoMetadata = {
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
        fps: 30 // Assuming 30fps
      };
      
      console.log('Video metadata:', videoMetadata);
      
      // Calculate total frames to process
      const totalFrames = Math.floor(videoMetadata.duration * FRAME_RATE);
      const framesPerAnalysis = FRAME_RATE * ANALYSIS_INTERVAL;
      
      // Store all coordinates
      const allCoordinates: any[] = [];
      const allAnalysisResults: string[] = [];
      
      // Process frames in batches
      for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
        // Calculate the timestamp for this frame
        const timestamp = frameIndex / FRAME_RATE;
        
        try {
          // Extract frame from video
          const frameBase64 = await extractFrame(timestamp);
          
          // Process the frame with Roboflow
          const frameCoordinates = await processFrame(frameBase64, frameIndex, timestamp);
          
          allCoordinates.push(frameCoordinates);
          
          // Update progress
          onProgress((frameIndex / totalFrames) * 100);
          
          // Every ANALYSIS_INTERVAL seconds, analyze the accumulated coordinates
          if ((frameIndex + 1) % framesPerAnalysis === 0 || frameIndex === totalFrames - 1) {
            // Get the coordinates for this batch
            const batchStart = Math.max(0, frameIndex - framesPerAnalysis + 1);
            const batchCoordinates = allCoordinates.slice(batchStart, frameIndex + 1);
            
            // Track objects across frames
            const trackedCoordinates = trackObjects(batchCoordinates);
            
            // Analyze the coordinates with GPT
            const analysisResult = await analyzeCoordinates(trackedCoordinates, videoMetadata);
            
            if (analysisResult) {
              allAnalysisResults.push(analysisResult);
              setAnalysisResults([...allAnalysisResults]);
            }
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
        analysisResults: allAnalysisResults,
        coordinates: allCoordinates
      };
      
      console.log('Final analysis result:', finalResult);
      
      // Call the completion handler
      onComplete(finalResult);
    } catch (error: any) {
      console.error('Error processing video:', error);
      onError(error.message || 'Error processing video');
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <div className="hidden">
      {/* Hidden video and canvas elements for processing */}
      <video 
        ref={videoRef}
        src={videoUrl}
        crossOrigin="anonymous"
        controls={false}
        muted
        playsInline
      />
      <canvas ref={canvasRef} />
    </div>
  );
} 