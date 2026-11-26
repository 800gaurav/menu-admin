// =========================================================================
// High-Impact Restaurant POS Sound & Voice Alert Utility
// Provides:
// 1. Loud, penetrating dual-burst bell chime (~85-90% volume + compressor)
// 2. Clear SpeechSynthesis voice announcement ("New order on Table X!")
// 3. Global AudioContext unlocking on first user interaction
// 4. Desktop notification trigger
// =========================================================================

let sharedAudioContext = null;

/**
 * Get or initialize a shared AudioContext instance and resume if suspended.
 */
export const getSharedAudioContext = () => {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
    sharedAudioContext = new AudioContextClass();
  }

  if (sharedAudioContext.state === 'suspended') {
    sharedAudioContext.resume().catch(() => {});
  }

  return sharedAudioContext;
};

// Auto-unlock AudioContext on first touch / click / keypress anywhere on screen
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    try {
      const ctx = getSharedAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume();
      }
    } catch (e) {}
  };

  ['pointerdown', 'touchstart', 'mousedown', 'keydown'].forEach((eventName) => {
    window.addEventListener(eventName, unlockAudio, { passive: true, capture: true });
  });
}

/**
 * Play a bright, loud multi-tone restaurant bell chime.
 * Uses DynamicsCompressorNode to make it cut through busy restaurant ambient noise
 * without distortion or clipping.
 */
export const playLoudBellChime = () => {
  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Dynamics compressor for punchy, loud presence
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-20, now);
    compressor.knee.setValueAtTime(25, now);
    compressor.ratio.setValueAtTime(10, now);
    compressor.attack.setValueAtTime(0.003, now);
    compressor.release.setValueAtTime(0.25, now);
    compressor.connect(ctx.destination);

    // Master gain node (high volume ~0.85)
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.85, now);
    masterGain.connect(compressor);

    // Helper: Play a resonant bell chime strike (multi-harmonic)
    const playBellStrike = (startTime, fundamentalFreq, duration = 0.45) => {
      // 3 Harmonics: Fundamental + Octave + Fifth
      const harmonics = [
        { freq: fundamentalFreq, gain: 0.6, type: 'triangle' },
        { freq: fundamentalFreq * 1.5, gain: 0.35, type: 'sine' },
        { freq: fundamentalFreq * 2.0, gain: 0.25, type: 'sine' }
      ];

      harmonics.forEach(({ freq, gain, type }) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, startTime);

        // Fast attack, exponential decay for a crisp bell ring
        g.gain.setValueAtTime(0.001, startTime);
        g.gain.linearRampToValueAtTime(gain, startTime + 0.015);
        g.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        osc.connect(g);
        g.connect(masterGain);

        osc.start(startTime);
        osc.stop(startTime + duration + 0.05);
      });
    };

    // --- Burst 1: Ding-Dong! ---
    // Strike 1 (Ding - high): E5 (659.25 Hz)
    playBellStrike(now, 659.25, 0.35);
    // Strike 2 (Dong - higher bright chime): A5 (880 Hz)
    playBellStrike(now + 0.18, 880.0, 0.45);

    // --- Burst 2: Repeat Ding-Dong after short gap so it can't be missed ---
    playBellStrike(now + 0.55, 659.25, 0.35);
    playBellStrike(now + 0.73, 1046.5, 0.55); // C6 for bright final ring

  } catch (err) {
    console.warn('Loud bell chime error:', err);
  }
};

/**
 * Text-To-Speech announcement using Web SpeechSynthesis.
 * Speaks: "New order, Table 4" or "New order received" in a loud, clear voice.
 */
export const speakOrderVoice = (order = null) => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    // Cancel any ongoing speech so it speaks promptly
    window.speechSynthesis.cancel();

    const tableName = order?.tableName || '';
    const text = tableName
      ? `New order on ${tableName}!`
      : 'New order received!';

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = 1.0; // 100% maximum volume
    utterance.rate = 1.05;  // Slightly fast and clear
    utterance.pitch = 1.1;  // Crisp pitch

    // Prefer English/Hindi voices available in browser
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.lang.startsWith('en') || v.lang.startsWith('hi'));
    if (voice) utterance.voice = voice;

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Voice announcement error:', err);
  }
};

/**
 * Show a native desktop/browser notification if permission is granted.
 */
export const showOrderDesktopNotification = (order = null) => {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    try {
      const orderNum = order?.orderNumber ? `#${order.orderNumber}` : '';
      const table = order?.tableName ? `Table: ${order.tableName}` : 'Dine-In Order';
      const amount = order?.totalAmount ? ` • ₹${order.totalAmount}` : '';
      const title = `🔔 New Order ${orderNum}`;
      const body = `${table}${amount}\nTap to open order details.`;

      const notification = new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: `order-${order?._id || Date.now()}`,
        renotify: true
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (e) {
      console.warn('Desktop notification error:', e);
    }
  }
};

/**
 * Master notification function:
 * Plays the loud dual-burst bell chime + speaks voice announcement + triggers desktop notification.
 */
export const playOrderNotification = (order = null, options = {}) => {
  const { voice = true, desktop = true } = options;

  // 1. Play loud POS bell chime immediately
  playLoudBellChime();

  // 2. Speak voice announcement right after the first chime strike (~650ms)
  if (voice) {
    setTimeout(() => {
      speakOrderVoice(order);
    }, 650);
  }

  // 3. Show desktop notification
  if (desktop && order) {
    showOrderDesktopNotification(order);
  }
};
