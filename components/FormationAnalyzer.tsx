'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Player, Formation, TacticalScenario } from '@/types/tactical';

interface FormationTemplate {
  name: string;
  positions: { x: number; y: number; role: string }[];
}

const FORMATION_TEMPLATES: FormationTemplate[] = [
  {
    name: '4-4-2',
    positions: [
      { x: 50, y: 90, role: 'GK' },
      { x: 20, y: 70, role: 'LB' },
      { x: 40, y: 70, role: 'CB' },
      { x: 60, y: 70, role: 'CB' },
      { x: 80, y: 70, role: 'RB' },
      { x: 20, y: 50, role: 'LM' },
      { x: 40, y: 50, role: 'CM' },
      { x: 60, y: 50, role: 'CM' },
      { x: 80, y: 50, role: 'RM' },
      { x: 40, y: 30, role: 'ST' },
      { x: 60, y: 30, role: 'ST' }
    ]
  },
  {
    name: '4-3-3',
    positions: [
      { x: 50, y: 90, role: 'GK' },
      { x: 20, y: 70, role: 'LB' },
      { x: 40, y: 70, role: 'CB' },
      { x: 60, y: 70, role: 'CB' },
      { x: 80, y: 70, role: 'RB' },
      { x: 30, y: 50, role: 'CM' },
      { x: 50, y: 50, role: 'CM' },
      { x: 70, y: 50, role: 'CM' },
      { x: 20, y: 30, role: 'LW' },
      { x: 50, y: 30, role: 'ST' },
      { x: 80, y: 30, role: 'RW' }
    ]
  },
  {
    name: '3-5-2',
    positions: [
      { x: 50, y: 90, role: 'GK' },
      { x: 30, y: 70, role: 'CB' },
      { x: 50, y: 70, role: 'CB' },
      { x: 70, y: 70, role: 'CB' },
      { x: 20, y: 50, role: 'LWB' },
      { x: 40, y: 50, role: 'CM' },
      { x: 50, y: 50, role: 'CM' },
      { x: 60, y: 50, role: 'CM' },
      { x: 80, y: 50, role: 'RWB' },
      { x: 40, y: 30, role: 'ST' },
      { x: 60, y: 30, role: 'ST' }
    ]
  }
];

