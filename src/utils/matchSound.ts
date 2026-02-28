/**
 * 매칭 시 5초간 "매칭 매칭" 사운드 반복 재생 (Web Audio API)
 */

const MATCH_SOUND_DURATION_MS = 5000;
const BEEP_INTERVAL_MS = 550; // 한 번의 "매칭 매칭" 반복 간격
const BEEP_FREQ = 880;
const BEEP_DURATION = 0.12;
const BEEP_GAP = 0.14; // 매칭 - 매칭 사이 간격

function playBeep(ctx: AudioContext, when: number): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = BEEP_FREQ;
  osc.type = 'sine';
  gain.gain.setValueAtTime(0.15, when);
  gain.gain.exponentialRampToValueAtTime(0.01, when + BEEP_DURATION);
  osc.start(when);
  osc.stop(when + BEEP_DURATION);
}

/** 한 번의 "매칭 매칭" (두 번 짧은 비프) 재생 */
function playMatchChime(ctx: AudioContext, when: number): void {
  playBeep(ctx, when);
  playBeep(ctx, when + BEEP_DURATION + BEEP_GAP);
}

let matchSoundStop: (() => void) | null = null;

/**
 * 매칭 사운드를 5초간 반복 재생합니다.
 * 이미 재생 중이면 기존 재생을 멈추고 새로 시작합니다.
 */
export function playMatchSoundLoop(): void {
  if (typeof window === 'undefined') return;
  const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;

  if (matchSoundStop) {
    matchSoundStop();
    matchSoundStop = null;
  }

  const ctx = new AudioContextClass();
  let cleared = false;

  const playOnce = () => {
    if (cleared) return;
    const when = ctx.currentTime;
    playMatchChime(ctx, when);
  };

  playOnce();
  const intervalId = setInterval(playOnce, BEEP_INTERVAL_MS);
  const timeoutId = setTimeout(() => {
    clearInterval(intervalId);
    cleared = true;
    try {
      ctx.close();
    } catch {
      // ignore
    }
    if (matchSoundStop === stop) matchSoundStop = null;
  }, MATCH_SOUND_DURATION_MS);

  const stop = () => {
    if (cleared) return;
    cleared = true;
    clearInterval(intervalId);
    clearTimeout(timeoutId);
    try {
      ctx.close();
    } catch {
      // ignore
    }
    if (matchSoundStop === stop) matchSoundStop = null;
  };

  matchSoundStop = stop;
}

/** 매칭 사운드 재생을 즉시 중지합니다 (예: 수락 버튼 클릭 시). */
export function stopMatchSound(): void {
  if (matchSoundStop) {
    matchSoundStop();
    matchSoundStop = null;
  }
}
