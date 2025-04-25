export type ReadingMode = 'standard' | 'enhance' | 'remove';

export interface GazePoint {
  x: number;
  y: number;
  timestamp: number;
}

export interface ReadingMetrics {
  wpm: number;
  fixationDuration: number;
  saccadeLength: number;
  regressions: number;
}

export interface FocusSettings {
  focusRadius: number;
  blurIntensity: number;
  opacityLevel: number;
}

export interface ReadingSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  mode: ReadingMode;
  metrics: ReadingMetrics;
  gazePoints: GazePoint[];
} 