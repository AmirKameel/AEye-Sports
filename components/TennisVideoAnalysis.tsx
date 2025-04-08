'use client';

import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { geminiInference, geminiInferenceMultiFrame } from '@/lib/gemini';
import { useLanguage } from '../lib/i18n/LanguageContext';

interface FrameData {
  frameNumber: number;
  timestamp: number;
  imageData: string; // base64
}

interface AnalysisResult {
  technique: string;
  positioning: string;
  movement: string;
  recommendations: string;
  speedAnalysis?: string;
}

const markdownComponents = {
  h1: (props: React.JSX.IntrinsicAttributes & React.ClassAttributes<HTMLHeadingElement> & React.HTMLAttributes<HTMLHeadingElement>) => <h1 style={{ color: '#2563eb', marginBottom: '16px' }} {...props} />,
  h2: (props: React.JSX.IntrinsicAttributes & React.ClassAttributes<HTMLHeadingElement> & React.HTMLAttributes<HTMLHeadingElement>) => <h2 style={{ color: '#2563eb', marginBottom: '12px' }} {...props} />,
  h3: (props: React.JSX.IntrinsicAttributes & React.ClassAttributes<HTMLHeadingElement> & React.HTMLAttributes<HTMLHeadingElement>) => <h3 style={{ color: '#2563eb', marginBottom: '12px' }} {...props} />,
  p: (props: React.JSX.IntrinsicAttributes & React.ClassAttributes<HTMLParagraphElement> & React.HTMLAttributes<HTMLParagraphElement>) => <p style={{ color: '#374151', marginBottom: '8px' }} {...props} />,
  li: (props: React.JSX.IntrinsicAttributes & React.ClassAttributes<HTMLLIElement> & React.LiHTMLAttributes<HTMLLIElement>) => <li style={{ color: '#374151', marginBottom: '4px' }} {...props} />,
};

