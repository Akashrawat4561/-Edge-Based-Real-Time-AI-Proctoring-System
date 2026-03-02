import { useEffect, useRef } from 'react';
import * as blazeface from '@tensorflow-models/blazeface';
import * as tf from '@tensorflow/tfjs';
import { DETECTION_FRAME_SKIP } from '../utils/constants';

/**
 * useFaceDetection
 * Uses BlazeFace (Edge AI) to detect faces in the camera feed every N frames.
 * Calls onDetect(predictions) with BlazeFace prediction objects.
 * Runs entirely in-browser — no video sent to server.
 */
export const useFaceDetection = (videoRef, onDetect, enabled = true) => {
  const modelRef = useRef(null);
  const frameIdRef = useRef(null);
  const frameCountRef = useRef(0);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    let isMounted = true;

    const loadModel = async () => {
      try {
        // Ensure TF backend is ready
        await tf.ready();
        const model = await blazeface.load({
          maxFaces: 4,        // detect up to 4 faces
          inputWidth: 128,
          inputHeight: 128,
          iouThreshold: 0.3,
          scoreThreshold: 0.75,
        });
        if (isMounted) {
          modelRef.current = model;
          loadedRef.current = true;
          console.log('✅ BlazeFace model loaded');
          detectFrame();
        }
      } catch (err) {
        console.error('❌ BlazeFace load error:', err);
      }
    };

    loadModel();

    return () => {
      isMounted = false;
      if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current);
    };
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  const detectFrame = async () => {
    if (!loadedRef.current || !modelRef.current || !onDetect) {
      frameIdRef.current = requestAnimationFrame(detectFrame);
      return;
    }

    const video = videoRef.current;
    if (!video || video.readyState < 2 || video.paused || video.ended) {
      frameIdRef.current = requestAnimationFrame(detectFrame);
      return;
    }

    // Skip frames for performance
    frameCountRef.current += 1;
    if (frameCountRef.current % DETECTION_FRAME_SKIP !== 0) {
      frameIdRef.current = requestAnimationFrame(detectFrame);
      return;
    }

    try {
      const predictions = await modelRef.current.estimateFaces(video, false);
      onDetect(predictions);
    } catch (err) {
      // Ignore transient errors (canvas disposed, etc.)
      if (!err.message?.includes('disposed')) {
        console.warn('Face detection frame error:', err.message);
      }
    }

    frameIdRef.current = requestAnimationFrame(detectFrame);
  };
};