'use client';

import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';

interface FrameData {
  frameNumber: number;
  timestamp: number;
  imageData: string; // base64
}

interface AnalysisResult {
  tacticalInsights: string;
  playerMovements: string;
  recommendations: string;
  formationAnalysis: string;
}

const markdownComponents = {
  h1: (props: React.JSX.IntrinsicAttributes & React.ClassAttributes<HTMLHeadingElement> & React.HTMLAttributes<HTMLHeadingElement>) => <h1 style={{ color: '#2563eb', marginBottom: '16px' }} {...props} />,
  h2: (props: React.JSX.IntrinsicAttributes & React.ClassAttributes<HTMLHeadingElement> & React.HTMLAttributes<HTMLHeadingElement>) => <h2 style={{ color: '#2563eb', marginBottom: '12px' }} {...props} />,
  h3: (props: React.JSX.IntrinsicAttributes & React.ClassAttributes<HTMLHeadingElement> & React.HTMLAttributes<HTMLHeadingElement>) => <h3 style={{ color: '#2563eb', marginBottom: '12px' }} {...props} />,
  p: (props: React.JSX.IntrinsicAttributes & React.ClassAttributes<HTMLParagraphElement> & React.HTMLAttributes<HTMLParagraphElement>) => <p style={{ color: '#374151', marginBottom: '8px' }} {...props} />,
  li: (props: React.JSX.IntrinsicAttributes & React.ClassAttributes<HTMLLIElement> & React.LiHTMLAttributes<HTMLLIElement>) => <li style={{ color: '#374151', marginBottom: '4px' }} {...props} />,
};

export default function PerformanceAnalysis() {
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
      frameNumber: Math.round(video.currentTime * fps), // use video.currentTime for accurate frame number
      timestamp: video.currentTime,                       // use video.currentTime for the timestamp
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
      const frame = captureFrame();
      if (frame) {
        frames.push(frame);
      }
      
      // Move to next frame
      video.currentTime = startTime + (currentFrameIndex + 1) * frameInterval;
      
      // Process next frame
      requestAnimationFrame(() => captureNextFrame(currentFrameIndex + 1));
    };
    
    // Start the capture process
    captureNextFrame(0);
  };

  // Remove a frame from selection
  const removeFrame = (index: number) => {
    setSelectedFrames(prev => prev.filter((_, i) => i !== index));
  };

  // Analyze selected frames
  const analyzeFrames = async () => {
    if (selectedFrames.length === 0) {
      setError('Please select frames to analyze');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      // Prepare the payload for the API
      const payload = {
        frames: selectedFrames,
        prompt: analysisPrompt || 'Analyze the tactical situation in these football frames',
        videoInfo: {
          name: fileName,
          duration,
          fps,
          totalFrames
        }
      };

      // Call the API endpoint
      const response = await axios.post('/api/analyze-frames', payload);
      setAnalysisResult(response.data);
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

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Performance Analysis</h2>
        <p className="text-gray-600">Upload a video and analyze specific sequences</p>
      </div>

      {/* Video upload section */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h3 className="text-lg font-semibold mb-4">1. Upload Video</h3>
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
          <h3 className="text-lg font-semibold mb-4">4. Analysis Instructions</h3>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              What would you like to analyze?
            </label>
            <textarea
              value={analysisPrompt}
              onChange={(e) => setAnalysisPrompt(e.target.value)}
              placeholder="E.g., Analyze the defensive structure, identify pressing triggers, evaluate the team's attacking shape..."
              className="w-full p-3 border rounded h-32"
            />
          </div>
          <button
            onClick={analyzeFrames}
            className="bg-blue-600 text-white px-6 py-2 rounded"
            disabled={isAnalyzing}
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze Frames'}
          </button>
          {error && <p className="mt-2 text-red-500">{error}</p>}
        </div>
      )}

      {/* Analysis results */}
      {analysisResult && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h3 className="text-2xl font-semibold mb-6">Analysis Results</h3>
          
          <div className="mb-6">
            <h4 className="text-lg font-medium mb-3">Tactical Insights</h4>
            <div className="bg-gray-50 p-4 rounded">
              <ReactMarkdown components={markdownComponents}>
                {analysisResult.tacticalInsights}
              </ReactMarkdown>
            </div>
          </div>
          
          <div className="mb-6">
            <h4 className="text-lg font-medium mb-3">Player Movements</h4>
            <div className="bg-gray-50 p-4 rounded">
              <ReactMarkdown components={markdownComponents}>
                {analysisResult.playerMovements}
              </ReactMarkdown>
            </div>
          </div>
          
          <div className="mb-6">
            <h4 className="text-lg font-medium mb-3">Formation Analysis</h4>
            <div className="bg-gray-50 p-4 rounded">
              <ReactMarkdown components={markdownComponents}>
                {analysisResult.formationAnalysis}
              </ReactMarkdown>
            </div>
          </div>
          
          <div>
            <h4 className="text-lg font-medium mb-3">Recommendations</h4>
            <div className="bg-gray-50 p-4 rounded">
              <ReactMarkdown components={markdownComponents}>
                {analysisResult.recommendations}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}