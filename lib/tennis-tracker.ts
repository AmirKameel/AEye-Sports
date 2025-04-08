import axios from 'axios';

// Define types for tracking
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  label: 'player' | 'ball';
}

export interface TrackingFrame {
  frameId: number;
  timestamp: number;
  player: {
    x: number;
    y: number;
    width: number;
    height: number;
    centerX: number;
    centerY: number;
    confidence: number;
  } | null;
  ball: {
    x: number;
    y: number;
    width: number;
    height: number;
    centerX: number;
    centerY: number;
    confidence: number;
  } | null;
  courtInfo?: {
    width: number;
    height: number;
    baselineY: number;
    netY: number;
    serviceLineY: number;
  };
  distancePlayerToBall?: number;
  isShot?: boolean;
  shotType?: string;
  playerSpeed?: number;
  ballSpeed?: number;
  playerDistanceCovered?: number;
  totalPlayerDistanceCovered?: number;
}

export interface TennisAnalysisResult {
  playerStats: {
    averageSpeed: number;
    maxSpeed: number;
    totalDistanceCovered: number;
    positionHeatmap: number[][];
    shotsHit: number;
    forehandCount: number;
    backhandCount: number;
    serveCount: number;
    volleyCount: number;
  };
  shotStats: {
    averageBallSpeed: number;
    maxBallSpeed: number;
    shotTypes: Record<string, number>;
  };
  courtCoverage: number;
  videoMetadata: {
    duration: number;
    width: number;
    height: number;
  };
  frames: FrameData[];
}

export interface FrameData {
  timestamp: number;
  playerSpeed?: number;
  ballSpeed?: number;
  isShot?: boolean;
  shotType?: 'forehand' | 'backhand' | 'serve' | 'volley' | string;
  playerPosition?: {
    x: number;
    y: number;
  };
  ballPosition?: {
    x: number;
    y: number;
  };
  players?: Array<{
    id: string;
    position: {
      x: number;
      y: number;
    };
  }>;
}

// Constants for tennis analysis
const SHOT_DETECTION_DISTANCE_THRESHOLD = 100; // pixels
const SHOT_DETECTION_SPEED_THRESHOLD = 15; // m/s
const MIN_BALL_CONFIDENCE = 0.4;
const BALL_TRAJECTORY_MEMORY = 10; // Increased for better trajectory analysis
const COURT_WIDTH_METERS = 10.97; // meters (singles court)
const COURT_LENGTH_METERS = 23.77; // meters
const PIXELS_TO_METERS_RATIO = 0.05; // Default ratio, will be calibrated

// Roboflow API for tennis ball detection
const BALL_DETECTION_MODEL = 'tennis-ball-detection-uuvje/1';
const PLAYER_DETECTION_MODEL = 'tennis-vhrs9/9';
const ROBOFLOW_API_KEY = process.env.NEXT_PUBLIC_ROBOFLOW_API_KEY;

interface BallTrajectoryPoint {
  x: number;
  y: number;
  timestamp: number;
  speed: number;
  confidence: number;
}

// Keep track of recent ball positions for trajectory analysis
const recentBallTrajectory: BallTrajectoryPoint[] = [];

/**
 * Initialize a tennis tracker with initial bounding boxes
 */
