import { useState, useRef, useCallback, useEffect } from "react";

export type DuetLayout = "side-by-side" | "top-bottom" | "picture-in-picture";

interface UseDuetRecordingOptions {
  sourceVideoRef: React.RefObject<HTMLVideoElement>;
  layout: DuetLayout;
}

export function useDuetRecording({ sourceVideoRef, layout }: UseDuetRecordingOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string>("");
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const durationIntervalRef = useRef<number | null>(null);

  // Initialize camera stream
  const initCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 720 },
          height: { ideal: 1280 },
        },
        audio: true,
      });
      setCameraStream(stream);
      setError(null);
      return stream;
    } catch (err) {
      setError("Could not access camera. Please check permissions.");
      return null;
    }
  }, []);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
  }, [cameraStream]);

  // Draw combined frame to canvas based on layout
  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const sourceVideo = sourceVideoRef.current;
    const cameraVideo = cameraVideoRef.current;

    if (!canvas || !sourceVideo || !cameraVideo) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, width, height);

    switch (layout) {
      case "side-by-side":
        // Left: source video, Right: camera
        const halfWidth = width / 2;
        drawVideoToArea(ctx, sourceVideo, 0, 0, halfWidth, height);
        drawVideoToArea(ctx, cameraVideo, halfWidth, 0, halfWidth, height, true);
        break;

      case "top-bottom":
        // Top: source video, Bottom: camera
        const halfHeight = height / 2;
        drawVideoToArea(ctx, sourceVideo, 0, 0, width, halfHeight);
        drawVideoToArea(ctx, cameraVideo, 0, halfHeight, width, halfHeight, true);
        break;

      case "picture-in-picture":
        // Full: source video, Corner: camera (small)
        drawVideoToArea(ctx, sourceVideo, 0, 0, width, height);
        const pipWidth = width * 0.3;
        const pipHeight = height * 0.3;
        const pipX = width - pipWidth - 16;
        const pipY = height - pipHeight - 16;
        // Add border to PiP
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 3;
        ctx.strokeRect(pipX - 2, pipY - 2, pipWidth + 4, pipHeight + 4);
        drawVideoToArea(ctx, cameraVideo, pipX, pipY, pipWidth, pipHeight, true);
        break;
    }

    animationFrameRef.current = requestAnimationFrame(drawFrame);
  }, [layout, sourceVideoRef]);

  // Helper to draw video maintaining aspect ratio
  const drawVideoToArea = (
    ctx: CanvasRenderingContext2D,
    video: HTMLVideoElement,
    x: number,
    y: number,
    areaWidth: number,
    areaHeight: number,
    mirror = false
  ) => {
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    const videoRatio = video.videoWidth / video.videoHeight;
    const areaRatio = areaWidth / areaHeight;

    let drawWidth: number;
    let drawHeight: number;
    let offsetX: number;
    let offsetY: number;

    if (videoRatio > areaRatio) {
      // Video is wider - fit by height
      drawHeight = areaHeight;
      drawWidth = areaHeight * videoRatio;
      offsetX = x + (areaWidth - drawWidth) / 2;
      offsetY = y;
    } else {
      // Video is taller - fit by width
      drawWidth = areaWidth;
      drawHeight = areaWidth / videoRatio;
      offsetX = x;
      offsetY = y + (areaHeight - drawHeight) / 2;
    }

    ctx.save();
    if (mirror) {
      ctx.translate(x + areaWidth, 0);
      ctx.scale(-1, 1);
      offsetX = areaWidth - (offsetX - x) - drawWidth;
    }

    // Clip to area
    ctx.beginPath();
    ctx.rect(mirror ? 0 : x, y, areaWidth, areaHeight);
    ctx.clip();

    ctx.drawImage(video, mirror ? offsetX : offsetX, offsetY, drawWidth, drawHeight);
    ctx.restore();
  };

  // Start recording
  const startRecording = useCallback(async () => {
    if (!canvasRef.current || !cameraStream) return;

    // Get canvas stream
    const canvasStream = canvasRef.current.captureStream(30);

    // Add audio from camera
    const audioTracks = cameraStream.getAudioTracks();
    audioTracks.forEach((track) => canvasStream.addTrack(track));

    // Create MediaRecorder
    const mediaRecorder = new MediaRecorder(canvasStream, {
      mimeType: "video/webm;codecs=vp9",
    });

    chunksRef.current = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      setRecordedBlob(blob);
      setRecordedUrl(URL.createObjectURL(blob));
    };

    mediaRecorderRef.current = mediaRecorder;

    // Start source video playback
    if (sourceVideoRef.current) {
      sourceVideoRef.current.currentTime = 0;
      sourceVideoRef.current.play();
    }

    // Start drawing frames
    drawFrame();

    // Start recording
    mediaRecorder.start(100);
    setIsRecording(true);
    setRecordingDuration(0);

    // Track duration
    durationIntervalRef.current = window.setInterval(() => {
      setRecordingDuration((prev) => prev + 1);
    }, 1000);
  }, [cameraStream, drawFrame, sourceVideoRef]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);

      // Stop animation
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      // Stop source video
      if (sourceVideoRef.current) {
        sourceVideoRef.current.pause();
      }

      // Clear duration interval
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    }
  }, [isRecording, sourceVideoRef]);

  // Pause/resume recording
  const togglePause = useCallback(() => {
    if (!mediaRecorderRef.current || !isRecording) return;

    if (isPaused) {
      mediaRecorderRef.current.resume();
      sourceVideoRef.current?.play();
      drawFrame();
      durationIntervalRef.current = window.setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } else {
      mediaRecorderRef.current.pause();
      sourceVideoRef.current?.pause();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    }

    setIsPaused(!isPaused);
  }, [isPaused, isRecording, drawFrame, sourceVideoRef]);

  // Reset recording
  const resetRecording = useCallback(() => {
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
    }
    setRecordedBlob(null);
    setRecordedUrl("");
    setRecordingDuration(0);
    chunksRef.current = [];
  }, [recordedUrl]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (recordedUrl) {
        URL.revokeObjectURL(recordedUrl);
      }
    };
  }, []);

  return {
    // State
    isRecording,
    isPaused,
    recordedBlob,
    recordedUrl,
    cameraStream,
    error,
    recordingDuration,
    // Refs
    canvasRef,
    cameraVideoRef,
    // Actions
    initCamera,
    stopCamera,
    startRecording,
    stopRecording,
    togglePause,
    resetRecording,
  };
}
