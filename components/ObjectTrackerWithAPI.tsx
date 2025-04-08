import React, { useRef, useState, useEffect } from 'react';
import axios from 'axios';

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence?: number;
  class_name?: string;
}

interface FrameData {
  frame_number: number;
  timestamp: number;
  bounding_boxes: BoundingBox[];
}

interface VideoAnalysisResponse {
  video_id: string;
  frames: FrameData[];
  total_frames: number;
  duration: number;
  fps_processed: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const ObjectTrackerWithAPI: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSelectingROI, setIsSelectingROI] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ x: number, y: number } | null>(null);
  const [currentSelection, setCurrentSelection] = useState<BoundingBox | null>(null);
  const [trackingData, setTrackingData] = useState<VideoAnalysisResponse | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [fps, setFps] = useState(2);
  const [trackerType, setTrackerType] = useState('csrt');
  const [error, setError] = useState<string | null>(null);
  const animationRef = useRef<number>();

  // Handle video upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      return;
    }

    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);

    setIsUploading(true);
    setError(null);

    try {
      const response = await axios.post(`${API_URL}/upload-video/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setVideoId(response.data.video_id);

      // Load the video for display
      if (videoRef.current) {
        const fileURL = URL.createObjectURL(file);
        videoRef.current.src = fileURL;
      }
    } catch (err) {
      console.error('Error uploading video:', err);
      setError('Failed to upload video');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle video loaded
  const handleVideoLoaded = () => {
    if (videoRef.current && canvasRef.current) {
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      drawFrame(0);
    }
  };

  // Drawing function
  const drawFrame = (frameIndex: number) => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Clear canvas and draw video frame
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Draw selection rectangle if selecting ROI
    if (isSelectingROI && currentSelection) {
      ctx.strokeStyle = 'rgb(100, 255, 0)';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        currentSelection.x,
        currentSelection.y,
        currentSelection.width,
        currentSelection.height
      );
    }

    // Draw tracking data if available
    if (trackingData && trackingData.frames.length > 0 && frameIndex < trackingData.frames.length) {
      const frame = trackingData.frames[frameIndex];
      
      frame.bounding_boxes.forEach(box => {
        ctx.strokeStyle = 'rgb(100, 255, 0)';
        ctx.lineWidth = 2;
        ctx.strokeRect(box.x, box.y, box.width, box.height);
        
        if (box.class_name) {
          ctx.fillStyle = 'rgb(100, 255, 0)';
          ctx.font = '16px Arial';
          ctx.fillText(
            `${box.class_name} ${box.confidence ? `${Math.round(box.confidence * 100)}%` : ''}`,
            box.x, box.y > 20 ? box.y - 5 : box.y + box.height + 16
          );
        }
      });
    }
  };

  // Mouse events for ROI selection
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isSelectingROI) return;

    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setSelectionStart({ x, y });
      setCurrentSelection({ x, y, width: 0, height: 0 });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isSelectingROI || !selectionStart) return;

    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      setCurrentSelection({
        x: selectionStart.x,
        y: selectionStart.y,
        width: x - selectionStart.x,
        height: y - selectionStart.y
      });

      // Draw the selection rectangle
      drawFrame(currentFrameIndex);
    }
  };

  const handleMouseUp = () => {
    if (!isSelectingROI || !currentSelection) return;
    setIsSelectingROI(false);
  };

  // Start tracking
  const startTracking = async () => {
    if (!videoId || !currentSelection) {
      setError('Please upload a video and select a region to track');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const response = await axios.post(`${API_URL}/track-object/`, 
        {
          video_id: videoId,
          x: currentSelection.x,
          y: currentSelection.y,
          width: currentSelection.width,
          height: currentSelection.height,
          fps: fps,
          tracker_type: trackerType
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      setTrackingData(response.data);
      setCurrentFrameIndex(0);
    } catch (err) {
      console.error('Error tracking object:', err);
      setError('Failed to track object');
    } finally {
      setIsProcessing(false);
    }
  };

  // Extract frames
  const extractFrames = async () => {
    if (!videoId) {
      setError('Please upload a video first');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const response = await axios.get(`${API_URL}/extract-frames/${videoId}?fps=${fps}`);
      console.log('Extracted frames:', response.data);
      // Handle the extracted frames as needed
    } catch (err) {
      console.error('Error extracting frames:', err);
      setError('Failed to extract frames');
    } finally {
      setIsProcessing(false);
    }
  };

  // Play/pause tracking visualization
  const togglePlayback = () => {
    if (!trackingData || trackingData.frames.length === 0) {
      return;
    }

    setIsPlaying(!isPlaying);
  };

  // Animation loop for playback
  useEffect(() => {
    if (!isPlaying || !trackingData || trackingData.frames.length === 0) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const animate = () => {
      if (videoRef.current && currentFrameIndex < trackingData.frames.length) {
        // Set video time to the current frame
        const frameData = trackingData.frames[currentFrameIndex];
        videoRef.current.currentTime = frameData.timestamp;
        
        // Draw the current frame
        drawFrame(currentFrameIndex);
        
        // Advance to next frame
        setCurrentFrameIndex(prev => 
          prev + 1 < trackingData.frames.length ? prev + 1 : 0
        );
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, currentFrameIndex, trackingData]);

  // Update canvas when video time changes
  useEffect(() => {
    const handleTimeUpdate = () => {
      drawFrame(currentFrameIndex);
    };

    if (videoRef.current) {
      videoRef.current.addEventListener('timeupdate', handleTimeUpdate);
    }

    return () => {
      if (videoRef.current) {
        videoRef.current.removeEventListener('timeupdate', handleTimeUpdate);
      }
    };
  }, [trackingData]);

  // Draw frame when currentFrameIndex changes
  useEffect(() => {
    drawFrame(currentFrameIndex);
  }, [currentFrameIndex]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Object Tracker with API</h1>

      <div className="w-full mb-4">
        <label className="block mb-2">Upload Video</label>
        <input 
          type="file" 
          accept="video/*"
          onChange={handleFileUpload}
          disabled={isUploading}
          className="w-full p-2 border border-gray-300 rounded"
        />
        {isUploading && <p className="mt-2 italic">Uploading video...</p>}
      </div>

      <div className="w-full mb-4 flex space-x-4">
        <div className="w-1/2">
          <label className="block mb-2">Processing FPS</label>
          <input 
            type="number" 
            min="1" 
            max="30" 
            value={fps}
            onChange={(e) => setFps(parseInt(e.target.value))}
            className="w-full p-2 border border-gray-300 rounded"
          />
        </div>
        <div className="w-1/2">
          <label className="block mb-2">Tracker Type</label>
          <select 
            value={trackerType}
            onChange={(e) => setTrackerType(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
          >
            <option value="csrt">CSRT</option>
            <option value="kcf">KCF</option>
            <option value="mil">MIL</option>
            <option value="tld">TLD</option>
            <option value="medianflow">MedianFlow</option>
            <option value="mosse">MOSSE</option>
          </select>
        </div>
      </div>

      <div className="relative mb-4 w-full">
        <video 
          ref={videoRef}
          className="w-full"
          onLoadedData={handleVideoLoaded}
          controls
        />
        
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        />
      </div>

      <div className="flex flex-wrap gap-4 mb-4">
        <button
          onClick={() => setIsSelectingROI(true)}
          disabled={!videoId || isSelectingROI || isProcessing}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
        >
          Select Region to Track
        </button>
        
        <button
          onClick={startTracking}
          disabled={!videoId || !currentSelection || isProcessing}
          className="px-4 py-2 bg-green-500 text-white rounded disabled:bg-gray-300"
        >
          Start Tracking
        </button>

        <button
          onClick={extractFrames}
          disabled={!videoId || isProcessing}
          className="px-4 py-2 bg-purple-500 text-white rounded disabled:bg-gray-300"
        >
          Extract Frames
        </button>
        
        <button
          onClick={togglePlayback}
          disabled={!trackingData || trackingData.frames.length === 0 || isProcessing}
          className="px-4 py-2 bg-yellow-500 text-white rounded disabled:bg-gray-300"
        >
          {isPlaying ? 'Pause' : 'Play'} Tracking
        </button>
      </div>

      {isProcessing && (
        <div className="w-full bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4">
          <p>Processing video... This may take a while depending on video length.</p>
        </div>
      )}

      {error && (
        <div className="w-full bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
          <p>{error}</p>
        </div>
      )}

      {trackingData && (
        <div className="w-full bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4">
          <h3 className="font-bold">Tracking Results</h3>
          <p>Total frames processed: {trackingData.frames.length}</p>
          <p>Video duration: {trackingData.duration.toFixed(2)} seconds</p>
          <p>Processing FPS: {trackingData.fps_processed.toFixed(2)}</p>
        </div>
      )}
    </div>
  );
};

export default ObjectTrackerWithAPI; 