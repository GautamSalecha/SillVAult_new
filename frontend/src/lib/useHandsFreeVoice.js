import { useCallback, useEffect, useRef, useState } from 'react';
import { Api } from './api';
import { getLanguage } from './languages';
import { getSpeechRecognitionCtor } from './voiceCapabilities';

const SPEECH_LEVEL = 8;
const SILENCE_MS = 1400;
const MIN_TURN_MS = 900;
const MAX_TURN_MS = 25000;
const BARGE_IN_LEVEL = 24;
const BARGE_IN_MS = 360;

function pickMimeType() {
  return ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find(
    (type) => window.MediaRecorder?.isTypeSupported?.(type),
  ) || '';
}

function extFor(type) {
  if (type.includes('mp4')) return 'm4a';
  if (type.includes('ogg')) return 'ogg';
  return 'webm';
}

export function useHandsFreeVoice() {
  const [micLevel, setMicLevel] = useState(0);
  const [sessionOpen, setSessionOpen] = useState(false);

  const streamRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const rafRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const captionRef = useRef(null);
  const activeTurnRef = useRef(null);
  const bargeRef = useRef(null);
  const bargeSinceRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => () => {
    mountedRef.current = false;
    closeEverything();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function closeCaption() {
    const rec = captionRef.current;
    if (!rec) return;
    captionRef.current = null;
    rec.onresult = null;
    rec.onerror = null;
    rec.onend = null;
    try { rec.stop(); } catch { /* noop */ }
  }

  function stopTracks() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  function closeEverything() {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    closeCaption();
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.onstop = null;
      recorderRef.current.ondataavailable = null;
      try { recorderRef.current.stop(); } catch { /* noop */ }
    }
    recorderRef.current = null;
    activeTurnRef.current = null;
    bargeRef.current = null;
    bargeSinceRef.current = null;
    stopTracks();
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {});
    }
    audioCtxRef.current = null;
    analyserRef.current = null;
    if (mountedRef.current) {
      setMicLevel(0);
      setSessionOpen(false);
    }
  }

  const tick = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;

    const data = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (const point of data) {
      const v = (point - 128) / 128;
      sum += v * v;
    }
    const level = Math.min(100, Math.round(Math.sqrt(sum / data.length) * 330));
    if (mountedRef.current) setMicLevel(level);

    const now = performance.now();
    const turn = activeTurnRef.current;
    if (turn) {
      if (level > SPEECH_LEVEL) {
        turn.lastSpeechAt = now;
        turn.heardSpeech = true;
      }
      const elapsed = now - turn.startedAt;
      const quietFor = turn.lastSpeechAt ? now - turn.lastSpeechAt : 0;
      if (elapsed >= MAX_TURN_MS || (turn.heardSpeech && elapsed >= MIN_TURN_MS && quietFor >= SILENCE_MS)) {
        stopListening();
      }
    }

    if (bargeRef.current) {
      if (level > BARGE_IN_LEVEL) {
        if (!bargeSinceRef.current) bargeSinceRef.current = now;
        if (now - bargeSinceRef.current >= BARGE_IN_MS) {
          const cb = bargeRef.current;
          bargeRef.current = null;
          bargeSinceRef.current = null;
          cb();
        }
      } else {
        bargeSinceRef.current = null;
      }
    }

    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const openSession = useCallback(async (onError) => {
    if (streamRef.current) return true;
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      onError?.('This browser does not support reliable microphone recording. Use latest Chrome or Edge.');
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') await ctx.resume().catch(() => {});
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        audioCtxRef.current = ctx;
        analyserRef.current = analyser;
        rafRef.current = requestAnimationFrame(tick);
      }

      if (mountedRef.current) setSessionOpen(true);
      return true;
    } catch (err) {
      onError?.(err?.name === 'NotAllowedError' ? 'Microphone access was denied.' : 'Could not open the microphone.');
      return false;
    }
  }, [tick]);

  const startCaption = useCallback((onInterim) => {
    const SpeechRecognition = getSpeechRecognitionCtor();
    if (!SpeechRecognition || !onInterim) return;
    const rec = new SpeechRecognition();
    rec.lang = getLanguage();
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (event) => {
      let text = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        text += event.results[i][0]?.transcript || '';
      }
      onInterim(text.trim());
    };
    rec.onerror = () => {};
    rec.onend = () => {
      if (captionRef.current === rec && activeTurnRef.current) {
        try { rec.start(); } catch { /* best effort captions */ }
      }
    };
    captionRef.current = rec;
    try { rec.start(); } catch { captionRef.current = null; }
  }, []);

  const listenOnce = useCallback((onResult, onError, onInterim) => {
    const stream = streamRef.current;
    if (!stream) {
      onError?.('Mic session is not open yet.');
      return;
    }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') return;

    const mimeType = pickMimeType();
    const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    const actualType = recorder.mimeType || mimeType || 'audio/webm';
    chunksRef.current = [];

    recorder.ondataavailable = (event) => {
      if (event.data?.size) chunksRef.current.push(event.data);
    };

    recorder.onstop = async () => {
      closeCaption();
      recorderRef.current = null;
      activeTurnRef.current = null;
      try {
        const blob = new Blob(chunksRef.current, { type: actualType });
        if (!blob.size) {
          onError?.('__EMPTY__');
          return;
        }
        const res = await Api.transcribe(blob, `audio.${extFor(actualType)}`);
        if (!res?.transcript?.trim()) {
          onError?.('__EMPTY__');
          return;
        }
        onResult(res);
      } catch (err) {
        onError?.(err.message || 'Could not transcribe that question.');
      }
    };

    recorder.onerror = () => {
      closeCaption();
      recorderRef.current = null;
      activeTurnRef.current = null;
      onError?.('Recording failed unexpectedly.');
    };

    recorderRef.current = recorder;
    activeTurnRef.current = {
      startedAt: performance.now(),
      lastSpeechAt: null,
      heardSpeech: false,
    };
    startCaption(onInterim);
    recorder.start(250);
  }, [startCaption]);

  function stopListening() {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      try { recorder.stop(); } catch { /* noop */ }
    }
  }

  const cancelTurn = useCallback(() => {
    closeCaption();
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.onstop = null;
      recorderRef.current.ondataavailable = null;
      try { recorderRef.current.stop(); } catch { /* noop */ }
    }
    recorderRef.current = null;
    activeTurnRef.current = null;
  }, []);

  const closeSession = useCallback(() => {
    closeEverything();
  }, []);

  const watchForBargeIn = useCallback((onSpeech) => {
    bargeRef.current = onSpeech;
    bargeSinceRef.current = null;
  }, []);

  const clearBargeInWatch = useCallback(() => {
    bargeRef.current = null;
    bargeSinceRef.current = null;
  }, []);

  return {
    sessionOpen,
    micLevel,
    openSession,
    closeSession,
    listenOnce,
    stopListening,
    cancelTurn,
    watchForBargeIn,
    clearBargeInWatch,
  };
}
