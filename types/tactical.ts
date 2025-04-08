export interface Player {
  id: number;
  number: number;
  role: string;
  x: number;
  y: number;
  isSelected: boolean;
}

export interface Formation {
  name: string;
  players: Player[];
}

export interface TacticalScenario {
  id: number;
  name: string;
  formation: string;
  players: Player[];
  timestamp: string;
} 