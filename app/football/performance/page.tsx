'use client';

import React, { useState } from 'react';
import Link from 'next/link';

interface PlayerStats {
  id: number;
  name: string;
  position: string;
  team: string;
  matches: number;
  goals: number;
  assists: number;
  minutesPlayed: number;
  passAccuracy: number;
  distanceCovered: number;
  sprints: number;
  tackles: number;
  interceptions: number;
  successfulDribbles: number;
  shotsOnTarget: number;
}

const DEMO_PLAYERS: PlayerStats[] = [
  {
    id: 1,
    name: 'Alex Johnson',
    position: 'Forward',
    team: 'Blue City FC',
    matches: 15,
    goals: 12,
    assists: 4,
    minutesPlayed: 1245,
    passAccuracy: 78,
    distanceCovered: 142.5,
    sprints: 186,
    tackles: 12,
    interceptions: 8,
    successfulDribbles: 28,
    shotsOnTarget: 26
  },
  {
    id: 2,
    name: 'Carlos Mendez',
    position: 'Midfielder',
    team: 'Red United',
    matches: 14,
    goals: 3,
    assists: 7,
    minutesPlayed: 1260,
    passAccuracy: 92,
    distanceCovered: 154.2,
    sprints: 142,
    tackles: 36,
    interceptions: 22,
    successfulDribbles: 14,
    shotsOnTarget: 10
  },
  {
    id: 3,
    name: 'Sarah Williams',
    position: 'Defender',
    team: 'Green Rovers',
    matches: 16,
    goals: 1,
    assists: 2,
    minutesPlayed: 1440,
    passAccuracy: 86,
    distanceCovered: 148.6,
    sprints: 102,
    tackles: 64,
    interceptions: 46,
    successfulDribbles: 6,
    shotsOnTarget: 3
  },
  {
    id: 4,
    name: 'Michael Chen',
    position: 'Goalkeeper',
    team: 'Blue City FC',
    matches: 15,
    goals: 0,
    assists: 0,
    minutesPlayed: 1350,
    passAccuracy: 72,
    distanceCovered: 42.1,
    sprints: 24,
    tackles: 0,
    interceptions: 2,
    successfulDribbles: 0,
    shotsOnTarget: 0
  },
  {
    id: 5,
    name: 'Lukas Schmidt',
    position: 'Midfielder',
    team: 'Yellow Dynamo',
    matches: 13,
    goals: 6,
    assists: 8,
    minutesPlayed: 1170,
    passAccuracy: 90,
    distanceCovered: 156.3,
    sprints: 164,
    tackles: 28,
    interceptions: 18,
    successfulDribbles: 32,
    shotsOnTarget: 16
  }
];

