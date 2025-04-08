'use client';

import { useState, useRef, useEffect } from 'react';

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  label: 'player' | 'ball';
}

interface BoundingBoxSelectorProps {
  videoUrl: string;
  onBoxesSelected: (boxes: BoundingBox[]) => void;
  onCancel: () => void;
}

export default function BoundingBoxSelector({ 
  videoUrl, 
  onBoxesSelected, 
  onCancel 
}: BoundingBoxSelectorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(true);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentLabel, setCurrentLabel] = useState<'player' | 'ball'>('player');
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const [endPoint, setEndPoint] = useState({ x: 0, y: 0 });
  const [boxes, setBoxes] = useState<BoundingBox[]>([]);
  const [videoTime, setVideoTime] = useState(0);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [canvasScale, setCanvasScale] = useState({ x: 1, y: 1 });

  // Initialize video and canvas
  useEffect(() => {
    if (!videoUrl) return;

    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setVideoLoaded(true);
      // Pause at the beginning
      video.currentTime = 0;
      video.pause();
      setIsPaused(true);
      updateCanvasSize();
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    
    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [videoUrl]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      updateCanvasSize();
    };

    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Update canvas size to match video display size
  const updateCanvasSize = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    
    if (!video || !canvas || !container) return;
    
    // Get the displayed size of the video
    const videoRect = video.getBoundingClientRect();
    
    // Set canvas size to match the displayed video size
    canvas.width = videoRect.width;
    canvas.height = videoRect.height;
    
    // Calculate scale factors between actual video dimensions and displayed dimensions
    setCanvasScale({
      x: video.videoWidth / videoRect.width,
      y: video.videoHeight / videoRect.height
    });
    
    // Redraw boxes
    drawBoxes();
  };

  // Draw boxes on canvas
  const drawBoxes = () => {
    if (!videoLoaded) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    // Clear canvas
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Draw existing boxes
    boxes.forEach(box => {
      // Convert video coordinates to canvas coordinates
      const canvasX = box.x / canvasScale.x;
      const canvasY = box.y / canvasScale.y;
      const canvasWidth = box.width / canvasScale.x;
      const canvasHeight = box.height / canvasScale.y;
      
      context.strokeStyle = box.label === 'player' ? '#FF0000' : '#00FF00';
      context.lineWidth = 2;
      context.strokeRect(canvasX, canvasY, canvasWidth, canvasHeight);
      
      // Draw label
      context.fillStyle = box.label === 'player' ? '#FF0000' : '#00FF00';
      context.font = '16px Arial';
      context.fillText(box.label, canvasX, canvasY - 5);
    });

    // Draw current box if drawing
    if (isDrawing) {
      const width = endPoint.x - startPoint.x;
      const height = endPoint.y - startPoint.y;
      
      context.strokeStyle = currentLabel === 'player' ? '#FF0000' : '#00FF00';
      context.lineWidth = 2;
      context.strokeRect(startPoint.x, startPoint.y, width, height);
      
      // Draw label
      context.fillStyle = currentLabel === 'player' ? '#FF0000' : '#00FF00';
      context.font = '16px Arial';
      context.fillText(currentLabel, startPoint.x, startPoint.y - 5);
    }
  };

  // Update video time
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setVideoTime(video.currentTime);
      drawBoxes();
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [boxes, isDrawing, startPoint, endPoint, currentLabel, canvasScale]);

  // Convert screen coordinates to canvas coordinates
  const screenToCanvas = (screenX: number, screenY: number): { x: number, y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    return {
      x: screenX - rect.left,
      y: screenY - rect.top
    };
  };

  // Handle mouse events
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = screenToCanvas(e.clientX, e.clientY);
    setStartPoint({ x, y });
    setEndPoint({ x, y });
    setIsDrawing(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const { x, y } = screenToCanvas(e.clientX, e.clientY);
    setEndPoint({ x, y });
    drawBoxes();
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    
    const width = Math.abs(endPoint.x - startPoint.x);
    const height = Math.abs(endPoint.y - startPoint.y);
    
    // Only add box if it has a reasonable size
    if (width > 10 && height > 10) {
      // Convert canvas coordinates to video coordinates
      const videoX = Math.min(startPoint.x, endPoint.x) * canvasScale.x;
      const videoY = Math.min(startPoint.y, endPoint.y) * canvasScale.y;
      const videoWidth = width * canvasScale.x;
      const videoHeight = height * canvasScale.y;
      
      const newBox: BoundingBox = {
        x: videoX,
        y: videoY,
        width: videoWidth,
        height: videoHeight,
        label: currentLabel
      };
      
      // Replace existing box with same label
      const filteredBoxes = boxes.filter(box => box.label !== currentLabel);
      setBoxes([...filteredBoxes, newBox]);
      
      // Switch to the other label if we haven't drawn it yet
      if (currentLabel === 'player' && !boxes.some(box => box.label === 'ball')) {
        setCurrentLabel('ball');
      } else if (currentLabel === 'ball' && !boxes.some(box => box.label === 'player')) {
        setCurrentLabel('player');
      }
    }
    
    setIsDrawing(false);
    drawBoxes();
  };

  // Handle video playback
  const togglePlayPause = async () => {
    const video = videoRef.current;
    if (!video) return;
    
    try {
      if (isPaused) {
        await video.play();
        setIsPaused(false);
      } else {
        video.pause();
        setIsPaused(true);
      }
    } catch (error) {
      console.error('Error playing/pausing video:', error);
    }
  };

  // Handle seeking
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    
    const time = parseFloat(e.target.value);
    video.currentTime = time;
    setVideoTime(time);
    drawBoxes();
  };

  // Handle completion
  const handleComplete = () => {
    // Check if we have both player and ball boxes
    if (!boxes.some(box => box.label === 'player') || !boxes.some(box => box.label === 'ball')) {
      alert('Please draw bounding boxes for both the player and the ball.');
      return;
    }
    
    onBoxesSelected(boxes);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-4">Select Player and Ball</h2>
      <p className="text-gray-600 mb-4">
        Draw bounding boxes around the player and the ball. Pause the video at a frame where both are clearly visible.
      </p>
      
      <div className="relative mb-4" ref={containerRef}>
        <video 
          ref={videoRef}
          src={videoUrl}
          className="w-full"
          crossOrigin="anonymous"
          playsInline
          onLoadedMetadata={updateCanvasSize}
        />
        <canvas 
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full cursor-crosshair"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>
      
      <div className="flex items-center mb-4">
        <button
          onClick={togglePlayPause}
          className="bg-blue-600 text-white px-4 py-2 rounded mr-4 hover:bg-blue-700 transition-colors"
        >
          {isPaused ? 'Play' : 'Pause'}
        </button>
        
        <input
          type="range"
          min="0"
          max={videoRef.current?.duration || 0}
          step="0.1"
          value={videoTime}
          onChange={handleSeek}
          className="flex-grow"
        />
        
        <span className="ml-2">
          {videoTime.toFixed(1)}s / {(videoRef.current?.duration || 0).toFixed(1)}s
        </span>
      </div>
      
      <div className="flex items-center mb-6">
        <div className="mr-6">
          <span className="font-semibold">Currently drawing: </span>
          <select
            value={currentLabel}
            onChange={(e) => setCurrentLabel(e.target.value as 'player' | 'ball')}
            className="border rounded px-2 py-1"
          >
            <option value="player">Player</option>
            <option value="ball">Ball</option>
          </select>
        </div>
        
        <div>
          <span className="font-semibold">Boxes drawn: </span>
          <span className="text-green-600">
            {boxes.some(box => box.label === 'player') ? 'Player ✓' : 'Player ✗'} | 
            {boxes.some(box => box.label === 'ball') ? ' Ball ✓' : ' Ball ✗'}
          </span>
        </div>
      </div>
      
      <div className="flex justify-end">
        <button
          onClick={onCancel}
          className="bg-gray-300 text-gray-800 px-4 py-2 rounded mr-2 hover:bg-gray-400 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleComplete}
          className={`px-4 py-2 rounded text-white ${
            boxes.some(box => box.label === 'player') && boxes.some(box => box.label === 'ball')
              ? 'bg-green-600 hover:bg-green-700'
              : 'bg-gray-400 cursor-not-allowed'
          } transition-colors`}
          disabled={!boxes.some(box => box.label === 'player') || !boxes.some(box => box.label === 'ball')}
        >
          Continue with Analysis
        </button>
      </div>
    </div>
  );
} 