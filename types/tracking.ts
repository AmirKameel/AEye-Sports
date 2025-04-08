// Define types for tracking functionality

export interface TrackingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  avgColor?: {
    r: number;
    g: number;
    b: number;
  };
}

export interface Coordinates {
  x: number;
  y: number;
  width: number;
  height: number;
  timestamp: number;
}

export interface AnalysisResult {
  movement: string;
  direction: string;
  speed: number;
  acceleration: number;
  maxSpeed: number;
  distance: number;
  eventType?: 'sprint' | 'stop' | 'change_direction' | 'steady' | 'start';
  feedback: string;
  timestamp: number;
} 