export default function PerformancePage() {
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerStats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPosition, setFilterPosition] = useState('');
  const [filterTeam, setFilterTeam] = useState('');

  // Filter players based on search and filters
  const filteredPlayers = DEMO_PLAYERS.filter(player => {
    const matchesSearch = player.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPosition = filterPosition ? player.position === filterPosition : true;
    const matchesTeam = filterTeam ? player.team === filterTeam : true;
    return matchesSearch && matchesPosition && matchesTeam;
  });

  // Get unique positions and teams for filters
  const positions = Array.from(new Set(DEMO_PLAYERS.map(player => player.position)));
  const teams = Array.from(new Set(DEMO_PLAYERS.map(player => player.team)));

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/football" className="text-blue-500 hover:underline flex items-center gap-2">
            <span>←</span> Back to Football
          </Link>
        </div>
        
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Player Performance Metrics</h2>
          <p className="text-gray-600">Track and analyze player statistics</p>
        </div>
        
        {/* Filters and search */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                Search Player
              </label>
              <input
                type="text"
                id="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Player name..."
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-1">
                Position
              </label>
              <select
                id="position"
                value={filterPosition}
                onChange={(e) => setFilterPosition(e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="">All Positions</option>
                {positions.map((position) => (
                  <option key={position} value={position}>{position}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="team" className="block text-sm font-medium text-gray-700 mb-1">
                Team
              </label>
              <select
                id="team"
                value={filterTeam}
                onChange={(e) => setFilterTeam(e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="">All Teams</option>
                {teams.map((team) => (
                  <option key={team} value={team}>{team}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        {/* Player list and details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Player list */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b">
                <h3 className="font-semibold">Players ({filteredPlayers.length})</h3>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {filteredPlayers.length > 0 ? (
                  <ul>
                    {filteredPlayers.map((player) => (
                      <li 
                        key={player.id}
                        className={`p-3 border-b hover:bg-blue-50 cursor-pointer ${
                          selectedPlayer?.id === player.id ? 'bg-blue-100' : ''
                        }`}
                        onClick={() => setSelectedPlayer(player)}
                      >
                        <div className="font-medium">{player.name}</div>
                        <div className="text-sm text-gray-500">
                          {player.position} • {player.team}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="p-4 text-center text-gray-500">
                    No players found matching your criteria
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Player details */}
          <div className="lg:col-span-2">
            {selectedPlayer ? (
              <div className="bg-white rounded-lg shadow">
                <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 rounded-t-lg">
                  <h3 className="text-2xl font-bold">{selectedPlayer.name}</h3>
                  <div className="mt-2 flex flex-wrap gap-3">
                    <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
                      {selectedPlayer.position}
                    </span>
                    <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
                      {selectedPlayer.team}
                    </span>
                    <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
                      {selectedPlayer.matches} Matches
                    </span>
                  </div>
                </div>
                
                <div className="p-6">
                  {/* Key stats */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-blue-50 p-4 rounded-lg text-center">
                      <div className="text-3xl font-bold text-blue-600">{selectedPlayer.goals}</div>
                      <div className="text-sm text-gray-600">Goals</div>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg text-center">
                      <div className="text-3xl font-bold text-blue-600">{selectedPlayer.assists}</div>
                      <div className="text-sm text-gray-600">Assists</div>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg text-center">
                      <div className="text-3xl font-bold text-blue-600">{selectedPlayer.minutesPlayed}</div>
                      <div className="text-sm text-gray-600">Minutes</div>
                    </div>
                  </div>
                  
                  {/* Detailed stats */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold">Performance Stats</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <StatBar 
                        label="Pass Accuracy" 
                        value={selectedPlayer.passAccuracy} 
                        max={100}
                        unit="%"
                        color="bg-green-500"
                      />
                      <StatBar 
                        label="Distance Covered" 
                        value={selectedPlayer.distanceCovered} 
                        max={180}
                        unit="km"
                        color="bg-blue-500"
                      />
                      <StatBar 
                        label="Sprints" 
                        value={selectedPlayer.sprints} 
                        max={200}
                        color="bg-purple-500"
                      />
                      <StatBar 
                        label="Tackles" 
                        value={selectedPlayer.tackles} 
                        max={70}
                        color="bg-yellow-500"
                      />
                      <StatBar 
                        label="Interceptions" 
                        value={selectedPlayer.interceptions} 
                        max={50}
                        color="bg-red-500"
                      />
                      <StatBar 
                        label="Successful Dribbles" 
                        value={selectedPlayer.successfulDribbles} 
                        max={40}
                        color="bg-indigo-500"
                      />
                      <StatBar 
                        label="Shots on Target" 
                        value={selectedPlayer.shotsOnTarget} 
                        max={30}
                        color="bg-orange-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
                <div className="text-5xl mb-4">📊</div>
                <h3 className="text-xl font-medium mb-2">Select a Player</h3>
                <p>Choose a player from the list to view detailed performance metrics</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface StatBarProps {
  label: string;
  value: number;
  max: number;
  unit?: string;
  color: string;
}

function StatBar({ label, value, max, unit = '', color }: StatBarProps) {
  const percentage = Math.min(Math.round((value / max) * 100), 100);
  
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm font-medium text-gray-700">{value}{unit}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div 
          className={`${color} h-2.5 rounded-full`} 
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
} 