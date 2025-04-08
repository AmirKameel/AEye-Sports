'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import VideoUploader from '@/components/VideoUploader';
import ByteTracker from '@/lib/byte-tracker';
import { MovementAnalyzer } from '@/lib/movement-analyzer';

interface DetectedObject {
  id: number;
  class: string;
  bbox: [number, number, number, number];
  confidence: number;
  track_id: number;
  age: number;
  hits: number;
  time_since_update: number;
  state: 'tentative' | 'confirmed' | 'deleted';
}

interface PlayerStats {
  id: number;
  name: string;
  distance: number;
  maxSpeed: number;
  avgSpeed: number;
  events: {
    type: string;
    timestamp: number;
    details: string;
  }[];
  coordinates: {
    x: number;
    y: number;
    timestamp: number;
  }[];
}

interface AnalysisReport {
  timestamp: number;
  players: {
    [key: number]: {
      position: { x: number; y: number };
      speed: number;
      direction: string;
      event?: string;
    };
  };
  ball?: {
    position: { x: number; y: number };
  };
}

export default function VideoAnalyzer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectionCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const trackerRef = useRef<ByteTracker | null>(null);
  
  // States for the flow
  const [step, setStep] = useState<'upload' | 'detectPlayers' | 'selectPlayer' | 'analysis' | 'report'>('upload');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [detectedPlayers, setDetectedPlayers] = useState<DetectedObject[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [playerStats, setPlayerStats] = useState<{ [key: number]: PlayerStats }>({});
  const [analysisReports, setAnalysisReports] = useState<AnalysisReport[]>([]);
  const [processedVideoUrl, setProcessedVideoUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  // Reference for frame processing
  const frameIntervalRef = useRef<number | null>(null);
  const lastAnalysisTimeRef = useRef(0);
  const apiKey = '305kTUjX7IoYABj7vMen';

  // Initialize ByteTracker
  useEffect(() => {
    trackerRef.current = new ByteTracker({
      track_thresh: 0.5,
      track_buffer: 30,
      match_thresh: 0.8,
      min_box_area: 10,
      mot20: false
    });

    // Create hidden canvas for detection
    if (!detectionCanvasRef.current) {
      detectionCanvasRef.current = document.createElement('canvas');
      detectionCanvasRef.current.style.display = 'none';
      document.body.appendChild(detectionCanvasRef.current);
    }

    return () => {
      if (detectionCanvasRef.current) {
        document.body.removeChild(detectionCanvasRef.current);
      }
      if (frameIntervalRef.current) {
        cancelAnimationFrame(frameIntervalRef.current);
      }
    };
  }, []);

  // Function to detect objects using Roboflow
  const detectObjects = async (imageData: string): Promise<DetectedObject[]> => {
    try {
      const response = await fetch(`https://detect.roboflow.com/football-players-detection-3zvbc/12?api_key=${apiKey}`, {
        method: 'POST',
        body: imageData,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      if (!response.ok) {
        throw new Error(`Detection API error: ${response.status}`);
      }

      const data = await response.json();
      
      return data.predictions.map((pred: any, index: number) => ({
        id: index + 1,
        class: pred.class,
        bbox: [
          pred.x - pred.width / 2,
          pred.y - pred.height / 2,
          pred.width,
          pred.height
        ],
        confidence: pred.confidence
      }));
    } catch (error) {
      console.error('Error detecting objects:', error);
      throw error;
    }
  };

  // Function to get current frame as base64
  const getCurrentFrameAsBase64 = (): string | null => {
    if (!videoRef.current || !detectionCanvasRef.current) return null;
    
    const video = videoRef.current;
    const canvas = detectionCanvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return null;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    try {
      return canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
    } catch (error) {
      console.error("Error creating base64 image:", error);
      return null;
    }
  };

  // Function to process video frames
  const processVideo = async () => {
    if (!videoRef.current || !canvasRef.current || !trackerRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Process frames at 2 FPS
    const frameInterval = 1000 / 2; // 500ms between frames
    let lastFrameTime = 0;

    const processFrame = async () => {
      if (!isProcessing || !trackerRef.current) return;

      const currentTime = Date.now();
      if (currentTime - lastFrameTime < frameInterval) {
        frameIntervalRef.current = requestAnimationFrame(processFrame);
        return;
      }

      lastFrameTime = currentTime;

      // Draw current frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      try {
        // Get frame as base64
        const imageData = getCurrentFrameAsBase64();
        if (!imageData) return;

        // Detect objects
        const detections = await detectObjects(imageData);
        
        // Update tracker with new detections
        const tracks = trackerRef.current.update(detections.map(det => ({
          ...det,
          track_id: det.track_id || det.id,
          age: 0,
          hits: 0,
          time_since_update: 0,
          state: 'tentative' as const
        })));
        
        // Update detected players state
        setDetectedPlayers(tracks);

        // Update player stats
        tracks.forEach((track: DetectedObject) => {
          if (track.class === 'player' && track.track_id) {
            setPlayerStats(prev => {
              const stats = prev[track.track_id!] || {
                id: track.track_id!,
                name: `Player ${track.track_id}`,
                distance: 0,
                maxSpeed: 0,
                avgSpeed: 0,
                events: [],
                coordinates: []
              };

              // Add new coordinate
              stats.coordinates.push({
                x: track.bbox[0] + track.bbox[2] / 2,
                y: track.bbox[1] + track.bbox[3] / 2,
                timestamp: currentTime
              });

              // Calculate movement stats
              const movementStats = MovementAnalyzer.calculateStats(stats.coordinates);
              stats.distance = movementStats.distance;
              stats.maxSpeed = movementStats.maxSpeed;
              stats.avgSpeed = movementStats.avgSpeed;
              stats.events = movementStats.events;

              return {
                ...prev,
                [track.track_id!]: stats
              };
            });
          }
        });

        // Analyze movements every 5 seconds
        if (currentTime - lastAnalysisTimeRef.current >= 5000) {
          const report: AnalysisReport = {
            timestamp: currentTime,
            players: {}
          };

          tracks.forEach(track => {
            if (track.class === 'player' && track.track_id) {
              const stats = playerStats[track.track_id];
              if (stats && stats.coordinates.length > 0) {
                const lastCoord = stats.coordinates[stats.coordinates.length - 1];
                report.players[track.track_id] = {
                  position: { x: lastCoord.x, y: lastCoord.y },
                  speed: stats.maxSpeed,
                  direction: stats.events[stats.events.length - 1]?.type || 'steady',
                  event: stats.events[stats.events.length - 1]?.type
                };
              }
            }
          });

          setAnalysisReports(prev => [...prev, report]);
          lastAnalysisTimeRef.current = currentTime;
        }

        // Update progress
        const progress = (video.currentTime / video.duration) * 100;
        setProgress(progress);

        // Continue processing if not finished
        if (progress < 100) {
          frameIntervalRef.current = requestAnimationFrame(processFrame);
        } else {
          // Video processing complete
          setIsProcessing(false);
          generateFinalVideo();
        }
      } catch (error) {
        console.error('Error processing frame:', error);
        setError('Error processing video frame');
      }
    };

    frameIntervalRef.current = requestAnimationFrame(processFrame);
  };

  // Function to generate final video with tracking boxes
  const generateFinalVideo = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Create a MediaRecorder to capture the canvas
    const stream = canvas.captureStream(30);
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9'
    });

    const chunks: BlobPart[] = [];
    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setProcessedVideoUrl(url);
      setStep('report');
    };

    // Start recording
    mediaRecorder.start();

    // Reset video to beginning
    video.currentTime = 0;
    await video.play();

    // Process each frame
    const drawFrame = () => {
      if (video.paused || video.ended) {
        mediaRecorder.stop();
        return;
      }

      // Draw video frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Draw tracking boxes and IDs
      detectedPlayers.forEach(player => {
        if (player.class === 'player') {
          // Draw box
          ctx.strokeStyle = '#3B82F6';
          ctx.lineWidth = 2;
          ctx.strokeRect(...player.bbox);

          // Draw ID
          ctx.fillStyle = '#3B82F6';
          ctx.font = '16px Arial';
          ctx.fillText(`Player ${player.track_id}`, player.bbox[0], player.bbox[1] - 5);
        }
      });

      requestAnimationFrame(drawFrame);
    };

    drawFrame();
  };

  // Function to start processing
  const startProcessing = () => {
    if (!videoUrl) return;
    setIsProcessing(true);
    setProgress(0);
    processVideo();
  };

  // Function to select player for detailed analysis
  const selectPlayer = (playerId: number) => {
    setSelectedPlayerId(playerId);
    setStep('report');
  };

  // Function to format time
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold mb-2">Football Player Analysis</h2>
            <p className="text-gray-600 mb-4">Track and analyze player movements in football videos</p>
          </div>
        </div>
        
        {/* Step indicator */}
        <div className="flex mb-6">
          <div className={`flex-1 text-center ${step === 'upload' ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center mb-2 ${step === 'upload' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>1</div>
            Upload Video
          </div>
          <div className={`flex-1 text-center ${step === 'detectPlayers' ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center mb-2 ${step === 'detectPlayers' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>2</div>
            Detect Players
          </div>
          <div className={`flex-1 text-center ${step === 'selectPlayer' ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center mb-2 ${step === 'selectPlayer' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>3</div>
            Select Player
          </div>
          <div className={`flex-1 text-center ${step === 'report' ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center mb-2 ${step === 'report' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>4</div>
            Analysis Report
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {/* STEP 1: Upload Video */}
        {step === 'upload' && (
          <div className="mb-6">
            <VideoUploader 
              sportType="football" 
              onUploadComplete={(url, name) => {
                setVideoUrl(url);
                setFileName(name);
                setStep('detectPlayers');
                startProcessing();
              }}
            />
          </div>
        )}

        {/* STEP 2: Player Detection and Tracking */}
        {step === 'detectPlayers' && videoUrl && (
          <div className="relative">
            <video 
              ref={videoRef}
              src={videoUrl}
              className="w-full"
              controls
              crossOrigin="anonymous"
            />
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 w-full h-full pointer-events-none"
            />
            {isProcessing && (
              <div className="absolute top-2 right-2 bg-blue-600 text-white px-3 py-1 rounded-full text-sm">
                Processing: {Math.round(progress)}%
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Player Selection */}
        {step === 'selectPlayer' && (
          <div className="w-full bg-white p-6 rounded-lg shadow">
            <h3 className="text-xl font-semibold mb-4">Select Player for Detailed Analysis</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.values(playerStats).map((stats) => (
                <div
                  key={stats.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedPlayerId === stats.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                  onClick={() => selectPlayer(stats.id)}
                >
                  <div className="font-semibold">{stats.name}</div>
                  <div className="text-sm text-gray-600">
                    Distance: {Math.round(stats.distance)}m
                  </div>
                  <div className="text-sm text-gray-600">
                    Max Speed: {stats.maxSpeed.toFixed(1)} m/s
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 4: Analysis Report */}
        {step === 'report' && selectedPlayerId && (
          <div>
            {/* Player Stats Summary */}
            <div className="mb-6 bg-white p-6 rounded-lg shadow">
              <h3 className="text-xl font-semibold mb-4">Player Performance Report</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <span className="text-gray-600 text-sm">Total Distance</span>
                  <p className="text-2xl font-bold">{Math.round(playerStats[selectedPlayerId].distance)}m</p>
                </div>
                <div>
                  <span className="text-gray-600 text-sm">Max Speed</span>
                  <p className="text-2xl font-bold">{playerStats[selectedPlayerId].maxSpeed.toFixed(1)} m/s</p>
                </div>
                <div>
                  <span className="text-gray-600 text-sm">Average Speed</span>
                  <p className="text-2xl font-bold">{playerStats[selectedPlayerId].avgSpeed.toFixed(1)} m/s</p>
                </div>
                <div>
                  <span className="text-gray-600 text-sm">Events Detected</span>
                  <p className="text-2xl font-bold">{playerStats[selectedPlayerId].events.length}</p>
                </div>
              </div>
            </div>

            {/* Movement Events Timeline */}
            <div className="mb-6 bg-white p-6 rounded-lg shadow">
              <h3 className="text-xl font-semibold mb-4">Movement Events</h3>
              <div className="space-y-4">
                {playerStats[selectedPlayerId].events.map((event, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className="text-gray-600">{formatTime(event.timestamp)}</div>
                    <div className={`px-2 py-1 rounded text-sm ${
                      event.type === 'sprint' ? 'bg-green-100 text-green-800' :
                      event.type === 'stop' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {event.type}
                    </div>
                    <div className="text-gray-600">{event.details}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Processed Video with Tracking */}
            {processedVideoUrl && (
              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-4">Processed Video with Tracking</h3>
                <video
                  src={processedVideoUrl}
                  className="w-full"
                  controls
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 