export function initializeTennisTracker(
  initialBoxes: BoundingBox[],
  videoWidth: number,
  videoHeight: number
): {
  initialFrame: TrackingFrame,
  pixelsToMeters: number
} {
  // Find player and ball boxes
  const playerBox = initialBoxes.find(box => box.label === 'player');
  const ballBox = initialBoxes.find(box => box.label === 'ball');
  
  if (!playerBox || !ballBox) {
    throw new Error('Both player and ball bounding boxes are required');
  }
  
  // Calculate center points
  const playerCenter = {
    x: playerBox.x + playerBox.width / 2,
    y: playerBox.y + playerBox.height / 2
  };
  
  const ballCenter = {
    x: ballBox.x + ballBox.width / 2,
    y: ballBox.y + ballBox.height / 2
  };
  
  // Calculate distance between player and ball
  const distancePlayerToBall = Math.sqrt(
    Math.pow(playerCenter.x - ballCenter.x, 2) + 
    Math.pow(playerCenter.y - ballCenter.y, 2)
  );
  
  // Estimate court dimensions (assuming player is standing on baseline)
  // This is a rough estimate and would be improved with court detection
  const courtInfo = {
    width: videoWidth,
    height: videoHeight,
    baselineY: playerBox.y + playerBox.height, // Assuming player is standing on baseline
    netY: videoHeight / 2,
    serviceLineY: (videoHeight / 2) * 0.7
  };
  
  // Estimate pixels to meters ratio based on court width
  // Assuming the video shows the full width of the court
  const pixelsToMeters = COURT_WIDTH_METERS / videoWidth;
  
  // Create initial tracking frame
  const initialFrame: TrackingFrame = {
    frameId: 0,
    timestamp: 0,
    player: {
      x: playerBox.x,
      y: playerBox.y,
      width: playerBox.width,
      height: playerBox.height,
      centerX: playerCenter.x,
      centerY: playerCenter.y,
      confidence: 1.0
    },
    ball: {
      x: ballBox.x,
      y: ballBox.y,
      width: ballBox.width,
      height: ballBox.height,
      centerX: ballCenter.x,
      centerY: ballCenter.y,
      confidence: 1.0
    },
    courtInfo,
    distancePlayerToBall,
    isShot: false,
    playerSpeed: 0,
    ballSpeed: 0,
    playerDistanceCovered: 0,
    totalPlayerDistanceCovered: 0
  };
  
  return {
    initialFrame,
    pixelsToMeters
  };
}

/**
 * Track objects in a video frame using Roboflow API
 */
