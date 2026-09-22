/**
 * PRAXIS Master Director Choreography & Interactive Controller
 * Coordinates:
 * - 8.0s cinematic timeline at 24fps
 * - 4-Shot Camera transitions and micro-shake
 * - Lighting flashes and whiteout post-processing
 * - OrbitControls for Free-Cam mode
 * - UI Telemetry, timeline scrubber, and audio visualizer
 */

class PraxisDirector {
    constructor() {
        this.sceneEngine = null;
        this.controls = null;
        
        this.duration = 8.0;
        this.currentTime = 0.0;
        this.isPlaying = false;
        this.isFreeCam = false;
        this.hasStarted = false;

        // Flash & Shake State
        this.shakeIntensity = 0.0;
        this.whiteoutOpacity = 0.0;
        this.flashDecay = 0.0;

        // Shot Trigger Flags to prevent duplicate sound/event triggers
        this.shotTriggered = {
            shot1: false,
            shot2: false,
            shot3: false,
            shot4: false
        };

        this.init();
    }

    init() {
        const container = document.getElementById('webgl-container');
        this.sceneEngine = new PraxisScene(container);

        // OrbitControls for Free-Cam Mode
        if (typeof THREE.OrbitControls !== 'undefined') {
            this.controls = new THREE.OrbitControls(this.sceneEngine.camera, container);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.05;
            this.controls.maxDistance = 50;
            this.controls.minDistance = 1;
            this.controls.enabled = false; // Disabled by default in Director Cut
        }

        this.cacheDOMElements();
        this.bindEvents();
        this.setupVisualizer();

        // Start animation loop
        requestAnimationFrame((t) => this.tick(t));
    }

    cacheDOMElements() {
        this.dom = {
            curtain: document.getElementById('init-curtain'),
            startBtn: document.getElementById('btn-init-experience'),
            playPauseBtn: document.getElementById('btn-play-pause'),
            replayBtn: document.getElementById('btn-replay'),
            scrubber: document.getElementById('timeline-scrubber'),
            timecodeDisplay: document.getElementById('timecode-display'),
            frameDisplay: document.getElementById('frame-display'),
            shotTag: document.getElementById('shot-indicator-tag'),
            shotDesc: document.getElementById('shot-indicator-desc'),
            whiteoutOverlay: document.getElementById('whiteout-overlay'),
            cinemaLetterbox: document.getElementById('cinema-wrapper'),
            freeCamBtn: document.getElementById('btn-freecam'),
            muteBtn: document.getElementById('btn-mute'),
            volumeSlider: document.getElementById('volume-slider'),
            promptDrawer: document.getElementById('prompt-drawer'),
            drawerToggleBtn: document.getElementById('btn-toggle-drawer'),
            drawerCloseBtn: document.getElementById('btn-close-drawer'),
            visualizerCanvas: document.getElementById('audio-visualizer'),
            shotPills: document.querySelectorAll('.shot-pill')
        };
    }

