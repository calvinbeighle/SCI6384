'use client';

import React from 'react';
import { ReadingMode, FocusSettings } from '../types';

interface ControlsProps {
  mode: ReadingMode;
  onModeChange: (mode: ReadingMode) => void;
  settings: FocusSettings;
  onSettingsChange: (settings: FocusSettings) => void;
}

export default function Controls({ mode, onModeChange, settings, onSettingsChange }: ControlsProps) {
  const modes: ReadingMode[] = ['standard', 'enhance', 'remove'];

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 space-y-4">
      <div className="space-y-2">
        <h3 className="font-semibold">Reading Mode</h3>
        <div className="flex space-x-2">
          {modes.map((m) => (
            <button
              key={m}
              onClick={() => onModeChange(m)}
              className={`px-3 py-1 rounded ${
                mode === m
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {mode !== 'standard' && (
        <div className="space-y-2">
          <h3 className="font-semibold">Focus Settings</h3>
          <div className="space-y-2">
            <div>
              <label className="block text-sm">Focus Radius (px)</label>
              <input
                type="range"
                min="50"
                max="300"
                value={settings.focusRadius}
                onChange={(e) =>
                  onSettingsChange({
                    ...settings,
                    focusRadius: parseInt(e.target.value),
                  })
                }
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm">Blur Intensity</label>
              <input
                type="range"
                min="0"
                max="10"
                value={settings.blurIntensity}
                onChange={(e) =>
                  onSettingsChange({
                    ...settings,
                    blurIntensity: parseInt(e.target.value),
                  })
                }
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm">Opacity Level</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.opacityLevel}
                onChange={(e) =>
                  onSettingsChange({
                    ...settings,
                    opacityLevel: parseFloat(e.target.value),
                  })
                }
                className="w-full"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 