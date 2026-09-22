/**
 * PRAXIS Cinematic Sound Engine (Web Audio API)
 * Fully procedural synthesized sound design for the 8-second cinematic sequence:
 * - Storm Wind & Sub-bass Ambiance
 * - Lightning Detonation Shockwave (Braam & sub-bass drop)
 * - Reverse Singularity Whoosh & Ascension
 * - Titanium Emblem Gong/Impact Chime
 * - Residual Electric Plasma Arcs
 * - Real-time Waveform Analyser for HUD Visualizer
 */

class CinematicAudioEngine {
    constructor() {
        this.ctx = null;
        this.isMuted = false;
        this.volume = 0.85;
        this.isInitialized = false;

        this.masterGain = null;
        this.analyser = null;
        this.analyserData = null;

        this.ambientGain = null;
        this.ambientNodes = [];
        this.activeArcInterval = null;
    }

    init() {
        if (this.isInitialized) {
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
            return;
        }

        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContextClass();

        // Master Gain
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);

        // Analyser for UI visualizer
        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 64;
        this.analyser.smoothingTimeConstant = 0.8;
        this.analyserData = new Uint8Array(this.analyser.frequencyBinCount);

        // Dynamics Compressor for Hollywood-level punch and limiting
        const compressor = this.ctx.createDynamicsCompressor();
        compressor.threshold.setValueAtTime(-14, this.ctx.currentTime);
        compressor.knee.setValueAtTime(10, this.ctx.currentTime);
        compressor.ratio.setValueAtTime(8, this.ctx.currentTime);
        compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
        compressor.release.setValueAtTime(0.25, this.ctx.currentTime);

        this.masterGain.connect(compressor);
        compressor.connect(this.analyser);
        this.analyser.connect(this.ctx.destination);

