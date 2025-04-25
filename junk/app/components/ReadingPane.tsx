'use client';

import React, { useState, useEffect } from 'react';
import { ReadingMode, FocusSettings } from '../types';
import Script from 'next/script';

interface ReadingPaneProps {
  content: string;
  mode: ReadingMode;
  settings: FocusSettings;
}

export default function ReadingPane({ content, mode, settings }: ReadingPaneProps) {
  const [gazePoint, setGazePoint] = useState({ x: 0, y: 0 });
  const [isCalibrating, setIsCalibrating] = useState(true);
  const [processedContent, setProcessedContent] = useState(content);
  const [isWebGazerReady, setIsWebGazerReady] = useState(false);
  const [isTracking, setIsTracking] = useState(false);

  // Initialize WebGazer
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).webgazer) {
      const webgazer = (window as any).webgazer;
      
      // Set up WebGazer
      webgazer.setRegression('ridge')
        .setTracker('TFFacemesh')
        .setGazeListener((data: any, timestamp: number) => {
          if (data != null) {
            setGazePoint({ x: data.x, y: data.y });
          }
        })
        .begin();

      setIsWebGazerReady(true);
    }
  }, []);

  // Process content based on mode
  useEffect(() => {
    let processed = content;
    
    switch (mode) {
      case 'enhance':
        processed = processed.replace(/\[\d+\]/g, '<span class="text-gray-500">$&</span>');
        break;
      case 'remove':
        processed = processed.replace(/\[\d+\]/g, '<span class="opacity-0 hover:opacity-100 transition-opacity duration-200">$&</span>');
        break;
      default:
        processed = content;
    }
    
    setProcessedContent(processed);
  }, [content, mode]);

  const getFocusStyle = () => {
    if (mode === 'standard') return {};
    
    const { focusRadius, blurIntensity, opacityLevel } = settings;
    const baseStyle = {
      background: `radial-gradient(circle ${focusRadius}px at ${gazePoint.x}px ${gazePoint.y}px, 
        rgba(255, 255, 255, 1) 0%, 
        rgba(255, 255, 255, ${opacityLevel}) 50%, 
        rgba(255, 255, 255, 0) 100%)`,
      backdropFilter: `blur(${blurIntensity}px)`,
    };

    switch (mode) {
      case 'enhance':
        return {
          ...baseStyle,
          background: `radial-gradient(circle ${focusRadius}px at ${gazePoint.x}px ${gazePoint.y}px, 
            rgba(255, 255, 255, 1) 0%, 
            rgba(255, 255, 255, ${opacityLevel}) 50%, 
            rgba(255, 255, 255, 0.3) 100%)`,
        };
      case 'remove':
        return {
          ...baseStyle,
          background: `radial-gradient(circle ${focusRadius}px at ${gazePoint.x}px ${gazePoint.y}px, 
            rgba(255, 255, 255, 1) 0%, 
            rgba(255, 255, 255, ${opacityLevel}) 50%, 
            rgba(255, 255, 255, 0) 100%)`,
          backdropFilter: `blur(${blurIntensity * 1.5}px)`,
        };
      default:
        return baseStyle;
    }
  };

  const startCalibration = async () => {
    if (!isWebGazerReady) return;
    
    const webgazer = (window as any).webgazer;
    await webgazer.showVideoPreview();
    setIsTracking(true);
    setIsCalibrating(false);
  };

  return (
    <div className="relative w-full h-screen bg-white">
      {/* Load WebGazer.js */}
      <Script
        src="https://webgazer.cs.brown.edu/webgazer.js"
        strategy="beforeInteractive"
      />

      {isCalibrating && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg">
            <h2 className="text-xl font-bold mb-4">Eye Tracking Setup</h2>
            <p className="mb-4">Please allow camera access and follow the calibration points on screen.</p>
            <button 
              onClick={startCalibration}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Start Calibration
            </button>
          </div>
        </div>
      )}
      
      <div 
        className="absolute inset-0 transition-all duration-200"
        style={getFocusStyle()}
      >
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div 
            className="prose prose-lg"
            dangerouslySetInnerHTML={{ __html: processedContent }}
          />
        </div>
      </div>

      {isTracking && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className="bg-white p-2 rounded shadow-lg">
            <div className="text-sm text-gray-600">
              Tracking: {isTracking ? 'Active' : 'Inactive'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 