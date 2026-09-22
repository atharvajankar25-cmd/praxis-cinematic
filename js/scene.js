/**
 * PRAXIS 3D Scene Architecture (Three.js)
 * Implements:
 * 1. Shattered Stone Plateau with glowing Norse rune fissures
 * 2. Armored Warrior silhouette with real-time procedural wind-whipping cape
 * 3. Churning charcoal storm atmosphere & volumetric god-rays
 * 4. Sculpted 3D Brushed Titanium "PRAXIS" wordmark with gold bevels
 * 5. Dynamic lighting & camera choreography support
 */

class PraxisScene {
    constructor(canvasContainer) {
        this.container = canvasContainer;
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
        
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.15;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        this.container.appendChild(this.renderer.domElement);

        // Scene Atmosphere & Fog
        this.scene.background = new THREE.Color(0x080b10);
        this.scene.fog = new THREE.FogExp2(0x090d14, 0.024);

        // Subsystems
        this.lightning = new LightningSystem(this.scene);
        this.particles = new DebrisParticleSystem(this.scene);

        // Scene Objects
        this.plateauGroup = new THREE.Group();
        this.warriorGroup = new THREE.Group();
        this.capeMesh = null;
        this.godRaysGroup = new THREE.Group();
        this.titleGroup = new THREE.Group();

        this.initLights();
        this.initStormSky();
        this.initShatteredPlateau();
        this.initArmoredWarrior();
        this.initGodRays();
        this.initPraxisTitle();

        this.scene.add(this.plateauGroup);
        this.scene.add(this.warriorGroup);
        this.scene.add(this.godRaysGroup);
        this.scene.add(this.titleGroup);

        this.clock = new THREE.Clock();
        this.setupResize();
    }

    initLights() {
        // Ambient Storm Slate Light
        this.ambientLight = new THREE.AmbientLight(0x1a2433, 0.8);
        this.scene.add(this.ambientLight);

        // Dusk God-Ray Key Light (Warm Orange-Gold)
        this.sunLight = new THREE.DirectionalLight(0xff7722, 1.8);
        this.sunLight.position.set(-15, 12, -25);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.width = 2048;
        this.sunLight.shadow.mapSize.height = 2048;
        this.scene.add(this.sunLight);

        // Electric Cyan Rim Light (Cold Storm Backlight)
        this.rimLight = new THREE.DirectionalLight(0x00d4ff, 1.4);
        this.rimLight.position.set(12, 15, -18);
        this.scene.add(this.rimLight);

        // Lightning Detonation Flash Point Light
        this.flashLight = new THREE.PointLight(0x00f0ff, 0.0, 70, 1.8);
        this.flashLight.position.set(0, 1.5, -3.5);
        this.scene.add(this.flashLight);

        // Title Showcase Spotlights (Shot 4)
        this.titleKeyLight = new THREE.DirectionalLight(0xfff5ea, 0.0);
        this.titleKeyLight.position.set(5, 8, 12);
        this.scene.add(this.titleKeyLight);

        this.titleRimCyan = new THREE.PointLight(0x00d4ff, 0.0, 25, 2.0);
        this.titleRimCyan.position.set(-8, 3, 2);
        this.scene.add(this.titleRimCyan);

        this.titleRimGold = new THREE.PointLight(0xffb800, 0.0, 25, 2.0);
        this.titleRimGold.position.set(8, -2, 2);
        this.scene.add(this.titleRimGold);
    }

