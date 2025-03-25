'use client';

import React, { useState, useEffect } from 'react';
import Script from 'next/script';

export default function Home() {
  const [gazePoint, setGazePoint] = useState({ x: 0, y: 0 });
  const [isTracking, setIsTracking] = useState(false);
  const [isCalibrating, setIsCalibrating] = useState(true);
  const [isWebGazerReady, setIsWebGazerReady] = useState(false);

  // Initialize WebGazer
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).webgazer) {
      const webgazer = (window as any).webgazer;
      
      // Set up WebGazer with basic settings
      webgazer.setRegression('ridge')
        .setTracker('TFFacemesh')
        .setGazeListener((data: any) => {
          if (data != null) {
            setGazePoint({ x: data.x, y: data.y });
            setIsTracking(true);
          }
        })
        .begin();

      setIsWebGazerReady(true);
    }
  }, []);

  const startCalibration = async () => {
    if (!isWebGazerReady) return;
    
    const webgazer = (window as any).webgazer;
    
    try {
      // Show video preview
      await webgazer.showVideoPreview();
      
      // Add click listener for calibration points
      document.addEventListener('click', function(e) {
        webgazer.addCalibrationPoint(e.clientX, e.clientY);
      });
      
      setIsCalibrating(false);
    } catch (error) {
      console.error('Error during calibration:', error);
    }
  };

  return (
    <main className="min-h-screen bg-white">
      {/* Load WebGazer.js */}
      <Script
        src="https://webgazer.cs.brown.edu/webgazer.js"
        strategy="beforeInteractive"
      />

      <div className="relative w-full h-screen">
        {isCalibrating && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg text-center">
              <h2 className="text-xl font-bold mb-4">Eye Tracking Setup</h2>
              <p className="mb-4">Please allow camera access and click anywhere on the screen while looking at that point.</p>
              <button 
                onClick={startCalibration}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Start Calibration
              </button>
            </div>
          </div>
        )}

        {/* Gaze point indicator */}
        <div 
          className="absolute w-4 h-4 bg-blue-500 rounded-full transform -translate-x-1/2 -translate-y-1/2"
          style={{
            left: gazePoint.x,
            top: gazePoint.y,
            transition: 'all 0.1s ease-out'
          }}
        />

        {/* Status indicator */}
        <div className="fixed bottom-4 right-4 bg-white p-2 rounded shadow-lg">
          <div className="text-sm">
            Tracking: {isTracking ? 'Active' : 'Inactive'}
          </div>
        </div>
      </div>
    </main>
  );
}
