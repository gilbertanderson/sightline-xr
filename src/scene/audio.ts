import { AudioListener, PositionalAudio } from 'three';

/**
 * A small synthesized band loop (kick, hats, bass, pad) played through a positional
 * source on the stage, so it sounds like it comes from the front of the hall.
 * Nothing loads from a file; audio starts only after the visitor turns sound on.
 */
export function createShowAudio(listener: AudioListener) {
  const ctx = listener.context;
  const out = ctx.createGain();
  out.gain.value = 0.55;
  const positional = new PositionalAudio(listener);
  positional.setRefDistance(8);
  positional.setRolloffFactor(0.6);
  positional.setNodeSource(out as unknown as AudioBufferSourceNode);

  const bpm = 112;
  const step = 60 / bpm / 4;
  const bass = [45, 45, 52, 45, 48, 48, 43, 43];
  const noise = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

  let n = 0;
  let next = 0;
  let timer: number | undefined;

  function note(t: number, i: number) {
    if (i % 4 === 0) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.setValueAtTime(140, t);
      o.frequency.exponentialRampToValueAtTime(42, t + 0.18);
      g.gain.setValueAtTime(0.9, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + 0.32);
    }
    if (i % 2 === 1) {
      const src = ctx.createBufferSource();
      src.buffer = noise;
      const f = ctx.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.value = 7000;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.12, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
      src.connect(f).connect(g).connect(out);
      src.start(t);
      src.stop(t + 0.08);
    }
    if (i % 2 === 0) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = hz(bass[(i / 2) % bass.length] - 12);
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 520;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.22, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + step * 1.8);
      o.connect(f).connect(g).connect(out);
      o.start(t);
      o.stop(t + step * 2);
    }
    if (i % 32 === 0) {
      const root = bass[(i / 2) % bass.length];
      [0, 7, 12, 16].forEach((iv) => {
        const o = ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.value = hz(root + iv + 12);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.05, t + 0.4);
        g.gain.exponentialRampToValueAtTime(0.0001, t + step * 30);
        o.connect(g).connect(out);
        o.start(t);
        o.stop(t + step * 31);
      });
    }
  }

  function schedule() {
    while (next < ctx.currentTime + 0.15) {
      note(next, n++);
      next += step;
    }
  }

  return {
    positional,
    async start() {
      if (ctx.state !== 'running') await ctx.resume();
      next = ctx.currentTime + 0.05;
      clearInterval(timer);
      timer = window.setInterval(schedule, 40);
      out.gain.setTargetAtTime(0.55, ctx.currentTime, 0.1);
    },
    stop() {
      clearInterval(timer);
      out.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
    },
  };
}