export async function trackFrame(
  imageBase64: string,
  frameId: number,
  timestamp: number,
  previousFrame: TrackingFrame,
  pixelsToMeters: number
): Promise<TrackingFrame> {
  try {
    // Remove the data:image/jpeg;base64, prefix
    const base64Data = imageBase64.split('base64,')[1];
    
    // Call both APIs in parallel for efficiency
    const [ballResponse, playerResponse] = await Promise.all([
      // Ball detection API call
      axios({
        method: 'POST',
        url: `https://detect.roboflow.com/${BALL_DETECTION_MODEL}?api_key=${ROBOFLOW_API_KEY}`,
        data: base64Data,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }),
      // Player detection API call
      axios({
        method: 'POST',
        url: `https://detect.roboflow.com/${PLAYER_DETECTION_MODEL}?api_key=${ROBOFLOW_API_KEY}`,
        data: base64Data,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })
    ]);
    
    // Process player detection
    const playerPredictions = playerResponse.data.predictions || [];
    const playerDetection = playerPredictions
      .filter((pred: any) => pred.class === 'player')
      .sort((a: any, b: any) => b.confidence - a.confidence)[0];
    
    const player = playerDetection ? {
      x: playerDetection.x - playerDetection.width / 2,
      y: playerDetection.y - playerDetection.height / 2,
      width: playerDetection.width,
      height: playerDetection.height,
      centerX: playerDetection.x,
      centerY: playerDetection.y,
      confidence: playerDetection.confidence
    } : trackPlayerFromPrevious(previousFrame);

    // Process ball detection with new model
    const ballPredictions = ballResponse.data.predictions || [];
    const ballDetection = ballPredictions
      .filter((pred: any) => pred.class === 'tennis ball' && pred.confidence > MIN_BALL_CONFIDENCE)
      .sort((a: any, b: any) => b.confidence - a.confidence)[0];

    let ball = null;
    if (ballDetection) {
      ball = {
        x: ballDetection.x - ballDetection.width / 2,
        y: ballDetection.y - ballDetection.height / 2,
        width: ballDetection.width,
        height: ballDetection.height,
        centerX: ballDetection.x,
        centerY: ballDetection.y,
        confidence: ballDetection.confidence
      };

      // Calculate ball velocity and add to trajectory
      const ballVelocity = previousFrame.ball ? {
        x: (ball.centerX - previousFrame.ball.centerX) / (timestamp - previousFrame.timestamp),
        y: (ball.centerY - previousFrame.ball.centerY) / (timestamp - previousFrame.timestamp)
      } : { x: 0, y: 0 };

      const ballSpeed = Math.sqrt(ballVelocity.x * ballVelocity.x + ballVelocity.y * ballVelocity.y) * pixelsToMeters;

      recentBallTrajectory.push({
        x: ball.centerX,
        y: ball.centerY,
        timestamp,
        speed: ballSpeed,
        confidence: ball.confidence
      });

      // Keep only recent frames
      if (recentBallTrajectory.length > BALL_TRAJECTORY_MEMORY) {
        recentBallTrajectory.shift();
      }
    } else {
      // If no ball detected, try to predict based on trajectory
      ball = predictBallFromTrajectory(timestamp);
      if (!ball && previousFrame.ball) {
        ball = trackBallFromPrevious(previousFrame);
      }
    }
    
    // Calculate distance between player and ball
    const distancePlayerToBall = player && ball ? 
      Math.sqrt(
        Math.pow(player.centerX - ball.centerX, 2) + 
        Math.pow(player.centerY - ball.centerY, 2)
      ) : null;
    
    // Calculate speeds and distances
    const playerSpeed = player && previousFrame.player ? 
      calculateSpeed(
        player.centerX, 
        player.centerY, 
        previousFrame.player.centerX, 
        previousFrame.player.centerY,
        timestamp - previousFrame.timestamp,
        pixelsToMeters
      ) : 0;
    
    const ballSpeed = ball && previousFrame.ball ? 
      calculateSpeed(
        ball.centerX, 
        ball.centerY, 
        previousFrame.ball.centerX, 
        previousFrame.ball.centerY,
        timestamp - previousFrame.timestamp,
        pixelsToMeters
      ) : 0;
    
    // Calculate player distances
    const playerDistanceCovered = player && previousFrame.player ? 
      calculateDistance(
        player.centerX, 
        player.centerY, 
        previousFrame.player.centerX, 
        previousFrame.player.centerY,
        pixelsToMeters
      ) : 0;
    
    const totalPlayerDistanceCovered = 
      (previousFrame.totalPlayerDistanceCovered || 0) + playerDistanceCovered;
    
    // Enhanced shot detection using ball velocity and trajectory
    const { isShot, shotType } = detectShot(previousFrame, { 
      frameId, 
      timestamp, 
      player, 
      ball,
      distancePlayerToBall: distancePlayerToBall || 0,
      ballSpeed,
      courtInfo: previousFrame.courtInfo
    });
    
    return {
      frameId,
      timestamp,
      player,
      ball,
      courtInfo: previousFrame.courtInfo,
      distancePlayerToBall: distancePlayerToBall || 0,
      isShot,
      shotType,
      playerSpeed,
      ballSpeed,
      playerDistanceCovered,
      totalPlayerDistanceCovered
    };
  } catch (error) {
    console.error('Error tracking frame:', error);
    return {
      frameId,
      timestamp,
      player: trackPlayerFromPrevious(previousFrame),
      ball: trackBallFromPrevious(previousFrame),
      courtInfo: previousFrame.courtInfo,
      distancePlayerToBall: previousFrame.distancePlayerToBall,
      isShot: false,
      playerSpeed: 0,
      ballSpeed: 0,
      playerDistanceCovered: 0,
      totalPlayerDistanceCovered: previousFrame.totalPlayerDistanceCovered || 0
    };
  }
}

/**
 * Track player position based on previous frame when detection fails
 */
function trackPlayerFromPrevious(previousFrame: TrackingFrame) {
  if (!previousFrame.player) return null;
  
  // Simple tracking - maintain previous position
  // In a real implementation, you would use a more sophisticated tracking algorithm
  return { ...previousFrame.player };
}

