import { detectObjectsWithGemini, analyzeTennisMatch } from './gemini';
import { TrackingFrame, FrameData } from './tennis-tracker';

// Constants for advanced tennis analysis
const FRAME_PROCESSING_RATE = 5; // Process every 5th frame for detailed analysis
const GEMINI_ANALYSIS_RATE = 15; // Only do detailed Gemini analysis on every 15th frame (reduced from every 5th)

// Interface for Gemini detection results
interface GeminiObject {
  box_2d: number[];
  label: string;
}

// Define player object with ID
interface Player {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  confidence: number;
}

// Define simpler CourtInfo for advanced tracking to fix type issues
interface CourtInfo {
  width: number;
  height: number;
  baselineY: number;
  netY: number;
  serviceLineY: number;
  lines?: any[];
}

interface AdvancedTrackingFrame extends Omit<TrackingFrame, 'courtInfo' | 'player'> {
  courtInfo: CourtInfo;
  players: Player[];  // Changed from single player to array of players
  geminiAnalysis?: {
    players?: Array<{
      id: string;
      playerPosition?: string;
      ballPosition?: string;
      shotType?: string;
      techniqueFeedback?: string;
      estimatedSpeed?: string;
    }>;
  };
}

// Extended version of TennisAnalysisResult to support multiple players
export interface TennisAnalysisResult {
  playerStats: {
    id?: string;
    averageSpeed: number;
    maxSpeed: number;
    totalDistanceCovered: number;
    positionHeatmap: number[][];
    shotsHit: number;
    forehandCount: number;
    backhandCount: number;
    serveCount: number;
    volleyCount: number;
    shotTypes?: Record<string, number>;
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
  allPlayers?: Array<{
    id: string;
    averageSpeed: number;
    maxSpeed: number;
    totalDistanceCovered: number;
    positionHeatmap: number[][];
    shotsHit: number;
    forehandCount: number;
    backhandCount: number;
    serveCount: number;
    volleyCount: number;
    shotTypes?: Record<string, number>;
  }>;
}

/**
 * Initialize the advanced tennis tracker with selected bounding boxes
 */
export function initializeAdvancedTennisTracker(
  initialBoxes: any[],
  videoWidth: number,
  videoHeight: number
) {
  // Calculate pixels to meters ratio based on court dimensions
  const COURT_WIDTH_METERS = 10.97; // singles court width
  const pixelsToMeters = videoWidth / (COURT_WIDTH_METERS * 2); // assuming court covers half the width
  
  // Extract player boxes and assign IDs
  const playerBoxes = initialBoxes.filter(box => box.label === 'player');
  const players = playerBoxes.map((box, index) => ({
    id: `player${index + 1}`,
    ...box
  }));
  
  // Create initial frame
  const initialFrame: AdvancedTrackingFrame = {
    frameId: 0,
    timestamp: 0,
    players: players.length > 0 ? players : [{
      id: 'player1',
      x: 0,
      y: 0,
      width: videoWidth / 4,
      height: videoHeight / 2,
      centerX: videoWidth / 2,
      centerY: videoHeight / 2,
      confidence: 1.0
    }],
    ball: initialBoxes.find(box => box.label === 'ball') || null,
    courtInfo: {
      width: videoWidth,
      height: videoHeight,
      baselineY: videoHeight * 0.9, // Assumed positions
      netY: videoHeight * 0.5,
      serviceLineY: videoHeight * 0.7
    },
    distancePlayerToBall: 0,
    playerSpeed: 0,
    ballSpeed: 0,
    playerDistanceCovered: 0,
    totalPlayerDistanceCovered: 0,
    isShot: false
  };
  
  return { initialFrame, pixelsToMeters };
}

/**
 * Track objects in a video frame using Gemini model
 */
export async function trackFrameAdvanced(
  imageBase64: string,
  frameId: number,
  timestamp: number,
  previousFrame: AdvancedTrackingFrame,
  pixelsToMeters: number
): Promise<AdvancedTrackingFrame> {
  try {
    console.log(`[Gemini] Frame ${frameId}: Starting object detection`);
    const startTime = performance.now();
    
    // Use Gemini to detect objects
    const detectedObjects = await detectObjectsWithGemini(imageBase64);
    
    const detectionTime = performance.now() - startTime;
    console.log(`[Gemini] Frame ${frameId}: Object detection completed in ${detectionTime.toFixed(0)}ms`);
    console.log(`[Gemini] Frame ${frameId}: Detected ${detectedObjects.length} objects:`, 
      detectedObjects.map(obj => `${obj.label} (${obj.box_2d.join(',')})`));
    
    // Process player detections
    const playerDetections = detectedObjects.filter(obj => 
      obj.label.toLowerCase().includes('player') || 
      obj.label.toLowerCase().includes('person')
    );
    
    // Make sure courtInfo exists
    const courtInfo = previousFrame.courtInfo || {
      width: 1920,
      height: 1080,
      baselineY: 1080 * 0.9,
      netY: 1080 * 0.5,
      serviceLineY: 1080 * 0.7
    };
    
    // Transform player coordinates (Gemini returns normalized 0-1000)
    const players: Player[] = [];
    
    if (playerDetections.length > 0) {
      // Create new players from detections
      playerDetections.forEach((detection, index) => {
        // Try to match with previous players by position
        let playerId = `player${index + 1}`;
        
        // If we have previous players, try to match by position
        if (previousFrame.players && previousFrame.players.length > 0) {
          const centerX = ((detection.box_2d[1] + detection.box_2d[3]) / 2000) * courtInfo.width;
          const centerY = ((detection.box_2d[0] + detection.box_2d[2]) / 2000) * courtInfo.height;
          
          // Find closest previous player
          let closestDistance = Infinity;
          let closestPlayerId = '';
          
          previousFrame.players.forEach(prevPlayer => {
            const distance = Math.sqrt(
              Math.pow(prevPlayer.centerX - centerX, 2) + 
              Math.pow(prevPlayer.centerY - centerY, 2)
            );
            
            if (distance < closestDistance) {
              closestDistance = distance;
              closestPlayerId = prevPlayer.id;
            }
          });
          
          // If close enough, use the previous player's ID
          if (closestDistance < 200) { // Threshold for matching
            playerId = closestPlayerId;
          }
        }
        
        // Extract label to see if it contains an ID
        if (detection.label.includes('player') && detection.label.length > 6) {
          const detectedId = detection.label.toLowerCase();
          if (detectedId.includes('player1') || detectedId.includes('player2')) {
            playerId = detectedId.includes('player1') ? 'player1' : 'player2';
          }
        }
        
        players.push({
          id: playerId,
          x: (detection.box_2d[1] / 1000) * courtInfo.width,
          y: (detection.box_2d[0] / 1000) * courtInfo.height,
          width: ((detection.box_2d[3] - detection.box_2d[1]) / 1000) * courtInfo.width,
          height: ((detection.box_2d[2] - detection.box_2d[0]) / 1000) * courtInfo.height,
          centerX: ((detection.box_2d[1] + detection.box_2d[3]) / 2000) * courtInfo.width,
          centerY: ((detection.box_2d[0] + detection.box_2d[2]) / 2000) * courtInfo.height,
          confidence: 0.95 // Gemini doesn't provide confidence, using high default
        });
      });
      
      console.log(`[Gemini] Frame ${frameId}: Detected ${players.length} players`);
    } else if (previousFrame.players) {
      // No players detected, use previous frame data
      players.push(...previousFrame.players);
      console.log(`[Gemini] Frame ${frameId}: No players detected, using previous frame data`);
    } else {
      // Default player if no previous data
      players.push({
        id: 'player1',
        x: 0,
        y: 0,
        width: courtInfo.width / 4,
        height: courtInfo.height / 2,
        centerX: courtInfo.width / 2,
        centerY: courtInfo.height / 2,
        confidence: 0.5
      });
      console.log(`[Gemini] Frame ${frameId}: Using default player data`);
    }
    
    // Process ball detection
    const ballDetection = detectedObjects.find(obj => 
      obj.label.toLowerCase().includes('ball') || 
      obj.label.toLowerCase().includes('tennis ball')
    );
    
    // Transform ball coordinates
    const ball = ballDetection ? {
      x: (ballDetection.box_2d[1] / 1000) * courtInfo.width,
      y: (ballDetection.box_2d[0] / 1000) * courtInfo.height,
      width: ((ballDetection.box_2d[3] - ballDetection.box_2d[1]) / 1000) * courtInfo.width,
      height: ((ballDetection.box_2d[2] - ballDetection.box_2d[0]) / 1000) * courtInfo.height,
      centerX: ((ballDetection.box_2d[1] + ballDetection.box_2d[3]) / 2000) * courtInfo.width,
      centerY: ((ballDetection.box_2d[0] + ballDetection.box_2d[2]) / 2000) * courtInfo.height,
      confidence: 0.9 // Gemini doesn't provide confidence, using high default
    } : previousFrame.ball;
    
    if (ball) {
      console.log(`[Gemini] Frame ${frameId}: Ball detected at (${ball.centerX.toFixed(1)}, ${ball.centerY.toFixed(1)})`);
    } else {
      console.log(`[Gemini] Frame ${frameId}: No ball detected, using previous frame data`);
    }
    
    // Calculate distance between primary player and ball
    const distancePlayerToBall = (players[0] && ball) ? 
      Math.sqrt(
        Math.pow(players[0].centerX - ball.centerX, 2) + 
        Math.pow(players[0].centerY - ball.centerY, 2)
      ) : previousFrame.distancePlayerToBall || 0;
    
    // Calculate primary player speed for backwards compatibility
    const primaryPlayerSpeed = calculatePlayersSpeed(
      players,
      previousFrame.players || [],
      timestamp - previousFrame.timestamp,
      pixelsToMeters
    )[0]?.speed || 0;
    
    // Convert primary player speed to km/h
    const primaryPlayerSpeedKmh = primaryPlayerSpeed * 3.6; // Convert m/s to km/h
    
    const ballSpeed = ball && previousFrame.ball ? 
      calculateSpeed(
        ball.centerX, 
        ball.centerY, 
        previousFrame.ball.centerX, 
        previousFrame.ball.centerY,
        timestamp - previousFrame.timestamp,
        pixelsToMeters
      ) * 3.6 : 0; // Convert to km/h
    
    // Calculate player distance covered for primary player (for backwards compatibility)
    const playerDistanceCovered = (players[0] && previousFrame.players && previousFrame.players[0]) ? 
      calculateDistance(
        players[0].centerX, 
        players[0].centerY, 
        previousFrame.players[0].centerX, 
        previousFrame.players[0].centerY,
        pixelsToMeters
      ) : 0;
    
    const totalPlayerDistanceCovered = 
      (previousFrame.totalPlayerDistanceCovered || 0) + playerDistanceCovered;
    
    // For key frames, perform detailed Gemini analysis
    let geminiAnalysis = undefined;
    
    if (frameId % GEMINI_ANALYSIS_RATE === 0) {
      try {
        console.log(`[Gemini] Frame ${frameId}: Performing detailed technique analysis`);
        const analysisStartTime = performance.now();
        
        const analysisResult = await analyzeTennisMatch(imageBase64);
        
        const analysisTime = performance.now() - analysisStartTime;
        console.log(`[Gemini] Frame ${frameId}: Technique analysis completed in ${analysisTime.toFixed(0)}ms`);
        
        try {
          geminiAnalysis = JSON.parse(analysisResult);
          console.log(`[Gemini] Frame ${frameId}: Analysis result:`, geminiAnalysis);
        } catch (e) {
          console.error(`[Gemini] Frame ${frameId}: Failed to parse analysis:`, analysisResult);
        }
      } catch (e) {
        console.error(`[Gemini] Frame ${frameId}: Failed to get analysis:`, e);
      }
    } else if (previousFrame.geminiAnalysis) {
      // Reuse analysis from previous frame if not doing new analysis
      geminiAnalysis = previousFrame.geminiAnalysis;
      console.log(`[Gemini] Frame ${frameId}: Reusing previous frame analysis`);
    }
    
    // Detect shot type using Gemini analysis if available
    let isShot = false;
    let shotType = undefined;
    
    if (geminiAnalysis?.players && geminiAnalysis.players.length > 0 && geminiAnalysis.players[0]?.shotType) {
      shotType = geminiAnalysis.players[0].shotType;
      isShot = shotType !== 'none' && shotType !== 'positioning';
      console.log(`[Gemini] Frame ${frameId}: Shot detected from analysis: ${shotType}`);
    } else {
      // Fallback shot detection logic
      isShot = !!(ball && previousFrame.ball && ballSpeed > 36); // 36 km/h threshold
      
      if (isShot && distancePlayerToBall < 100) {
        shotType = 'detected shot';
        console.log(`[Gemini] Frame ${frameId}: Shot detected from speed/distance`);
      }
    }
    
    const frameResult: AdvancedTrackingFrame = {
      frameId,
      timestamp,
      players,
      ball,
      courtInfo,
      distancePlayerToBall,
      isShot,
      shotType,
      playerSpeed: primaryPlayerSpeedKmh, // Now in km/h
      ballSpeed, // Now in km/h
      playerDistanceCovered,
      totalPlayerDistanceCovered,
      geminiAnalysis
    };
    
    console.log(`[Gemini] Frame ${frameId}: Processing completed`);
    
    return frameResult;
  } catch (error) {
    console.error(`[Gemini] Frame ${frameId}: Error in advanced tracking:`, error);
    // Return previous frame data if error occurs
    return {
      ...previousFrame,
      frameId,
      timestamp
    };
  }
}

/**
 * Calculate speeds for all players in km/h
 */
function calculatePlayersSpeed(
  currentPlayers: Player[],
  previousPlayers: Player[],
  timeDiff: number,
  pixelsToMeters: number
): Array<{id: string, speed: number}> {
  const speeds: Array<{id: string, speed: number}> = [];
  
  currentPlayers.forEach(player => {
    // Find matching previous player
    const prevPlayer = previousPlayers.find(p => p.id === player.id);
    
    if (prevPlayer) {
      const speed = calculateSpeed(
        player.centerX,
        player.centerY,
        prevPlayer.centerX,
        prevPlayer.centerY,
        timeDiff,
        pixelsToMeters
      );
      
      speeds.push({
        id: player.id,
        speed: speed
      });
    } else {
      speeds.push({
        id: player.id,
        speed: 0
      });
    }
  });
  
  return speeds;
}

/**
 * Calculate speed in meters per second
 */
function calculateSpeed(
  x1: number, 
  y1: number, 
  x2: number, 
  y2: number, 
  timeDiff: number,
  pixelsToMeters: number
): number {
  const distance = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  return (distance * pixelsToMeters) / timeDiff;
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
  const distance = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  return distance * pixelsToMeters;
}

/**
 * Generate final analysis result from all frames
 */
export function generateAdvancedAnalysisResult(
  frames: AdvancedTrackingFrame[],
  videoMetadata: any,
  pixelsToMeters: number
): TennisAnalysisResult {
  // Extract unique player IDs from all frames
  const playerIds = new Set<string>();
  frames.forEach(frame => {
    if (frame.players) {
      frame.players.forEach(player => playerIds.add(player.id));
    }
  });
  
  // Calculate stats for each player
  const playerStatsMap: Record<string, any> = {};
  
  playerIds.forEach(playerId => {
    // Get frames with this player
    const playerFrames = frames.filter(frame => 
      frame.players && frame.players.some(p => p.id === playerId)
    );
    
    if (playerFrames.length === 0) return;
    
    // Extract player from each frame
    const playerPositions = playerFrames.map(frame => {
      const player = frame.players.find(p => p.id === playerId);
      return player ? { x: player.centerX, y: player.centerY } : null;
    }).filter(Boolean) as Array<{x: number, y: number}>;
    
    // Calculate player's speeds
    const playerSpeeds: number[] = [];
    for (let i = 1; i < playerFrames.length; i++) {
      const prevFrame = playerFrames[i-1];
      const currFrame = playerFrames[i];
      
      const prevPlayer = prevFrame.players.find(p => p.id === playerId);
      const currPlayer = currFrame.players.find(p => p.id === playerId);
      
      if (prevPlayer && currPlayer) {
        const speed = calculateSpeed(
          currPlayer.centerX,
          currPlayer.centerY,
          prevPlayer.centerX,
          prevPlayer.centerY,
          currFrame.timestamp - prevFrame.timestamp,
          pixelsToMeters
        ) * 3.6; // Convert to km/h
        
        playerSpeeds.push(speed);
      }
    }
    
    // Calculate player distances
    let totalDistance = 0;
    for (let i = 1; i < playerFrames.length; i++) {
      const prevFrame = playerFrames[i-1];
      const currFrame = playerFrames[i];
      
      const prevPlayer = prevFrame.players.find(p => p.id === playerId);
      const currPlayer = currFrame.players.find(p => p.id === playerId);
      
      if (prevPlayer && currPlayer) {
        const distance = calculateDistance(
          currPlayer.centerX,
          currPlayer.centerY,
          prevPlayer.centerX,
          prevPlayer.centerY,
          pixelsToMeters
        );
        
        totalDistance += distance;
      }
    }
    
    // Count shots by type for this player
    const playerShots = playerFrames.filter(frame => {
      // If this is the primary player (first in the list), use the isShot flag
      // (for backwards compatibility)
      const isPrimary = frame.players[0]?.id === playerId;
      if (isPrimary && frame.isShot) return true;
      
      // Otherwise, check if there's a shot type in the Gemini analysis for this player
      if (frame.geminiAnalysis?.players) {
        const playerAnalysis = frame.geminiAnalysis.players.find(p => p.id === playerId);
        return playerAnalysis?.shotType && 
               playerAnalysis.shotType !== 'none' && 
               playerAnalysis.shotType !== 'positioning';
      }
      
      return false;
    });
    
    // Categorize shots
    const shotTypes: Record<string, number> = {};
    playerShots.forEach(frame => {
      let shotType = 'unknown';
      
      // Try to get shot type from Gemini analysis for this player
      if (frame.geminiAnalysis?.players) {
        const playerAnalysis = frame.geminiAnalysis.players.find(p => p.id === playerId);
        if (playerAnalysis?.shotType) {
          shotType = playerAnalysis.shotType.toLowerCase();
        }
      } else if (frame.players[0]?.id === playerId && frame.shotType) {
        // Fallback to frame's shotType if this is the primary player
        shotType = frame.shotType.toLowerCase();
      }
      
      shotTypes[shotType] = (shotTypes[shotType] || 0) + 1;
    });
    
    // Create heatmap for this player
    const heatmap = createHeatmap(playerPositions, videoMetadata.width, videoMetadata.height);
    
    // Store stats for this player
    playerStatsMap[playerId] = {
      id: playerId,
      averageSpeed: playerSpeeds.length > 0 
        ? playerSpeeds.reduce((sum, speed) => sum + speed, 0) / playerSpeeds.length 
        : 0,
      maxSpeed: playerSpeeds.length > 0 ? Math.max(...playerSpeeds) : 0,
      totalDistanceCovered: totalDistance,
      positionHeatmap: heatmap,
      shotsHit: playerShots.length,
      forehandCount: shotTypes['forehand'] || 0,
      backhandCount: shotTypes['backhand'] || 0,
      serveCount: shotTypes['serve'] || 0,
      volleyCount: shotTypes['volley'] || 0,
      shotTypes
    };
  });
  
  // Get stats for the primary player (first player, for backward compatibility)
  // If no players with stats, create a default player
  const primaryPlayerId = Array.from(playerIds)[0] || 'player1';
  const primaryPlayerStats = playerStatsMap[primaryPlayerId] || {
    id: primaryPlayerId,
    averageSpeed: 0,
    maxSpeed: 0,
    totalDistanceCovered: 0,
    positionHeatmap: Array(10).fill(0).map(() => Array(10).fill(0)),
    shotsHit: 0,
    forehandCount: 0,
    backhandCount: 0,
    serveCount: 0,
    volleyCount: 0
  };
  
  // Calculate ball statistics
  const ballSpeeds = frames
    .filter(frame => frame.ballSpeed !== undefined)
    .map(frame => frame.ballSpeed || 0);
  
  const avgBallSpeed = ballSpeeds.length > 0 
    ? ballSpeeds.reduce((sum, speed) => sum + speed, 0) / ballSpeeds.length 
    : 0;
  
  const maxBallSpeed = ballSpeeds.length > 0 
    ? Math.max(...ballSpeeds) 
    : 0;
  
  // Generate ball position heatmap
  const ballPositions = frames
    .filter(frame => frame.ball)
    .map(frame => ({ 
      x: frame.ball!.centerX, 
      y: frame.ball!.centerY 
    }));
  
  const ballHeatmap = createHeatmap(ballPositions, videoMetadata.width, videoMetadata.height);
  
  // Create FrameData array with support for multiple players
  const frameData: FrameData[] = frames.map(frame => ({
    timestamp: frame.timestamp,
    playerSpeed: frame.playerSpeed,
    ballSpeed: frame.ballSpeed,
    isShot: frame.isShot,
    shotType: frame.shotType,
    playerPosition: frame.players && frame.players.length > 0 ? {
      x: frame.players[0].centerX,
      y: frame.players[0].centerY
    } : undefined,
    ballPosition: frame.ball ? {
      x: frame.ball.centerX,
      y: frame.ball.centerY
    } : undefined,
    // Add array of all players
    players: frame.players ? frame.players.map(player => ({
      id: player.id,
      position: {
        x: player.centerX,
        y: player.centerY
      }
    })) : []
  }));
  
  // Create full result with player stats
  return {
    playerStats: primaryPlayerStats,
    shotStats: {
      averageBallSpeed: avgBallSpeed,
      maxBallSpeed: maxBallSpeed,
      shotTypes: Object.entries(playerStatsMap).reduce((acc, [id, stats]) => {
        Object.entries(stats.shotTypes || {}).forEach(([type, count]) => {
          acc[type] = (acc[type] || 0) + (count as number);
        });
        return acc;
      }, {} as Record<string, number>)
    },
    courtCoverage: 75, // Estimated coverage (percentage of court)
    videoMetadata: {
      duration: videoMetadata.duration,
      width: videoMetadata.width,
      height: videoMetadata.height
    },
    frames: frameData,
    // Add all players' stats
    allPlayers: Object.values(playerStatsMap)
  };
}

/**
 * Create a heatmap from position data
 */
function createHeatmap(
  positions: Array<{x: number, y: number}>,
  width: number,
  height: number
): number[][] {
  // Create 10x10 grid
  const grid: number[][] = Array(10).fill(0).map(() => Array(10).fill(0));
  
  positions.forEach(pos => {
    // Convert position to grid cell
    const gridX = Math.min(Math.floor(pos.x / width * 10), 9);
    const gridY = Math.min(Math.floor(pos.y / height * 10), 9);
    
    // Increment count in cell
    grid[gridY][gridX]++;
  });
  
  return grid;
} 