import { useEffect, useRef } from 'react';

/**
 * useBrowserEventsMonitoring
 * Edge-side browser behaviour monitoring — all checks run in-browser.
 *
 * Detects:
 * - Tab switching / window blur
 * - Fullscreen exit
 * - Copy / Paste / Cut attempts
 * - Right-click (context menu)
 * - Dev tools open (viewport height heuristic)
 * - Keyboard shortcuts (Ctrl+C, Ctrl+V, F12, Ctrl+Shift+I/J/C)
 *
 * Each event is debounced to avoid flooding the server.
 * Calls onEvent(eventType, confidence, metadata) for each detection.
 */
export const useBrowserEventsMonitoring = (onEvent, enabled = true) => {
  const lastEventTimeRef = useRef({});

  const debounced = (key, callback, ms = 3000) => {
    const now = Date.now();
    const last = lastEventTimeRef.current[key] || 0;
    if (now - last < ms) return;
    lastEventTimeRef.current[key] = now;
    callback();
  };

  useEffect(() => {
    if (!enabled || !onEvent) return;

    // ── Tab switching / window blur ─────────────────────────────
    const onVisibilityChange = () => {
      if (document.hidden) {
        debounced('tab-switch', () => {
          onEvent('Tab Switching', 0.92, { reason: 'document_hidden', ts: Date.now() });
        }, 2000);
      }
    };

    const onWindowBlur = () => {
      debounced('window-blur', () => {
        onEvent('Tab Switching', 0.80, { reason: 'window_blur', ts: Date.now() });
      }, 4000);
    };

    // ── Fullscreen exit ──────────────────────────────────────────
    const onFullscreenChange = () => {
      const isFullscreen =
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement;
      if (!isFullscreen) {
        debounced('fullscreen-exit', () => {
          onEvent('Fullscreen Exit', 0.85, { reason: 'fullscreen_change' });
        }, 5000);
      }
    };

    // ── Copy / Paste / Cut ───────────────────────────────────────
    const onCopy = () => {
      debounced('copy', () => {
        onEvent('Copy Paste', 0.75, { action: 'copy', selection: window.getSelection()?.toString()?.slice(0, 80) });
      }, 3000);
    };
    const onPaste = () => {
      debounced('paste', () => {
        onEvent('Copy Paste', 0.80, { action: 'paste' });
      }, 3000);
    };
    const onCut = () => {
      debounced('cut', () => {
        onEvent('Copy Paste', 0.75, { action: 'cut' });
      }, 3000);
    };

    // ── Right-click ──────────────────────────────────────────────
    const onContextMenu = (e) => {
      e.preventDefault();
      debounced('context-menu', () => {
        onEvent('Copy Paste', 0.65, { action: 'right_click' });
      }, 5000);
    };

    // ── Keyboard shortcuts ───────────────────────────────────────
    const onKeyDown = (e) => {
      const ctrl = e.ctrlKey || e.metaKey;

      // F12 or Ctrl+Shift+I/J/C → Dev tools
      if (
        e.key === 'F12' ||
        (ctrl && e.shiftKey && ['i', 'j', 'c', 'I', 'J', 'C'].includes(e.key))
      ) {
        e.preventDefault();
        debounced('devtools-key', () => {
          onEvent('Dev Tools Open', 0.85, { key: e.key, combo: 'keyboard_shortcut' });
        }, 5000);
        return;
      }

      // Ctrl+C / Ctrl+X / Ctrl+V
      if (ctrl && e.key === 'c') debounced('copy-key', () => onEvent('Copy Paste', 0.70, { action: 'ctrl_c' }), 3000);
      if (ctrl && e.key === 'v') debounced('paste-key', () => onEvent('Copy Paste', 0.75, { action: 'ctrl_v' }), 3000);
      if (ctrl && e.key === 'x') debounced('cut-key', () => onEvent('Copy Paste', 0.70, { action: 'ctrl_x' }), 3000);

      // Prevent printing
      if (ctrl && e.key === 'p') e.preventDefault();

      // Prevent opening new tab / window
      if (ctrl && (e.key === 't' || e.key === 'n')) e.preventDefault();
    };

    // ── Dev tools (viewport heuristic) ──────────────────────────
    let lastHeight = window.innerHeight;
    const onResize = () => {
      const delta = Math.abs(window.innerHeight - lastHeight);
      if (delta > 160) {
        debounced('devtools-resize', () => {
          onEvent('Dev Tools Open', 0.65, { delta, method: 'viewport_shrink' });
        }, 8000);
      }
      lastHeight = window.innerHeight;
    };

    // ── Register all listeners ───────────────────────────────────
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', onWindowBlur);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    document.addEventListener('mozfullscreenchange', onFullscreenChange);
    document.addEventListener('MSFullscreenChange', onFullscreenChange);
    document.addEventListener('copy', onCopy);
    document.addEventListener('paste', onPaste);
    document.addEventListener('cut', onCut);
    document.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onResize);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur', onWindowBlur);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
      document.removeEventListener('mozfullscreenchange', onFullscreenChange);
      document.removeEventListener('MSFullscreenChange', onFullscreenChange);
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('paste', onPaste);
      document.removeEventListener('cut', onCut);
      document.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onResize);
    };
  }, [onEvent, enabled]); // eslint-disable-line react-hooks/exhaustive-deps
};
