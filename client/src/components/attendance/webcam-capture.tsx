// components/attendance/webcam-capture.tsx
"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Camera, 
  Square, 
  Play, 
  Pause, 
  RotateCcw, 
  Upload,
  CheckCircle,
  AlertCircle,
  Timer
} from "lucide-react";

interface WebcamCaptureProps {
  onBatchComplete: (images: string[]) => void;
  disabled?: boolean; // <-- Added this prop
}

export default function WebcamCapture({ onBatchComplete, disabled }: WebcamCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const [isStreamActive, setIsStreamActive] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [captureInterval, setCaptureInterval] = useState(2000);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const startWebcam = useCallback(async () => {
    if (disabled) {
      alert("Please select a class first.");
      return;
    }
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreamActive(true);
      }
    } catch (err) {
      console.error("Failed to start webcam:", err);
      setError("Failed to access webcam. Please ensure camera permissions are granted.");
    }
  }, [disabled]);

  const stopWebcam = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsStreamActive(false);
    setIsCapturing(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx || video.videoWidth === 0) return null;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.8);
  }, []);

  const startCapture = useCallback(() => {
    if (disabled) {
      alert("Please select a class first.");
      return;
    }
    if (!isStreamActive) return;

    setIsCapturing(true);
    setCapturedImages([]);
    setCountdown(3);

    let countdownValue = 3;
    const countdownInterval = setInterval(() => {
      countdownValue--;
      setCountdown(countdownValue);

      if (countdownValue <= 0) {
        clearInterval(countdownInterval);
        setCountdown(0);

        intervalRef.current = setInterval(() => {
          const frame = captureFrame();
          if (frame) setCapturedImages((prev) => [...prev, frame]);
        }, captureInterval);
      }
    }, 1000);
  }, [disabled, isStreamActive, captureFrame, captureInterval]);

  const stopCapture = useCallback(() => {
    setIsCapturing(false);
    setCountdown(0);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const resetCapture = useCallback(() => {
    stopCapture();
    setCapturedImages([]);
    setError(null);
  }, [stopCapture]);

  const processImages = useCallback(async () => {
    if (capturedImages.length === 0) return;
    setIsProcessing(true);
    try {
      await onBatchComplete(capturedImages);
      setCapturedImages([]);
    } catch (error) {
      console.error("Processing failed:", error);
      setError("Failed to process images. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  }, [capturedImages, onBatchComplete]);

  useEffect(() => () => stopWebcam(), [stopWebcam]);

  useEffect(() => {
    if (capturedImages.length >= 30 && isCapturing) stopCapture();
  }, [capturedImages.length, isCapturing, stopCapture]);

  return (
    <div className="space-y-6">
      {/* Video Stream Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Camera className="h-5 w-5" />
              <span>Live Camera Feed</span>
            </div>
            {isStreamActive && (
              <Badge variant="default" className="bg-green-500">
                <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse" />
                Live
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative bg-gray-900 rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-auto max-h-96 object-cover"
              style={{ display: isStreamActive ? "block" : "none" }}
            />
            <canvas ref={canvasRef} className="hidden" />
            {!isStreamActive && (
              <div className="aspect-video flex items-center justify-center bg-gray-100 text-gray-500">
                <div className="text-center">
                  <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Click "Start Camera" to begin</p>
                </div>
              </div>
            )}
            {countdown > 0 && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <div className="text-white text-6xl font-bold animate-ping">{countdown}</div>
              </div>
            )}
            {isCapturing && countdown === 0 && (
              <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <span>CAPTURING</span>
              </div>
            )}
            {capturedImages.length > 0 && (
              <div className="absolute bottom-4 right-4 bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                {capturedImages.length} frames
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <span className="text-red-700 text-sm">{error}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Capture Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {!isStreamActive ? (
                <Button onClick={startWebcam} disabled={disabled} className="bg-green-600 hover:bg-green-700">
                  <Play className="mr-2 h-4 w-4" /> Start Camera
                </Button>
              ) : (
                <Button onClick={stopWebcam} variant="destructive">
                  <Square className="mr-2 h-4 w-4" /> Stop Camera
                </Button>
              )}

              {isStreamActive && !isCapturing && (
                <Button onClick={startCapture} disabled={disabled} className="bg-blue-600 hover:bg-blue-700">
                  <Camera className="mr-2 h-4 w-4" /> Start Capture
                </Button>
              )}

              {isCapturing && (
                <Button onClick={stopCapture} variant="outline">
                  <Pause className="mr-2 h-4 w-4" /> Stop Capture
                </Button>
              )}

              <Button onClick={resetCapture} variant="outline">
                <RotateCcw className="mr-2 h-4 w-4" /> Reset
              </Button>
            </div>

            {/* Interval Setting */}
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-2">
                <Timer className="h-4 w-4" />
                <span>Interval:</span>
                <select
                  value={captureInterval}
                  onChange={(e) => setCaptureInterval(Number(e.target.value))}
                  className="border rounded px-2 py-1"
                  disabled={isCapturing}
                >
                  <option value={1000}>1 second</option>
                  <option value={2000}>2 seconds</option>
                  <option value={3000}>3 seconds</option>
                  <option value={5000}>5 seconds</option>
                </select>
              </div>
            </div>

            {capturedImages.length > 0 && (
              <div className="pt-4 border-t flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm">{capturedImages.length} images captured</span>
                </div>
                <Button
                  onClick={processImages}
                  disabled={isProcessing || capturedImages.length < 5 || disabled}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {isProcessing ? "Processing..." : "Process Attendance"}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
