'use client';

import { useState } from 'react';
import { TennisAnalysisResult } from '@/lib/tennis-tracker';

interface TennisAnalysisReportProps {
  result: TennisAnalysisResult;
}

export default function TennisAnalysisReport({ result }: TennisAnalysisReportProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'player' | 'shots' | 'timeline'>('overview');
  
  const { playerStats, shotStats, courtCoverage, videoMetadata } = result;
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6">Tennis Analysis Report</h2>
      
      {/* Tabs */}
      <div className="flex border-b mb-6">
        <button
          className={`px-4 py-2 font-medium ${activeTab === 'overview' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`px-4 py-2 font-medium ${activeTab === 'player' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('player')}
        >
          Player Stats
        </button>
        <button
          className={`px-4 py-2 font-medium ${activeTab === 'shots' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('shots')}
        >
          Shot Analysis
        </button>
        <button
          className={`px-4 py-2 font-medium ${activeTab === 'timeline' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('timeline')}
        >
          Timeline
        </button>
      </div>
      
      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatCard 
              title="Player Speed" 
              value={`${playerStats.averageSpeed.toFixed(1)} km/h`}
              subValue={`Max: ${playerStats.maxSpeed.toFixed(1)} km/h`}
              icon="⚡"
            />
            <StatCard 
              title="Distance Covered" 
              value={`${playerStats.totalDistanceCovered.toFixed(1)} m`}
              subValue={`Court Coverage: ${courtCoverage.toFixed(1)}%`}
              icon="🏃"
            />
            <StatCard 
              title="Shots Hit" 
              value={`${playerStats.shotsHit}`}
              subValue={`Avg Ball Speed: ${shotStats.averageBallSpeed.toFixed(1)} km/h`}
              icon="🎾"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Shot Distribution</h3>
              <div className="h-64">
                <ShotDistributionChart shotStats={shotStats} />
              </div>
            </div>
            
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Player Position Heatmap</h3>
              <div className="h-64">
                <PositionHeatmap heatmap={playerStats.positionHeatmap} />
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Player Stats Tab */}
      {activeTab === 'player' && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Player Speed</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-gray-600">Average Speed</p>
                  <p className="text-2xl font-bold">{playerStats.averageSpeed.toFixed(1)} km/h</p>
                </div>
                <div>
                  <p className="text-gray-600">Maximum Speed</p>
                  <p className="text-2xl font-bold">{playerStats.maxSpeed.toFixed(1)} km/h</p>
                </div>
                <div className="h-40">
                  <SpeedChart frames={result.frames} />
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Movement Analysis</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-gray-600">Total Distance</p>
                  <p className="text-2xl font-bold">{playerStats.totalDistanceCovered.toFixed(1)} m</p>
                </div>
                <div>
                  <p className="text-gray-600">Court Coverage</p>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                    <div 
                      className="bg-blue-600 h-2.5 rounded-full" 
                      style={{ width: `${courtCoverage}%` }}
                    ></div>
                  </div>
                  <p className="mt-1">{courtCoverage.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-gray-600">Position Heatmap</p>
                  <div className="h-40 mt-2">
                    <PositionHeatmap heatmap={playerStats.positionHeatmap} />
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Performance Insights</h3>
            <div className="space-y-2">
              <p>
                <span className="font-medium">Movement Efficiency:</span> The player covered a total distance of {playerStats.totalDistanceCovered.toFixed(1)} meters
                with an average speed of {playerStats.averageSpeed.toFixed(1)} km/h. The maximum speed reached was {playerStats.maxSpeed.toFixed(1)} km/h.
              </p>
              <p>
                <span className="font-medium">Court Coverage:</span> The player covered {courtCoverage.toFixed(1)}% of the court area during the analyzed period,
                with most time spent in the {getMostFrequentPosition(playerStats.positionHeatmap)} of the court.
              </p>
              <p>
                <span className="font-medium">Recommendations:</span> Based on the movement patterns, the player could improve court coverage by focusing on
                {courtCoverage < 50 ? ' increasing lateral movement and being more proactive in court positioning.' : ' maintaining consistent positioning while optimizing movement efficiency.'}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Shot Analysis Tab */}
      {activeTab === 'shots' && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Shot Statistics</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-gray-600">Total Shots</p>
                  <p className="text-2xl font-bold">{playerStats.shotsHit}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-600">Forehand</p>
                    <p className="text-xl font-bold">{playerStats.forehandCount}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Backhand</p>
                    <p className="text-xl font-bold">{playerStats.backhandCount}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Serve</p>
                    <p className="text-xl font-bold">{playerStats.serveCount}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Volley</p>
                    <p className="text-xl font-bold">{playerStats.volleyCount}</p>
                  </div>
                </div>
                <div className="h-40">
                  <ShotDistributionChart shotStats={shotStats} />
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Ball Speed</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-gray-600">Average Ball Speed</p>
                  <p className="text-2xl font-bold">{shotStats.averageBallSpeed.toFixed(1)} km/h</p>
                </div>
                <div>
                  <p className="text-gray-600">Maximum Ball Speed</p>
                  <p className="text-2xl font-bold">{shotStats.maxBallSpeed.toFixed(1)} km/h</p>
                </div>
                <div className="h-40">
                  <BallSpeedChart frames={result.frames} />
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Shot Analysis Insights</h3>
            <div className="space-y-2">
              <p>
                <span className="font-medium">Shot Distribution:</span> The player hit a total of {playerStats.shotsHit} shots,
                with {playerStats.forehandCount} forehands ({((playerStats.forehandCount / playerStats.shotsHit) * 100).toFixed(1)}%),
                {playerStats.backhandCount} backhands ({((playerStats.backhandCount / playerStats.shotsHit) * 100).toFixed(1)}%),
                {playerStats.serveCount} serves ({((playerStats.serveCount / playerStats.shotsHit) * 100).toFixed(1)}%), and
                {playerStats.volleyCount} volleys ({((playerStats.volleyCount / playerStats.shotsHit) * 100).toFixed(1)}%).
              </p>
              <p>
                <span className="font-medium">Ball Speed:</span> The average ball speed was {shotStats.averageBallSpeed.toFixed(1)} km/h,
                with a maximum of {shotStats.maxBallSpeed.toFixed(1)} km/h.
                {shotStats.maxBallSpeed > 150 ? ' The player demonstrates excellent power on shots.' : 
                 shotStats.maxBallSpeed > 100 ? ' The player shows good power on shots.' : 
                 ' The player could work on generating more power on shots.'}
              </p>
              <p>
                <span className="font-medium">Recommendations:</span> Based on the shot analysis, the player could focus on
                {playerStats.forehandCount > playerStats.backhandCount * 2 ? ' developing a more balanced game by improving backhand shots.' : 
                 playerStats.backhandCount > playerStats.forehandCount * 2 ? ' developing a more balanced game by improving forehand shots.' : 
                 ' maintaining the good balance between forehand and backhand shots while working on shot consistency.'}
                {playerStats.volleyCount < playerStats.shotsHit * 0.1 ? ' Additionally, practicing volleys could add variety to the game.' : ''}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Timeline Tab */}
      {activeTab === 'timeline' && (
        <div>
          <div className="bg-gray-50 p-6 rounded-lg mb-6">
            <h3 className="text-lg font-semibold mb-4">Shot Timeline</h3>
            <div className="h-64">
              <ShotTimeline frames={result.frames} />
            </div>
          </div>
          
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Key Moments</h3>
            <div className="space-y-4">
              {getKeyMoments(result.frames).map((moment, index) => (
                <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                  <p className="text-gray-600 text-sm">{formatTime(moment.timestamp)}</p>
                  <p className="font-medium">{moment.description}</p>
                  {moment.details && <p className="text-gray-700 text-sm">{moment.details}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper Components

function StatCard({ title, value, subValue, icon }: { title: string, value: string, subValue: string, icon: string }) {
  return (
    <div className="bg-gray-50 p-6 rounded-lg">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-gray-600">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          <p className="text-sm text-gray-500 mt-1">{subValue}</p>
        </div>
        <div className="text-3xl">{icon}</div>
      </div>
    </div>
  );
}

function ShotDistributionChart({ shotStats }: { shotStats: TennisAnalysisResult['shotStats'] }) {
  // In a real implementation, you would use a charting library like Chart.js or Recharts
  // For this example, we'll create a simple bar chart
  const shotTypes = Object.entries(shotStats.shotTypes || {});
  const total = shotTypes.reduce((sum, [_, count]) => sum + count, 0);
  
  if (total === 0) {
    return <div className="flex items-center justify-center h-full text-gray-500">No shot data available</div>;
  }
  
  return (
    <div className="flex flex-col h-full justify-end">
      <div className="flex h-full items-end space-x-4">
        {shotTypes.map(([type, count]) => (
          <div key={type} className="flex flex-col items-center flex-1">
            <div 
              className="w-full bg-blue-500 rounded-t"
              style={{ height: `${(count / total) * 100}%` }}
            ></div>
            <p className="text-xs mt-1 capitalize">{type}</p>
            <p className="text-xs font-medium">{count}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function PositionHeatmap({ heatmap }: { heatmap: number[][] }) {
  // Find the maximum value in the heatmap for normalization
  let maxValue = 0;
  heatmap.forEach(row => {
    row.forEach(value => {
      maxValue = Math.max(maxValue, value);
    });
  });
  
  return (
    <div className="grid h-full" style={{ gridTemplateRows: `repeat(${heatmap.length}, 1fr)` }}>
      {heatmap.map((row, rowIndex) => (
        <div 
          key={rowIndex} 
          className="grid w-full h-full" 
          style={{ gridTemplateColumns: `repeat(${row.length}, 1fr)` }}
        >
          {row.map((value, colIndex) => (
            <div 
              key={colIndex} 
              className="w-full h-full border border-gray-100"
              style={{ 
                backgroundColor: `rgba(59, 130, 246, ${value / maxValue})`,
                opacity: value > 0 ? 1 : 0.1
              }}
            ></div>
          ))}
        </div>
      ))}
    </div>
  );
}

function SpeedChart({ frames }: { frames: TennisAnalysisResult['frames'] }) {
  // In a real implementation, you would use a charting library
  // For this example, we'll create a simple line chart
  const speedData = frames
    .filter(frame => frame.playerSpeed !== undefined)
    .map(frame => ({
      timestamp: frame.timestamp,
      speed: frame.playerSpeed || 0
    }));
  
  if (speedData.length === 0) {
    return <div className="flex items-center justify-center h-full text-gray-500">No speed data available</div>;
  }
  
  const maxSpeed = Math.max(...speedData.map(d => d.speed));
  
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 relative">
        <div className="absolute inset-0">
          {speedData.map((data, index) => {
            if (index === 0) return null;
            const prevData = speedData[index - 1];
            const x1 = `${(prevData.timestamp / frames[frames.length - 1].timestamp) * 100}%`;
            const y1 = `${100 - (prevData.speed / maxSpeed) * 100}%`;
            const x2 = `${(data.timestamp / frames[frames.length - 1].timestamp) * 100}%`;
            const y2 = `${100 - (data.speed / maxSpeed) * 100}%`;
            
            return (
              <svg key={index} className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                <line 
                  x1={x1} 
                  y1={y1} 
                  x2={x2} 
                  y2={y2} 
                  stroke="rgb(59, 130, 246)" 
                  strokeWidth="2" 
                />
              </svg>
            );
          })}
        </div>
      </div>
      <div className="h-6 border-t border-gray-300 flex">
        <div className="flex-1 text-xs text-gray-500 text-left">0s</div>
        <div className="flex-1 text-xs text-gray-500 text-right">
          {frames[frames.length - 1].timestamp.toFixed(1)}s
        </div>
      </div>
    </div>
  );
}

function BallSpeedChart({ frames }: { frames: TennisAnalysisResult['frames'] }) {
  // Similar to SpeedChart but for ball speed
  const speedData = frames
    .filter(frame => frame.ballSpeed !== undefined && frame.isShot)
    .map(frame => ({
      timestamp: frame.timestamp,
      speed: frame.ballSpeed || 0
    }));
  
  if (speedData.length === 0) {
    return <div className="flex items-center justify-center h-full text-gray-500">No ball speed data available</div>;
  }
  
  const maxSpeed = Math.max(...speedData.map(d => d.speed));
  
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 relative">
        <div className="absolute inset-0">
          {speedData.map((data, index) => (
            <div 
              key={index}
              className="absolute w-2 h-2 bg-red-500 rounded-full transform -translate-x-1 -translate-y-1"
              style={{ 
                left: `${(data.timestamp / frames[frames.length - 1].timestamp) * 100}%`,
                top: `${100 - (data.speed / maxSpeed) * 100}%`
              }}
            ></div>
          ))}
        </div>
      </div>
      <div className="h-6 border-t border-gray-300 flex">
        <div className="flex-1 text-xs text-gray-500 text-left">0s</div>
        <div className="flex-1 text-xs text-gray-500 text-right">
          {frames[frames.length - 1].timestamp.toFixed(1)}s
        </div>
      </div>
    </div>
  );
}

function ShotTimeline({ frames }: { frames: TennisAnalysisResult['frames'] }) {
  const shots = frames.filter(frame => frame.isShot);
  
  if (shots.length === 0) {
    return <div className="flex items-center justify-center h-full text-gray-500">No shots detected</div>;
  }
  
  const duration = frames[frames.length - 1].timestamp;
  
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 relative">
        {shots.map((shot, index) => (
          <div 
            key={index}
            className="absolute bottom-0 transform -translate-x-1/2"
            style={{ left: `${(shot.timestamp / duration) * 100}%` }}
          >
            <div className="flex flex-col items-center">
              <div className={`w-4 h-4 rounded-full ${getShotTypeColor(shot.shotType)}`}></div>
              <div className="h-16 border-l border-gray-300"></div>
              <div className="text-xs font-medium capitalize">{shot.shotType || 'shot'}</div>
              <div className="text-xs text-gray-500">{formatTime(shot.timestamp)}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="h-6 border-t border-gray-300"></div>
    </div>
  );
}

// Helper Functions

function getMostFrequentPosition(heatmap: number[][]): string {
  let maxValue = 0;
  let maxRow = 0;
  let maxCol = 0;
  
  heatmap.forEach((row, rowIndex) => {
    row.forEach((value, colIndex) => {
      if (value > maxValue) {
        maxValue = value;
        maxRow = rowIndex;
        maxCol = colIndex;
      }
    });
  });
  
  const rowPosition = maxRow < heatmap.length / 3 ? 'back' : 
                      maxRow < (2 * heatmap.length) / 3 ? 'middle' : 'front';
  
  const colPosition = maxCol < heatmap[0].length / 3 ? 'left' : 
                      maxCol < (2 * heatmap[0].length) / 3 ? 'center' : 'right';
  
  return `${rowPosition} ${colPosition}`;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getShotTypeColor(shotType: string | undefined): string {
  switch (shotType) {
    case 'forehand':
      return 'bg-green-500';
    case 'backhand':
      return 'bg-blue-500';
    case 'serve':
      return 'bg-red-500';
    case 'volley':
      return 'bg-purple-500';
    default:
      return 'bg-gray-500';
  }
}

interface KeyMoment {
  timestamp: number;
  description: string;
  details?: string;
}

function getKeyMoments(frames: TennisAnalysisResult['frames']): KeyMoment[] {
  const keyMoments: KeyMoment[] = [];
  
  // Find shots
  frames.forEach((frame, index) => {
    if (frame.isShot) {
      keyMoments.push({
        timestamp: frame.timestamp,
        description: `${frame.shotType?.charAt(0).toUpperCase()}${frame.shotType?.slice(1) || 'Shot'}`,
        details: frame.ballSpeed ? `Ball speed: ${frame.ballSpeed.toFixed(1)} km/h` : undefined
      });
    }
  });
  
  // Find max player speed
  let maxSpeedFrame = frames[0];
  frames.forEach(frame => {
    if ((frame.playerSpeed || 0) > (maxSpeedFrame.playerSpeed || 0)) {
      maxSpeedFrame = frame;
    }
  });
  
  if (maxSpeedFrame.playerSpeed && maxSpeedFrame.playerSpeed > 0) {
    keyMoments.push({
      timestamp: maxSpeedFrame.timestamp,
      description: 'Maximum Speed Reached',
      details: `${maxSpeedFrame.playerSpeed.toFixed(1)} km/h`
    });
  }
  
  // Sort by timestamp
  keyMoments.sort((a, b) => a.timestamp - b.timestamp);
  
  return keyMoments;
} 