/**
 * Track ball position based on previous frame when detection fails
 */
function trackBallFromPrevious(previousFrame: TrackingFrame) {
  if (!previousFrame.ball) return null;
  
  // Simple tracking - maintain previous position
  // In a real implementation, you would use a more sophisticated tracking algorithm
  return { ...previousFrame.ball };
}

/**
 * Calculate speed in km/h
 */
function calculateSpeed(
  x1: number, 
  y1: number, 
  x2: number, 
  y2: number, 
  timeDiff: number,
  pixelsToMeters: number
): number {
  // Calculate distance in meters
  const distanceMeters = calculateDistance(x1, y1, x2, y2, pixelsToMeters);
  
  // Calculate speed in m/s
  const speedMps = distanceMeters / timeDiff;
  
  // Convert to km/h
  const speedKmh = speedMps * 3.6;
  
  return speedKmh;
}

/**
 * Calculate distance in meters
 */
function calculateDistance(
  x1: number, 
  y1: number, 
  x2: number, 
  y2: number,
  pixelsToMeters: number
): number {
  // Calculate distance in pixels
  const distancePixels = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  
  // Convert to meters
  const distanceMeters = distancePixels * pixelsToMeters;
  
  return distanceMeters;
}

/**
 * Predict ball position based on recent trajectory with improved accuracy
 */
function predictBallFromTrajectory(currentTimestamp: number): TrackingFrame['ball'] | null {
  if (recentBallTrajectory.length < 3) return null;

  // Get the last three known positions for better prediction
  const lastPoints = recentBallTrajectory.slice(-3);
  const [point1, point2, point3] = lastPoints;

  // Calculate velocities between points
  const velocity1 = {
    x: (point2.x - point1.x) / (point2.timestamp - point1.timestamp),
    y: (point2.y - point1.y) / (point2.timestamp - point1.timestamp)
  };

  const velocity2 = {
    x: (point3.x - point2.x) / (point3.timestamp - point2.timestamp),
    y: (point3.y - point2.y) / (point3.timestamp - point2.timestamp)
  };

  // Calculate acceleration
  const acceleration = {
    x: (velocity2.x - velocity1.x) / ((point3.timestamp - point1.timestamp) / 2),
    y: (velocity2.y - velocity1.y) / ((point3.timestamp - point1.timestamp) / 2)
  };

  // Predict new position using physics equations
  const timeDiff = currentTimestamp - point3.timestamp;
  const predictedX = point3.x + velocity2.x * timeDiff + 0.5 * acceleration.x * timeDiff * timeDiff;
  const predictedY = point3.y + velocity2.y * timeDiff + 0.5 * acceleration.y * timeDiff * timeDiff;

  // Use average of recent ball sizes
  const avgSize = recentBallTrajectory.reduce((sum, point) => sum + 10, 0) / recentBallTrajectory.length;

  return {
    x: predictedX - avgSize / 2,
    y: predictedY - avgSize / 2,
    width: avgSize,
    height: avgSize,
    centerX: predictedX,
    centerY: predictedY,
    confidence: 0.4 // Lower confidence for predicted positions
  };
}

/**
 * Detect if a shot was hit with improved accuracy
 */
function detectShot(
  previousFrame: TrackingFrame, 
  currentFrame: Partial<TrackingFrame> & { ballSpeed: number }
): { isShot: boolean; shotType?: string } {
  if (!previousFrame.player || !previousFrame.ball || !currentFrame.player || !currentFrame.ball) {
    return { isShot: false };
  }

  // Check multiple conditions for shot detection
  const conditions = {
    // Player and ball were close in the previous frame
    proximity: (previousFrame.distancePlayerToBall || Infinity) < SHOT_DETECTION_DISTANCE_THRESHOLD,
    
    // Ball speed increased significantly
    speedIncrease: currentFrame.ballSpeed > SHOT_DETECTION_SPEED_THRESHOLD,
    
    // Ball changed direction
    directionChange: hasChangedDirection(recentBallTrajectory),
    
    // Ball is moving away from player
    movingAway: isMovingAwayFromPlayer(currentFrame.player, currentFrame.ball, previousFrame.ball)
  };

  // Shot is detected if multiple conditions are met
  const isShot = (conditions.proximity && conditions.speedIncrease) || 
                 (conditions.proximity && conditions.directionChange) ||
                 (conditions.speedIncrease && conditions.movingAway);

  if (!isShot) return { isShot: false };

  // Determine shot type with improved accuracy
  const shotType = determineShotType(previousFrame, currentFrame);

  return { isShot, shotType };
}

