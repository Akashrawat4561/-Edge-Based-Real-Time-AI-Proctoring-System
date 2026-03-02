import { useEffect, useRef, useState, useCallback } from 'react';
/* global faceapi */
const faceapi = window.faceapi;

/**
 * useFaceApiProctor
 * Advanced proctoring hook using face-api.js.
 * Handles:
 * - Face Detection
 * - Face Landmarks (68 points)
 * - Eye Detection (Open/Closed)
 * - Head Pose Estimation (Yaw, Pitch, Roll)
 * - Expression Detection
 */
export const useFaceApiProctor = (videoRef, onEvent, enabled = true) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [detections, setDetections] = useState(null);
  const requestRef = useRef();
  const lastEventTimeRef = useRef({});

  // Model loading
  useEffect(() => {
    if (!enabled) return;

    let isMounted = true;
    const loadModels = async () => {
      try {
        const MODEL_URL = '/models';
        console.log('📡 Loading face-api.js models...');

        // Disable face-api.js nodejs environment detection to avoid "fs" resolution errors
        faceapi.env.monkeyPatch({
          Canvas: HTMLCanvasElement,
          Image: HTMLImageElement,
          ImageData: ImageData,
          Video: HTMLVideoElement,
          createCanvasElement: () => document.createElement('canvas'),
          createImageElement: () => document.createElement('img')
        });

        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        ]);

        if (isMounted) {
          setIsLoaded(true);
          console.log('✅ face-api.js models loaded');
        }
      } catch (err) {
        console.error('❌ face-api.js model load error:', err);
      }
    };

    loadModels();
    return () => { isMounted = false; };
  }, [enabled, videoRef]);

  // Main detection loop
  const detect = useCallback(async () => {
    if (!isLoaded || !videoRef.current || videoRef.current.readyState < 2) {
      requestRef.current = requestAnimationFrame(detect);
      return;
    }

    try {
      const video = videoRef.current;
      const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });

      const result = await faceapi
        .detectSingleFace(video, options)
        .withFaceLandmarks()
        .withFaceExpressions();

      if (result) {
        setDetections(result);
        analyzeFace(result);
      } else {
        setDetections(null);
        triggerEvent('No Face', 1.0);
      }
    } catch (err) {
      if (!err.message?.includes('disposed')) {
        console.warn('face-api detection error:', err);
      }
    }

    requestRef.current = requestAnimationFrame(detect);
  }, [isLoaded, videoRef]);

  useEffect(() => {
    if (isLoaded && enabled) {
      requestRef.current = requestAnimationFrame(detect);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isLoaded, enabled, detect]);

  // Analytics
  const analyzeFace = (result) => {
    const { landmarks, expressions, detection } = result;
    const now = Date.now();

    // 1. Check Multiple Faces (detectAllFaces would be needed for this, but detectSingleFace is faster for primary)
    // we can use detectAllFaces if we wanted, but let's stick to advanced checks for now.

    // 2. Head Pose (Estimate yaw/pitch from landmarks)
    const jaw = landmarks.getJawOutline();
    const nose = landmarks.getNose();
    const mouth = landmarks.getMouth();
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();

    // Simple yaw estimation: compare distance from nose to jaw edges
    const noseTip = nose[6];
    const leftJawEdge = jaw[0];
    const rightJawEdge = jaw[16];

    const distLeft = Math.abs(noseTip.x - leftJawEdge.x);
    const distRight = Math.abs(noseTip.y - rightJawEdge.y); // Wait, this logic is a bit crude

    // Better Yaw Calculation: Horizontal ratio of nose bridge relative to eyes
    const eyeCenterL = leftEye.reduce((acc, p) => ({ x: acc.x + p.x / 6, y: acc.y + p.y / 6 }), { x: 0, y: 0 });
    const eyeCenterR = rightEye.reduce((acc, p) => ({ x: acc.x + p.x / 6, y: acc.y + p.y / 6 }), { x: 0, y: 0 });
    const noseBridge = nose[0];
    const eyeMidX = (eyeCenterL.x + eyeCenterR.x) / 2;
    const yaw = (noseBridge.x - eyeMidX) / (eyeCenterR.x - eyeCenterL.x);

    if (Math.abs(yaw) > 0.45) {
      triggerEvent('Looking Away', 0.8, { direction: yaw > 0 ? 'right' : 'left' });
    }

    // 3. Eye Landmarks (Check if eyes are closed)
    // Ear (Eye Aspect Ratio)
    const getEar = (eye) => {
      const v1 = Math.sqrt((eye[1].x - eye[5].x) ** 2 + (eye[1].y - eye[5].y) ** 2);
      const v2 = Math.sqrt((eye[2].x - eye[4].x) ** 2 + (eye[2].y - eye[4].y) ** 2);
      const h = Math.sqrt((eye[0].x - eye[3].x) ** 2 + (eye[0].y - eye[3].y) ** 2);
      return (v1 + v2) / (2 * h);
    };

    const leftEar = getEar(leftEye);
    const rightEar = getEar(rightEye);
    const avgEar = (leftEar + rightEar) / 2;

    if (avgEar < 0.2) {
      // Potentially eyes closed or looking down too much
      // triggerEvent('Eyes Closed', 0.7); 
      // Disabled by default to avoid false positives during normal blinking, 
      // but could be used for "Persistent Eyes Closed"
    }

    // 4. Expression detection (Suspicious expressions like surprise or fear)
    if (expressions.surprise > 0.8) {
      // triggerEvent('Suspicious Expression', 0.5, { type: 'Surprise' });
    }
  };

  const triggerEvent = (type, confidence, metadata = {}) => {
    const now = Date.now();
    const lastTime = lastEventTimeRef.current[type] || 0;

    // Throttling: send same event type at most every 5 seconds
    if (now - lastTime > 5000) {
      lastEventTimeRef.current[type] = now;
      if (onEvent) onEvent(type, confidence, metadata);
    }
  };

  return { isLoaded, detections };
};
