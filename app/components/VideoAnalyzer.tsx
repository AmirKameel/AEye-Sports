'use client';

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

interface VideoAnalyzerProps {
  videoUrl: string;
  sportType: 'tennis' | 'football';
  onProgress?: (progress: number) => void;
  onComplete?: (analysisResults: any) => void;
  onError?: (error: string) => void;
}

// Roboflow model endpoints
const TENNIS_MODEL_ENDPOINT = 'tennis-vhrs9/9';
const FOOTBALL_MODEL_ENDPOINT = 'football-detection/1'; // Placeholder, replace with actual endpoint

export default function VideoAnalyzer({
  videoUrl,
  sportType,
  onProgress,
  onComplete,
  onError
}: VideoAnalyzerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [trackedCoordinates, setTrackedCoordinates] = useState<any[]>([]);

  // Initialize video and extract metadata
  useEffect(() => {
    if (!videoUrl) return;

    const video = videoRef.current;
    if (!video) return;

    const handleMetadataLoaded = () => {
      setDuration(video.duration);
    };

    video.addEventListener('loadedmetadata', handleMetadataLoaded);
    
    return () => {
      video.removeEventListener('loadedmetadata', handleMetadataLoaded);
    };
  }, [videoUrl]);

  // Start processing the video
  const startProcessing = async () => {
    try {
      setProcessing(true);
      setProgress(0);
      setTrackedCoordinates([]);

      const video = videoRef.current;
      if (!video || !duration) {
        throw new Error('Video not loaded properly');
      }

      // Determine which endpoint to use based on sport type
      const modelEndpoint = sportType === 'tennis' ? TENNIS_MODEL_ENDPOINT : FOOTBALL_MODEL_ENDPOINT;
      
      // For tennis, process 2 frames per second
      const frameInterval = 0.5; // 0.5 seconds between frames (2 fps)
      const totalFrames = Math.floor(duration / frameInterval);
      let processedFrames = 0;
      
      const coordinates: any[] = [];
      
      // Process frames at regular intervals
      for (let currentTime = 0; currentTime < duration; currentTime += frameInterval) {
        // Extract frame
        const frame = await extractFrame(video, currentTime);
        
        // Process frame with Roboflow
        const detections = await processFrame(frame, modelEndpoint);
        
        // Add timestamp to each detection
        const frameData = {
          timestamp: currentTime,
          detections
        };
        
        coordinates.push(frameData);
        
        // Update progress
        processedFrames++;
        const newProgress = Math.floor((processedFrames / totalFrames) * 100);
        setProgress(newProgress);
        if (onProgress) onProgress(newProgress);
        
        // Every 5 seconds (10 frames at 2fps), track objects across frames
        if (processedFrames % 10 === 0 || currentTime + frameInterval >= duration) {
          const trackedObjects = trackObjects(coordinates);
          setTrackedCoordinates(trackedObjects);
          
          // If we've reached the end or have enough data, analyze
          if (currentTime + frameInterval >= duration || trackedObjects.length > 20) {
            await analyzeCoordinates(trackedObjects);
          }
        }
      }
      
      // Final analysis with all data
      const trackedObjects = trackObjects(coordinates);
      await analyzeCoordinates(trackedObjects);
      
      setProcessing(false);
    } catch (error) {
      console.error('Error processing video:', error);
      setProcessing(false);
      if (onError) onError('Failed to process video. Please try again.');
    }
  };

  // Extract a frame from the video at the specified time
  const extractFrame = (video: HTMLVideoElement, time: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      // Set the current time of the video
      video.currentTime = time;
      
      // When the video seeks to the specified time
      const handleSeeked = () => {
        try {
          // Create a canvas element
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          // Draw the current frame on the canvas
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }
          
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Convert the canvas to a data URL
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          
          // Remove the event listener and resolve with the data URL
          video.removeEventListener('seeked', handleSeeked);
          resolve(dataUrl);
        } catch (error) {
          reject(error);
        }
      };
      
      video.addEventListener('seeked', handleSeeked);
    });
  };

  // Process a frame using Roboflow API
  const processFrame = async (frameDataUrl: string, modelEndpoint: string) => {
    try {
      // Extract base64 data from data URL
      const base64Data = frameDataUrl.split(',')[1];
      
      // Call Roboflow API
      const response = await axios({
        method: 'POST',
        url: `https://detect.roboflow.com/${modelEndpoint}?api_key=${process.env.NEXT_PUBLIC_ROBOFLOW_API_KEY}`,
        data: base64Data,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      if (response.data && response.data.predictions) {
        // Transform the response into a more useful format
        return response.data.predictions.map((pred: any) => ({
          class: pred.class,
          confidence: pred.confidence,
          x: pred.x,
          y: pred.y,
          width: pred.width,
          height: pred.height
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Error processing frame with Roboflow:', error);
      return [];
    }
  };

  // Track objects across frames
  const trackObjects = (frameData: any[]) => {
    if (frameData.length === 0) return [];
    
    const trackedObjects: any[] = [];
    
    // Initialize tracked objects with the first frame's detections
    if (frameData.length > 0) {
      frameData[0].detections.forEach((detection: any) => {
        trackedObjects.push({
          class: detection.class,
          coordinates: [{
            timestamp: frameData[0].timestamp,
            x: detection.x,
            y: detection.y,
            width: detection.width,
            height: detection.height,
            confidence: detection.confidence
          }]
        });
      });
    }
    
    // For each subsequent frame, match detections to existing tracked objects
    for (let i = 1; i < frameData.length; i++) {
      const frame = frameData[i];
      
      // Keep track of which detections have been matched
      const matchedDetections = new Set();
      
      // For each tracked object, find the best matching detection in the current frame
      trackedObjects.forEach(trackedObj => {
        const lastCoord = trackedObj.coordinates[trackedObj.coordinates.length - 1];
        let bestMatch = null;
        let bestDistance = Infinity;
        
        // Find the closest detection of the same class
        frame.detections.forEach((detection: any, index: number) => {
          if (detection.class === trackedObj.class && !matchedDetections.has(index)) {
            const distance = Math.sqrt(
              Math.pow(detection.x - lastCoord.x, 2) + 
              Math.pow(detection.y - lastCoord.y, 2)
            );
            
            // If this is closer than the current best match, update
            if (distance < bestDistance && distance < 100) { // Threshold for considering it the same object
              bestMatch = detection;
              bestDistance = distance;
              matchedDetections.add(index);
            }
          }
        });
        
        // If a match was found, add it to the tracked object's coordinates
        if (bestMatch) {
          trackedObj.coordinates.push({
            timestamp: frame.timestamp,
            x: bestMatch.x,
            y: bestMatch.y,
            width: bestMatch.width,
            height: bestMatch.height,
            confidence: bestMatch.confidence
          });
        }
      });
      
      // Add any unmatched detections as new tracked objects
      frame.detections.forEach((detection: any, index: number) => {
        if (!matchedDetections.has(index)) {
          trackedObjects.push({
            class: detection.class,
            coordinates: [{
              timestamp: frame.timestamp,
              x: detection.x,
              y: detection.y,
              width: detection.width,
              height: detection.height,
              confidence: detection.confidence
            }]
          });
        }
      });
    }
    
    // Filter out objects with too few coordinates (likely noise or false detections)
    return trackedObjects.filter(obj => obj.coordinates.length > 3);
  };

  // Analyze the tracked coordinates
  const analyzeCoordinates = async (trackedObjects: any[]) => {
    try {
      if (trackedObjects.length === 0) {
        throw new Error('No objects tracked in the video');
      }
      
      // Send data to OpenAI for analysis
      const response = await fetch('/api/analyze-coordinates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sportType,
          trackedObjects,
          videoDuration: duration
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to analyze tracking data');
      }
      
      const analysisResults = await response.json();
      
      // Call onComplete callback with results
      if (onComplete) {
        onComplete(analysisResults);
      }
      
      return analysisResults;
    } catch (error) {
      console.error('Error analyzing coordinates:', error);
      if (onError) {
        onError('Failed to analyze tracking data. Please try again.');
      }
      return null;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-4">Video Analyzer</h2>
      
      <div className="aspect-video bg-black rounded-lg overflow-hidden mb-4">
        <video 
          ref={videoRef}
          src={videoUrl}
          className="w-full h-full"
          controls
          crossOrigin="anonymous"
        />
      </div>
      
      <div className="mb-6">
        {processing ? (
          <div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div 
                className="bg-blue-600 h-2 rounded-full" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600">
              Processing video... {progress}% complete
            </p>
          </div>
        ) : (
          <button
            onClick={startProcessing}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            disabled={!videoUrl || !duration}
          >
            Start Analysis
          </button>
        )}
      </div>
      
      {trackedCoordinates.length > 0 && (
        <div className="mt-4">
          <h3 className="font-semibold mb-2">Tracking {trackedCoordinates.length} objects:</h3>
          <div className="grid grid-cols-2 gap-2">
            {trackedCoordinates.slice(0, 4).map((obj, index) => (
              <div key={index} className="bg-gray-50 p-2 rounded">
                <p className="font-medium">{obj.class}</p>
                <p className="text-sm">{obj.coordinates.length} positions tracked</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 