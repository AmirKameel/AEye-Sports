'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

interface VideoUploaderProps {
  sportType: 'tennis' | 'football';
  onUploadComplete: (videoUrl: string) => void;
}

export default function VideoUploader({
  sportType,
  onUploadComplete
}: VideoUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Handle file drop
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    
    // Reset states
    setError(null);
    
    // Check if file is a video
    if (!file.type.startsWith('video/')) {
      setError('Please upload a video file');
      return;
    }
    
    // Check file size (limit to 100MB)
    if (file.size > 100 * 1024 * 1024) {
      setError('File size exceeds 100MB limit');
      return;
    }
    
    // Start upload process
    handleUpload(file);
  }, []);

  // Configure dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.mov', '.avi', '.webm']
    },
    maxFiles: 1,
    multiple: false
  });

  // Handle file upload
  const handleUpload = (file: File) => {
    setUploading(true);
    setUploadProgress(0);
    
    // Create a local URL for the video file
    const videoUrl = URL.createObjectURL(file);
    
    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setUploading(false);
          
          // When upload is complete, call the callback with the video URL
          onUploadComplete(videoUrl);
          
          return 100;
        }
        return prev + 5;
      });
    }, 100);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-4">
        Upload {sportType === 'tennis' ? 'Tennis' : 'Football'} Video
      </h2>
      
      <div 
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
        }`}
      >
        <input {...getInputProps()} />
        
        {uploading ? (
          <div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
              <div 
                className="bg-blue-600 h-2.5 rounded-full" 
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="text-gray-600">Uploading video... {uploadProgress}%</p>
          </div>
        ) : (
          <>
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
              aria-hidden="true"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            
            <p className="mt-2 text-sm text-gray-600">
              Drag and drop your {sportType} video here, or click to browse
            </p>
            
            <p className="mt-1 text-xs text-gray-500">
              MP4, MOV, AVI or WebM up to 100MB
            </p>
          </>
        )}
      </div>
      
      {error && (
        <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}
      
      <div className="mt-6">
        <h3 className="font-semibold mb-2">Tips for best results:</h3>
        {sportType === 'tennis' ? (
          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
            <li>Upload a video with clear visibility of the player and the ball</li>
            <li>Videos taken from the side or behind the baseline work best</li>
            <li>Ensure good lighting conditions for accurate tracking</li>
            <li>Higher resolution videos provide more accurate analysis</li>
          </ul>
        ) : (
          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
            <li>Upload a video with clear visibility of all players and the ball</li>
            <li>Videos taken from an elevated vantage point work best</li>
            <li>Ensure the entire field or relevant section is visible</li>
            <li>Higher resolution videos provide more accurate analysis</li>
          </ul>
        )}
      </div>
    </div>
  );
} 