        this.isInitialized = true;
    }

    setVolume(val) {
        this.volume = Math.max(0, Math.min(1, val));
        if (this.masterGain && this.ctx) {
            this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime, 0.05);
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.masterGain && this.ctx) {
            this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime, 0.05);
        }
        return this.isMuted;
    }

    getWaveformData() {
        if (!this.analyser || !this.analyserData) return null;
        this.analyser.getByteFrequencyData(this.analyserData);
        return this.analyserData;
    }

    // Helper: Create White/Pink Noise Buffer
    createNoiseBuffer(duration = 3) {
        if (!this.ctx) return null;
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
            // Brown-pink noise approximation for cinematic weight
            const white = Math.random() * 2 - 1;
            data[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = data[i];
            data[i] *= 3.5; // Gain boost
        }
        return buffer;
    }

    // --- SHOT 1: Ambient Storm Wind & Low-End Drone ---
    startStormAmbiance() {
        if (!this.ctx || this.ambientGain) return;

        this.ambientGain = this.ctx.createGain();
        this.ambientGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
        this.ambientGain.gain.linearRampToValueAtTime(0.35, this.ctx.currentTime + 1.2);
        this.ambientGain.connect(this.masterGain);

        // Wind noise filter sweep
        const noiseBuf = this.createNoiseBuffer(5);
        const noiseNode = this.ctx.createBufferSource();
        noiseNode.buffer = noiseBuf;
        noiseNode.loop = true;

        const windFilter = this.ctx.createBiquadFilter();
        windFilter.type = 'bandpass';
        windFilter.frequency.setValueAtTime(320, this.ctx.currentTime);
        windFilter.Q.setValueAtTime(3.0, this.ctx.currentTime);

        // LFO for howling wind variation
        const lfo = this.ctx.createOscillator();
        lfo.frequency.setValueAtTime(0.3, this.ctx.currentTime);
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.setValueAtTime(180, this.ctx.currentTime);
        lfo.connect(lfoGain);
        lfoGain.connect(windFilter.frequency);
        lfo.start();

        // Sub-bass drone for cinematic tension
        const subOsc = this.ctx.createOscillator();
        subOsc.type = 'sawtooth';
        subOsc.frequency.setValueAtTime(55, this.ctx.currentTime); // A1 note

        const subFilter = this.ctx.createBiquadFilter();
        subFilter.type = 'lowpass';
        subFilter.frequency.setValueAtTime(95, this.ctx.currentTime);

        const subGain = this.ctx.createGain();
        subGain.gain.setValueAtTime(0.4, this.ctx.currentTime);

        noiseNode.connect(windFilter);
        windFilter.connect(this.ambientGain);

        subOsc.connect(subFilter);
        subFilter.connect(subGain);
        subGain.connect(this.ambientGain);

        noiseNode.start();
        subOsc.start();

        this.ambientNodes = [noiseNode, lfo, subOsc];
    }

    stopStormAmbiance(fadeDuration = 0.5) {
        if (!this.ctx || !this.ambientGain) return;
        this.ambientGain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + fadeDuration);
        setTimeout(() => {
            this.ambientNodes.forEach(node => {
                try { node.stop(); } catch(e) {}
            });
            this.ambientNodes = [];
            this.ambientGain = null;
        }, fadeDuration * 1000 + 100);
    }

    // --- SHOT 2: Lightning Strike Detonation & Shockwave Braam ---
    triggerLightningDetonation() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        // 1. Blinding high-frequency crack
        const crackBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.15, this.ctx.sampleRate);
        const cData = crackBuffer.getChannelData(0);
        for (let i = 0; i < cData.length; i++) {
            cData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.02));
        }
        const crackSource = this.ctx.createBufferSource();
        crackSource.buffer = crackBuffer;
        const crackFilter = this.ctx.createBiquadFilter();
        crackFilter.type = 'highpass';
        crackFilter.frequency.setValueAtTime(1500, now);
        const crackGain = this.ctx.createGain();
        crackGain.gain.setValueAtTime(1.0, now);
        crackSource.connect(crackFilter);
        crackFilter.connect(crackGain);
        crackGain.connect(this.masterGain);
        crackSource.start(now);

        // 2. Heavy Sub-bass Shockwave Detonation (BRAAM)
        const subOsc1 = this.ctx.createOscillator();
        const subOsc2 = this.ctx.createOscillator();
        subOsc1.type = 'sawtooth';
        subOsc2.type = 'triangle';

        // Pitch drop from 130Hz down to 34Hz
        subOsc1.frequency.setValueAtTime(130, now);
        subOsc1.frequency.exponentialRampToValueAtTime(34, now + 1.2);
        subOsc2.frequency.setValueAtTime(90, now);
        subOsc2.frequency.exponentialRampToValueAtTime(28, now + 1.5);

        const distFilter = this.ctx.createBiquadFilter();
        distFilter.type = 'lowpass';
        distFilter.frequency.setValueAtTime(450, now);
        distFilter.frequency.exponentialRampToValueAtTime(60, now + 2.0);

        const subGain = this.ctx.createGain();
        subGain.gain.setValueAtTime(1.0, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 2.4);

        subOsc1.connect(distFilter);
        subOsc2.connect(distFilter);
        distFilter.connect(subGain);
        subGain.connect(this.masterGain);

        subOsc1.start(now);
        subOsc2.start(now);
        subOsc1.stop(now + 2.5);
        subOsc2.stop(now + 2.5);

        // 3. Debris Scatter Impact Noise
        const debrisNoise = this.ctx.createBufferSource();
        debrisNoise.buffer = this.createNoiseBuffer(2.2);
        const debrisFilter = this.ctx.createBiquadFilter();
        debrisFilter.type = 'bandpass';
        debrisFilter.frequency.setValueAtTime(800, now);
        debrisFilter.frequency.exponentialRampToValueAtTime(180, now + 1.8);
        debrisFilter.Q.setValueAtTime(1.5, now);

        const debrisGain = this.ctx.createGain();
        debrisGain.gain.setValueAtTime(0.7, now + 0.05);
        debrisGain.gain.exponentialRampToValueAtTime(0.01, now + 2.0);

        debrisNoise.connect(debrisFilter);
        debrisFilter.connect(debrisGain);
        debrisGain.connect(this.masterGain);
        debrisNoise.start(now + 0.05);
        debrisNoise.stop(now + 2.2);
    }

    // --- SHOT 3: Reverse Convergence & Singularity Vortex ---
    triggerReverseConvergence() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const duration = 2.0;

        // 1. Exponential Inward Whoosh / Vacuum Inversion
        const whooshSource = this.ctx.createBufferSource();
        whooshSource.buffer = this.createNoiseBuffer(duration + 0.5);

        const whooshFilter = this.ctx.createBiquadFilter();
        whooshFilter.type = 'bandpass';
        whooshFilter.frequency.setValueAtTime(120, now);
        whooshFilter.frequency.exponentialRampToValueAtTime(2400, now + duration);
        whooshFilter.Q.setValueAtTime(4.0, now);

        const whooshGain = this.ctx.createGain();
        whooshGain.gain.setValueAtTime(0.05, now);
        whooshGain.gain.exponentialRampToValueAtTime(1.0, now + duration);

        whooshSource.connect(whooshFilter);
        whooshFilter.connect(whooshGain);
        whooshGain.connect(this.masterGain);

        whooshSource.start(now);
        whooshSource.stop(now + duration + 0.1);

        // 2. High-energy Singularity Pitch Riser
        const riserOsc = this.ctx.createOscillator();
        riserOsc.type = 'sine';
        riserOsc.frequency.setValueAtTime(180, now);
        riserOsc.frequency.exponentialRampToValueAtTime(1400, now + duration);

        const riserGain = this.ctx.createGain();
        riserGain.gain.setValueAtTime(0.01, now);
        riserGain.gain.linearRampToValueAtTime(0.45, now + duration);

        riserOsc.connect(riserGain);
        riserGain.connect(this.masterGain);

        riserOsc.start(now);
        riserOsc.stop(now + duration + 0.1);
    }

    // --- SHOT 4: Whiteout Flash, Titanium Emblem Impact & Electric Arcs ---
    triggerTitaniumReveal() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        // 1. Heavy Metallic Anvil / Gong Impact Chime
        const fundamental = 146.83; // D3 note
        const partials = [1, 2.02, 3.45, 5.12, 7.89];
        const gains = [0.6, 0.45, 0.3, 0.2, 0.1];

        partials.forEach((mult, idx) => {
            const osc = this.ctx.createOscillator();
            osc.type = idx === 0 ? 'triangle' : 'sine';
            osc.frequency.setValueAtTime(fundamental * mult, now);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(gains[idx], now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + (3.5 - idx * 0.4));

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(now);
            osc.stop(now + 3.8);
        });

        // 2. Sub impact thud
        const thudOsc = this.ctx.createOscillator();
        thudOsc.type = 'sine';
        thudOsc.frequency.setValueAtTime(80, now);
        thudOsc.frequency.exponentialRampToValueAtTime(25, now + 0.6);

        const thudGain = this.ctx.createGain();
        thudGain.gain.setValueAtTime(0.9, now);
        thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

        thudOsc.connect(thudGain);
        thudGain.connect(this.masterGain);
        thudOsc.start(now);
        thudOsc.stop(now + 0.9);

        // 3. Triumphant Cinematic Brass/Synth Chord (D-minor power voicing)
        const chordNotes = [73.42, 110.00, 146.83, 220.00, 261.63, 329.63]; // D2, A2, D3, A3, C4, E4
        chordNotes.forEach((freq, i) => {
            const chordOsc = this.ctx.createOscillator();
            chordOsc.type = 'sawtooth';
            chordOsc.frequency.setValueAtTime(freq, now + 0.05);

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(400 + i * 150, now);
            filter.frequency.linearRampToValueAtTime(1200 + i * 200, now + 1.5);
            filter.frequency.exponentialRampToValueAtTime(300, now + 4.5);

            const chordGain = this.ctx.createGain();
            chordGain.gain.setValueAtTime(0.001, now);
            chordGain.gain.linearRampToValueAtTime(0.12 / chordNotes.length * 2.5, now + 0.4);
            chordGain.gain.exponentialRampToValueAtTime(0.0001, now + 4.5);

            chordOsc.connect(filter);
            filter.connect(chordGain);
            chordGain.connect(this.masterGain);

            chordOsc.start(now + 0.05);
            chordOsc.stop(now + 4.6);
        });

        // 4. Start residual electric plasma crackles
        this.startElectricArcSound();
    }

    startElectricArcSound() {
        if (this.activeArcInterval) clearInterval(this.activeArcInterval);
        if (!this.ctx) return;

        let count = 0;
        this.activeArcInterval = setInterval(() => {
            if (!this.ctx || count > 18) {
                clearInterval(this.activeArcInterval);
                this.activeArcInterval = null;
                return;
            }
            count++;
            if (Math.random() > 0.45) {
                this.playSingleArcCrackle();
            }
        }, 140);
    }

    playSingleArcCrackle() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const duration = 0.04 + Math.random() * 0.05;

        const osc = this.ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(1200 + Math.random() * 2800, now);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(2000, now);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.15 + Math.random() * 0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + duration);
    }

    stopAll() {
        if (this.activeArcInterval) {
            clearInterval(this.activeArcInterval);
            this.activeArcInterval = null;
        }
        this.stopStormAmbiance(0.2);
    }
}

window.cinematicAudio = new CinematicAudioEngine();
