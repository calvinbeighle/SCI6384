"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";

interface GazeData {
  x: number;
  y: number;
  confidence?: number;
}

interface EyeTrackerProps {
  onGazeUpdate?: (gazeData: GazeData) => void;
}

interface CalibrationPoint {
  x: number;
  y: number;
  completed: boolean;
}

// Separate component for calibration target to improve click handling
const CalibrationTarget = ({
  x,
  y,
  index,
  total,
  onTargetClick,
}: {
  x: number;
  y: number;
  index: number;
  total: number;
  onTargetClick: () => void;
}) => {
  return (
    <button
      className="fixed w-20 h-20 bg-blue-500 rounded-full transform -translate-x-1/2 -translate-y-1/2 cursor-pointer animate-pulse shadow-lg z-[10000] border-4 border-white focus:outline-none"
      style={{
        left: x,
        top: y,
        boxShadow:
          "0 0 0 4px rgba(59, 130, 246, 0.5), 0 0 0 8px rgba(59, 130, 246, 0.3)",
      }}
      onClick={onTargetClick}
    >
      <span className="text-white font-bold">
        Click ({index}/{total})
      </span>
    </button>
  );
};

const EyeTracker: React.FC<EyeTrackerProps> = ({ onGazeUpdate }) => {
  const [gazePoint, setGazePoint] = useState<GazeData>({ x: 0, y: 0 });
  const [isTracking, setIsTracking] = useState(false);
  const [isCalibrating, setIsCalibrating] = useState(true);
  const [isWebGazerReady, setIsWebGazerReady] = useState(false);
  const [calibrationPoints, setCalibrationPoints] = useState<number>(0);
  const [showVideo, setShowVideo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const minCalibrationPoints = 10; // Minimum number of calibration points required
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [videoVisible, setVideoVisible] = useState(false);

  // Guided calibration state
  const [guidedCalibration, setGuidedCalibration] = useState(true);
  const [currentCalibrationPoint, setCurrentCalibrationPoint] = useState(0);
  const [calibrationComplete, setCalibrationComplete] = useState(false);
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 1920,
    height: typeof window !== "undefined" ? window.innerHeight : 1080,
  });

  // Update window size on resize and component mount
  useEffect(() => {
    // Only run in browser environment
    if (typeof window === "undefined") return;

    // Set initial window size
    setWindowSize({
      width: window.innerWidth,
      height: window.innerHeight,
    });

    // Handle resize
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    // Add event listener
    window.addEventListener("resize", handleResize);

    // Remove event listener on cleanup
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Define fixed calibration points based on current window size
  const fixedCalibrationPoints = useMemo(
    () => [
      {
        x: windowSize.width * 0.1,
        y: windowSize.height * 0.1,
        completed: false,
      },
      {
        x: windowSize.width * 0.5,
        y: windowSize.height * 0.1,
        completed: false,
      },
      {
        x: windowSize.width * 0.9,
        y: windowSize.height * 0.1,
        completed: false,
      },
      {
        x: windowSize.width * 0.1,
        y: windowSize.height * 0.5,
        completed: false,
      },
      {
        x: windowSize.width * 0.5,
        y: windowSize.height * 0.5,
        completed: false,
      },
      {
        x: windowSize.width * 0.9,
        y: windowSize.height * 0.5,
        completed: false,
      },
      {
        x: windowSize.width * 0.1,
        y: windowSize.height * 0.9,
        completed: false,
      },
      {
        x: windowSize.width * 0.5,
        y: windowSize.height * 0.9,
        completed: false,
      },
      {
        x: windowSize.width * 0.9,
        y: windowSize.height * 0.9,
        completed: false,
      },
      {
        x: windowSize.width * 0.5,
        y: windowSize.height * 0.5,
        completed: false,
      }, // Center point again to finish
    ],
    [windowSize.width, windowSize.height]
  );

  // Initialize camera stream
  useEffect(() => {
    if (showVideo && !mediaStream) {
      const setupCamera = async () => {
        try {
          // Request camera with specific constraints for better performance
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 640 },
              height: { ideal: 480 },
              facingMode: "user",
            },
          });

          setMediaStream(stream);
          setPermissionGranted(true);

          // Set the stream to our video element
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.onloadedmetadata = () => {
              videoRef.current?.play();
              setVideoVisible(true);

              // Important: Set WebGazer to use our video element directly
              if ((window as any).webgazer) {
                console.log("Setting WebGazer to use our video element");
                try {
                  (window as any).webgazer.setVideoElement(videoRef.current);
                } catch (err) {
                  console.error("Error setting video element:", err);
                }
              }
            };
          }
        } catch (err) {
          console.error("Error accessing camera:", err);
          alert(
            "Camera access is required for eye tracking. Please allow camera access and reload the page."
          );
        }
      };

      setupCamera();
    }

    // Cleanup function - but don't stop the stream if we're tracking
    return () => {
      if (mediaStream && isCalibrating) {
        mediaStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [showVideo, mediaStream, isCalibrating]);

  // Initialize WebGazer
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Wait for WebGazer to be loaded
    const checkWebGazerLoaded = setInterval(() => {
      if ((window as any).webgazer) {
        clearInterval(checkWebGazerLoaded);
        const webgazer = (window as any).webgazer;

        // Set up WebGazer with optimal settings for eye tracking
        webgazer
          .setRegression("ridge") // Use ridge regression for better accuracy
          .setTracker("TFFacemesh") // Use TensorFlow Facemesh for face tracking
          .setGazeListener((data: GazeData | null) => {
            if (data && data.x && data.y) {
              // Debug info
              console.log(`Gaze data: x=${data.x}, y=${data.y}`);

              // Update local state
              setGazePoint(data);
              setIsTracking(true);

              // Notify parent component if callback provided
              if (onGazeUpdate) {
                onGazeUpdate(data);
              }
            } else {
              console.log("Invalid gaze data received");
            }
          })
          .saveDataAcrossSessions(true) // Save calibration data across sessions
          .begin();

        // Configure WebGazer UI elements - Important: order matters!
        webgazer.showVideo(false); // We handle video display ourselves
        webgazer.showFaceOverlay(false); // No need for the face overlay
        webgazer.showFaceFeedbackBox(false); // No need for the face feedback box

        // IMPORTANT: Always call showPredictionPoints last to ensure it's visible
        webgazer.showPredictionPoints(true);

        // Set WebGazer to use our video element
        if (videoRef.current) {
          console.log("Setting WebGazer to use our video element");
          try {
            webgazer.setVideoElement(videoRef.current);
          } catch (err) {
            console.error("Error setting video element:", err);
          }
        }

        console.log("WebGazer initialized successfully");
        setIsWebGazerReady(true);
      }
    }, 500);

    return () => {
      clearInterval(checkWebGazerLoaded);

      // Clean up WebGazer when component unmounts
      if ((window as any).webgazer) {
        try {
          (window as any).webgazer.pause();
          (window as any).webgazer.end(); // Completely stop WebGazer

          // Clean up WebGazer video elements if they exist
          [
            "webgazerVideoContainer",
            "webgazerVideoFeed",
            "webgazerFaceOverlay",
            "webgazerFaceFeedbackBox",
          ].forEach((id) => {
            const element = document.getElementById(id);
            if (element && element.parentNode) {
              element.parentNode.removeChild(element);
            }
          });
        } catch (err) {
          console.error("Error cleaning up WebGazer:", err);
        }
      }
    };
  }, [onGazeUpdate]);

  // Function to add a calibration point at the given coordinates
  const addCalibrationPoint = (x: number, y: number) => {
    if (!isWebGazerReady) return;

    try {
      const webgazer = (window as any).webgazer;
      console.log(`Adding calibration point at: (${x}, ${y})`);

      // Add the calibration point to WebGazer - using the correct method
      webgazer.recordScreenPosition(x, y, "click");

      // Update our local state
      setCalibrationPoints((prev) => prev + 1);

      // If in guided mode, move to next point
      if (guidedCalibration) {
        setCurrentCalibrationPoint((prev) => {
          // If we've reached the end, mark as complete
          if (prev + 1 >= fixedCalibrationPoints.length) {
            setCalibrationComplete(true);
          }
          return Math.min(prev + 1, fixedCalibrationPoints.length - 1);
        });
      }
    } catch (error) {
      console.error("Error adding calibration point:", error);
    }
  };

  // Start calibration process
  const startCalibration = () => {
    if (!isWebGazerReady) {
      alert("WebGazer is not ready. Please wait a moment and try again.");
      return;
    }

    // Start showing our custom video
    setShowVideo(true);

    // Reset calibration points counter
    setCalibrationPoints(0);
    setCurrentCalibrationPoint(0);
    setCalibrationComplete(false);

    console.log(
      `Calibration started. Mode: ${guidedCalibration ? "Guided" : "Manual"}`
    );
  };

  // Handle click on calibration target
  const handleTargetClick = () => {
    if (
      !isWebGazerReady ||
      currentCalibrationPoint >= fixedCalibrationPoints.length
    )
      return;

    const point = fixedCalibrationPoints[currentCalibrationPoint];
    addCalibrationPoint(point.x, point.y);
  };

  // Handle manual calibration clicks (anywhere on screen)
  const handleManualCalibrationClick = (e: React.MouseEvent) => {
    if (!isWebGazerReady || guidedCalibration) return;

    addCalibrationPoint(e.clientX, e.clientY);
  };

  // Complete calibration and start tracking
  const completeCalibration = () => {
    if (calibrationPoints < minCalibrationPoints) {
      alert(
        `Please complete at least ${minCalibrationPoints} calibration points`
      );
      return;
    }

    // Apply the calibration
    try {
      const webgazer = (window as any).webgazer;

      // Make sure our video is still the one being used
      if (videoRef.current) {
        webgazer.setVideoElement(videoRef.current);
      }

      // Make sure tracking is active
      webgazer.pause(); // Pause briefly
      setTimeout(() => {
        // Resume after a short delay to ensure state is refreshed
        webgazer.resume();

        // Ensure prediction points are visible - call this AFTER resume
        webgazer.showPredictionPoints(true);

        // Create prediction point if it doesn't exist
        if (!document.getElementById("webgazerGazeDot")) {
          const gazeDot = document.createElement("div");
          gazeDot.id = "webgazerGazeDot";
          gazeDot.style.position = "fixed";
          gazeDot.style.zIndex = "999999";
          gazeDot.style.width = "20px";
          gazeDot.style.height = "20px";
          gazeDot.style.borderRadius = "100%";
          gazeDot.style.border = "2px solid white";
          gazeDot.style.background = "rgba(0, 0, 255, 0.6)";
          gazeDot.style.boxShadow = "0 0 10px rgba(0, 0, 255, 0.6)";
          gazeDot.style.transform = "translate3d(-50%, -50%, 0)";
          gazeDot.style.pointerEvents = "none";
          document.body.appendChild(gazeDot);
        }

        console.log("WebGazer calibration applied, tracking active");
      }, 300);
    } catch (error) {
      console.error("Error applying calibration:", error);
    }

    setIsCalibrating(false);

    // Hide the video but DON'T stop the camera stream
    setShowVideo(false);
    setVideoVisible(false);

    console.log("Calibration completed successfully, tracking started");
  };

  // Reset calibration
  const resetCalibration = () => {
    if (!isWebGazerReady) return;

    // Clear WebGazer data
    const webgazer = (window as any).webgazer;
    webgazer.clearData();

    // Reset state
    setCalibrationPoints(0);
    setCurrentCalibrationPoint(0);
    setCalibrationComplete(false);
    setIsCalibrating(true);

    // If we don't have a media stream running, restart it
    if (!mediaStream) {
      setShowVideo(true);
    } else {
      // Otherwise just make it visible
      setVideoVisible(true);
      setShowVideo(true);
    }

    console.log("Calibration reset");
  };

  // Toggle between guided and manual calibration
  const toggleCalibrationMode = () => {
    setGuidedCalibration(!guidedCalibration);
  };

  // Current calibration target point to display
  const currentPoint =
    guidedCalibration && currentCalibrationPoint < fixedCalibrationPoints.length
      ? fixedCalibrationPoints[currentCalibrationPoint]
      : null;

  return (
    <div
      className="eye-tracker"
      onClick={
        !guidedCalibration && showVideo
          ? handleManualCalibrationClick
          : undefined
      }
    >
      {/* Force WebGazer prediction point to stay in viewport */}
      <style jsx global>{`
        #webgazerGazeDot {
          position: fixed !important;
          z-index: 999999 !important;
          width: 20px !important;
          height: 20px !important;
          border-radius: 100% !important;
          border: 2px solid white !important;
          background: rgba(0, 0, 255, 0.6) !important;
          box-shadow: 0 0 10px rgba(0, 0, 255, 0.6) !important;
          transform: translate3d(-50%, -50%, 0) !important;
          pointer-events: none !important;
        }
      `}</style>

      {isCalibrating ? (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg text-center max-w-lg">
            <h2 className="text-xl font-bold mb-4">Eye Tracking Calibration</h2>

            {!showVideo ? (
              <>
                <p className="mb-4">
                  Please allow camera access. You will need to calibrate your
                  eye movements by looking at specific points on the screen and
                  clicking on them.
                </p>
                <div className="flex space-x-2 justify-center mb-4">
                  <button
                    onClick={toggleCalibrationMode}
                    className="bg-gray-200 text-gray-800 px-3 py-1 text-sm rounded hover:bg-gray-300"
                  >
                    {guidedCalibration
                      ? "Switch to Manual Mode"
                      : "Switch to Guided Mode"}
                  </button>
                </div>
                <button
                  onClick={startCalibration}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mb-4"
                  disabled={!isWebGazerReady}
                >
                  {!isWebGazerReady
                    ? "Loading WebGazer..."
                    : "Start Calibration"}
                </button>
              </>
            ) : (
              <>
                <div
                  ref={videoContainerRef}
                  className="webcam-container mb-4 mx-auto relative"
                  style={{
                    width: "320px",
                    height: "240px",
                    overflow: "hidden",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                  }}
                >
                  {/* Our custom video element - directly accessing the webcam */}
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: videoVisible ? "block" : "none",
                    }}
                  />

                  {/* Loading indicator shown until video is ready */}
                  {!videoVisible && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                      <p className="text-gray-500">Loading camera feed...</p>
                    </div>
                  )}
                </div>

                {guidedCalibration ? (
                  <p className="mb-2 font-bold text-blue-600">
                    Look at the blue circle and click on it. Point{" "}
                    {currentCalibrationPoint + 1} of{" "}
                    {fixedCalibrationPoints.length}
                  </p>
                ) : (
                  <p className="mb-2">
                    Look at your cursor and click at different points on the
                    screen. Try to cover all areas of the screen for better
                    accuracy.
                  </p>
                )}

                <p className="text-sm mb-4">
                  Calibration points: {calibrationPoints}/{minCalibrationPoints}
                </p>

                <div className="flex justify-center space-x-4">
                  <button
                    onClick={completeCalibration}
                    disabled={calibrationPoints < minCalibrationPoints}
                    className={`px-4 py-2 rounded ${
                      calibrationPoints >= minCalibrationPoints
                        ? "bg-green-500 hover:bg-green-600 text-white"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    Complete Calibration
                  </button>

                  <button
                    onClick={resetCalibration}
                    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                  >
                    Reset
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Hidden video element - keeps running for eye tracking */}
          <div
            style={{
              position: "absolute",
              width: 1,
              height: 1,
              overflow: "hidden",
              opacity: 0,
              pointerEvents: "none",
            }}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ width: "100%", height: "100%" }}
            />
          </div>

          {/* Gaze point indicator */}
          <div
            className="absolute w-4 h-4 bg-blue-500 rounded-full transform -translate-x-1/2 -translate-y-1/2 opacity-50 pointer-events-none"
            style={{
              left: gazePoint.x,
              top: gazePoint.y,
              transition: "all 0.1s ease-out",
            }}
          />

          {/* Status and controls */}
          <div className="fixed bottom-4 right-4 bg-white p-3 rounded shadow-lg">
            <div className="text-sm mb-2">
              <span className="font-bold">Status:</span>{" "}
              {isTracking ? "Tracking Active" : "Inactive"}
            </div>
            <div className="text-sm mb-2">
              <span className="font-bold">Position:</span> X:
              {Math.round(gazePoint.x)}, Y:{Math.round(gazePoint.y)}
            </div>
            <button
              onClick={resetCalibration}
              className="bg-blue-500 text-white px-2 py-1 text-xs rounded hover:bg-blue-600"
            >
              Recalibrate
            </button>
          </div>
        </>
      )}

      {/* Calibration target point - only shown in guided mode during calibration */}
      {isCalibrating && showVideo && guidedCalibration && currentPoint && (
        <CalibrationTarget
          x={currentPoint.x}
          y={currentPoint.y}
          index={currentCalibrationPoint + 1}
          total={fixedCalibrationPoints.length}
          onTargetClick={handleTargetClick}
        />
      )}
    </div>
  );
};

export default EyeTracker;
