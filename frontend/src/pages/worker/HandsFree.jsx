import { useEffect, useRef, useState } from 'react';
import { Mic, Waves, Square, Volume2, VolumeX, AlertTriangle, X } from 'lucide-react';
import MachineSelect from '../../components/MachineSelect';
import { Api } from '../../lib/api';
import { useHandsFreeVoice } from '../../lib/useHandsFreeVoice';
import { useToast } from '../../lib/toast';
import { useHandsFreeSession } from '../../lib/workerSession';
import { useI18n } from '../../lib/i18n';
import { getBrowserVoice } from '../../lib/voiceCapabilities';

const KEY = 'sv_handsfree_prefs_v2';
function loadPrefs() {
  try {
    return { continuous: false, spoken: true, activation: 'ptt', ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return { continuous: false, spoken: true, activation: 'ptt' };
  }
}
function savePrefs(p) {
  localStorage.setItem(KEY, JSON.stringify(p));
}

const STATE = {
  OFF: 'off',
  IDLE: 'idle',
  LISTENING: 'listening',
  TRANSCRIBING: 'transcribing',
  THINKING: 'thinking',
  SPEAKING: 'speaking',
};

const DEFAULT_LANG = 'en-IN';

function makeId() {
  return (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `t${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function beep(freq, ms) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + ms / 1000);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + ms / 1000 + 0.02);
    osc.onended = () => ctx.close().catch(() => {});
  } catch { /* non-critical */ }
}

export default function HandsFree() {
  const { t } = useI18n();
  const [prefs, setPrefs] = useState(loadPrefs);
  const [machines, setMachines] = useState([]);
  const {
    hfMachine: machine, setHfMachine: setMachine,
    setHfBusy: setBusy,
    hfTranscript: transcript, setHfTranscript: setTranscript,
  } = useHandsFreeSession();

  const [state, setState] = useState(STATE.OFF);
  const [detectedLang, setDetectedLang] = useState(DEFAULT_LANG);
  const [bannerError, setBannerError] = useState(null);
  const [liveText, setLiveText] = useState('');
  const audioRef = useRef(null);
  const transcriptEndRef = useRef(null);
  const utteranceRef = useRef(null); // browser SpeechSynthesisUtterance currently playing, if any
  const { push } = useToast();
  const voice = useHandsFreeVoice();
  const stateRef = useRef(state);
  stateRef.current = state;
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;
  const machineRef = useRef(machine);
  machineRef.current = machine;

  useEffect(() => {
    Api.myMachines()
      .then((res) => {
        setMachines(res.machine_ids || []);
        if (res.machine_ids?.length && !machine) setMachine(res.machine_ids[0]);
      })
      .catch((err) => {
        console.error('[HandsFree] failed to load machines', err);
        push(err.message, 'error');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => {
    stopSpeaking();
    voice.closeSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [transcript.length, liveText]);

  function update(patch) {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    savePrefs(next);
  }

  function updateEntry(id, patch) {
    setTranscript((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }

  // Stops whichever TTS engine (Sarvam <audio> or browser SpeechSynthesis)
  // happens to be speaking right now - the three interrupt points below
  // (unmount, exit hands-free, tap-to-interrupt) all need to work
  // regardless of which one played this particular answer.
  function stopSpeaking() {
    audioRef.current?.pause();
    if (utteranceRef.current) {
      window.speechSynthesis?.cancel();
      utteranceRef.current = null;
    }
  }

  async function handleEnterHandsFree() {
    if (!machine) {
      push(t('noMachineAssignedYet'), 'info');
      return;
    }
    setBannerError(null);
    const ok = await voice.openSession((err) => {
      const msg = err || t('micErrorHandsFree');
      console.error('[HandsFree] openSession failed:', err);
      setBannerError(msg);
      push(msg, 'error');
    });
    if (!ok) return;
    startListeningTurn();
  }

  function handleExitHandsFree() {
    stopSpeaking();
    setLiveText('');
    voice.cancelTurn();
    voice.clearBargeInWatch();
    voice.closeSession();
    setState(STATE.OFF);
  }

  function startListeningTurn() {
    if (!machineRef.current) return;
    setState(STATE.LISTENING);
    setLiveText('');
    beep(760, 90);
    voice.listenOnce(
      ({ transcript: text, language_code }) => {
        setLiveText('');
        if (language_code) setDetectedLang(language_code);
        setState(STATE.THINKING);
        handleQuestion(text, language_code || detectedLang);
      },
      (err) => {
        setLiveText('');
        if (err === '__EMPTY__') {
          if (
            prefsRef.current.continuous &&
            (stateRef.current === STATE.LISTENING || stateRef.current === STATE.TRANSCRIBING)
          ) {
            startListeningTurn();
          } else {
            setState(STATE.IDLE);
          }
          return;
        }
        console.error('[HandsFree] listenOnce failed:', err);
        setState(STATE.IDLE);
        push(err || t('micErrorHandsFree'), 'error');
      },
      // onInterim - live, on-screen captions while the worker talks.
      // Only fires when voice.listenOnce is using the browser STT path;
      // the Sarvam fallback path has no interim results, so liveText
      // just stays empty for that turn (as it always did before Sarvam
      // finished transcribing).
      (interimText) => setLiveText(interimText),
    );
  }

  function stopListeningTurn() {
    setState(STATE.TRANSCRIBING);
    voice.stopListening();
  }

  async function handleQuestion(text, lang) {
    const id = makeId();
    setTranscript((prev) => [
      ...prev,
      { id, question: text, answer: null, sourcesUsed: 0, status: 'pending' },
    ]);
    setBusy(true);
    try {
      const res = await Api.ask(text, machineRef.current);
      updateEntry(id, {
        answer: res.answer,
        sourcesUsed: res.sources_used,
        status: 'answered',
      });
      setBusy(false);
      if (prefsRef.current.spoken) {
        await speak(res.answer, lang, id);
      } else {
        advanceAfterTurn();
      }
    } catch (err) {
      console.error('[HandsFree] /ask failed:', err);
      updateEntry(id, {
        status: 'error',
        errorMessage: err.message || t('answerErrorHandsFree'),
      });
      push(err.message || t('answerErrorHandsFree'), 'error');
      setBusy(false);
      advanceAfterTurn();
    }
  }

  function advanceAfterTurn() {
    if (
      prefsRef.current.continuous &&
      prefsRef.current.activation === 'auto' &&
      voice.sessionOpen
    ) {
      startListeningTurn();
    } else {
      setState(STATE.IDLE);
    }
  }

  async function speakViaSarvam(text, langCode, entryId) {
    const { blob } = await Api.speak(text, langCode);
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audioRef.current = audio;

    if (prefsRef.current.activation === 'auto') {
      voice.watchForBargeIn(() => {
        audio.pause();
        URL.revokeObjectURL(url);
        startListeningTurn();
      });
    }

    audio.onended = () => {
      URL.revokeObjectURL(url);
      voice.clearBargeInWatch();
      advanceAfterTurn();
    };
    audio.onerror = () => {
      console.error('[HandsFree] audio playback error for entry', entryId);
      URL.revokeObjectURL(url);
      voice.clearBargeInWatch();
      updateEntry(entryId, { audioFailed: true });
      advanceAfterTurn();
    };
    await audio.play();
  }

  function speakViaBrowser(voiceOpt, text, langCode, entryId) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voiceOpt;
    utterance.lang = langCode;
    utteranceRef.current = utterance;

    if (prefsRef.current.activation === 'auto') {
      voice.watchForBargeIn(() => {
        window.speechSynthesis.cancel();
        utteranceRef.current = null;
        startListeningTurn();
      });
    }

    utterance.onend = () => {
      utteranceRef.current = null;
      voice.clearBargeInWatch();
      advanceAfterTurn();
    };
    utterance.onerror = () => {
      utteranceRef.current = null;
      voice.clearBargeInWatch();
      // Browser voice failed mid-flight - fall back to Sarvam for this
      // turn rather than leaving the worker stuck with no audio.
      speakViaSarvam(text, langCode, entryId).catch(() => {
        updateEntry(entryId, { audioFailed: true });
        push(t('spokenAnswerError'), 'error');
        advanceAfterTurn();
      });
    };
    window.speechSynthesis.speak(utterance);
  }

  async function speak(text, lang, entryId) {
    setState(STATE.SPEAKING);
    const langCode = lang || detectedLang;
    const browserVoice = getBrowserVoice(langCode);
    if (browserVoice) {
      speakViaBrowser(browserVoice, text, langCode, entryId);
      return;
    }
    try {
      await speakViaSarvam(text, langCode, entryId);
    } catch (err) {
      console.error('[HandsFree] speak() failed:', err);
      updateEntry(entryId, { audioFailed: true });
      push(t('spokenAnswerError'), 'error');
      advanceAfterTurn();
    }
  }

  function handleMicTap() {
    if (state === STATE.OFF) {
      handleEnterHandsFree();
      return;
    }
    if (state === STATE.LISTENING) {
      if (prefs.activation === 'ptt') stopListeningTurn();
      return;
    }
    if (state === STATE.SPEAKING) {
      stopSpeaking();
      voice.clearBargeInWatch();
      advanceAfterTurn();
      return;
    }
    if (state === STATE.THINKING || state === STATE.TRANSCRIBING) return;
    if (state === STATE.IDLE) startListeningTurn();
  }

  const statusLabel = {
    [STATE.OFF]: t('statusTapToStart'),
    [STATE.IDLE]: prefs.activation === 'auto' ? t('statusIdleAuto') : t('statusIdlePtt'),
    [STATE.LISTENING]: prefs.activation === 'auto' ? t('statusListeningAuto') : t('statusListening'),
    [STATE.TRANSCRIBING]: t('transcribing'),
    [STATE.THINKING]: t('thinking'),
    [STATE.SPEAKING]: prefs.activation === 'auto' ? t('statusSpeakingBargeIn') : t('statusSpeaking'),
  }[state];

  const isBusyState = state === STATE.THINKING || state === STATE.TRANSCRIBING;
  const ringLevel = state === STATE.LISTENING ? Math.max(8, voice.micLevel) : 0;

  return (
    <div className="sv-handsfree-page">
      <div className="sv-handsfree-console">
        <div className="sv-handsfree-hero">
          <span className="sv-kicker"><Waves size={14} /> Hands-free command mode</span>
          <h1>{t('handsFreeTitle')}</h1>
          <p>{t('handsFreeSubtitle')}</p>
        </div>

        <div className="sv-handsfree-machine">
          {machines.length > 0 ? (
            <MachineSelect
              value={machine}
              onChange={setMachine}
              machines={machines}
              disabled={state !== STATE.OFF}
            />
          ) : (
            <span style={{ fontSize: 13, color: 'var(--sv-muted)' }}>
              {t('noMachinesAssigned')}
            </span>
          )}
        </div>

        {bannerError && (
          <div
            role="alert"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              padding: '10px 12px',
              marginBottom: 14,
              borderRadius: 12,
              background: 'var(--sv-danger-soft, #fee2e2)',
              border: '1px solid var(--sv-danger, #ef4444)',
            }}
          >
            <AlertTriangle size={16} color="var(--sv-danger, #ef4444)" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 13, color: 'var(--sv-ink)', flex: 1, margin: 0 }}>{bannerError}</p>
            <button
              onClick={() => setBannerError(null)}
              aria-label={t('close')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--sv-muted)', flexShrink: 0 }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Mic card */}
        <div className="sv-handsfree-orb-card">
          <div className={`sv-handsfree-orb sv-handsfree-orb--${state}`}>
            {state === STATE.LISTENING && (
              <div
                className="sv-handsfree-orb__level"
                style={{ inset: -Math.round(ringLevel * 0.45) }}
              />
            )}
            <button
              onClick={handleMicTap}
              disabled={isBusyState}
              className="sv-handsfree-orb__button"
              aria-label={state === STATE.LISTENING ? t('stopListeningAria') : t('startListeningAria')}
            >
              {state === STATE.SPEAKING ? (
                <Volume2 size={38} color="#fff" />
              ) : (
                <Mic size={38} color="#fff" />
              )}
            </button>
          </div>

          <p
            aria-live="polite"
            className="sv-handsfree-status"
          >
            <Waves size={15} />
            {statusLabel}
          </p>

          {/* Live caption while speaking */}
          {state === STATE.LISTENING && (
            <div
              className="sv-handsfree-caption"
            >
              {liveText || 'Speak now… your words will appear here'}
            </div>
          )}

          {state === STATE.LISTENING && prefs.activation === 'ptt' && (
            <button
              onClick={stopListeningTurn}
              className="sv-btn sv-btn--outline"
              style={{ marginTop: 12, fontSize: 13, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Square size={12} /> {t('tapAgainToStop')}
            </button>
          )}

          {state !== STATE.OFF && (
            <button
              onClick={handleExitHandsFree}
              style={{
                marginTop: 14,
                fontSize: 12,
                color: 'var(--sv-muted)',
                background: 'none',
                border: 'none',
                textDecoration: 'underline',
                cursor: 'pointer',
              }}
            >
              {t('exitHandsFree')}
            </button>
          )}
        </div>

        {/* Transcript */}
        <div className="sv-handsfree-transcript">
          {transcript.length === 0 ? (
            <p
              style={{
                fontSize: 13,
                color: 'var(--sv-muted)',
                textAlign: 'center',
                marginTop: 8,
              }}
            >
              {t('transcriptEmptyHint')}
            </p>
          ) : (
            transcript.map((entry) => (
              <TranscriptTurn
                key={entry.id}
                entry={entry}
                t={t}
                onRetryListen={startListeningTurn}
                state={state}
              />
            ))
          )}
          <div ref={transcriptEndRef} />
        </div>

        {/* Settings */}
        <div className="sv-handsfree-settings">
          <ToggleRow
            title={t('continuousListeningTitle')}
            note={t('continuousListeningNote')}
            value={prefs.continuous}
            onChange={(v) => update({ continuous: v })}
          />
          <ToggleRow
            title={t('speakAnswersTitle')}
            note={t('speakAnswersNote')}
            value={prefs.spoken}
            onChange={(v) => update({ spoken: v })}
          />
          <div className="sv-card" style={{ borderRadius: 14, padding: 14 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--sv-ink)', margin: '0 0 2px' }}>
              {t('activationTitle')}
            </p>
            <p style={{ fontSize: 12, color: 'var(--sv-muted)', margin: '0 0 10px' }}>
              {t('activationNote')}
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              {['auto', 'ptt'].map((mode) => (
                <button
                  key={mode}
                  disabled={state !== STATE.OFF && state !== STATE.IDLE}
                  onClick={() => update({ activation: mode })}
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    padding: '8px 14px',
                    borderRadius: 999,
                    background:
                      prefs.activation === mode
                        ? 'var(--sv-activation-bg, var(--sv-brass, #b8860b))'
                        : 'transparent',
                    color:
                      prefs.activation === mode
                        ? 'var(--sv-activation-text, #fff)'
                        : 'var(--sv-muted)',
                    border: `1px solid ${
                      prefs.activation === mode
                        ? 'var(--sv-activation-bg, var(--sv-brass, #b8860b))'
                        : 'var(--sv-border, #ccc)'
                    }`,
                    cursor:
                      state !== STATE.OFF && state !== STATE.IDLE ? 'not-allowed' : 'pointer',
                  }}
                >
                  {mode === 'auto' ? t('activationAuto') : t('activationPtt')}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TranscriptTurn({ entry, t, onRetryListen, state }) {
  const isPending = entry.status === 'pending';
  const isError = entry.status === 'error';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div
        style={{
          alignSelf: 'flex-end',
          maxWidth: '88%',
          background: 'var(--sv-question-bg, var(--sv-brass, #b8860b))',
          color: 'var(--sv-question-text, #fff)',
          borderRadius: '14px 14px 4px 14px',
          padding: '10px 14px',
          fontSize: 14,
          lineHeight: 1.4,
        }}
      >
        {entry.question}
      </div>
      {isPending && (
        <div style={{ alignSelf: 'flex-start', fontSize: 13, color: 'var(--sv-muted)', padding: '4px 6px' }}>
          {t('thinking')}
        </div>
      )}
      {isError && (
        <div
          style={{
            alignSelf: 'flex-start',
            maxWidth: '92%',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--sv-danger-soft, #fee2e2)',
            border: '1px solid var(--sv-danger, #ef4444)',
            borderRadius: 12,
            padding: '10px 12px',
          }}
        >
          <AlertTriangle size={14} color="var(--sv-danger, #ef4444)" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: 'var(--sv-ink)', flex: 1 }}>
            {entry.errorMessage || t('answerErrorHandsFree')}
          </span>
          {(state === 'idle' || state === 'off') && (
            <button
              onClick={onRetryListen}
              className="sv-btn sv-btn--outline"
              style={{ fontSize: 11, padding: '4px 10px', flexShrink: 0 }}
            >
              {t('retryTurn')}
            </button>
          )}
        </div>
      )}
      {entry.status === 'answered' && (
        <div
          style={{
            alignSelf: 'flex-start',
            maxWidth: '92%',
            background: 'var(--sv-surface, var(--sv-card, #fff))',
            border: '1px solid var(--sv-border, #e5e5e5)',
            borderRadius: '14px 14px 14px 4px',
            padding: '10px 14px',
          }}
        >
          <p style={{ fontSize: 14, color: 'var(--sv-ink)', margin: 0, lineHeight: 1.45 }}>
            {entry.answer}
          </p>
          {entry.audioFailed && (
            <p
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11,
                color: 'var(--sv-muted)',
                margin: '8px 0 0',
              }}
            >
              <VolumeX size={12} /> {t('audioUnavailable')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ToggleRow({ title, note, value, onChange }) {
  return (
    <div
      className="sv-card"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        borderRadius: 14,
        padding: 14,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--sv-ink)', margin: 0 }}>{title}</p>
        <p style={{ fontSize: 12, color: 'var(--sv-muted)', margin: '2px 0 0' }}>{note}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        aria-pressed={value}
        aria-label={title}
        style={{
          width: 44,
          height: 26,
          borderRadius: 999,
          position: 'relative',
          background: value ? 'var(--sv-teal, #0d9488)' : 'var(--sv-border, #ccc)',
          flexShrink: 0,
          border: 'none',
          cursor: 'pointer',
        }}
      >
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: '#fff',
            position: 'absolute',
            top: 3,
            left: value ? 21 : 3,
            transition: 'left 0.15s ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }}
        />
      </button>
    </div>
  );
}
