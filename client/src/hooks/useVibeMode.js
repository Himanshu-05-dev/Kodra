import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * useVibeMode Hook
 * Provides energetic/chill aesthetic state and an optional gentle ambient synth soundscape
 * synthesized in real-time via the browser's Web Audio API.
 */
export function useVibeMode() {
  const [isVibeModeActive, setIsVibeModeActive] = useState(false);
  const audioCtxRef = useRef(null);
  const gainNodeRef = useRef(null);
  const oscRef = useRef([]);

  const startAmbientSound = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }

      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Master Gain
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.015, ctx.currentTime);
      masterGain.connect(ctx.destination);
      gainNodeRef.current = masterGain;

      // Lowpass Filter for soft warm lofi warmth
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, ctx.currentTime);
      filter.connect(masterGain);

      // Warm chord oscillators: 108Hz (A2), 162Hz (E3), 216Hz (A3)
      const freqs = [108, 162, 216];
      const oscillators = freqs.map((freq) => {
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        osc.connect(filter);
        osc.start();
        return osc;
      });

      oscRef.current = oscillators;
    } catch {
      // Audio not supported or blocked by autoplay
    }
  }, []);

  const stopAmbientSound = useCallback(() => {
    try {
      if (oscRef.current.length > 0) {
        oscRef.current.forEach((osc) => {
          try { osc.stop(); osc.disconnect(); } catch {}
        });
        oscRef.current = [];
      }
    } catch {}
  }, []);

  const toggleVibeMode = useCallback(() => {
    setIsVibeModeActive((prev) => {
      const next = !prev;
      if (next) {
        startAmbientSound();
      } else {
        stopAmbientSound();
      }
      return next;
    });
  }, [startAmbientSound, stopAmbientSound]);

  useEffect(() => {
    return () => {
      stopAmbientSound();
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, [stopAmbientSound]);

  return {
    isVibeModeActive,
    toggleVibeMode
  };
}