export default function FormationAnalyzer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Existing state for selected formation, players, etc.
  const [selectedFormation, setSelectedFormation] = useState<FormationTemplate | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [scenarios, setScenarios] = useState<TacticalScenario[]>([]);
  const [currentScenario, setCurrentScenario] = useState<TacticalScenario | null>(null);
  const [showZones, setShowZones] = useState(false);
  // New states for custom formation mode
  const [customFormationMode, setCustomFormationMode] = useState(false);
  const [customFormationName, setCustomFormationName] = useState('');

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = 800;
    canvas.height = 600;

    // Draw initial pitch
    drawPitch(ctx);
  }, []);

  // Draw football pitch
  const drawPitch = (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = '#2ecc71';
    ctx.fillRect(0, 0, 800, 600);
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(400, 300, 50, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(400, 0);
    ctx.lineTo(400, 600);
    ctx.stroke();
    ctx.strokeRect(50, 200, 100, 200);
    ctx.strokeRect(650, 200, 100, 200);
    ctx.strokeRect(50, 250, 50, 100);
    ctx.strokeRect(700, 250, 50, 100);
  };

  // Draw players and zones as before...
  const drawPlayers = (ctx: CanvasRenderingContext2D) => {
    players.forEach(player => {
      ctx.beginPath();
      ctx.arc(player.x, player.y, 15, 0, Math.PI * 2);
      ctx.fillStyle = player.isSelected ? '#e74c3c' : '#3498db';
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.stroke();
      ctx.fillStyle = 'white';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(player.number.toString(), player.x, player.y);
    });
  };

  const drawZones = (ctx: CanvasRenderingContext2D) => {
    if (!showZones) return;
    ctx.fillStyle = 'rgba(231, 76, 60, 0.2)';
    ctx.fillRect(0, 300, 800, 300);
    ctx.fillStyle = 'rgba(241, 196, 15, 0.2)';
    ctx.fillRect(0, 200, 800, 200);
    ctx.fillStyle = 'rgba(46, 204, 113, 0.2)';
    ctx.fillRect(0, 0, 800, 200);
  };

  // Modified: Handle canvas click. In custom mode, if no player is clicked, add a new player.
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    // Check if clicked on an existing player
    const clickedPlayer = players.find(player => {
      const dx = player.x - x;
      const dy = player.y - y;
      return Math.sqrt(dx * dx + dy * dy) < 15;
    });
    
    if (clickedPlayer) {
      setSelectedPlayer(clickedPlayer);
      setIsDragging(true);
    } else if (customFormationMode) {
      // If in custom mode and no player was clicked, add a new player
      const newPlayer = {
        id: players.length + 1,
        number: players.length + 1,
        role: 'N/A',
        x,
        y,
        isSelected: false,
      };
      setPlayers(prev => [...prev, newPlayer]);
      // Redraw canvas with new player
      const ctx = canvas.getContext('2d');
      if (ctx) {
        drawPitch(ctx);
        drawZones(ctx);
        drawPlayers(ctx);
      }
    }
  };

  // The rest of your canvas mouse handlers (handleCanvasMouseMove, handleCanvasMouseUp) remain the same.
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !selectedPlayer) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    setPlayers(prevPlayers =>
      prevPlayers.map(player =>
        player === selectedPlayer ? { ...player, x, y } : player
      )
    );
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawPitch(ctx);
    drawZones(ctx);
    drawPlayers(ctx);
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
    setSelectedPlayer(null);
  };

  // Existing applyFormation remains unchanged
  const applyFormation = (template: FormationTemplate) => {
    setCustomFormationMode(false); // Turn off custom mode when applying a template
    setSelectedFormation(template);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { width, height } = canvas;
    setPlayers(
      template.positions.map((pos, index) => ({
        id: index + 1,
        number: index + 1,
        role: pos.role,
        x: width - ((pos.y / 100) * width),
        y: (pos.x / 100) * height,
        isSelected: false,
      }))
    );
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawPitch(ctx);
    drawZones(ctx);
    drawPlayers(ctx);
  };

  // New function: Begin custom formation mode
  const startCustomFormation = () => {
    setCustomFormationMode(true);
    setSelectedFormation(null);
    setPlayers([]);
    setCustomFormationName('');
    // Optionally, clear the canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        drawPitch(ctx);
        drawZones(ctx);
      }
    }
  };

  // Save current formation as scenario (works for both templates and custom formations)
  const saveScenario = () => {
    const formationName = customFormationMode && customFormationName.trim() !== ''
      ? customFormationName
      : selectedFormation?.name || 'Custom';
    const newScenario: TacticalScenario = {
      id: scenarios.length + 1,
      name: `Scenario ${scenarios.length + 1}`,
      formation: formationName,
      players: [...players],
      timestamp: new Date().toISOString(),
    };
    setScenarios([...scenarios, newScenario]);
  };

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Formation Analyzer</h2>
        <p className="text-gray-600">Design and analyze football formations</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {/* Left sidebar - Formation templates and custom formation creation */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Formation Templates</h3>
          <div className="space-y-2">
            {FORMATION_TEMPLATES.map(template => (
              <button
                key={template.name}
                onClick={() => applyFormation(template)}
                className="w-full p-2 text-left rounded hover:bg-gray-100"
              >
                {template.name}
              </button>
            ))}
            <button
              onClick={startCustomFormation}
              className="w-full p-2 text-left rounded hover:bg-gray-100 border-t pt-2 mt-2"
            >
              Create Custom Formation
            </button>
          </div>
        </div>

        {/* Main canvas area */}
        <div className="col-span-2">
          <div className="bg-white p-4 rounded-lg shadow">
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
              className="w-full border rounded"
            />
            <div className="mt-4 flex justify-between">
              <button
                onClick={() => setShowZones(!showZones)}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                {showZones ? 'Hide Zones' : 'Show Zones'}
              </button>
              <button
                onClick={saveScenario}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Save Scenario
              </button>
            </div>
            {/* If in custom mode, show an input to name the custom formation */}
            {customFormationMode && (
              <div className="mt-4">
                <input
                  type="text"
                  value={customFormationName}
                  onChange={(e) => setCustomFormationName(e.target.value)}
                  placeholder="Name your custom formation"
                  className="w-full p-2 border rounded"
                />
                <p className="text-sm text-gray-500 mt-1">
                  After placing players by clicking on the field, enter a name and click &quot;Save Scenario&quot;.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar - Scenarios */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Saved Scenarios</h3>
          <div className="space-y-2">
            {scenarios.map(scenario => (
              <div
                key={scenario.id}
                className="p-2 rounded hover:bg-gray-100 cursor-pointer"
                onClick={() => {
                  setCurrentScenario(scenario);
                  setPlayers(scenario.players);
                }}
              >
                <div className="font-medium">{scenario.name}</div>
                <div className="text-sm text-gray-500">{scenario.formation}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