    bindEvents() {
        // Initializer click to start AudioContext & Experience
        this.dom.startBtn.addEventListener('click', () => {
            this.dom.curtain.classList.add('hidden');
            window.cinematicAudio.init();
            this.hasStarted = true;
            this.play();
        });

        // Play / Pause
        this.dom.playPauseBtn.addEventListener('click', () => {
            if (this.isPlaying) this.pause();
            else this.play();
        });

        // Replay
        this.dom.replayBtn.addEventListener('click', () => {
            this.seekTo(0.0);
            this.play();
        });

        // Scrubber
        this.dom.scrubber.addEventListener('input', (e) => {
            const time = parseFloat(e.target.value);
            this.seekTo(time);
        });

        // Shot Pills Click
        this.dom.shotPills.forEach(pill => {
            pill.addEventListener('click', (e) => {
                const targetTime = parseFloat(pill.dataset.time);
                this.seekTo(targetTime);
                if (!this.isPlaying) this.play();
            });
        });

        // Free-Cam Toggle
        this.dom.freeCamBtn.addEventListener('click', () => {
            this.isFreeCam = !this.isFreeCam;
            if (this.controls) {
                this.controls.enabled = this.isFreeCam;
                if (this.isFreeCam) {
                    this.controls.target.set(0, 2.4, 0);
                    this.dom.freeCamBtn.classList.add('active');
                    this.dom.freeCamBtn.innerText = '🎥 DIRECTOR CUT';
                } else {
                    this.dom.freeCamBtn.classList.remove('active');
                    this.dom.freeCamBtn.innerText = '🕹️ FREE 3D ORBIT';
                }
            }
        });

        // Audio Controls
        this.dom.muteBtn.addEventListener('click', () => {
            const isMuted = window.cinematicAudio.toggleMute();
            this.dom.muteBtn.innerText = isMuted ? '🔇' : '🔊';
        });

        this.dom.volumeSlider.addEventListener('input', (e) => {
            window.cinematicAudio.setVolume(parseFloat(e.target.value));
        });

        // Prompt Drawer
        this.dom.drawerToggleBtn.addEventListener('click', () => {
            this.dom.promptDrawer.classList.toggle('open');
        });
        this.dom.drawerCloseBtn.addEventListener('click', () => {
            this.dom.promptDrawer.classList.remove('open');
        });

        // Keyboard shortcuts
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                if (this.isPlaying) this.pause();
                else this.play();
            } else if (e.code === 'KeyR') {
                this.seekTo(0.0);
                this.play();
            } else if (e.code === 'Digit1') {
                this.seekTo(0.0);
            } else if (e.code === 'Digit2') {
                this.seekTo(2.5);
            } else if (e.code === 'Digit3') {
                this.seekTo(4.5);
            } else if (e.code === 'Digit4') {
                this.seekTo(6.5);
            }
        });
    }

    play() {
        if (!this.hasStarted) return;
        this.isPlaying = true;
        this.dom.playPauseBtn.innerHTML = '⏸ PAUSE';
        if (this.currentTime >= this.duration) {
            this.seekTo(0.0);
        }
    }

    pause() {
        this.isPlaying = false;
        this.dom.playPauseBtn.innerHTML = '▶ PLAY';
    }

    seekTo(timeSec) {
        this.currentTime = Math.max(0, Math.min(this.duration, timeSec));
        this.dom.scrubber.value = this.currentTime;

        // Reset trigger states based on seek position
        this.shotTriggered.shot1 = this.currentTime >= 0.0 && this.currentTime < 2.5;
        this.shotTriggered.shot2 = this.currentTime >= 2.5;
        this.shotTriggered.shot3 = this.currentTime >= 4.5;
        this.shotTriggered.shot4 = this.currentTime >= 6.5;

        // Sync Audio state if seeking backwards
        if (this.currentTime < 2.5) {
            window.cinematicAudio.startStormAmbiance();
        } else if (this.currentTime >= 6.5) {
            window.cinematicAudio.stopStormAmbiance(0.1);
        }

        this.updateChoreography(0.0);
    }

    setupVisualizer() {
        this.visCanvas = this.dom.visualizerCanvas;
        if (!this.visCanvas) return;
        this.visCtx = this.visCanvas.getContext('2d');
        this.visCanvas.width = 160;
        this.visCanvas.height = 36;
    }

    drawVisualizer() {
        if (!this.visCtx) return;
        const data = window.cinematicAudio.getWaveformData();
        this.visCtx.clearRect(0, 0, this.visCanvas.width, this.visCanvas.height);

        if (!data) {
            // Idle subtle line
            this.visCtx.strokeStyle = 'rgba(0, 212, 255, 0.25)';
            this.visCtx.lineWidth = 1.5;
            this.visCtx.beginPath();
            this.visCtx.moveTo(0, 18);
            this.visCtx.lineTo(160, 18);
            this.visCtx.stroke();
            return;
        }

        const barWidth = (this.visCanvas.width / data.length) * 1.6;
        let x = 0;
        for (let i = 0; i < data.length; i++) {
            const barHeight = (data[i] / 255) * this.visCanvas.height * 0.9;
            const grad = this.visCtx.createLinearGradient(0, this.visCanvas.height, 0, 0);
            grad.addColorStop(0, 'rgba(0, 212, 255, 0.3)');
            grad.addColorStop(1, 'rgba(255, 184, 0, 0.9)');

            this.visCtx.fillStyle = grad;
            this.visCtx.fillRect(x, this.visCanvas.height - barHeight, barWidth - 1, barHeight);
            x += barWidth;
        }
    }

    updateChoreography(delta) {
        const time = this.currentTime;
        const cam = this.sceneEngine.camera;

        // Global Particle & Cloth Updates
        this.sceneEngine.updateCapeCloth(performance.now() * 0.001);
        this.sceneEngine.particles.updateTimeline(time, delta);
        this.sceneEngine.lightning.update(delta);

        // Active Shot Tracking & UI
        this.updateHUD(time);

        // --- SHOT 1: 0.0s – 2.5s (Dusk Storm & Armored Warrior) ---
        if (time < 2.5) {
            const t = time / 2.5; // 0 to 1
            this.sceneEngine.plateauGroup.visible = true;
            this.sceneEngine.warriorGroup.visible = true;
            this.sceneEngine.godRaysGroup.visible = true;
            this.sceneEngine.titleGroup.visible = false;
            this.sceneEngine.lightning.updateLetterArcs(false);

            // Lighting: Dusk Teal-Orange Atmosphere
            this.sceneEngine.renderer.toneMappingExposure = 1.15;
            this.sceneEngine.flashLight.intensity = 0.0;
            this.sceneEngine.titleKeyLight.intensity = 0.0;
            this.sceneEngine.titleRimCyan.intensity = 0.0;
            this.sceneEngine.titleRimGold.intensity = 0.0;

            // Trigger Shot 1 Audio Ambiance once
            if (!this.shotTriggered.shot1 && this.isPlaying) {
                window.cinematicAudio.startStormAmbiance();
                this.shotTriggered.shot1 = true;
            }

            // Camera: Low-angle hero dolly-in behind warrior, craning up
            if (!this.isFreeCam) {
                const startPos = new THREE.Vector3(0.0, 1.1, 6.2);
                const endPos = new THREE.Vector3(0.3, 3.1, 2.8);
                const startLook = new THREE.Vector3(0.0, 2.6, -1.2);
                const endLook = new THREE.Vector3(0.0, 3.4, -4.5);

                const ease = Math.pow(t, 1.2);
                cam.position.lerpVectors(startPos, endPos, ease);
                
                const curLook = new THREE.Vector3().lerpVectors(startLook, endLook, ease);
                cam.lookAt(curLook);

                // Handheld micro-shake
                this.applyMicroShake(cam, 0.015);
            }

            this.whiteoutOpacity = 0.0;
        }

        // --- SHOT 2: 2.5s – 4.5s (Lightning Detonation & Slow-Mo Shockwave) ---
        else if (time >= 2.5 && time < 4.5) {
            const t = (time - 2.5) / 2.0; // 0 to 1
            this.sceneEngine.plateauGroup.visible = true;
            this.sceneEngine.warriorGroup.visible = true;
            this.sceneEngine.godRaysGroup.visible = true;
            this.sceneEngine.titleGroup.visible = false;
            this.sceneEngine.lightning.updateLetterArcs(false);

            // Trigger Shot 2 Lightning Bolt & Audio Shockwave
            if (!this.shotTriggered.shot2 && this.isPlaying) {
                this.sceneEngine.lightning.strike(
                    new THREE.Vector3(3.0, 48.0, -6.0),
                    new THREE.Vector3(0.0, 0.5, -3.5)
                );
                window.cinematicAudio.triggerLightningDetonation();
                this.shakeIntensity = 0.45; // Violent camera shake
                this.flashDecay = 1.0;
                this.shotTriggered.shot2 = true;
            }

            // Flash point light decay
            if (this.flashDecay > 0) {
                this.flashDecay -= delta * 3.5;
                this.sceneEngine.flashLight.intensity = Math.max(0, this.flashDecay * 45.0);
            }

            // Camera: Orbital whip-pan right pushing into debris field
            if (!this.isFreeCam) {
                const startPos = new THREE.Vector3(0.3, 3.1, 2.8);
                // Orbit curve through +X
                const angle = t * Math.PI * 0.45;
                const radius = 3.2 - t * 0.8;
                const camX = Math.sin(angle) * radius + 0.3;
                const camZ = Math.cos(angle) * radius - t * 0.5;
                const camY = 3.1 - t * 0.7;

                cam.position.set(camX, camY, camZ);
                cam.lookAt(0, 1.8, -2.5);

                // Decay shake
                this.shakeIntensity = Math.max(0, this.shakeIntensity - delta * 0.8);
                this.applyMicroShake(cam, 0.02 + this.shakeIntensity);
            }

            this.whiteoutOpacity = 0.0;
        }

        // --- SHOT 3: 4.5s – 6.5s (Singularity Reverse Convergence & Whiteout) ---
        else if (time >= 4.5 && time < 6.5) {
            const t = (time - 4.5) / 2.0; // 0 to 1
            this.sceneEngine.plateauGroup.visible = true;
            this.sceneEngine.warriorGroup.visible = true;
            this.sceneEngine.godRaysGroup.visible = true;
            this.sceneEngine.titleGroup.visible = false;
            this.sceneEngine.lightning.updateLetterArcs(false);

            // Trigger Shot 3 Reverse Audio Whoosh
            if (!this.shotTriggered.shot3 && this.isPlaying) {
                window.cinematicAudio.triggerReverseConvergence();
                this.shotTriggered.shot3 = true;
            }

            // Camera: Rapid push-in toward singularity center (0, 2.2, 0)
            if (!this.isFreeCam) {
                const pushEase = Math.pow(t, 2.0);
                const startPos = new THREE.Vector3(2.2, 2.4, 1.8);
                const endPos = new THREE.Vector3(0.0, 2.2, 0.4);

                cam.position.lerpVectors(startPos, endPos, pushEase);
                cam.lookAt(0, 2.2, 0);

                this.applyMicroShake(cam, 0.025 + pushEase * 0.03);
            }

            // Exponential whiteout flash ramp near t = 6.5s
            if (t > 0.65) {
                const whiteoutT = (t - 0.65) / 0.35;
                this.whiteoutOpacity = Math.pow(whiteoutT, 2.5);
            } else {
                this.whiteoutOpacity = 0.0;
            }
        }

        // --- SHOT 4: 6.5s – 8.0s+ (Titanium & Gold PRAXIS Reveal + Residual Arcs) ---
        else {
            const t = (time - 6.5) / 1.5; // 0 to 1
            this.sceneEngine.plateauGroup.visible = false;
            this.sceneEngine.warriorGroup.visible = false;
            this.sceneEngine.godRaysGroup.visible = false;
            this.sceneEngine.titleGroup.visible = true;

            // Electric Arcs active across titanium letters
            this.sceneEngine.lightning.updateLetterArcs(true);

            // Trigger Shot 4 Reveal Gong / Impact
            if (!this.shotTriggered.shot4 && this.isPlaying) {
                window.cinematicAudio.triggerTitaniumReveal();
                this.shotTriggered.shot4 = true;
            }

            // Whiteout dissipates rapidly into deep black
            this.whiteoutOpacity = Math.max(0, 1.0 - t * 3.5);

            // Title showcase lighting
            this.sceneEngine.renderer.toneMappingExposure = 1.35;
            this.sceneEngine.titleKeyLight.intensity = 2.4;
            this.sceneEngine.titleRimCyan.intensity = 3.5;
            this.sceneEngine.titleRimGold.intensity = 3.0;

            // Camera: Settle on majestic PRAXIS wordmark with subtle floating micro-drift
            if (!this.isFreeCam) {
                const settlePos = new THREE.Vector3(
                    Math.sin(time * 0.4) * 0.35,
                    2.4 + Math.cos(time * 0.5) * 0.15,
                    6.8 - Math.min(0.8, t * 0.8)
                );
                cam.position.lerp(settlePos, 0.12);
                cam.lookAt(0, 2.4, 0);
            }
        }

        // Apply whiteout overlay opacity
        if (this.dom.whiteoutOverlay) {
            this.dom.whiteoutOverlay.style.opacity = this.whiteoutOpacity.toFixed(3);
        }
    }

    applyMicroShake(camera, magnitude) {
        const time = performance.now() * 0.01;
        camera.position.x += Math.sin(time * 3.7) * magnitude * 0.4;
        camera.position.y += Math.cos(time * 4.3) * magnitude * 0.3;
        camera.rotation.z += Math.sin(time * 2.5) * magnitude * 0.08;
    }

    updateHUD(time) {
        // Timecode Format 00:00:SS:FF (24fps)
        const totalFrames = Math.floor(time * 24);
        const seconds = Math.floor(time);
        const frames = totalFrames % 24;
        const pad = (n) => String(n).padStart(2, '0');
        const tcString = `00:00:${pad(seconds)}:${pad(frames)}`;

        this.dom.timecodeDisplay.innerText = tcString;
        this.dom.frameDisplay.innerText = `FRAME ${String(totalFrames).padStart(4, '0')} / 0192 [24 FPS]`;

        // Update Shot Pill Active Classes
        let activeShot = 1;
        let shotName = 'SHOT 1: THE STORM & WARRIOR';
        let shotDesc = 'Extreme low-angle hero dolly-in behind armored warrior on shattered stone plateau at dusk';

        if (time >= 2.5 && time < 4.5) {
            activeShot = 2;
            shotName = 'SHOT 2: LIGHTNING DETONATION';
            shotDesc = 'Lightning strike shockwave ripples out; rock and molten metal explode in 240fps slow-motion';
        } else if (time >= 4.5 && time < 6.5) {
            activeShot = 3;
            shotName = 'SHOT 3: REVERSE SINGULARITY';
            shotDesc = 'Molten fragments reverse direction and streak inward into white-hot convergence singularity';
        } else if (time >= 6.5) {
            activeShot = 4;
            shotName = 'SHOT 4: PRAXIS TITANIUM REVEAL';
            shotDesc = 'Whiteout clears to reveal brushed titanium & gold PRAXIS emblem with residual electric-blue arcs';
        }

        this.dom.shotTag.innerText = shotName;
        this.dom.shotDesc.innerText = shotDesc;

        this.dom.shotPills.forEach(pill => {
            if (parseInt(pill.dataset.shot) === activeShot) {
                pill.classList.add('active');
            } else {
                pill.classList.remove('active');
            }
        });
    }

    tick(now) {
        requestAnimationFrame((t) => this.tick(t));

        const delta = Math.min(this.sceneEngine.clock.getDelta(), 0.1);

        if (this.isPlaying) {
            this.currentTime += delta;
            if (this.currentTime > this.duration) {
                this.currentTime = this.duration;
                this.pause();
            }
            this.dom.scrubber.value = this.currentTime;
        }

        if (this.controls && this.isFreeCam) {
            this.controls.update();
        }

        this.updateChoreography(delta);
        this.sceneEngine.render();
        this.drawVisualizer();
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.director = new PraxisDirector();
});
