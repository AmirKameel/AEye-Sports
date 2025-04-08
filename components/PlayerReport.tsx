import React from 'react';

interface PlayerStats {
  distance: number;
  maxSpeed: number;
  averageSpeed: number;
  events: string[];
}

interface AnalysisReport {
  playerName: string;
  stats: PlayerStats;
  timestamp: string;
}

interface PlayerReportProps {
  playerName: string;
  stats: PlayerStats;
  reports: AnalysisReport[];
}

export const PlayerReport: React.FC<PlayerReportProps> = ({ playerName, stats, reports }) => {
  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold mb-4">Player Analysis Report</h2>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-semibold mb-4">{playerName}</h3>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 p-4 rounded">
            <h4 className="font-medium text-gray-600">Total Distance</h4>
            <p className="text-2xl font-bold">{stats.distance.toFixed(2)} meters</p>
          </div>
          <div className="bg-gray-50 p-4 rounded">
            <h4 className="font-medium text-gray-600">Max Speed</h4>
            <p className="text-2xl font-bold">{stats.maxSpeed.toFixed(2)} km/h</p>
          </div>
          <div className="bg-gray-50 p-4 rounded">
            <h4 className="font-medium text-gray-600">Average Speed</h4>
            <p className="text-2xl font-bold">{stats.averageSpeed.toFixed(2)} km/h</p>
          </div>
          <div className="bg-gray-50 p-4 rounded">
            <h4 className="font-medium text-gray-600">Events Detected</h4>
            <p className="text-2xl font-bold">{stats.events.length}</p>
          </div>
        </div>

        <div className="mt-6">
          <h4 className="text-lg font-semibold mb-2">Movement Events</h4>
          <ul className="space-y-2">
            {stats.events.map((event, index) => (
              <li key={index} className="flex items-center text-gray-700">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                {event}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6">
          <h4 className="text-lg font-semibold mb-2">Analysis History</h4>
          <div className="space-y-4">
            {reports.map((report, index) => (
              <div key={index} className="border-l-4 border-blue-500 pl-4">
                <p className="text-sm text-gray-500">
                  {new Date(report.timestamp).toLocaleString()}
                </p>
                <p className="text-gray-700">
                  Distance: {report.stats.distance.toFixed(2)}m | 
                  Max Speed: {report.stats.maxSpeed.toFixed(2)}km/h | 
                  Events: {report.stats.events.length}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}; 