    initStormSky() {
        // Dynamic charcoal storm cloud dome with dusk gradient
        const skyGeo = new THREE.SphereGeometry(140, 32, 24);
        
        // Procedural dusk storm shader
        const vertexShader = `
            varying vec3 vWorldPosition;
            void main() {
                vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                vWorldPosition = worldPosition.xyz;
                gl_Position = projectionMatrix * viewMatrix * worldPosition;
            }
        `;
        const fragmentShader = `
            varying vec3 vWorldPosition;
            void main() {
                vec3 dir = normalize(vWorldPosition);
                float h = dir.y;
                
                // Charcoal storm grey top, dusk teal-orange horizon
                vec3 topColor = vec3(0.04, 0.06, 0.09);
                vec3 midClouds = vec3(0.11, 0.14, 0.19);
                vec3 horizonGlow = vec3(0.45, 0.22, 0.08); // dusk orange
                vec3 duskCyan = vec3(0.02, 0.22, 0.32);

                vec3 col = mix(horizonGlow, midClouds, smoothstep(0.0, 0.25, h));
                col = mix(col, topColor, smoothstep(0.25, 0.8, h));
                col = mix(col, duskCyan, smoothstep(-0.2, 0.15, dir.x) * 0.4);

                gl_FragColor = vec4(col, 1.0);
            }
        `;

        const skyMat = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            side: THREE.BackSide,
            depthWrite: false
        });

        this.skyDome = new THREE.Mesh(skyGeo, skyMat);
        this.scene.add(this.skyDome);
    }

    initGodRays() {
        // Translucent volumetric light beam cones originating from the dusk clouds
        const coneGeo = new THREE.CylinderGeometry(0.8, 12, 45, 16, 1, true);
        const rayMat = new THREE.MeshBasicMaterial({
            color: 0xffa044,
            transparent: true,
            opacity: 0.14,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            depthWrite: false
        });

        const rayAngles = [-0.35, -0.15, 0.05, 0.25];
        rayAngles.forEach((angle, i) => {
            const ray = new THREE.Mesh(coneGeo, rayMat);
            ray.position.set(-18 + i * 8, 16, -26);
            ray.rotation.z = angle;
            ray.rotation.x = -0.3;
            this.godRaysGroup.add(ray);
        });
    }

    initShatteredPlateau() {
        // Main cracked stone plateau
        const plateauGeo = new THREE.CylinderGeometry(14, 18, 5, 12, 3);
        const pos = plateauGeo.attributes.position;
        // Jitter vertices for rugged, fractured rock edges
        for (let i = 0; i < pos.count; i++) {
            const y = pos.getY(i);
            const x = pos.getX(i);
            const z = pos.getZ(i);
            if (y > 1.5) {
                // Top plateau surface displacement
                pos.setY(i, y + (Math.sin(x * 0.8) + Math.cos(z * 0.8)) * 0.35);
            }
            pos.setX(i, x + (Math.random() - 0.5) * 0.6);
            pos.setZ(i, z + (Math.random() - 0.5) * 0.6);
        }
        plateauGeo.computeVertexNormals();

        const rockMat = new THREE.MeshStandardMaterial({
            color: 0x1f242c,
            roughness: 0.88,
            metalness: 0.25,
            flatShading: true
        });

        const plateauMesh = new THREE.Mesh(plateauGeo, rockMat);
        plateauMesh.position.set(0, -2.5, -4);
        plateauMesh.receiveShadow = true;
        this.plateauGroup.add(plateauMesh);

        // Jagged detached rock monoliths on edges
        const monolithGeo = new THREE.BoxGeometry(1.6, 4.2, 1.4);
        for (let m = 0; m < 7; m++) {
            const angle = (m / 7) * Math.PI * 1.6 + 0.4;
            const r = 11 + (m % 2) * 1.5;
            const monolith = new THREE.Mesh(monolithGeo, rockMat);
            monolith.position.set(
                Math.cos(angle) * r,
                0.2 + (m % 3) * 0.4,
                Math.sin(angle) * r - 4
            );
            monolith.rotation.set((Math.random() - 0.5) * 0.4, angle, (Math.random() - 0.5) * 0.3);
            monolith.castShadow = true;
            this.plateauGroup.add(monolith);
        }

        // Glowing Norse Rune Fissures in the rock surface
        const runeGeo = new THREE.RingGeometry(1.8, 2.0, 32);
        const runeMat = new THREE.MeshBasicMaterial({
            color: 0x00d4ff,
            transparent: true,
            opacity: 0.35,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        });
        const runeRing = new THREE.Mesh(runeGeo, runeMat);
        runeRing.rotation.x = -Math.PI / 2;
        runeRing.position.set(0, 0.05, -3.5);
        this.plateauGroup.add(runeRing);
    }

    initArmoredWarrior() {
        // Armored Warrior silhouette standing firmly in defiance, back to camera
        const armorMat = new THREE.MeshStandardMaterial({
            color: 0x161a22,
            roughness: 0.45,
            metalness: 0.85,
            flatShading: true
        });

        const goldTrimMat = new THREE.MeshStandardMaterial({
            color: 0xcca033,
            roughness: 0.35,
            metalness: 0.95
        });

        // 1. Torso / Cuirass
        const torsoGeo = new THREE.CylinderGeometry(0.7, 0.55, 1.5, 8);
        const torso = new THREE.Mesh(torsoGeo, armorMat);
        torso.position.y = 2.4;
        torso.castShadow = true;
        this.warriorGroup.add(torso);

        // 2. Heavy Pauldrons (Norse shoulder armor plates)
        const pauldronGeo = new THREE.ConeGeometry(0.55, 0.8, 6);
        const leftPauldron = new THREE.Mesh(pauldronGeo, goldTrimMat);
        leftPauldron.position.set(-0.9, 2.9, 0);
        leftPauldron.rotation.z = Math.PI * 0.7;
        this.warriorGroup.add(leftPauldron);

        const rightPauldron = new THREE.Mesh(pauldronGeo, goldTrimMat);
        rightPauldron.position.set(0.9, 2.9, 0);
        rightPauldron.rotation.z = -Math.PI * 0.7;
        this.warriorGroup.add(rightPauldron);

        // 3. Helmet (Back of head silhouette with Norse crest)
        const helmetGeo = new THREE.SphereGeometry(0.42, 8, 8);
        const helmet = new THREE.Mesh(helmetGeo, armorMat);
        helmet.position.set(0, 3.45, 0);
        this.warriorGroup.add(helmet);

        const crestGeo = new THREE.BoxGeometry(0.12, 0.45, 0.7);
        const crest = new THREE.Mesh(crestGeo, goldTrimMat);
        crest.position.set(0, 3.7, 0.05);
        crest.rotation.x = -0.2;
        this.warriorGroup.add(crest);

        // 4. Legs / Greaves
        const legGeo = new THREE.CylinderGeometry(0.24, 0.28, 1.6, 6);
        const leftLeg = new THREE.Mesh(legGeo, armorMat);
        leftLeg.position.set(-0.4, 0.8, 0);
        this.warriorGroup.add(leftLeg);

        const rightLeg = new THREE.Mesh(legGeo, armorMat);
        rightLeg.position.set(0.4, 0.8, 0);
        this.warriorGroup.add(rightLeg);

        // 5. Heavy Storm Cape (Dynamic Cloth Simulation Mesh)
        // High-segment plane billowing violently in the storm wind
        const capeGeo = new THREE.PlaneGeometry(1.6, 2.7, 16, 20);
        const capeMat = new THREE.MeshStandardMaterial({
            color: 0x181418, // dark crimson slate
            roughness: 0.9,
            metalness: 0.1,
            side: THREE.DoubleSide
        });

        this.capeMesh = new THREE.Mesh(capeGeo, capeMat);
        this.capeMesh.position.set(0, 2.6, 0.35); // anchored at shoulders behind torso
        this.capeMesh.castShadow = true;
        this.warriorGroup.add(this.capeMesh);

        // Position Warrior at the plateau edge looking toward the storm horizon
        this.warriorGroup.position.set(0, 0.0, -1.2);
        this.warriorGroup.rotation.y = Math.PI; // back facing camera (+Z)
    }

    initPraxisTitle() {
        // High-precision sculpted 3D "PRAXIS" titanium wordmark
        // Custom shapes for P - R - A - X - I - S
        const extrudeSettings = {
            steps: 2,
            depth: 0.45,
            bevelEnabled: true,
            bevelThickness: 0.12,
            bevelSize: 0.08,
            bevelOffset: 0,
            bevelSegments: 4
        };

        const titaniumMat = new THREE.MeshStandardMaterial({
            color: 0x94a3b8,      // Brushed gunmetal titanium
            roughness: 0.22,
            metalness: 0.94,
            envMapIntensity: 2.0
        });

        const goldBevelMat = new THREE.MeshStandardMaterial({
            color: 0xffb800,      // Molten polished gold bevel rim
            roughness: 0.18,
            metalness: 0.98,
            emissive: 0x332200,
            emissiveIntensity: 0.4
        });

        const letterMaterials = [titaniumMat, goldBevelMat];

        const shapes = this.createLetterShapes();
        const letterMeshes = [];
        const arcAnchors = [];

        shapes.forEach((shapeData, i) => {
            const geo = new THREE.ExtrudeGeometry(shapeData.shape, extrudeSettings);
            geo.center();
            const mesh = new THREE.Mesh(geo, letterMaterials);
            mesh.position.x = shapeData.xOffset;
            mesh.position.y = 2.4;
            mesh.position.z = 0;
            this.titleGroup.add(mesh);
            letterMeshes.push(mesh);

            // Extract anchor points for electric arcs
            const p = new THREE.Vector3(shapeData.xOffset, 2.4, 0.3);
            arcAnchors.push(p);
            arcAnchors.push(p.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.8, 0.7, 0)));
            arcAnchors.push(p.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.8, -0.7, 0)));
        });

        // 3D Geometric Backing Shield / Chevron Plate
        const plateShape = new THREE.Shape();
        plateShape.moveTo(-5.4, 0.0);
        plateShape.lineTo(-5.0, 1.4);
        plateShape.lineTo(0.0, 1.9);
        plateShape.lineTo(5.0, 1.4);
        plateShape.lineTo(5.4, 0.0);
        plateShape.lineTo(5.0, -1.4);
        plateShape.lineTo(0.0, -1.9);
        plateShape.lineTo(-5.0, -1.4);
        plateShape.closePath();

        const plateExtrude = {
            depth: 0.2,
            bevelEnabled: true,
            bevelThickness: 0.06,
            bevelSize: 0.06,
            bevelSegments: 3
        };
        const plateGeo = new THREE.ExtrudeGeometry(plateShape, plateExtrude);
        plateGeo.center();

        const plateMat = new THREE.MeshStandardMaterial({
            color: 0x121720,
            roughness: 0.5,
            metalness: 0.88
        });
        const plateMesh = new THREE.Mesh(plateGeo, plateMat);
        plateMesh.position.set(0, 2.4, -0.3);
        this.titleGroup.add(plateMesh);

        // Feed anchor points to lightning system for plasma arcing
        this.lightning.setEmblemAnchorPoints(arcAnchors);

        // Hide title group until Shot 4
        this.titleGroup.visible = false;
    }

    createLetterShapes() {
        const letters = [];
        const scale = 0.85;

        // P
        const pShape = new THREE.Shape();
        pShape.moveTo(-0.5, -1.0);
        pShape.lineTo(-0.15, -1.0);
        pShape.lineTo(-0.15, 0.1);
        pShape.lineTo(0.3, 0.1);
        pShape.absarc(0.3, 0.55, 0.45, -Math.PI / 2, Math.PI / 2, false);
        pShape.lineTo(-0.5, 1.0);
        pShape.closePath();
        // Inner hole for P
        const pHole = new THREE.Path();
        pHole.moveTo(-0.15, 0.35);
        pHole.lineTo(0.25, 0.35);
        pHole.absarc(0.25, 0.55, 0.2, -Math.PI / 2, Math.PI / 2, false);
        pHole.lineTo(-0.15, 0.75);
        pHole.closePath();
        pShape.holes.push(pHole);
        letters.push({ shape: pShape, xOffset: -3.8 * scale });

        // R
        const rShape = new THREE.Shape();
        rShape.moveTo(-0.5, -1.0);
        rShape.lineTo(-0.15, -1.0);
        rShape.lineTo(-0.15, 0.05);
        rShape.lineTo(0.15, -1.0);
        rShape.lineTo(0.55, -1.0);
        rShape.lineTo(0.18, 0.1);
        rShape.absarc(0.25, 0.55, 0.45, -Math.PI / 2, Math.PI / 2, false);
        rShape.lineTo(-0.5, 1.0);
        rShape.closePath();
        const rHole = new THREE.Path();
        rHole.moveTo(-0.15, 0.35);
        rHole.lineTo(0.22, 0.35);
        rHole.absarc(0.22, 0.55, 0.2, -Math.PI / 2, Math.PI / 2, false);
        rHole.lineTo(-0.15, 0.75);
        rHole.closePath();
        rShape.holes.push(rHole);
        letters.push({ shape: rShape, xOffset: -2.3 * scale });

        // A
        const aShape = new THREE.Shape();
        aShape.moveTo(-0.6, -1.0);
        aShape.lineTo(-0.2, -1.0);
        aShape.lineTo(-0.08, -0.4);
        aShape.lineTo(0.08, -0.4);
        aShape.lineTo(0.2, -1.0);
        aShape.lineTo(0.6, -1.0);
        aShape.lineTo(0.18, 1.0);
        aShape.lineTo(-0.18, 1.0);
        aShape.closePath();
        const aHole = new THREE.Path();
        aHole.moveTo(-0.05, -0.15);
        aHole.lineTo(0.05, -0.15);
        aHole.lineTo(0.0, 0.45);
        aHole.closePath();
        aShape.holes.push(aHole);
        letters.push({ shape: aShape, xOffset: -0.8 * scale });

        // X
        const xShape = new THREE.Shape();
        xShape.moveTo(-0.55, -1.0);
        xShape.lineTo(-0.18, -1.0);
        xShape.lineTo(0.0, -0.4);
        xShape.lineTo(0.18, -1.0);
        xShape.lineTo(0.55, -1.0);
        xShape.lineTo(0.22, 0.0);
        xShape.lineTo(0.55, 1.0);
        xShape.lineTo(0.18, 1.0);
        xShape.lineTo(0.0, 0.4);
        xShape.lineTo(-0.18, 1.0);
        xShape.lineTo(-0.55, 1.0);
        xShape.lineTo(-0.22, 0.0);
        xShape.closePath();
        letters.push({ shape: xShape, xOffset: 0.8 * scale });

        // I
        const iShape = new THREE.Shape();
        iShape.moveTo(-0.2, -1.0);
        iShape.lineTo(0.2, -1.0);
        iShape.lineTo(0.2, 1.0);
        iShape.lineTo(-0.2, 1.0);
        iShape.closePath();
        letters.push({ shape: iShape, xOffset: 2.1 * scale });

        // S
        const sShape = new THREE.Shape();
        sShape.moveTo(-0.45, -0.7);
        sShape.lineTo(-0.12, -0.62);
        sShape.bezierCurveTo(-0.1, -0.45, 0.25, -0.45, 0.25, -0.2);
        sShape.bezierCurveTo(0.25, 0.05, -0.4, 0.05, -0.4, 0.45);
        sShape.bezierCurveTo(-0.4, 0.95, 0.4, 0.95, 0.45, 0.65);
        sShape.lineTo(0.15, 0.55);
        sShape.bezierCurveTo(0.12, 0.4, -0.15, 0.4, -0.15, 0.2);
        sShape.bezierCurveTo(-0.15, -0.05, 0.5, -0.05, 0.5, -0.45);
        sShape.bezierCurveTo(0.5, -0.95, -0.35, -0.95, -0.45, -0.7);
        sShape.closePath();
        letters.push({ shape: sShape, xOffset: 3.5 * scale });

        return letters;
    }

    // Dynamic wind flutter on the warrior's cape
    updateCapeCloth(elapsedTime) {
        if (!this.capeMesh) return;
        const posAttr = this.capeMesh.geometry.attributes.position;
        const posArr = posAttr.array;

        for (let i = 0; i < posAttr.count; i++) {
            const y = posArr[i * 3 + 1];
            // Anchored at top (y > 1.2), flutters violently at bottom (y < 0)
            const factor = Math.max(0, (1.35 - y) / 2.7);
            
            // Complex multi-harmonic wind wave
            const wave1 = Math.sin(elapsedTime * 9.0 + y * 4.0) * 0.35;
            const wave2 = Math.cos(elapsedTime * 14.0 + posArr[i * 3] * 5.0) * 0.18;
            const flutter = (wave1 + wave2) * Math.pow(factor, 1.4);

            posArr[i * 3 + 2] = 0.2 * factor + flutter; // pushes back in +Z direction
        }
        posAttr.needsUpdate = true;
        this.capeMesh.geometry.computeVertexNormals();
    }

    setupResize() {
        window.addEventListener('resize', () => {
            const width = window.innerWidth;
            const height = window.innerHeight;
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(width, height);
        });
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }
}

window.PraxisScene = PraxisScene;