/**
 * Check if ball has changed direction significantly
 */
function hasChangedDirection(trajectory: BallTrajectoryPoint[]): boolean {
  if (trajectory.length < 3) return false;

  const last = trajectory.slice(-3);
  const [point1, point2, point3] = last;

  // Calculate vectors
  const vector1 = {
    x: point2.x - point1.x,
    y: point2.y - point1.y
  };

  const vector2 = {
    x: point3.x - point2.x,
    y: point3.y - point2.y
  };

  // Calculate angle between vectors
  const angle = Math.atan2(
    vector1.x * vector2.y - vector1.y * vector2.x,
    vector1.x * vector2.x + vector1.y * vector2.y
  );

  // Return true if angle is significant (more than 30 degrees)
  return Math.abs(angle) > Math.PI / 6;
}

/**
 * Check if ball is moving away from player
 */
function isMovingAwayFromPlayer(
  player: TrackingFrame['player'],
  currentBall: TrackingFrame['ball'],
  previousBall: TrackingFrame['ball']
): boolean {
  if (!player || !currentBall || !previousBall) return false;

  const previousDistance = Math.sqrt(
    Math.pow(player.centerX - previousBall.centerX, 2) +
    Math.pow(player.centerY - previousBall.centerY, 2)
  );

  const currentDistance = Math.sqrt(
    Math.pow(player.centerX - currentBall.centerX, 2) +
    Math.pow(player.centerY - currentBall.centerY, 2)
  );

  return currentDistance > previousDistance;
}

/**
 * Determine the type of shot
 */
function determineShotType(previousFrame: TrackingFrame, currentFrame: Partial<TrackingFrame>): string {
  if (!previousFrame.player || !previousFrame.ball || !currentFrame.player || !currentFrame.ball || !previousFrame.courtInfo) {
    return 'unknown';
  }
  
  const { player, ball, courtInfo } = previousFrame;
  
  // Check if player is near the net
  const isNearNet = Math.abs(player.centerY - courtInfo.netY) < 100;
  
  // Check if player is near the baseline
  const isNearBaseline = Math.abs(player.centerY - courtInfo.baselineY) < 100;
  
  // Check if ball is above player (for serve)
  const isBallAbovePlayer = ball.centerY < player.centerY - player.height;
  
  // Check if ball is on the right or left side of the player
  const isBallOnRight = ball.centerX > player.centerX;
  
  // Determine shot type
  if (isNearBaseline && isBallAbovePlayer) {
    return 'serve';
  } else if (isNearNet) {
    return 'volley';
  } else if (isBallOnRight) {
    return 'forehand';
  } else {
    return 'backhand';
  }
}

/**
 * Generate a heatmap of player positions
 */
export function generatePositionHeatmap(frames: TrackingFrame[], gridSize: number = 10): number[][] {
  // Initialize heatmap grid
  const heatmap = Array(gridSize).fill(0).map(() => Array(gridSize).fill(0));
  
  // Count player positions
  frames.forEach(frame => {
    if (frame.player) {
      const { centerX, centerY } = frame.player;
      const { width, height } = frame.courtInfo || { width: 1, height: 1 };
      
      // Calculate grid position
      const gridX = Math.min(gridSize - 1, Math.floor((centerX / width) * gridSize));
      const gridY = Math.min(gridSize - 1, Math.floor((centerY / height) * gridSize));
      
      // Increment count
      heatmap[gridY][gridX]++;
    }
  });
  
  return heatmap;
}

