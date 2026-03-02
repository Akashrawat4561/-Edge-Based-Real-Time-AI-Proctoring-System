import { useEffect, useRef } from 'react';

/**
 * useAudioMonitoring
 * Edge-side audio monitoring using the Web Audio API.
 *
 * Detects:
 * - Sudden noise spikes (background discussions, sudden sounds)
 * - Sustained elevated volume (multiple voices / background conversation)
 * - Whisper-like low-energy sustained sound
 *
 * Calls onEvent(eventType, confidence, metadata) for each anomaly.
 * No audio is ever sent to the server — analysis is purely local.
 */
export const useAudioMonitoring = (stream, onEvent, enabled = true) => {
  const rafRef = useRef(null);
  const contextRef = useRef(null);

  useEffect(() => {
    if (!enabled || !stream || !onEvent) return;

    let isMounted = true;
    let audioContext, analyser, source;

    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      contextRef.current = audioContext;
      source = audioContext.createMediaStreamSource(stream);
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
    } catch (err) {
      console.warn('Audio monitoring setup failed:', err.message);
      return;
    }

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    // State for baseline calibration
    let baselineRMS = 0;
    let calibrationFrames = 0;
    const CALIBRATION_FRAMES = 180; // ~3 seconds at 60fps
    const SPIKE_MULTIPLIER = 2.8;     // RMS must be N× baseline to trigger
    const SUSTAINED_MULTIPLIER = 1.8; // for sustained noise detection
    const SUSTAINED_FRAMES_THRESHOLD = 90; // ~1.5s of sustained noise
    let sustainedHighFrames = 0;

    // Debounce - avoid flooding events
    let lastSpikeTime = 0;
    let lastSustainedTime = 0;
    const SPIKE_DEBOUNCE_MS = 3000;
    const SUSTAINED_DEBOUNCE_MS = 8000;

    const computeRMS = () => {
      analyser.getByteTimeDomainData(dataArray);
      let sumSquares = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const v = (dataArray[i] - 128) / 128;
        sumSquares += v * v;
      }
      return Math.sqrt(sumSquares / dataArray.length);
    };

    const loop = () => {
      if (!isMounted) return;

      const rms = computeRMS();
      const now = Date.now();

      // Phase 1: calibrate baseline over first ~3s
      if (calibrationFrames < CALIBRATION_FRAMES) {
        baselineRMS = (baselineRMS * calibrationFrames + rms) / (calibrationFrames + 1);
        calibrationFrames++;
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      const spikeThreshold = baselineRMS * SPIKE_MULTIPLIER + 0.015;
      const sustainedThreshold = baselineRMS * SUSTAINED_MULTIPLIER + 0.01;

      // Sudden spike detection (noise burst, loud voice)
      if (rms > spikeThreshold && now - lastSpikeTime > SPIKE_DEBOUNCE_MS) {
        const confidence = Math.min(0.98, Math.max(0.6, (rms - spikeThreshold) * 15 + 0.6));
        onEvent('Noise Spike', parseFloat(confidence.toFixed(2)), {
          rms: parseFloat(rms.toFixed(4)),
          baseline: parseFloat(baselineRMS.toFixed(4)),
          ratio: parseFloat((rms / baselineRMS).toFixed(2)),
        });
        lastSpikeTime = now;
        sustainedHighFrames = 0; // reset sustained counter on spike
      }

      // Sustained elevated noise detection (conversation, multiple voices)
      if (rms > sustainedThreshold) {
        sustainedHighFrames++;
        if (sustainedHighFrames >= SUSTAINED_FRAMES_THRESHOLD &&
          now - lastSustainedTime > SUSTAINED_DEBOUNCE_MS) {
          const confidence = Math.min(0.95, Math.max(0.65, sustainedHighFrames / 200));
          onEvent('Multiple Voices', parseFloat(confidence.toFixed(2)), {
            rms: parseFloat(rms.toFixed(4)),
            baseline: parseFloat(baselineRMS.toFixed(4)),
            sustainedFrames: sustainedHighFrames,
          });
          lastSustainedTime = now;
          sustainedHighFrames = 0;
        }
      } else {
        // Decay sustained counter if noise drops below threshold
        sustainedHighFrames = Math.max(0, sustainedHighFrames - 3);
      }

      // Slowly adapt baseline to ambient conditions (long-term drift)
      baselineRMS = baselineRMS * 0.9995 + rms * 0.0005;

      rafRef.current = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      isMounted = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      try {
        source?.disconnect();
        analyser?.disconnect();
        audioContext?.close();
      } catch { }
    };
  }, [stream, onEvent, enabled]);
};
