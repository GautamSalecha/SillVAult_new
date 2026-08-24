import { useCallback, useRef, useState } from 'react';
import { Api } from './api';
import { getLanguage } from './languages';
import { getSpeechRecognitionCtor } from './voiceCapabilities';

function pickMimeType() {
  return ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find(
    (type) => window.MediaRecorder?.isTypeSupported?.(type),
  ) || '';
}

function extensionFor(type) {
  if (type.includes('mp4')) return 'm4a';
  if (type.includes('ogg')) return 'ogg';
  return 'webm';
}

// Final transcript always comes from the backend STT endpoint. Browser
// SpeechRecognition is used only for live captions, never as the text
// submitted to /ask, so interim fragments cannot become repeated messages.
export function useVoiceRecorder() {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const captionRef = useRef(null);

  const stopCaption = useCallback(() => {
    if (!captionRef.current) return;
    const rec = captionRef.current;
    captionRef.current = null;
    rec.onresult = null;
    rec.onerror = null;
    rec.onend = null;
    try { rec.stop(); } catch { /* noop */ }
  }, []);

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
      if (captionRef.current === rec) {
        try { rec.start(); } catch { /* captions are best effort */ }
      }
    };
    captionRef.current = rec;
    try { rec.start(); } catch { captionRef.current = null; }
  }, []);

  const start = useCallback(async (onResult, onError, onInterim) => {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      onError?.('This browser does not support audio recording.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = pickMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      const actualType = recorder.mimeType || mimeType || 'audio/webm';

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stopCaption();
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setRecording(false);
        setBusy(true);
        try {
          const blob = new Blob(chunksRef.current, { type: actualType });
          if (!blob.size) {
            onError?.("Couldn't hear anything in that recording. Please try again.");
            return;
          }
          const res = await Api.transcribe(blob, `audio.${extensionFor(actualType)}`);
          if (res?.transcript?.trim()) {
            onResult(res);
          } else {
            onError?.("Couldn't hear anything in that recording. Please try again.");
          }
        } catch (err) {
          onError?.(err.message || 'Transcription failed.');
        } finally {
          setBusy(false);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250);
      startCaption(onInterim);
      setRecording(true);
    } catch (err) {
      stopCaption();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      onError?.(err?.name === 'NotAllowedError' ? 'Microphone access denied.' : 'Could not start recording.');
    }
  }, [startCaption, stopCaption]);

  const stop = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      try { recorder.stop(); } catch { /* noop */ }
      return;
    }
    stopCaption();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setRecording(false);
  }, [stopCaption]);

  return { recording, busy, start, stop };
}
