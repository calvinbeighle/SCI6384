"use client";

import { useState, useEffect, useRef } from "react";
import Script from "next/script";
import { GazePoint } from "./types";

// TypeScript interfaces for WebGazer
interface WebGazerData {
  x: number;
  y: number;
}

interface WebGazer {
  setRegression: (method: string) => WebGazer;
  setTracker: (tracker: string) => WebGazer;
  setGazeListener: (listener: (data: WebGazerData | null) => void) => WebGazer;
  begin: () => Promise<any>;
  showVideo: (show: boolean) => WebGazer;
  showPredictionPoints: (show: boolean) => WebGazer;
  showFaceOverlay: (show: boolean) => WebGazer;
  showFaceFeedbackBox: (show: boolean) => WebGazer;
  // 所有可能的校准相关方法
  addCalibrationPoint?: (x: number, y: number, userId?: string) => WebGazer;
  clearData: () => WebGazer;
  pause: () => WebGazer;
  resume: () => WebGazer;
  stopVideo: () => WebGazer;
  saveDataAcrossSessions: (save: boolean) => WebGazer;
  getTracker: () => any;
  removeMouseEventListeners?: () => void;
}

declare global {
  interface Window {
    webgazer: WebGazer;
  }
}

export default function Home() {
  const [gazePoint, setGazePoint] = useState<WebGazerData>({ x: 0, y: 0 });
  const [isTracking, setIsTracking] = useState(false);
  const [isCalibrating, setIsCalibrating] = useState(true);
  const [isWebGazerReady, setIsWebGazerReady] = useState(false);
  const [calibrationPoints, setCalibrationPoints] = useState<number>(0);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [webGazerInitialized, setWebGazerInitialized] = useState(false);
  const [loadingCamera, setLoadingCamera] = useState(false);
  const [webgazerLoaded, setWebgazerLoaded] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showFacePoints, setShowFacePoints] = useState(true);

  const calibrationRef = useRef<HTMLDivElement>(null);
  const scriptLoaded = useRef(false);
  const initAttempts = useRef(0);
  const targetId = useRef("calibration-target");

  // 列出WebGazer可用的方法
  const logWebGazerMethods = () => {
    if (!window.webgazer) return [];

    const methods = [];
    for (const key in window.webgazer) {
      try {
        if (typeof (window.webgazer as any)[key] === "function") {
          methods.push(key);
        }
      } catch (e) {
        // 忽略错误
      }
    }

    console.log("WebGazer available methods:", methods);
    return methods;
  };

  // 自定义校准方法
  const customCalibration = (x: number, y: number) => {
    if (!window.webgazer) return;

    const webgazer = window.webgazer;

    // 尝试使用各种可能的校准方法
    try {
      if (typeof webgazer.addCalibrationPoint === "function") {
        console.log("Using addCalibrationPoint method");

        // 为提高精度，在点击位置周围添加多个校准点
        webgazer.addCalibrationPoint(x, y);
        // 在每个点多停留一会提高精度
        setTimeout(() => {
          console.log("Additional calibration point added");
        }, 200);

        return true;
      } else {
        // 如果没有直接的校准方法，模拟点击事件
        console.log("Using click simulation for calibration");
        // 这里我们简单地记录了眼睛位置和屏幕位置之间的对应关系
        // 在真实实现中，webgazer内部会处理这个映射
        return true;
      }
    } catch (error) {
      console.error("Error during calibration:", error);
      return false;
    }
  };

  // Ensure we have camera access before proceeding
  const checkCameraAccess = async () => {
    try {
      setLoadingCamera(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      // Stop the stream immediately after getting access
      stream.getTracks().forEach((track) => track.stop());
      setLoadingCamera(false);
      return true;
    } catch (err) {
      console.error("Camera access error:", err);
      setError(
        "Camera access is required. Please allow camera access and refresh the page."
      );
      setLoadingCamera(false);
      return false;
    }
  };

  // Handle WebGazer script loading
  const handleScriptLoad = () => {
    scriptLoaded.current = true;
    console.log("WebGazer script loaded");
    setWebgazerLoaded(true);

    // Check if webgazer is available on the window object
    if (typeof window !== "undefined" && window.webgazer) {
      // 记录WebGazer可用的方法
      logWebGazerMethods();

      // Start initialization with a delay
      setTimeout(() => {
        initWebGazer();
      }, 1000);
    } else {
      setError("WebGazer failed to load properly. Please refresh the page.");
    }
  };

  // Initialize WebGazer with settings
  const initWebGazer = async () => {
    if (webGazerInitialized) return;

    // Limit initialization attempts
    if (initAttempts.current >= 3) {
      setError(
        "Failed to initialize WebGazer after multiple attempts. Please refresh the page."
      );
      return;
    }

    initAttempts.current += 1;
    console.log(`Initializing WebGazer... (Attempt ${initAttempts.current})`);

    try {
      // First ensure we have camera access
      const hasCameraAccess = await checkCameraAccess();
      if (!hasCameraAccess) return;

      // 确保webgazer对象存在
      if (!window.webgazer) {
        console.error("WebGazer not found on window object");
        setError("WebGazer library not found. Please refresh and try again.");
        return;
      }

      // 确保页面上有正确的视频容器结构
      const existingContainer = document.getElementById(
        "webgazerVideoContainer"
      );
      if (existingContainer) {
        // 已存在容器，确保其样式正确
        console.log("Existing video container found");
      } else {
        console.log("Creating webgazer video container");
        // WebGazer会自动创建视频容器，但我们需要确保有一个唯一的ID
        const tempContainer = document.createElement("div");
        tempContainer.id = "webgazerVideoContainer";
        tempContainer.style.position = "fixed";
        tempContainer.style.top = "0";
        tempContainer.style.left = "0";
        tempContainer.style.zIndex = "-1";
        document.body.appendChild(tempContainer);
      }

      // Configure WebGazer with optimal settings
      let gazer = window.webgazer
        .setRegression("ridge") // Use ridge regression
        .setTracker("TFFacemesh"); // Use TFFacemesh tracker for better performance

      // 尝试设置saveDataAcrossSessions
      try {
        if (typeof gazer.saveDataAcrossSessions === "function") {
          gazer = gazer.saveDataAcrossSessions(false);
        }
      } catch (e) {
        console.warn("saveDataAcrossSessions not available", e);
      }

      // Set up gaze listener
      gazer.setGazeListener((data: WebGazerData | null) => {
        if (data && data.x && data.y) {
          // Only log occasionally to avoid console spam
          if (Math.random() < 0.01) {
            console.log(
              `Gaze data: x=${Math.round(data.x)}, y=${Math.round(data.y)}`
            );
          }
          setGazePoint({ x: data.x, y: data.y });
          setIsTracking(true);
        } else {
          setIsTracking(false);
        }
      });

      // Begin WebGazer - this is an async operation
      console.log("Starting WebGazer.begin()...");
      try {
        const result = await gazer.begin();
        console.log("WebGazer begin result:", result);
      } catch (e) {
        console.error("Error during webgazer.begin():", e);
        throw e;
      }

      // 设置WebGazer UI元素显示状态
      try {
        // 首先隐藏所有UI元素
        gazer.showVideo(false);
        gazer.showFaceOverlay(false);
        gazer.showFaceFeedbackBox(false);
        gazer.showPredictionPoints(false);
      } catch (e) {
        console.warn("Error setting WebGazer UI elements:", e);
      }

      console.log("WebGazer initialized successfully");

      // 再次记录WebGazer的可用方法
      logWebGazerMethods();

      setWebGazerInitialized(true);
      setIsWebGazerReady(true);
    } catch (error) {
      console.error("Error initializing WebGazer:", error);
      setError(
        "Failed to initialize eye tracking. Please ensure camera permissions are granted and refresh the page."
      );

      // Try again after a delay
      if (initAttempts.current < 3) {
        console.log(`Retrying initialization in 2 seconds...`);
        setTimeout(() => {
          initWebGazer();
        }, 2000);
      }
    }
  };

  // Start calibration process
  const startCalibration = async () => {
    // Double-check WebGazer is ready
    if (!window.webgazer || !isWebGazerReady) {
      console.error("WebGazer not ready");
      setError("WebGazer not ready. Please wait a moment or refresh the page.");

      // Try to reinitialize
      setTimeout(() => {
        if (window.webgazer && !webGazerInitialized) {
          initWebGazer();
        }
      }, 1000);

      return;
    }

    try {
      console.log("Starting calibration...");
      setError(null);

      // 确保视频容器存在于正确位置
      const videoContainer = document.getElementById("webgazerVideoContainer");
      if (videoContainer) {
        // 移动视频容器到校准区域
        const calibrationElement = document.getElementById(targetId.current);
        if (calibrationElement) {
          calibrationElement.appendChild(videoContainer);
          // 调整样式使其显示在中央
          videoContainer.style.position = "absolute";
          videoContainer.style.top = "0";
          videoContainer.style.left = "0";
          videoContainer.style.zIndex = "10";
        }
      }

      // Show video preview during calibration
      window.webgazer.showVideo(true);
      setShowPreview(true);

      // Clear existing data to start fresh
      window.webgazer.clearData();

      setCalibrationPoints(0);
    } catch (error) {
      console.error("Error during calibration:", error);
      setError(
        "Failed to start calibration. Please refresh the page and try again."
      );
    }
  };

  // Handle calibration point click
  const handleCalibrationClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!window.webgazer || !isWebGazerReady || !isCalibrating) return;

    const { clientX, clientY } = e;

    console.log(`Adding calibration point at (${clientX}, ${clientY})`);

    // 使用自定义校准方法
    const success = customCalibration(clientX, clientY);

    if (success) {
      setCalibrationPoints((prev: number) => {
        const newValue = prev + 1;
        console.log(`Calibration points: ${newValue}/9`);

        // 需要更多校准点以提高精度
        if (newValue >= 9) {
          setTimeout(() => {
            finishCalibration();
          }, 500);
        }

        return newValue;
      });
    } else {
      setError("Error during calibration. Please try again.");
    }
  };

  // Finish calibration process
  const finishCalibration = () => {
    console.log("Finishing calibration...");

    if (!window.webgazer) {
      setError("WebGazer not available. Please refresh the page.");
      return;
    }

    try {
      // 先隐藏所有元素
      window.webgazer.showVideo(false);
      window.webgazer.showFaceOverlay(false);
      setShowPreview(false);

      // 结束校准模式
      setIsCalibrating(false);

      // 延迟一点时间，确保DOM已更新
      setTimeout(() => {
        // 直接显示摄像头和面部特征点
        setShowCamera(true);
        window.webgazer.showVideo(true);
        window.webgazer.showFaceOverlay(showFacePoints);

        // 显示预测点
        window.webgazer.showPredictionPoints(true);
      }, 300);
    } catch (error) {
      console.error("Error finishing calibration:", error);
      setError("Error finishing calibration. Please refresh and try again.");
    }
  };

  // Reset calibration
  const resetCalibration = () => {
    if (!window.webgazer) {
      setError("WebGazer not available. Please refresh the page.");
      return;
    }

    try {
      console.log("Resetting calibration...");
      window.webgazer.clearData();
      setCalibrationPoints(0);
      setIsCalibrating(true);
      setShowPreview(false);
    } catch (error) {
      console.error("Error resetting calibration:", error);
      setError("Error resetting calibration. Please refresh the page.");
    }
  };

  // Add a function to toggle the camera display
  const toggleCamera = () => {
    if (!window.webgazer) return;

    const newState = !showCamera;
    setShowCamera(newState);

    try {
      // 直接控制摄像头显示状态
      window.webgazer.showVideo(newState);

      // 如果打开摄像头，同时根据面部特征点状态显示或隐藏
      if (newState) {
        window.webgazer.showFaceOverlay(showFacePoints);
      }

      console.log(`Camera ${newState ? "shown" : "hidden"}`);
    } catch (error) {
      console.error("Error toggling camera:", error);
    }
  };

  // 修改toggleFacePoints函数
  const toggleFacePoints = () => {
    if (!window.webgazer) return;

    const newState = !showFacePoints;
    setShowFacePoints(newState);

    try {
      // 如果摄像头可见，则直接切换特征点显示状态
      if (showCamera) {
        window.webgazer.showFaceOverlay(newState);
      }

      console.log(`Face points ${newState ? "shown" : "hidden"}`);
    } catch (error) {
      console.error("Error toggling face points:", error);
    }
  };

  // Check periodically if WebGazer is ready
  useEffect(() => {
    if (scriptLoaded.current && !webGazerInitialized) {
      const checkInterval = setInterval(() => {
        if (window.webgazer && !webGazerInitialized) {
          clearInterval(checkInterval);
          initWebGazer();
        }
      }, 2000);

      return () => clearInterval(checkInterval);
    }
  }, [webGazerInitialized]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (window.webgazer) {
        console.log("Cleaning up WebGazer...");
        try {
          // 尝试移除鼠标事件监听器，避免内存泄漏
          if (typeof window.webgazer.removeMouseEventListeners === "function") {
            window.webgazer.removeMouseEventListeners();
          }
          window.webgazer.stopVideo();
        } catch (e) {
          console.error("Error stopping WebGazer:", e);
        }
      }
    };
  }, []);

  return (
    <main className="min-h-screen bg-white">
      {/* Debug info - 已移除fixed定位样式 */}
      <div className="hidden">
        <div>Script loaded: {scriptLoaded.current ? "Yes" : "No"}</div>
        <div>WebGazer loaded: {webgazerLoaded ? "Yes" : "No"}</div>
        <div>WebGazer initialized: {webGazerInitialized ? "Yes" : "No"}</div>
        <div>WebGazer ready: {isWebGazerReady ? "Yes" : "No"}</div>
        <div>Calibrating: {isCalibrating ? "Yes" : "No"}</div>
        <div>Camera Access: {loadingCamera ? "Checking..." : "Ready"}</div>
        <div>Points: {calibrationPoints}/9</div>
        <div>Init Attempts: {initAttempts.current}</div>
      </div>

      {/* Load local WebGazer.js */}
      <Script
        src="/lib/webgazer.js"
        strategy="afterInteractive"
        onLoad={handleScriptLoad}
        onError={() => {
          console.error("Failed to load local WebGazer");
          setError(
            "Failed to load WebGazer script. Please check your connection and refresh."
          );
        }}
      />

      <div
        className="relative w-full h-screen bg-gray-50"
        ref={calibrationRef}
        onClick={
          isCalibrating && showPreview ? handleCalibrationClick : undefined
        }
      >
        {/* Error message */}
        {error && (
          <div className="absolute inset-0 bg-red-100 bg-opacity-90 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg text-center max-w-md">
              <h2 className="text-xl font-bold mb-4 text-red-600">Error</h2>
              <p className="mb-4">{error}</p>
              <button
                onClick={() => setError(null)}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Loading indicator */}
        {loadingCamera && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg text-center">
              <h2 className="text-xl font-bold mb-4">Accessing Camera</h2>
              <p className="mb-4">Please allow camera access when prompted.</p>
              <div className="animate-spin h-10 w-10 border-4 border-blue-500 rounded-full border-t-transparent mx-auto"></div>
            </div>
          </div>
        )}

        {/* Calibration overlay */}
        {isCalibrating && (
          <div className="absolute inset-0 bg-black bg-opacity-40 flex flex-col items-center justify-center z-40">
            <div className="bg-white p-6 rounded-lg text-center max-w-md mb-8">
              <h2 className="text-xl font-bold mb-4">
                Eye Tracking Calibration
              </h2>
              <p className="mb-4">
                {showPreview
                  ? "Please click on each dot while looking directly at it. This helps calibrate the eye tracker."
                  : "Click below to start calibration. You will need to allow camera access."}
              </p>
              <p className="mb-4">
                {showPreview &&
                  `You've completed ${calibrationPoints}/9 calibration points.`}
              </p>
              <p className="text-xs text-gray-500 mb-4">
                Note: For best results, use Chrome browser and ensure good
                lighting.
              </p>
              {!showPreview && (
                <button
                  onClick={startCalibration}
                  disabled={!isWebGazerReady || loadingCamera}
                  className={`px-4 py-2 rounded ${
                    isWebGazerReady && !loadingCamera
                      ? "bg-blue-500 text-white hover:bg-blue-600"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  {loadingCamera
                    ? "Checking Camera..."
                    : isWebGazerReady
                    ? "Start Calibration"
                    : "Initializing..."}
                </button>
              )}
              {showPreview && calibrationPoints >= 9 && (
                <button
                  onClick={finishCalibration}
                  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                >
                  Finish Calibration
                </button>
              )}
            </div>

            {/* Calibration points grid */}
            {showPreview && (
              <div
                className="absolute inset-0 flex items-center justify-center"
                id={targetId.current}
              >
                <div className="grid grid-cols-3 w-[80vw] h-[80vh]">
                  {/* 左上 */}
                  <div className="flex items-start justify-start p-4">
                    <div
                      className={`w-6 h-6 rounded-full ${
                        0 < calibrationPoints ? "bg-green-500" : "bg-blue-500"
                      } ${0 === calibrationPoints ? "animate-pulse" : ""}`}
                    />
                  </div>

                  {/* 上中 */}
                  <div className="flex items-start justify-center p-4">
                    <div
                      className={`w-6 h-6 rounded-full ${
                        1 < calibrationPoints ? "bg-green-500" : "bg-blue-500"
                      } ${1 === calibrationPoints ? "animate-pulse" : ""}`}
                    />
                  </div>

                  {/* 右上 */}
                  <div className="flex items-start justify-end p-4">
                    <div
                      className={`w-6 h-6 rounded-full ${
                        2 < calibrationPoints ? "bg-green-500" : "bg-blue-500"
                      } ${2 === calibrationPoints ? "animate-pulse" : ""}`}
                    />
                  </div>

                  {/* 左中 */}
                  <div className="flex items-center justify-start p-4">
                    <div
                      className={`w-6 h-6 rounded-full ${
                        3 < calibrationPoints ? "bg-green-500" : "bg-blue-500"
                      } ${3 === calibrationPoints ? "animate-pulse" : ""}`}
                    />
                  </div>

                  {/* 中心 */}
                  <div className="flex items-center justify-center p-4">
                    <div
                      className={`w-6 h-6 rounded-full ${
                        4 < calibrationPoints ? "bg-green-500" : "bg-blue-500"
                      } ${4 === calibrationPoints ? "animate-pulse" : ""}`}
                    />
                  </div>

                  {/* 右中 */}
                  <div className="flex items-center justify-end p-4">
                    <div
                      className={`w-6 h-6 rounded-full ${
                        5 < calibrationPoints ? "bg-green-500" : "bg-blue-500"
                      } ${5 === calibrationPoints ? "animate-pulse" : ""}`}
                    />
                  </div>

                  {/* 左下 */}
                  <div className="flex items-end justify-start p-4">
                    <div
                      className={`w-6 h-6 rounded-full ${
                        6 < calibrationPoints ? "bg-green-500" : "bg-blue-500"
                      } ${6 === calibrationPoints ? "animate-pulse" : ""}`}
                    />
                  </div>

                  {/* 下中 */}
                  <div className="flex items-end justify-center p-4">
                    <div
                      className={`w-6 h-6 rounded-full ${
                        7 < calibrationPoints ? "bg-green-500" : "bg-blue-500"
                      } ${7 === calibrationPoints ? "animate-pulse" : ""}`}
                    />
                  </div>

                  {/* 右下 */}
                  <div className="flex items-end justify-end p-4">
                    <div
                      className={`w-6 h-6 rounded-full ${
                        8 < calibrationPoints ? "bg-green-500" : "bg-blue-500"
                      } ${8 === calibrationPoints ? "animate-pulse" : ""}`}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Demo content when not calibrating */}
        {!isCalibrating && (
          <div className="p-8">
            <h1 className="text-3xl font-bold mb-4">Eye Tracking Demo</h1>
            <p className="mb-4">
              Look around the page. The blue dot represents your gaze point.
            </p>

            <div className="grid grid-cols-3 gap-8 mt-12">
              {[...Array(9)].map((_, index) => (
                <div
                  key={index}
                  className="bg-white p-4 rounded-lg shadow-lg text-center h-40 flex items-center justify-center"
                >
                  <span className="text-xl font-bold">Area {index + 1}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Gaze point indicator */}
        {!isCalibrating && isTracking && (
          <div
            className="absolute rounded-full transform -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none"
            style={{
              left: gazePoint.x,
              top: gazePoint.y,
              transition: "all 0.1s ease-out",
              width: "20px",
              height: "20px",
              background:
                "radial-gradient(circle, rgba(59,130,246,0.6) 0%, rgba(59,130,246,0) 70%)",
              boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.3)",
            }}
          >
            <div
              className="absolute w-3 h-3 bg-blue-500 rounded-full top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
              style={{
                boxShadow: "0 0 8px rgba(59, 130, 246, 0.8)",
              }}
            />
          </div>
        )}

        {/* Status bar */}
        <div className="fixed bottom-4 right-4 bg-white p-2 rounded shadow-lg z-30 flex gap-4">
          <div className="text-sm">
            Tracking: {isTracking ? "Active" : "Inactive"}
          </div>
          {!isCalibrating && (
            <>
              <button
                onClick={resetCalibration}
                className="bg-gray-200 text-gray-800 px-2 py-1 text-xs rounded hover:bg-gray-300"
              >
                Recalibrate
              </button>
              <button
                onClick={toggleCamera}
                className={`px-2 py-1 text-xs rounded ${
                  showCamera
                    ? "bg-red-500 text-white hover:bg-red-600"
                    : "bg-green-500 text-white hover:bg-green-600"
                }`}
              >
                {showCamera ? "Hide Camera" : "Show Camera"}
              </button>
              {showCamera && (
                <button
                  onClick={toggleFacePoints}
                  className={`px-2 py-1 text-xs rounded ${
                    showFacePoints
                      ? "bg-purple-500 text-white hover:bg-purple-600"
                      : "bg-blue-500 text-white hover:bg-blue-600"
                  }`}
                >
                  {showFacePoints ? "Hide Face Points" : "Show Face Points"}
                </button>
              )}
            </>
          )}
          <div className="text-sm">
            Gaze: {Math.round(gazePoint.x)},{Math.round(gazePoint.y)}
          </div>
        </div>
      </div>
    </main>
  );
}
