import { useEffect, useRef } from 'react';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import * as tf from '@tensorflow/tfjs';
import { DETECTION_FRAME_SKIP, PROHIBITED_OBJECTS, DEFAULT_CONFIDENCE_THRESHOLD } from '../utils/constants';

/**
 * useObjectDetection
 * Uses COCO-SSD (Edge AI) to detect prohibited objects in the camera feed.
 * Only calls onDetect() when a prohibited object is present above the confidence threshold.
 * Runs entirely in-browser — no video sent to server.
 */
export const useObjectDetection = (videoRef, onDetect, enabled = true) => {
  const modelRef = useRef(null);
  const frameIdRef = useRef(null);
  const frameCountRef = useRef(0);
  const loadedRef = useRef(false);
  // Debounce: track last time each object type was reported
  const lastReportRef = useRef({});
  const DEBOUNCE_MS = 5000; // report same object at most every 5s

  useEffect(() => {
    if (!enabled) return;

    let isMounted = true;

    const loadModel = async () => {
      try {
        await tf.ready();
        const model = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
        if (isMounted) {
          modelRef.current = model;
          loadedRef.current = true;
          console.log('✅ COCO-SSD model loaded');
          detectFrame();
        }
      } catch (err) {
        console.error('❌ COCO-SSD load error:', err);
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

    // Skip frames for performance (object detection is heavier)
    frameCountRef.current += 1;
    if (frameCountRef.current % (DETECTION_FRAME_SKIP * 3) !== 0) {
      frameIdRef.current = requestAnimationFrame(detectFrame);
      return;
    }

    try {
      const predictions = await modelRef.current.detect(video);
      const now = Date.now();

      // Filter to prohibited objects above threshold + debounce
      const relevant = predictions.filter(p => {
        if (!PROHIBITED_OBJECTS.includes(p.class)) return false;
        if (p.score < DEFAULT_CONFIDENCE_THRESHOLD) return false;

        const lastTime = lastReportRef.current[p.class] || 0;
        if (now - lastTime < DEBOUNCE_MS) return false;

        lastReportRef.current[p.class] = now;
        return true;
      });

      if (relevant.length > 0) {
        onDetect(relevant);
      }
    } catch (err) {
      if (!err.message?.includes('disposed')) {
        console.warn('Object detection frame error:', err.message);
      }
    }

    frameIdRef.current = requestAnimationFrame(detectFrame);
  };
};