/**
 * Calculate court coverage percentage
 */
export function calculateCourtCoverage(frames: TrackingFrame[], gridSize: number = 10): number {
  const heatmap = generatePositionHeatmap(frames, gridSize);
  
  // Count cells with player presence
  let coveredCells = 0;
  let totalCells = 0;
  
  heatmap.forEach(row => {
    row.forEach(cell => {
      if (cell > 0) coveredCells++;
      totalCells++;
    });
  });
  
  return (coveredCells / totalCells) * 100;
}

/**
 * Generate final analysis result
 */
export function generateAnalysisResult(
  frames: TrackingFrame[],
  videoMetadata: {
    duration: number;
    width: number;
    height: number;
    fps: number;
  },
  pixelsToMeters: number
): TennisAnalysisResult {
  // Calculate player statistics
  let totalPlayerSpeed = 0;
  let maxPlayerSpeed = 0;
  let shotsHit = 0;
  let forehandCount = 0;
  let backhandCount = 0;
  let serveCount = 0;
  let volleyCount = 0;
  
  // Calculate shot statistics
  let totalBallSpeed = 0;
  let maxBallSpeed = 0;
  const shotTypes: {[key: string]: number} = {};
  
  // Process frames
  frames.forEach(frame => {
    // Player stats
    if (frame.playerSpeed) {
      totalPlayerSpeed += frame.playerSpeed;
      maxPlayerSpeed = Math.max(maxPlayerSpeed, frame.playerSpeed);
    }
    
    // Shot stats
    if (frame.isShot) {
      shotsHit++;
      
      if (frame.shotType) {
        shotTypes[frame.shotType] = (shotTypes[frame.shotType] || 0) + 1;
        
        // Count specific shot types
        if (frame.shotType === 'forehand') forehandCount++;
        if (frame.shotType === 'backhand') backhandCount++;
        if (frame.shotType === 'serve') serveCount++;
        if (frame.shotType === 'volley') volleyCount++;
      }
      
      if (frame.ballSpeed) {
        totalBallSpeed += frame.ballSpeed;
        maxBallSpeed = Math.max(maxBallSpeed, frame.ballSpeed);
      }
    }
  });
  
  // Calculate averages
  const averagePlayerSpeed = shotsHit > 0 ? totalPlayerSpeed / frames.length : 0;
  const averageBallSpeed = shotsHit > 0 ? totalBallSpeed / shotsHit : 0;
  
  // Get total distance covered
  const totalDistanceCovered = frames[frames.length - 1]?.totalPlayerDistanceCovered || 0;
  
  // Generate heatmap
  const positionHeatmap = generatePositionHeatmap(frames);
  
  // Calculate court coverage
  const courtCoverage = calculateCourtCoverage(frames);
  
  return {
    playerStats: {
      averageSpeed: averagePlayerSpeed,
      maxSpeed: maxPlayerSpeed,
      totalDistanceCovered,
      shotsHit,
      forehandCount,
      backhandCount,
      serveCount,
      volleyCount,
      positionHeatmap
    },
    shotStats: {
      averageBallSpeed,
      maxBallSpeed,
      shotTypes
    },
    courtCoverage,
    videoMetadata: {
      duration: videoMetadata.duration,
      width: videoMetadata.width,
      height: videoMetadata.height
    },
    frames: generateFramesData(frames) // Convert TrackingFrames to FrameData
  };
}

// Helper function to convert TrackingFrames to FrameData
function generateFramesData(frames: TrackingFrame[]): FrameData[] {
  return frames.map(frame => ({
    timestamp: frame.timestamp,
    playerSpeed: frame.playerSpeed,
    ballSpeed: frame.ballSpeed,
    isShot: frame.isShot,
    shotType: frame.shotType,
    playerPosition: frame.player ? {
      x: frame.player.centerX,
      y: frame.player.centerY
    } : undefined,
    ballPosition: frame.ball ? {
      x: frame.ball.centerX,
      y: frame.ball.centerY
    } : undefined
  }));
} 