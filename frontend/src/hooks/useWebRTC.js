import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * useWebRTC
 * Acquires camera + microphone stream via getUserMedia.
 * Returns the video element ref, the raw stream, and any error.
 *
 * Features:
 * - Prefers HD video (1280×720) but falls back to any resolution
 * - Stops all tracks on unmount to release camera/mic
 * - Exposes a `retry` function for one-click permission re-request
 */
export const useWebRTC = () => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  const [permissionState, setPermissionState] = useState('pending'); // pending | granted | denied

  const startStream = useCallback(async () => {
    // Stop any existing tracks before re-requesting
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    setError(null);
    setPermissionState('pending');

    const constraints = {
      video: {
        width: { ideal: 1280, min: 640 },
        height: { ideal: 720, min: 480 },
        facingMode: 'user',
        frameRate: { ideal: 30, min: 15 },
      },
      audio: {
        echoCancellation: true,
        noiseSuppression: false, // Keep background audio for monitoring
        sampleRate: 44100,
      },
    };

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = mediaStream;
      setStream(mediaStream);
      setPermissionState('granted');

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      setPermissionState('denied');
      let message = err.message;
      if (err.name === 'NotAllowedError') {
        message = 'Camera/microphone access was denied. Please allow access in your browser settings and refresh the page.';
      } else if (err.name === 'NotFoundError') {
        message = 'No camera or microphone device found. Please connect a webcam to continue.';
      } else if (err.name === 'NotReadableError') {
        message = 'Camera is already in use by another application. Please close it and retry.';
      } else if (err.name === 'OverconstrainedError') {
        // Retry with relaxed constraints
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          streamRef.current = fallbackStream;
          setStream(fallbackStream);
          setPermissionState('granted');
          if (videoRef.current) videoRef.current.srcObject = fallbackStream;
          return;
        } catch (e2) {
          message = 'Could not access camera with required settings.';
        }
      }
      setError(message);
    }
  }, []);

  useEffect(() => {
    startStream();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Attach stream to video ref whenever either changes
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return {
    videoRef,
    stream,
    error,
    permissionState,
    retry: startStream,
  };
};