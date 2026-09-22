/**
 * PRAXIS Procedural Lightning & Electric Arc Generator
 * Provides:
 * 1. Sky-to-Ground branched lightning bolt with multiple sub-forks and flash decay
 * 2. Expanding electric shockwave ring on the ground plane
 * 3. Surface plasma arcs across titanium letterforms in Shot 4
 */

class LightningSystem {
    constructor(scene) {
        this.scene = scene;
        this.activeBolts = [];
        this.shockwaves = [];
        this.letterArcs = [];
        this.arcAnchorPoints = [];
        this.activeArcGroup = new THREE.Group();
        this.scene.add(this.activeArcGroup);

        // Core Materials
        this.coreLightningMaterial = new THREE.LineBasicMaterial({
            color: 0xffffff,
            linewidth: 3,
            transparent: true,
            opacity: 1.0,
            blending: THREE.AdditiveBlending
        });

        this.glowLightningMaterial = new THREE.LineBasicMaterial({
            color: 0x00d4ff,
            linewidth: 6,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending
        });

        this.shockwaveMaterial = new THREE.MeshBasicMaterial({
            color: 0x00d4ff,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.85,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
    }

    // Generate jagged 3D points between start and end using midpoint displacement
    generateSegmentPath(start, end, maxDisplacement, roughness = 0.55, iterations = 5) {
        let points = [start.clone(), end.clone()];

        for (let i = 0; i < iterations; i++) {
            const nextPoints = [];
            const currentDisp = maxDisplacement * Math.pow(roughness, i);

            for (let j = 0; j < points.length - 1; j++) {
                const p1 = points[j];
                const p2 = points[j + 1];
                nextPoints.push(p1);

                const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
                const dir = new THREE.Vector3().subVectors(p2, p1);
                
                // Normal orthogonal random jitter
                let perp = new THREE.Vector3(
                    Math.random() * 2 - 1,
                    Math.random() * 2 - 1,
                    Math.random() * 2 - 1
                ).normalize();

                mid.addScaledVector(perp, (Math.random() - 0.5) * 2 * currentDisp);
                nextPoints.push(mid);
            }
            nextPoints.push(points[points.length - 1]);
            points = nextPoints;
        }

        return points;
    }

    // Trigger full sky strike with branches
    strike(startPos, groundPos) {
        const boltGroup = new THREE.Group();
        const mainPath = this.generateSegmentPath(startPos, groundPos, 3.5, 0.58, 5);

        // Main trunk (core + glow)
        const trunkGeo = new THREE.BufferGeometry().setFromPoints(mainPath);
        const coreLine = new THREE.Line(trunkGeo, this.coreLightningMaterial.clone());
        const glowLine = new THREE.Line(trunkGeo, this.glowLightningMaterial.clone());
        glowLine.scale.set(1.05, 1.0, 1.05);

        boltGroup.add(coreLine);
        boltGroup.add(glowLine);

        // Generate 4-7 branching forks from main path points
        const branchCount = 4 + Math.floor(Math.random() * 4);
        for (let b = 0; b < branchCount; b++) {
            const splitIdx = Math.floor(mainPath.length * (0.2 + Math.random() * 0.6));
            const splitPoint = mainPath[splitIdx];
            
            // Random downward/outward branch target
            const branchEnd = splitPoint.clone().add(new THREE.Vector3(
                (Math.random() - 0.5) * 12,
                - (6 + Math.random() * 10),
                (Math.random() - 0.5) * 12
            ));

            const branchPoints = this.generateSegmentPath(splitPoint, branchEnd, 2.0, 0.55, 4);
            const branchGeo = new THREE.BufferGeometry().setFromPoints(branchPoints);
            const branchCore = new THREE.Line(branchGeo, this.coreLightningMaterial.clone());
            const branchGlow = new THREE.Line(branchGeo, this.glowLightningMaterial.clone());

            boltGroup.add(branchCore);
            boltGroup.add(branchGlow);
        }

        this.scene.add(boltGroup);

        const boltObj = {
            group: boltGroup,
            life: 1.0,
            age: 0,
            maxAge: 0.35, // fast flash
            flicker: true
        };
        this.activeBolts.push(boltObj);

        // Trigger Shockwave ring
        this.triggerShockwave(groundPos);
    }

    triggerShockwave(center) {
        const ringGeo = new THREE.RingGeometry(0.2, 0.8, 64);
        const ringMesh = new THREE.Mesh(ringGeo, this.shockwaveMaterial.clone());
        ringMesh.rotation.x = -Math.PI / 2;
        ringMesh.position.copy(center);
        ringMesh.position.y += 0.08;

        this.scene.add(ringMesh);

        this.shockwaves.push({
            mesh: ringMesh,
            radius: 0.5,
            maxRadius: 32.0,
            life: 1.0,
            speed: 28.0
        });
    }

    setEmblemAnchorPoints(points) {
        this.arcAnchorPoints = points;
    }

    // Trigger rapid electric arc crackling on the titanium letters
    updateLetterArcs(active = false) {
        // Clear previous frame lines
        while (this.activeArcGroup.children.length > 0) {
            const child = this.activeArcGroup.children.pop();
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
        }

        if (!active || this.arcAnchorPoints.length < 2) return;

        // Create 3 to 6 simultaneous arcs across the letters
        const numArcs = 3 + Math.floor(Math.random() * 4);
        for (let i = 0; i < numArcs; i++) {
            const idx1 = Math.floor(Math.random() * this.arcAnchorPoints.length);
            let idx2 = Math.floor(Math.random() * this.arcAnchorPoints.length);
            if (idx1 === idx2) idx2 = (idx1 + 1) % this.arcAnchorPoints.length;

            const p1 = this.arcAnchorPoints[idx1];
            const p2 = this.arcAnchorPoints[idx2];
            
            // Only arc if points are relatively close (< 6 units)
            if (p1.distanceTo(p2) > 6.0) continue;

            const arcPts = this.generateSegmentPath(p1, p2, 0.35, 0.5, 4);
            const geo = new THREE.BufferGeometry().setFromPoints(arcPts);
            
            const mat = new THREE.LineBasicMaterial({
                color: Math.random() > 0.3 ? 0x00d4ff : 0xffffff,
                linewidth: 2,
                transparent: true,
                opacity: 0.75 + Math.random() * 0.25,
                blending: THREE.AdditiveBlending
            });

            const arcLine = new THREE.Line(geo, mat);
            this.activeArcGroup.add(arcLine);
        }
    }

    update(delta) {
        // Update active lightning bolts (with violent realistic flicker)
        for (let i = this.activeBolts.length - 1; i >= 0; i--) {
            const bolt = this.activeBolts[i];
            bolt.age += delta;
            const progress = bolt.age / bolt.maxAge;

            if (progress >= 1.0) {
                this.scene.remove(bolt.group);
                bolt.group.traverse(child => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) child.material.dispose();
                });
                this.activeBolts.splice(i, 1);
            } else {
                // Multi-flash decay pattern
                const flickerVal = Math.sin(progress * Math.PI * 8) * 0.5 + 0.5;
                const opacity = (1 - progress) * (0.6 + flickerVal * 0.4);
                bolt.group.traverse(child => {
                    if (child.material) {
                        child.material.opacity = opacity;
                    }
                });
            }
        }

        // Update shockwaves
        for (let i = this.shockwaves.length - 1; i >= 0; i--) {
            const sw = this.shockwaves[i];
            sw.radius += sw.speed * delta;
            const norm = sw.radius / sw.maxRadius;

            if (norm >= 1.0) {
                this.scene.remove(sw.mesh);
                sw.mesh.geometry.dispose();
                sw.mesh.material.dispose();
                this.shockwaves.splice(i, 1);
            } else {
                const scale = sw.radius;
                sw.mesh.scale.set(scale, scale, 1);
                // Fade out as it expands
                sw.mesh.material.opacity = (1 - norm) * 0.9;
            }
        }
    }

    clear() {
        this.activeBolts.forEach(bolt => {
            this.scene.remove(bolt.group);
        });
        this.activeBolts = [];

        this.shockwaves.forEach(sw => {
            this.scene.remove(sw.mesh);
        });
        this.shockwaves = [];

        while (this.activeArcGroup.children.length > 0) {
            const child = this.activeArcGroup.children.pop();
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
        }
    }
}

window.LightningSystem = LightningSystem;
