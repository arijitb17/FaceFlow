import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Play, Square, Camera, Settings, Zap } from "lucide-react";

interface WebcamCaptureProps {
  onBatchComplete?: (images: string[]) => void;
}

export default function WebcamCapture({ onBatchComplete }: WebcamCaptureProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [captureInterval, setCaptureInterval] = useState("2");
  const [totalImages, setTotalImages] = useState(20);
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 1280, height: 720 } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const captureImage = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return null;
    
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return null;

    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    context.drawImage(videoRef.current, 0, 0);
    
    return canvas.toDataURL('image/jpeg', 0.8);
  }, []);

  const startCapture = useCallback(async () => {
    if (!videoRef.current) {
      await startCamera();
      // Wait for camera to initialize
      setTimeout(() => {
        if (videoRef.current && videoRef.current.readyState >= 2) {
          startCapture();
        }
      }, 1000);
      return;
    }

    setIsCapturing(true);
    setCapturedImages([]);
    setProgress(0);
    
    let imageCount = 0;
    const images: string[] = [];

    const capture = () => {
      const imageData = captureImage();
      if (imageData) {
        images.push(imageData);
        setCapturedImages([...images]);
        imageCount++;
        
        const progressValue = (imageCount / totalImages) * 100;
        setProgress(progressValue);

        if (imageCount >= totalImages) {
          stopCapture();
          if (onBatchComplete) {
            setIsProcessing(true);
            onBatchComplete(images);
          }
        }
      }
    };

    if (captureInterval === "manual") {
      // Manual capture mode - just capture one for now
      capture();
    } else {
      // Automatic capture
      const intervalMs = parseInt(captureInterval) * 1000;
      capture(); // Capture first image immediately
      
      intervalRef.current = setInterval(capture, intervalMs);
    }
  }, [captureInterval, totalImages, startCamera, captureImage, onBatchComplete]);

  const stopCapture = useCallback(() => {
    setIsCapturing(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const quickAttendance = useCallback(() => {
    // Simulate quick attendance with 5 images captured rapidly
    setTotalImages(5);
    setCaptureInterval("1");
    startCapture();
  }, [startCapture]);

  return (
    <Card className="shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900" data-testid="webcam-title">
            Live Attendance Capture
          </h3>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            isCapturing 
              ? "bg-destructive/10 text-destructive" 
              : "bg-secondary/10 text-secondary"
          }`} data-testid="capture-status">
            {isCapturing ? "Capturing" : "Ready"}
          </span>
        </div>
      </div>
      
      <CardContent className="p-6">
        {/* Camera Preview */}
        <div className="bg-gray-900 rounded-lg overflow-hidden mb-6 relative">
          <div className="aspect-video bg-gray-800 flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              data-testid="video-preview"
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {!streamRef.current && (
                <div className="text-center text-white">
                  <Camera className="text-4xl mb-3 text-gray-400 mx-auto" />
                  <p className="text-lg font-medium">Camera Preview</p>
                  <p className="text-sm text-gray-400">Click "Start Capture" to begin</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Camera Controls Overlay */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-4">
            <Button
              onClick={startCapture}
              disabled={isCapturing || isProcessing}
              className="bg-primary text-white hover:bg-primary/90"
              data-testid="button-start-capture"
            >
              <Play className="mr-2 h-4 w-4" />
              Start Capture
            </Button>
            <Button
              onClick={stopCapture}
              disabled={!isCapturing}
              variant="secondary"
              data-testid="button-stop-capture"
            >
              <Square className="mr-2 h-4 w-4" />
              Stop
            </Button>
          </div>
        </div>

        {/* Hidden canvas for image capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Capture Settings */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <Label htmlFor="capture-interval" className="text-sm font-medium text-gray-700 mb-2 block">
              Capture Interval
            </Label>
            <Select 
              value={captureInterval} 
              onValueChange={setCaptureInterval}
              disabled={isCapturing}
            >
              <SelectTrigger data-testid="select-capture-interval">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2 seconds</SelectItem>
                <SelectItem value="3">3 seconds</SelectItem>
                <SelectItem value="5">5 seconds</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="total-images" className="text-sm font-medium text-gray-700 mb-2 block">
              Total Images
            </Label>
            <Input
              id="total-images"
              type="number"
              value={totalImages}
              onChange={(e) => setTotalImages(parseInt(e.target.value) || 20)}
              disabled={isCapturing}
              className="border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent"
              data-testid="input-total-images"
            />
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Capture Progress</span>
            <span className="text-sm text-gray-500" data-testid="progress-text">
              {capturedImages.length}/{totalImages}
            </span>
          </div>
          <Progress 
            value={progress} 
            className="w-full h-2"
            data-testid="capture-progress"
          />
        </div>

        {/* Quick Actions */}
        <div className="flex space-x-3">
          <Button
            onClick={quickAttendance}
            disabled={isCapturing || isProcessing}
            className="flex-1 bg-secondary text-white hover:bg-secondary/90"
            data-testid="button-quick-attendance"
          >
            <Zap className="mr-2 h-4 w-4" />
            Quick Attendance
          </Button>
          <Button
            onClick={() => {}}
            disabled={isCapturing}
            variant="outline"
            className="flex-1"
            data-testid="button-advanced-settings"
          >
            <Settings className="mr-2 h-4 w-4" />
            Advanced Settings
          </Button>
        </div>

        {isProcessing && (
          <div className="mt-4 p-4 bg-accent/10 rounded-lg">
            <p className="text-accent font-medium text-center" data-testid="processing-message">
              Processing images with AI recognition...
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
