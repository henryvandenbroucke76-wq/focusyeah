'use strict';
/* Synthesized sound: effects, ambience and gentle generative music (Web Audio, no sound files). */
const Sound = (() => {
  let ctx = null, master, sfxBus, musicBus, ambBus, rev, noiseBuf;
  let windSrc = null, windGain = null, windFilter = null;
  const AC = window.AudioContext || window.webkitAudioContext;
  function init() {
    if (ctx || !AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.connect(ctx.destination);
    sfxBus = ctx.createGain(); musicBus = ctx.createGain(); ambBus = ctx.createGain();
    // simple generated reverb
    rev = ctx.createConvolver();
    const len = ctx.sampleRate * 2.6, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    rev.buffer = ir;
    const revOut = ctx.createGain(); revOut.gain.value = 0.32; rev.connect(revOut); revOut.connect(master);
    for (const b of [sfxBus, musicBus, ambBus]) b.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    // wind: looping noise through a slowly moving low-pass
    windSrc = ctx.createBufferSource(); windSrc.buffer = noiseBuf; windSrc.loop = true;
    windFilter = ctx.createBiquadFilter(); windFilter.type = 'lowpass'; windFilter.frequency.value = 400; windFilter.Q.value = 0.7;
    windGain = ctx.createGain(); windGain.gain.value = 0;
    windSrc.connect(windFilter); windFilter.connect(windGain); windGain.connect(ambBus); windSrc.start();
    volumes();
  }
  for (const ev of ['pointerdown', 'keydown']) document.addEventListener(ev, () => { init(); if (ctx && ctx.state === 'suspended') ctx.resume(); }, { passive: true });
  function volumes() {
    if (!ctx) return;
    master.gain.value = Settings.vMaster;
    sfxBus.gain.value = Settings.vSfx;
    ambBus.gain.value = Settings.vSfx * 0.7;
    musicBus.gain.value = Settings.vMusic * 0.55;
  }
  const now = () => ctx.currentTime;
  function noise(o) {
    if (!ctx) return;
    const t = now() + (o.delay || 0), src = ctx.createBufferSource(); src.buffer = noiseBuf; src.playbackRate.value = o.rate || 1;
    const f = ctx.createBiquadFilter(); f.type = o.filter || 'bandpass'; f.frequency.value = o.freq || 1000; f.Q.value = o.q || 1;
    if (o.sweep) f.frequency.exponentialRampToValueAtTime(o.sweep, t + o.dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(o.gain || 0.3, t + (o.attack || 0.004)); g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    src.connect(f); f.connect(g); g.connect(o.out || sfxBus); if (o.wet) g.connect(rev);
    src.start(t, Math.random() * 1.5); src.stop(t + o.dur + 0.05);
  }
  function tone(o) {
    if (!ctx) return;
    const t = now() + (o.delay || 0), osc = ctx.createOscillator(); osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.freq, t); if (o.slide) osc.frequency.exponentialRampToValueAtTime(o.slide, t + o.dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(o.gain || 0.2, t + (o.attack || 0.005)); g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    osc.connect(g); g.connect(o.out || sfxBus); if (o.wet) g.connect(rev);
    osc.start(t); osc.stop(t + o.dur + 0.05);
  }
  function material(id) {
    const d = BLK[id]; if (!d) return 'stone';
    if ([B.GLASS, B.CRYSTAL, B.CRYSTAL_ROSE, B.CRYSTAL_CLUSTER, B.STARSTONE].includes(id)) return 'glass';
    if (d.cutLike || d.render === 'cross') return 'leaf';
    if ([B.SAND, B.GRAVEL, B.SNOW, B.ASH].includes(id)) return 'sand';
    if ([B.GRASS, B.DIRT, B.MUD, B.SWAMPGRASS, B.FARMLAND, B.PATH, B.HAY, B.THATCH].includes(id)) return 'dirt';
    if (d.tool === 'axe' || [B.PLANKS, B.PLANKS_DARK, B.LADDER, B.FENCE, B.CHEST, B.BARREL, B.CRATE, B.TABLE, B.BOOKSHELF].includes(id)) return 'wood';
    if (String(d.key).startsWith('WOOL') || id === B.BANNER) return 'cloth';
    if ([B.IRON_BLOCK, B.GOLD_BLOCK, B.RAIL, B.CAULDRON].includes(id)) return 'metal';
    return 'stone';
  }
  const MAT = {
    stone: { freq: 1500, q: 1.2, rate: 1 }, wood: { freq: 700, q: 2.5, rate: 0.8 }, dirt: { freq: 420, q: 0.8, rate: 0.6, filter: 'lowpass' },
    sand: { freq: 2600, q: 0.6, rate: 1.2, filter: 'highpass' }, leaf: { freq: 3000, q: 0.5, rate: 1.4, filter: 'highpass' },
    glass: { freq: 4200, q: 4, rate: 1.5 }, cloth: { freq: 600, q: 0.5, rate: 0.5, filter: 'lowpass' }, metal: { freq: 2200, q: 8, rate: 1 },
  };
  function matNoise(id, gain, dur) { const m = MAT[material(id)]; noise({ freq: m.freq * (0.9 + Math.random() * 0.2), q: m.q, rate: m.rate, filter: m.filter, gain, dur }); }
  // ---- ambience + music, ticked from the main loop
  let birdT = 3, cricketT = 2, fireT = 1, waterT = 2, musicT = 4, phraseLeft = 0;
  const DAY_SCALE = [0, 2, 4, 7, 9, 12, 14, 16], NIGHT_SCALE = [0, 3, 5, 7, 10, 12, 15];
  function pianoNote(midi, gain, dur) {
    const f = 440 * Math.pow(2, (midi - 69) / 12);
    tone({ freq: f, type: 'sine', gain: gain, dur: dur, attack: 0.008, out: musicBus, wet: true });
    tone({ freq: f * 2, type: 'triangle', gain: gain * 0.18, dur: dur * 0.5, attack: 0.004, out: musicBus, wet: true });
    tone({ freq: f * 3.01, type: 'sine', gain: gain * 0.06, dur: dur * 0.3, out: musicBus });
  }
  function update(dt, info) {
    if (!ctx || ctx.state !== 'running') return;
    const day = info.day, playing = info.playing;
    // wind gets stronger up high and in the highlands
    const wv = playing ? 0.05 + Math.min(0.12, Math.max(0, info.height - 30) * 0.004) + (info.biome === 4 ? 0.05 : 0) : 0.02;
    windGain.gain.setTargetAtTime(wv * (info.under ? 0.2 : 1), now(), 0.8);
    windFilter.frequency.setTargetAtTime(300 + Math.sin(now() * 0.13) * 160 + (info.under ? -200 : 0), now(), 1.5);
    if (!playing) return;
    birdT -= dt; cricketT -= dt; fireT -= dt; waterT -= dt; musicT -= dt;
    if (birdT <= 0) {
      birdT = 2 + Math.random() * 6;
      if (day > 0.55 && (info.biome === 0 || info.biome === 1 || info.biome === 2) && !info.under) {
        const base = 2200 + Math.random() * 1600, n = 2 + Math.floor(Math.random() * 4);
        for (let i = 0; i < n; i++) tone({ freq: base * (1 + Math.random() * 0.2), slide: base * (1.3 + Math.random() * 0.4), dur: 0.08 + Math.random() * 0.06, gain: 0.025, delay: i * 0.13, out: ambBus, wet: true });
      }
    }
    if (cricketT <= 0) {
      cricketT = 0.6 + Math.random() * 1.6;
      if (day < 0.45 && info.biome !== 5 && !info.under) for (let i = 0; i < 3; i++) tone({ freq: 4300 + Math.random() * 300, dur: 0.03, gain: 0.012, delay: i * 0.06, out: ambBus });
    }
    if (fireT <= 0) { fireT = 0.08 + Math.random() * 0.3; if (info.fireNear) noise({ freq: 1800 + Math.random() * 2500, q: 3, gain: 0.03 * info.fireNear, dur: 0.03 + Math.random() * 0.04, out: ambBus }); }
    if (waterT <= 0) { waterT = 0.8 + Math.random() * 1.5; if (info.waterNear) noise({ freq: 500, sweep: 900, q: 0.8, filter: 'lowpass', gain: 0.05, dur: 0.6, attack: 0.2, out: ambBus }); }
    // music: short soft phrases with long gentle rests
    if (musicT <= 0 && Settings.vMusic > 0) {
      const scale = day > 0.45 ? DAY_SCALE : NIGHT_SCALE, root = day > 0.45 ? 60 : 57;
      if (phraseLeft <= 0) { phraseLeft = 4 + Math.floor(Math.random() * 5); musicT = 6 + Math.random() * 8; pianoNote(root - 12 + scale[Math.floor(Math.random() * 3)], 0.06, 4.5); return; }
      phraseLeft--;
      const note = root + scale[Math.floor(Math.random() * scale.length)];
      pianoNote(note, 0.07, 2.8);
      if (Math.random() < 0.3) pianoNote(note - 12 + (Math.random() < 0.5 ? 7 : 4), 0.035, 3.2);
      musicT = 0.6 + Math.random() * 0.9;
    }
  }
  return {
    volumes, update,
    brk(id) { matNoise(id, 0.35, 0.22); matNoise(id, 0.18, 0.12); if (material(id) === 'glass') tone({ freq: 2400, slide: 1800, dur: 0.25, gain: 0.05 }); },
    dig(id) { matNoise(id, 0.12, 0.07); },
    place(id) { matNoise(id, 0.25, 0.1); tone({ freq: 140, slide: 90, dur: 0.08, gain: 0.08 }); },
    step(id) { matNoise(id, material(id) === 'stone' ? 0.06 : 0.08, 0.06); },
    pop() { tone({ freq: 700 + Math.random() * 200, slide: 1400, dur: 0.07, gain: 0.06 }); },
    swing() { noise({ freq: 600, sweep: 2400, q: 0.7, gain: 0.05, dur: 0.15, attack: 0.03 }); },
    hit() { tone({ freq: 160, slide: 70, dur: 0.12, gain: 0.18 }); noise({ freq: 900, q: 1, gain: 0.12, dur: 0.08 }); },
    hurt() { tone({ freq: 220, slide: 110, dur: 0.18, gain: 0.16, type: 'triangle' }); noise({ freq: 500, q: 0.8, gain: 0.1, dur: 0.12 }); },
    bow() { tone({ freq: 180, slide: 90, dur: 0.18, gain: 0.12, type: 'triangle' }); noise({ freq: 2500, sweep: 800, q: 1, gain: 0.06, dur: 0.18 }); },
    zap() { for (let i = 0; i < 6; i++) noise({ freq: 1500 + Math.random() * 4000, q: 2, gain: 0.08, dur: 0.05, delay: i * 0.03 }); tone({ freq: 90, slide: 40, dur: 0.4, gain: 0.12, type: 'sawtooth' }); },
    chest() { tone({ freq: 160, slide: 260, dur: 0.25, gain: 0.05, type: 'sawtooth' }); noise({ freq: 700, q: 2, gain: 0.08, dur: 0.15, delay: 0.15 }); },
    ui() { tone({ freq: 880, dur: 0.05, gain: 0.03 }); },
    eat() { for (let i = 0; i < 3; i++) noise({ freq: 1800, q: 1.5, gain: 0.08, dur: 0.06, delay: i * 0.12 }); },
    splash() { noise({ freq: 600, sweep: 2000, q: 0.6, filter: 'lowpass', gain: 0.2, dur: 0.5, attack: 0.02 }); },
    quest() { [0, 4, 7, 12].forEach((n, i) => { const f = 523.25 * Math.pow(2, n / 12); tone({ freq: f, dur: 1.2, gain: 0.07, delay: i * 0.11, wet: true }); tone({ freq: f * 2, dur: 0.6, gain: 0.02, delay: i * 0.11, wet: true }); }); },
    discover() { [0, 7, 12, 16].forEach((n, i) => tone({ freq: 261.6 * Math.pow(2, n / 12), dur: 2.6, gain: 0.05, attack: 0.4, delay: i * 0.18, wet: true, out: musicBus })); },
    death() { [12, 8, 5, 0].forEach((n, i) => tone({ freq: 220 * Math.pow(2, n / 12), dur: 0.9, gain: 0.06, delay: i * 0.22, wet: true })); },
  };
})();
