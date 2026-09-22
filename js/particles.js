/**
 * PRAXIS Particle Dynamics & Debris Physics Engine
 * Handles:
 * 1. Slow-motion atmospheric embers and ash drifting in the storm
 * 2. 450+ 3D molten metal and rock shards with 2-phase trajectory:
 *    - Explosion Phase (2.5s - 4.5s): 240fps slow-motion radial blast toward camera
 *    - Reverse Convergence Phase (4.5s - 6.5s): Exponential inward streaking into singularity
 * 3. Singularity white-hot energy vortex
 */

class DebrisParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.debrisGroup = new THREE.Group();
        this.emberPoints = null;
        this.singularityVortex = null;
        this.scene.add(this.debrisGroup);

        this.fragments = [];
        this.fragmentCount = 420;
        this.detonationOrigin = new THREE.Vector3(0, 0.6, -3.5);
        this.singularityTarget = new THREE.Vector3(0, 2.2, 0);

        this.initAtmosphericEmbers();
        this.initDebrisFragments();
        this.initSingularityVortex();
    }

    // 1. Slow-floating storm embers and ash
    initAtmosphericEmbers() {
        const count = 1200;
        const geo = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        const velocities = [];

        const goldColor = new THREE.Color(0xffb800);
        const cyanColor = new THREE.Color(0x00d4ff);
        const ashColor = new THREE.Color(0x8899aa);

        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 50;
            positions[i * 3 + 1] = Math.random() * 25;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 50;

            let c = ashColor;
            const r = Math.random();
            if (r > 0.65) c = goldColor;
            else if (r > 0.45) c = cyanColor;

            colors[i * 3] = c.r;
            colors[i * 3 + 1] = c.g;
            colors[i * 3 + 2] = c.b;

            sizes[i] = 0.08 + Math.random() * 0.22;

            velocities.push({
                x: 0.3 + (Math.random() - 0.5) * 0.4,
                y: -0.15 + (Math.random() - 0.5) * 0.2,
                z: 0.5 + (Math.random() - 0.5) * 0.4,
                rotSpeed: (Math.random() - 0.5) * 2.0
            });
        }

        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        // Custom circular glow point texture via Canvas
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
        grad.addColorStop(0, 'rgba(255,255,255,1)');
        grad.addColorStop(0.3, 'rgba(255,220,150,0.8)');
        grad.addColorStop(0.7, 'rgba(255,150,0,0.3)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 32, 32);
        const particleTexture = new THREE.CanvasTexture(canvas);

        const mat = new THREE.PointsMaterial({
            size: 0.24,
            map: particleTexture,
            vertexColors: true,
            transparent: true,
            opacity: 0.85,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.emberPoints = new THREE.Points(geo, mat);
        this.emberVelocities = velocities;
        this.scene.add(this.emberPoints);
    }

    // 2. Solid 3D Molten Metal & Shattered Rock Shards
    initDebrisFragments() {
        const geometries = [
            new THREE.TetrahedronGeometry(0.18, 0),
            new THREE.OctahedronGeometry(0.22, 0),
            new THREE.DodecahedronGeometry(0.25, 0),
            new THREE.BoxGeometry(0.2, 0.35, 0.12)
        ];

        // Materials: Molten Gold, Charcoal Rock, Brushed Titanium
        const moltenGoldMat = new THREE.MeshStandardMaterial({
            color: 0xffa000,
            emissive: 0xff7700,
            emissiveIntensity: 0.9,
            roughness: 0.3,
            metalness: 0.95
        });

        const cyanChargedMat = new THREE.MeshStandardMaterial({
            color: 0x00d4ff,
            emissive: 0x0088cc,
            emissiveIntensity: 1.2,
            roughness: 0.2,
            metalness: 0.8
        });

        const darkRockMat = new THREE.MeshStandardMaterial({
            color: 0x1e2229,
            roughness: 0.85,
            metalness: 0.2
        });

        const materials = [moltenGoldMat, cyanChargedMat, darkRockMat, moltenGoldMat];

        for (let i = 0; i < this.fragmentCount; i++) {
            const geo = geometries[i % geometries.length];
            const mat = materials[i % materials.length].clone();
            const mesh = new THREE.Mesh(geo, mat);

            // Hide initially until detonation
            mesh.visible = false;
            this.debrisGroup.add(mesh);

            // Explosive velocity vector (biased toward camera +Z and slightly upward)
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(Math.random() * 1.6 - 0.8); // mostly forward & upward hemisphere
            const speed = 4.0 + Math.random() * 14.0;

            const vx = Math.sin(phi) * Math.cos(theta) * speed;
            const vy = Math.abs(Math.cos(phi)) * speed * 0.9 + 1.5;
            const vz = (Math.sin(phi) * Math.sin(theta) * 0.7 + 0.6) * speed; // strong push towards camera

            this.fragments.push({
                mesh: mesh,
                initialPos: this.detonationOrigin.clone().add(new THREE.Vector3(
                    (Math.random() - 0.5) * 0.8,
                    Math.random() * 0.4,
                    (Math.random() - 0.5) * 0.8
                )),
                currentPos: new THREE.Vector3(),
                maxExplodedPos: new THREE.Vector3(),
                velocity: new THREE.Vector3(vx, vy, vz),
                rotAxis: new THREE.Vector3(Math.random(), Math.random(), Math.random()).normalize(),
                rotSpeed: (Math.random() - 0.5) * 12.0,
                scale: 0.5 + Math.random() * 1.5
            });
        }
    }

    // 3. Singularity Vortex (Shot 3)
    initSingularityVortex() {
        const count = 300;
        const geo = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);

        const cyan = new THREE.Color(0x00d4ff);
        const gold = new THREE.Color(0xffb800);
        const white = new THREE.Color(0xffffff);

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 1.0 + Math.random() * 6.0;
            positions[i * 3] = Math.cos(angle) * radius;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 1.5;
            positions[i * 3 + 2] = Math.sin(angle) * radius;

            const c = Math.random() > 0.6 ? white : (Math.random() > 0.5 ? cyan : gold);
            colors[i * 3] = c.r;
            colors[i * 3 + 1] = c.g;
            colors[i * 3 + 2] = c.b;
        }

        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const mat = new THREE.PointsMaterial({
            size: 0.18,
            vertexColors: true,
            transparent: true,
            opacity: 0.0,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.singularityVortex = new THREE.Points(geo, mat);
        this.singularityVortex.position.copy(this.singularityTarget);
        this.scene.add(this.singularityVortex);
    }

    // Update sequence physics based on timeline second (0.0 to 8.0s)
    updateTimeline(timeSec, delta) {
        // 1. Atmospheric Embers (Always active with slow wind)
        if (this.emberPoints) {
            const posAttr = this.emberPoints.geometry.attributes.position;
            const posArr = posAttr.array;
            for (let i = 0; i < this.fragmentCount; i++) {
                const vel = this.emberVelocities[i];
                posArr[i * 3] += vel.x * delta * 2.0;
                posArr[i * 3 + 1] += vel.y * delta * 1.5;
                posArr[i * 3 + 2] += vel.z * delta * 2.5;

                // Loop boundaries
                if (posArr[i * 3 + 1] < 0) posArr[i * 3 + 1] = 20;
                if (posArr[i * 3 + 2] > 25) posArr[i * 3 + 2] = -25;
            }
            posAttr.needsUpdate = true;
        }

        // 2. Debris Fragments
        if (timeSec < 2.5) {
            // Shot 1: Pre-detonation, fragments dormant
            this.fragments.forEach(f => {
                f.mesh.visible = false;
            });
            if (this.singularityVortex) this.singularityVortex.material.opacity = 0;
        } 
        else if (timeSec >= 2.5 && timeSec < 4.5) {
            // Shot 2: Detonation explosion (240fps slow motion)
            const explosionProgress = (timeSec - 2.5) / 2.0; // 0.0 to 1.0

            this.fragments.forEach(f => {
                f.mesh.visible = true;

                // Slow motion trajectory with quadratic easing out
                const t = Math.pow(explosionProgress, 0.75);
                const currentPos = new THREE.Vector3(
                    f.initialPos.x + f.velocity.x * t * 1.2,
                    f.initialPos.y + f.velocity.y * t * 1.2 - 0.5 * 4.0 * t * t, // gravity
                    f.initialPos.z + f.velocity.z * t * 1.4
                );

                f.currentPos.copy(currentPos);
                f.maxExplodedPos.copy(currentPos); // Cache maximum explosion position for reverse

                f.mesh.position.copy(currentPos);
                f.mesh.rotateOnAxis(f.rotAxis, f.rotSpeed * delta * 0.4); // slow tumble
                f.mesh.scale.setScalar(f.scale);
            });

            if (this.singularityVortex) this.singularityVortex.material.opacity = 0;
        }
        else if (timeSec >= 4.5 && timeSec < 6.5) {
            // Shot 3: Reverse Singularity Convergence!
            // Fragments brake and streak rapidly inward toward center (0, 2.2, 0)
            const convergeProgress = (timeSec - 4.5) / 2.0; // 0.0 to 1.0
            const easeInExp = Math.pow(convergeProgress, 2.8); // Accelerates inward violently!

            this.fragments.forEach(f => {
                f.mesh.visible = true;
                // Lerp from maxExplodedPos to singularityTarget
                f.currentPos.lerpVectors(f.maxExplodedPos, this.singularityTarget, easeInExp);
                f.mesh.position.copy(f.currentPos);

                // Spin accelerates as it approaches singularity
                f.mesh.rotateOnAxis(f.rotAxis, f.rotSpeed * delta * (1.0 + easeInExp * 8.0));
                
                // Stretch and scale down into whiteout flash at center
                const scale = f.scale * (1.0 - easeInExp * 0.85);
                f.mesh.scale.setScalar(Math.max(0.01, scale));
            });

            // Singularity energy vortex accelerates
            if (this.singularityVortex) {
                this.singularityVortex.material.opacity = Math.min(1.0, convergeProgress * 1.8);
                this.singularityVortex.rotation.y += delta * (3.0 + easeInExp * 15.0);
                const s = 1.0 - easeInExp * 0.7;
                this.singularityVortex.scale.set(s, s, s);
            }
        }
        else {
            // Shot 4: Title reveal, fragments have fused into the PRAXIS wordmark
            this.fragments.forEach(f => {
                f.mesh.visible = false;
            });
            if (this.singularityVortex) this.singularityVortex.material.opacity = 0;
        }
    }
}

window.DebrisParticleSystem = DebrisParticleSystem;