export default function TennisVideoAnalysis() {
  const { t } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [fps, setFps] = useState<number>(25);
  const [startFrame, setStartFrame] = useState<number>(0);
  const [endFrame, setEndFrame] = useState<number>(0);
  const [selectedFrames, setSelectedFrames] = useState<FrameData[]>([]);
  const [analysisPrompt, setAnalysisPrompt] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [totalFrames, setTotalFrames] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setFileName(file.name);
    setVideoUrl(url);
    setSelectedFrames([]);
    setAnalysisResult(null);
    setError(null);
  };

  // Initialize video metadata when video is loaded
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setTotalFrames(Math.floor(video.duration * fps));
      setStartFrame(0);
      setEndFrame(Math.floor(video.duration * fps));
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    
    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [videoUrl, fps]);

  // Update current time during playback
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, []);

  // Add this useEffect after your existing useEffect hooks
  useEffect(() => {
    if (duration) {
      const newTotal = Math.floor(duration * fps);
      setTotalFrames(newTotal);
      setEndFrame(newTotal);
    }
  }, [duration, fps]);

  // Handle play/pause
  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  // Seek to specific time
  const seekTo = (time: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = time;
    setCurrentTime(time);
  };

  // Capture a single frame
  const captureFrame = (): FrameData | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the current frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to base64
    const imageData = canvas.toDataURL('image/jpeg', 0.8);

    return {
      frameNumber: Math.round(video.currentTime * fps), 
      timestamp: video.currentTime,
      imageData
    };
  };

  // Add current frame to selected frames
  const addCurrentFrame = () => {
    const frame = captureFrame();
    if (!frame) return;

    setSelectedFrames(prev => [...prev, frame]);
  };

  // Capture sequence of frames
  const captureFrameSequence = async () => {
    const video = videoRef.current;
    if (!video || isCapturing) return;

    setIsCapturing(true);
    setSelectedFrames([]);
    
    // Calculate time between frames
    const startTime = startFrame / fps;
    const endTime = endFrame / fps;
    const framesToCapture = endFrame - startFrame;
    const frameInterval = 1 / fps;
    
    // Start capturing
    video.currentTime = startTime;
    
    // Create an array to store our frames
    const frames: FrameData[] = [];
    
    // Function to capture each frame sequentially
    const captureNextFrame = async (currentFrameIndex: number) => {
      if (currentFrameIndex >= framesToCapture) {
        setSelectedFrames(frames);
        setIsCapturing(false);
        return;
      }
      
      // Wait for currentTime to update
      await new Promise(resolve => {
        const checkTime = () => {
          if (Math.abs(video.currentTime - (startTime + currentFrameIndex * frameInterval)) < 0.01) {
            resolve(null);
          } else {
            requestAnimationFrame(checkTime);
          }
        };
        checkTime();
      });
      
      // Capture the frame
      const frameData = captureFrame();
      if (frameData) {
        frames.push(frameData);
      }
      
      // Move to next frame
      video.currentTime = startTime + (currentFrameIndex + 1) * frameInterval;
      
      // Capture next frame
      setTimeout(() => captureNextFrame(currentFrameIndex + 1), 100);
    };
    
    // Start the capture process
    captureNextFrame(0);
  };

  // Remove a frame from selected frames
  const removeFrame = (index: number) => {
    setSelectedFrames(prev => prev.filter((_, i) => i !== index));
  };

  // Analyze selected frames using Gemini
  const analyzeFrames = async () => {
    if (selectedFrames.length === 0) {
      setError('Please select frames to analyze');
      return;
    }

    if (selectedFrames.length < 2) {
      setError('Please select at least 2 frames for proper motion and speed analysis');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      // Get user prompt or use default
      const userPrompt = analysisPrompt || 'Analyze the tennis match';
      
      // Create a string with all frame timestamps for reference
      const frameTimestamps = selectedFrames.map((frame, index) => 
        `Frame ${index+1}: ${frame.timestamp.toFixed(2)}s`
      ).join('\n');
      
      // Calculate time intervals between frames
      const timeIntervals = [];
      for (let i = 1; i < selectedFrames.length; i++) {
        timeIntervals.push(selectedFrames[i].timestamp - selectedFrames[i-1].timestamp);
      }
      
      const avgInterval = timeIntervals.length > 0 
        ? timeIntervals.reduce((sum, interval) => sum + interval, 0) / timeIntervals.length 
        : 0;
      
      // Base CV detection prompt with coordination tracking across frames
      const cvPrompt = `
IMPORTANT: You will analyze multiple tennis match frames in sequence.

FRAME INFORMATION:
${frameTimestamps}
Average time between frames: ${avgInterval.toFixed(2)} seconds

TRACKING INSTRUCTIONS:
1. Track ball and player coordinates across ALL frames.
2. Calculate between frames:
   - Ball speed (km/h)
   - Player movement speed (km/h)
   - Distance covered by each player
   - Shot trajectory

3. Count all shots in the sequence by type for each player.

CRITICAL: This is a multi-frame sequence from ${selectedFrames[0].timestamp.toFixed(2)}s to ${selectedFrames[selectedFrames.length-1].timestamp.toFixed(2)}s.`;

      // Final prompt for Gemini with explicit multi-frame analysis
      const fullPrompt = `You are an advanced tennis match analysis system analyzing multiple sequential images. 

USER REQUEST: ${userPrompt}

MULTI-FRAME ANALYSIS TASK:${cvPrompt}

RESPONSE FORMAT REQUIREMENTS:
1. Provide ONLY direct measurements and counts, no explanations
2. Format as concise bullet points 
3. Include ONLY the requested metrics
4. Focus on data from tracking players and ball across ALL frames

Use these exact headings:
1. Shot Count (total shots by type for each player)
2. Ball Tracking (positions, speeds, trajectories between frames)  
3. Player Metrics (distance, speed data)
4. Technical Analysis (shot technique notes)`;

      try {
        // Select the frames to send to Gemini (limited to 2-3 for API compatibility)
        const framesToProcess = selectedFrames.slice(0, Math.min(3, selectedFrames.length));
        
        // Generate content parts with multiple images and their timestamps
        const contentParts = [
          { text: fullPrompt },
          ...framesToProcess.map((frame, index) => ({
            inlineData: {
              mimeType: "image/jpeg",
              data: frame.imageData.split(',')[1], // Remove the data:image/jpeg;base64, prefix
            }
          }))
        ];
        
        // Call modified Gemini API with multiple frames
        const result = await geminiInferenceMultiFrame(contentParts);

        // Parse the result
        const analysisText = result.text;
        
        // Extract sections
        const technique = extractSection(analysisText, 'Shot Count') || 
                         extractSection(analysisText, 'Technical Analysis') ||
                         extractSection(analysisText, 'Technique');
                         
        const positioning = extractSection(analysisText, 'Player Metrics') || 
                           extractSection(analysisText, 'Positioning');
                           
        const movement = extractSection(analysisText, 'Movement') || 
                        extractSection(analysisText, 'Player Movement');
                        
        const recommendations = extractSection(analysisText, 'Recommendations') ||
                               extractSection(analysisText, 'Improvements');
                               
        const speedAnalysis = extractSection(analysisText, 'Ball Tracking') ||
                             extractSection(analysisText, 'Speed Analysis');

        setAnalysisResult({
          technique,
          positioning,
          movement,
          recommendations,
          speedAnalysis
        });
      } catch (err: any) {
        console.error('Gemini API error:', err);
        
        // Check for specific errors
        if (err.message && err.message.includes('deprecated')) {
          setError('The Gemini model being used has been deprecated. The administrator needs to update to a newer model like gemini-1.5-flash.');
        } else if (err.message && err.message.includes('503')) {
          setError('Gemini API service is temporarily unavailable. The API might be experiencing high traffic or maintenance. Please try again in a few minutes.');
        } else if (err.message && err.message.includes('429')) {
          setError('Rate limit exceeded. Too many requests to the Gemini API. Please wait a minute and try again.');
        } else {
          setError('An error occurred while analyzing the frames. Please try with fewer frames or try again later.');
        }
      }
    } catch (err) {
      console.error('Analysis error:', err);
      setError('An error occurred during analysis. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Format time (seconds to MM:SS format)
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Helper function to extract sections from the analysis
  const extractSection = (text: string, sectionTitle: string): string => {
    const regex = new RegExp(`${sectionTitle}:?([\\s\\S]*?)(?=\\n\\s*\\n\\s*(?:Technique|Positioning|Movement|Recommendations|Speed Analysis):?|$)`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : `No ${sectionTitle.toLowerCase()} provided.`;
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">{t('tennis.features.videoAnalysis.title')}</h2>
        <p className="text-gray-600">{t('tennis.features.videoAnalysis.description')}</p>
      </div>

      {/* Video upload section */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h3 className="text-lg font-semibold mb-4">{t('common.uploadVideo')}</h3>
        <input
          type="file"
          accept="video/*"
          onChange={handleFileUpload}
          className="block w-full text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
      </div>

      {/* Video player */}
      {videoUrl && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h3 className="text-lg font-semibold mb-4">2. Select Frame Range</h3>
          <div className="relative">
            <video 
              ref={videoRef}
              src={videoUrl}
              className="w-full"
              controls={false}
              crossOrigin="anonymous"
            />
            <canvas
              ref={canvasRef}
              className="hidden"
            />
          </div>

          {/* Video controls */}
          <div className="mt-4">
            <div className="flex items-center mb-4">
              <button
                onClick={togglePlayPause}
                className="bg-blue-500 text-white px-4 py-2 rounded mr-4"
              >
                {isPlaying ? 'Pause' : 'Play'}
              </button>
              <span className="text-gray-700">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            {/* Timeline slider */}
            <input
              type="range"
              min={0}
              max={duration}
              step={0.1}
              value={currentTime}
              onChange={(e) => seekTo(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Frame selection controls */}
          <div className="grid grid-cols-2 gap-6 mt-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                FPS
              </label>
              <input
                type="number"
                value={fps}
                onChange={(e) => setFps(parseInt(e.target.value) || 25)}
                className="w-full p-2 border rounded"
                min={1}
                max={60}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Frames
              </label>
              <input
                type="text"
                value={totalFrames}
                disabled
                className="w-full p-2 border rounded bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Frame
              </label>
              <input
                type="number"
                value={startFrame}
                onChange={(e) => setStartFrame(parseInt(e.target.value) || 0)}
                className="w-full p-2 border rounded"
                min={0}
                max={totalFrames - 1}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Frame
              </label>
              <input
                type="number"
                value={endFrame}
                onChange={(e) => setEndFrame(parseInt(e.target.value) || 0)}
                className="w-full p-2 border rounded"
                min={startFrame + 1}
                max={totalFrames}
              />
            </div>
          </div>

          <div className="flex justify-between mt-6">
            <button
              onClick={addCurrentFrame}
              className="bg-green-500 text-white px-4 py-2 rounded"
              disabled={isCapturing}
            >
              Capture Current Frame
            </button>
            <button
              onClick={captureFrameSequence}
              className="bg-purple-500 text-white px-4 py-2 rounded"
              disabled={isCapturing}
            >
              {isCapturing ? 'Capturing...' : `Capture Sequence (${endFrame - startFrame} frames)`}
            </button>
          </div>
        </div>
      )}

      {/* Selected frames */}
      {selectedFrames.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h3 className="text-lg font-semibold mb-4">3. Selected Frames ({selectedFrames.length})</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {selectedFrames.map((frame, index) => (
              <div key={index} className="relative">
                <img 
                  src={frame.imageData} 
                  alt={`Frame ${frame.frameNumber}`} 
                  className="w-full h-auto rounded"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1">
                  Frame {frame.frameNumber} ({formatTime(frame.timestamp)})
                </div>
                <button
                  onClick={() => removeFrame(index)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analysis prompt */}
      {selectedFrames.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h3 className="text-lg font-semibold mb-4">{t('tennis.pages.videoAnalysis.analyzeFrames')}</h3>
          
          <div className="px-4 py-3 mb-4 bg-blue-50 border-l-4 border-blue-500 text-sm">
            <p className="font-medium">{t('tennis.pages.videoAnalysis.title')}</p>
            <p className="mt-1">{t('tennis.pages.videoAnalysis.subtitle')}</p>
            <ul className="list-disc ml-6 mt-1">
              <li>{t('tennis.pages.playerAnalysis.playerMetrics')}</li>
              <li>{t('tennis.pages.playerAnalysis.shotAnalysis')}</li>
              <li>{t('tennis.pages.playerAnalysis.movementAnalysis')}</li>
            </ul>
            <p className="mt-2 text-xs italic">{t('common.select')} 2-4 {t('common.capture')}</p>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('tennis.pages.videoAnalysis.analyzeFrames')}
            </label>
            <textarea
              value={analysisPrompt}
              onChange={(e) => setAnalysisPrompt(e.target.value)}
              placeholder="Example: Calculate how many shots for each player, the shot speed for each one, player speed and distance covered. Analyze what type of shots were used..."
              className="w-full p-3 border rounded h-32"
            />
          </div>
          <div className="flex items-center">
            <button
              onClick={analyzeFrames}
              className="bg-blue-600 text-white px-6 py-2 rounded"
              disabled={isAnalyzing || selectedFrames.length < 2}
            >
              {isAnalyzing ? t('common.processing') : t('common.analyze')}
            </button>
            {selectedFrames.length < 2 && (
              <p className="ml-3 text-sm text-amber-600">
                {t('common.select')} 2 {t('common.capture')}
              </p>
            )}
          </div>
          {error && <p className="mt-2 text-red-500">{error}</p>}
        </div>
      )}

      {/* Analysis results */}
      {analysisResult && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h3 className="text-2xl font-semibold mb-6">Tennis Match Analysis Results</h3>
          
          <div className="mb-6">
            <h4 className="text-lg font-medium mb-3">Shot Count & Analysis</h4>
            <div className="bg-gray-50 p-4 rounded">
              <ReactMarkdown components={markdownComponents}>
                {analysisResult.technique}
              </ReactMarkdown>
            </div>
          </div>
          
          <div className="mb-6">
            <h4 className="text-lg font-medium mb-3">Player Metrics</h4>
            <div className="bg-gray-50 p-4 rounded">
              <ReactMarkdown components={markdownComponents}>
                {analysisResult.positioning}
              </ReactMarkdown>
            </div>
          </div>
          
          {analysisResult.movement && (
            <div className="mb-6">
              <h4 className="text-lg font-medium mb-3">Movement Analysis</h4>
              <div className="bg-gray-50 p-4 rounded">
                <ReactMarkdown components={markdownComponents}>
                  {analysisResult.movement}
                </ReactMarkdown>
              </div>
            </div>
          )}
          
          {analysisResult.speedAnalysis && (
            <div className="mb-6">
              <h4 className="text-lg font-medium mb-3">Speed Analysis</h4>
              <div className="bg-gray-50 p-4 rounded">
                <ReactMarkdown components={markdownComponents}>
                  {analysisResult.speedAnalysis}
                </ReactMarkdown>
              </div>
            </div>
          )}
          
          {analysisResult.recommendations && (
            <div>
              <h4 className="text-lg font-medium mb-3">Recommendations</h4>
              <div className="bg-gray-50 p-4 rounded">
                <ReactMarkdown components={markdownComponents}>
                  {analysisResult.recommendations}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 