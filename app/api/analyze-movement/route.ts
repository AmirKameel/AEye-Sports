import { NextResponse } from 'next/server';
import { Coordinates, AnalysisResult } from '@/types/tracking';

interface PlayerProfile {
  name: string;
}

interface AnalyzeRequest {
  coordinates: Coordinates[];
  playerName: string;
}

export async function POST(request: Request) {
  try {
    const data: AnalyzeRequest = await request.json();
    
    // Validate the request
    if (!data.coordinates || !Array.isArray(data.coordinates) || data.coordinates.length < 2) {
      return NextResponse.json({ error: 'Not enough coordinates provided' }, { status: 400 });
    }
    
    // Player name validation
    if (!data.playerName) {
      return NextResponse.json({ error: 'Player name is required' }, { status: 400 });
    }
    
    // Sort coordinates by timestamp
    const sortedCoordinates = [...data.coordinates].sort((a, b) => a.timestamp - b.timestamp);
    
    // Calculate movement metrics
    const movement = calculateMovement(sortedCoordinates);
    
    // Generate feedback based on movement data
    const feedback = generateFeedback(movement, data.playerName);
    
    // Return the analysis data
    return NextResponse.json({
      ...movement,
      feedback,
      movementEvents: movement.events,
    });
  } catch (error) {
    console.error('Error in movement analysis:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function calculateMovement(coordinates: Coordinates[]) {
  // Initialize movement data
  const movementData = {
    direction: 'stationary',
    speed: 0,
    acceleration: 0,
    maxSpeed: 0,
    distance: 0,
    events: [] as {type: 'sprint' | 'stop' | 'change_direction' | 'steady' | 'start', time: number}[]
  };
  
  if (coordinates.length < 2) {
    return movementData;
  }
  
  // Calculate total distance and average speed
  let totalDistance = 0;
  let maxSpeed = 0;
  let prevSpeed = 0;
  let prevDirection = '';
  let lastEventTime = coordinates[0].timestamp;
  
  // Add start event
  movementData.events.push({
    type: 'start',
    time: coordinates[0].timestamp
  });
  
  // For each pair of consecutive coordinates
  for (let i = 1; i < coordinates.length; i++) {
    const prev = coordinates[i-1];
    const curr = coordinates[i];
    
    // Calculate time difference in seconds
    const timeDiff = (curr.timestamp - prev.timestamp) / 1000;
    if (timeDiff <= 0) continue; // Skip invalid time differences
    
    // Calculate displacement (in pixels, can be converted to real-world units)
    const dx = (curr.x + curr.width/2) - (prev.x + prev.width/2);
    const dy = (curr.y + curr.height/2) - (prev.y + prev.height/2);
    
    // Calculate distance using Euclidean distance
    const distance = Math.sqrt(dx*dx + dy*dy);
    totalDistance += distance;
    
    // Calculate speed (pixels per second)
    const speed = distance / timeDiff;
    
    // Update max speed
    if (speed > maxSpeed) {
      maxSpeed = speed;
    }
    
    // Calculate acceleration (change in speed over time)
    const acceleration = (speed - prevSpeed) / timeDiff;
    
    // Determine direction
    let direction = 'stationary';
    if (Math.abs(dx) > Math.abs(dy)) {
      direction = dx > 0 ? 'right' : 'left';
    } else if (Math.abs(dy) > 0) {
      direction = dy > 0 ? 'down' : 'up';
    }
    
    // Detect movement events
    const timeSinceLastEvent = curr.timestamp - lastEventTime;
    
    // Sprint detection (high speed)
    if (speed > 50 && prevSpeed < 40 && timeSinceLastEvent > 500) {
      movementData.events.push({
        type: 'sprint',
        time: curr.timestamp
      });
      lastEventTime = curr.timestamp;
    }
    // Stop detection (low speed after movement)
    else if (speed < 5 && prevSpeed > 20 && timeSinceLastEvent > 500) {
      movementData.events.push({
        type: 'stop',
        time: curr.timestamp
      });
      lastEventTime = curr.timestamp;
    }
    // Direction change
    else if (prevDirection && direction !== prevDirection && direction !== 'stationary' && timeSinceLastEvent > 500) {
      movementData.events.push({
        type: 'change_direction',
        time: curr.timestamp
      });
      lastEventTime = curr.timestamp;
    }
    // Steady movement
    else if (i % 10 === 0 && speed > 10 && Math.abs(acceleration) < 5 && timeSinceLastEvent > 1000) {
      movementData.events.push({
        type: 'steady',
        time: curr.timestamp
      });
      lastEventTime = curr.timestamp;
    }
    
    // Update for next iteration
    prevSpeed = speed;
    prevDirection = direction;
  }
  
  // Calculate final metrics for return
  const lastIndex = coordinates.length - 1;
  const firstCoord = coordinates[0];
  const lastCoord = coordinates[lastIndex];
  
  // Current direction (based on the last two coordinates)
  if (lastIndex > 0) {
    const secondLastCoord = coordinates[lastIndex - 1];
    const dx = (lastCoord.x + lastCoord.width/2) - (secondLastCoord.x + secondLastCoord.width/2);
    const dy = (lastCoord.y + lastCoord.height/2) - (secondLastCoord.y + secondLastCoord.height/2);
    
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 2) { // Threshold to avoid noise
      movementData.direction = dx > 0 ? 'right' : 'left';
    } else if (Math.abs(dy) > 2) {
      movementData.direction = dy > 0 ? 'down' : 'up';
    } else {
      movementData.direction = 'stationary';
    }
  }
  
  // Final speed (average of last 3 points if available)
  const speedCalcStart = Math.max(0, coordinates.length - 3);
  const speedCalcEnd = coordinates.length - 1;
  
  if (speedCalcEnd > speedCalcStart) {
    const startCoord = coordinates[speedCalcStart];
    const endCoord = coordinates[speedCalcEnd];
    const dx = (endCoord.x + endCoord.width/2) - (startCoord.x + startCoord.width/2);
    const dy = (endCoord.y + endCoord.height/2) - (startCoord.y + startCoord.height/2);
    const distance = Math.sqrt(dx*dx + dy*dy);
    const timeDiff = (endCoord.timestamp - startCoord.timestamp) / 1000;
    
    if (timeDiff > 0) {
      movementData.speed = distance / timeDiff;
    }
  }
  
  // Acceleration (calculated from speed change)
  if (coordinates.length > 3) {
    const start = coordinates[coordinates.length - 4];
    const mid = coordinates[coordinates.length - 2];
    const end = coordinates[coordinates.length - 1];
    
    const timeStart = (mid.timestamp - start.timestamp) / 1000;
    const timeEnd = (end.timestamp - mid.timestamp) / 1000;
    
    if (timeStart > 0 && timeEnd > 0) {
      const dxStart = (mid.x + mid.width/2) - (start.x + start.width/2);
      const dyStart = (mid.y + mid.height/2) - (start.y + start.height/2);
      const distStart = Math.sqrt(dxStart*dxStart + dyStart*dyStart);
      const speedStart = distStart / timeStart;
      
      const dxEnd = (end.x + end.width/2) - (mid.x + mid.width/2);
      const dyEnd = (end.y + end.height/2) - (mid.y + mid.height/2);
      const distEnd = Math.sqrt(dxEnd*dxEnd + dyEnd*dyEnd);
      const speedEnd = distEnd / timeEnd;
      
      movementData.acceleration = (speedEnd - speedStart) / ((timeStart + timeEnd) / 2);
    }
  }
  
  // Set final values
  movementData.maxSpeed = maxSpeed;
  movementData.distance = totalDistance;
  
  return movementData;
}

function generateFeedback(movement: any, playerName: string): string {
  const { direction, speed, acceleration, maxSpeed, distance, events } = movement;
  
  let feedback = '';
  
  // Generate feedback based on the current state
  if (speed < 5) {
    feedback = `${playerName} is currently stationary or moving very slowly.`;
  } else if (speed > 40) {
    feedback = `${playerName} is moving at high speed (${speed.toFixed(1)} units/sec).`;
  } else {
    feedback = `${playerName} is moving at moderate speed (${speed.toFixed(1)} units/sec).`;
  }
  
  // Add direction info
  if (direction !== 'stationary') {
    feedback += ` Direction: ${direction}.`;
  }
  
  // Add event-based feedback
  if (events && events.length > 0) {
    const latestEvent = events[events.length - 1];
    const eventTime = new Date(latestEvent.time).toISOString().substr(11, 8);
    
    switch (latestEvent.type) {
      case 'sprint':
        feedback += ` At ${eventTime}, ${playerName} started sprinting.`;
        break;
      case 'stop':
        feedback += ` At ${eventTime}, ${playerName} came to a stop.`;
        break;
      case 'change_direction':
        feedback += ` At ${eventTime}, ${playerName} changed direction.`;
        break;
      case 'steady':
        feedback += ` At ${eventTime}, ${playerName} maintained a steady pace.`;
        break;
      case 'start':
        feedback += ` Tracking started at ${eventTime}.`;
        break;
    }
  }
  
  // Add acceleration feedback
  if (Math.abs(acceleration) > 10) {
    feedback += acceleration > 0 
      ? ` ${playerName} is accelerating.` 
      : ` ${playerName} is decelerating.`;
  }
  
  // Add distance info
  feedback += ` Total tracked distance: ${distance.toFixed(0)} units.`;
  
  return feedback;
} 