interface Coordinates {
  x: number;
  y: number;
  timestamp: number;
}

interface MovementEvent {
  type: 'sprint' | 'stop' | 'change_direction' | 'steady';
  timestamp: number;
  details: string;
}

interface MovementStats {
  distance: number;
  maxSpeed: number;
  avgSpeed: number;
  events: MovementEvent[];
}

export class MovementAnalyzer {
  private static readonly SPRINT_THRESHOLD = 5; // m/s
  private static readonly STOP_THRESHOLD = 0.5; // m/s
  private static readonly DIRECTION_CHANGE_THRESHOLD = 45; // degrees
  private static readonly PIXELS_PER_METER = 100; // Approximate conversion factor

  static calculateStats(coordinates: Coordinates[]): MovementStats {
    const stats: MovementStats = {
      distance: 0,
      maxSpeed: 0,
      avgSpeed: 0,
      events: []
    };

    if (coordinates.length < 2) return stats;

    let totalSpeed = 0;
    let prevDirection = 0;

    for (let i = 1; i < coordinates.length; i++) {
      const prev = coordinates[i - 1];
      const curr = coordinates[i];
      
      // Calculate distance in meters
      const dx = (curr.x - prev.x) / this.PIXELS_PER_METER;
      const dy = (curr.y - prev.y) / this.PIXELS_PER_METER;
      const distance = Math.sqrt(dx * dx + dy * dy);
      stats.distance += distance;

      // Calculate speed in m/s
      const timeDiff = (curr.timestamp - prev.timestamp) / 1000; // Convert to seconds
      const speed = distance / timeDiff;
      stats.maxSpeed = Math.max(stats.maxSpeed, speed);
      totalSpeed += speed;

      // Calculate direction change
      const direction = Math.atan2(dy, dx) * 180 / Math.PI;
      const directionChange = Math.abs(direction - prevDirection);
      prevDirection = direction;

      // Detect events
      if (speed > this.SPRINT_THRESHOLD) {
        stats.events.push({
          type: 'sprint',
          timestamp: curr.timestamp,
          details: `Sprint detected at ${speed.toFixed(1)} m/s`
        });
      } else if (speed < this.STOP_THRESHOLD) {
        stats.events.push({
          type: 'stop',
          timestamp: curr.timestamp,
          details: `Stop detected (${speed.toFixed(1)} m/s)`
        });
      } else if (directionChange > this.DIRECTION_CHANGE_THRESHOLD) {
        stats.events.push({
          type: 'change_direction',
          timestamp: curr.timestamp,
          details: `Direction change of ${Math.round(directionChange)}°`
        });
      } else {
        stats.events.push({
          type: 'steady',
          timestamp: curr.timestamp,
          details: `Steady movement at ${speed.toFixed(1)} m/s`
        });
      }
    }

    // Calculate average speed
    stats.avgSpeed = totalSpeed / (coordinates.length - 1);

    return stats;
  }

  static generateReport(stats: MovementStats): string {
    const report = [
      'Movement Analysis Report',
      '=====================',
      '',
      `Total Distance Covered: ${stats.distance.toFixed(2)} meters`,
      `Maximum Speed: ${stats.maxSpeed.toFixed(2)} m/s`,
      `Average Speed: ${stats.avgSpeed.toFixed(2)} m/s`,
      '',
      'Events Detected:',
      '---------------'
    ];

    stats.events.forEach(event => {
      report.push(`[${new Date(event.timestamp).toLocaleTimeString()}] ${event.details}`);
    });

    return report.join('\n');
  }
} 