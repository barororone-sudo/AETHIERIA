// js/World.js
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Enemy } from './Enemy.js';
import { Golem } from './Golem.js';
import { Elements } from './Chemistry.js';
import { NPC } from './NPC.js';
import { Tower } from './world/Tower.js';
import { Waypoint } from './world/Waypoint.js';
import { MonsterFactory } from './MonsterFactory.js';
import { TerrainManager } from './world/TerrainManager.js';
import { Chest } from './world/Chest.js';
import { ForestGenerator } from './world/ForestGenerator.js';
import { PoolManager } from './managers/PoolManager.js';
import { LevelManager } from './managers/LevelManager.js';

export class World {
    constructor(game) {
        this.game = game;
        // --- THREE.JS SCENE ---
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0x87CEEB, 20, 100);

        // --- CANNON PHYSICS WORLD ---
        this.physicsWorld = new CANNON.World();
        this.physicsWorld.gravity.set(0, -9.82, 0);

        this.physicsWorld.gravity.set(0, -9.82, 0);

        /** @type {CANNON.Material} */
        this.defaultMaterial = new CANNON.Material('default');
        const defaultContactMaterial = new CANNON.ContactMaterial(this.defaultMaterial, this.defaultMaterial, {
            friction: 0.9,
            restitution: 0.0, // No bounce
        });
        this.physicsWorld.addContactMaterial(defaultContactMaterial);

        // Slippery Material (No Friction)
        /** @type {CANNON.Material} */
        this.slipperyMaterial = new CANNON.Material('slippery');
        const slipperyContact = new CANNON.ContactMaterial(this.slipperyMaterial, this.slipperyMaterial, {
            friction: 0.0,
            restitution: 0.0
        });
        this.physicsWorld.addContactMaterial(slipperyContact);

        // Interaction between Default and Slippery
        const defaultSlipperyContact = new CANNON.ContactMaterial(this.defaultMaterial, this.slipperyMaterial, {
            friction: 0.0,
            restitution: 0.0
        });
        this.physicsWorld.addContactMaterial(defaultSlipperyContact);

        // --- FACTORIES ---
        this.monsterFactory = new MonsterFactory(game);
        this.terrainManager = new TerrainManager(this);
        this.poolManager = new PoolManager(this); // POOL MANAGER
        this.levelManager = new LevelManager(this);

        // --- LIGHTING ---
        this.setupLights();

        // DEBUG: Axes Helper to verify rendering
        const axesHelper = new THREE.AxesHelper(500);
        this.scene.add(axesHelper);

        // --- ENVIRONMENT ---
        this.createSky();
        this.createClouds();
        // this.createGrassField(); // Replaced by TerrainManager

        // Safety Floor (Invisible) to catch player if terrain fails
        const floorShape = new CANNON.Plane();
        const floorBody = new CANNON.Body({ mass: 0 });
        floorBody.addShape(floorShape);
        floorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
        floorBody.position.set(0, -10, 0);
        this.physicsWorld.addBody(floorBody);

        this.createWater();

        // --- GAMEPLAY OBJECTS ---
        this.interactables = [];
        this.towers = []; // Early Init for LevelManager
        this.chests = []; // Store Chest instances
        this.generateFogGrid();
        // this.createWall(this.defaultMaterial); // Removed for procedural generation focus
        // this.createArena(new THREE.Vector3(0, 0.5, -40)); // Removed for procedural generation focus

        this.createAmbientParticles();

        // --- ENEMIES ---
        this.enemies = [];
        // this.createEnemies(); // Deprecated by LevelManager
        // this.spawnGolem(new CANNON.Vec3(0, 5, -40)); // Moved to LevelManager logic or kept as arena boss

        // Use World Builder
        // Moved to init()
        // Use World Builder
        // Moved to init() for better timing
        // this.levelManager.generate();

        // --- NPCS ---
        this.npcs = [];

        // --- QUEST ITEMS ---
        this.questItems = [];
        this.populateStartingZone();

        // UPDRAFTS
        this.updrafts = [];

        // TOWERS
        // Moved to top for initialization order
        // Handled by LevelManager (Biome Towers)
        // this.spawnTowers();

        // FOREST (Act 2)
        this.generateForest();

        // FOREST (Act 2)
        this.generateForest();

        // WAYPOINTS (Fast Travel) -> Moved to LevelManager
        this.waypoints = [];
        // this.spawnWaypoints();

        // LOOT
        this.loot = [];

        // 🏕️ CAMP CLEARING SYSTEM
        this.camps = [];

        // Day/Night Cycle
        this.gameTime = 0.25; // Start at 6am (0.25)
        this.dayDuration = 1440; // 24 minutes in seconds
    }

    async init() {
        console.log('[World] Starting Async Initialization...');
        if (this.game.ui) this.game.ui.showToast("[DEBUG] World Init Start...", "info");

        try {
            // 1. Generate Camps & Population
            if (this.levelManager) {
                try {
                    this.levelManager.generate();
                } catch (err) {
                    console.error("CRITICAL: Level Generation Failed", err);
                    if (this.game.ui) this.game.ui.showToast("CRITICAL: POI GEN FAILED: " + err.message, "error");
                }
            }
            //    this.levelManager.generate();
            // } else {
            //    console.error("LevelManager missing!");
            // }
            await new Promise(r => setTimeout(r, 10)); // Yield

            // 2. Spawn Towers - MOVED TO CONSTRUCTOR
            // console.log("Step 2: Towers (Skipped, in constructor)");
            // if (this.game.ui) this.game.ui.showToast("[DEBUG] Spawning Towers (Constructor)...", "info");
            // this.spawnTowers();
            await new Promise(r => setTimeout(r, 10)); // Yield

            // 2b. Spawn Random Loot Chests
            // 2b. Spawn Biome Loot Chests
            this.spawnBiomeChests();
            await new Promise(r => setTimeout(r, 10));

            // 3. Generate Forest
            // Already called in constructor

            // 4. Spawn Waypoints
            // Already called in constructor

            await new Promise(r => setTimeout(r, 10)); // Yield

            if (this.game.ui) this.game.ui.showToast("[DEBUG] World Init DONE", "success");

        } catch (e) {
            console.error("[World] CRITICAL INIT ERROR:", e);
            if (this.game.ui) this.game.ui.showToast(`[CRITICAL] World Init Failed: ${e.message}`, "error");
        }

        // Log summary of fast travel points
        if (this.game.waypointManager) {
            const totalPoints = this.game.waypointManager.waypoints.size;
            const towers = Array.from(this.game.waypointManager.waypoints.values()).filter(w => w.type === 'tower').length;
            const waypoints = totalPoints - towers;
            console.log(`[Fast Travel] Registered ${totalPoints} points (${towers} towers, ${waypoints} waypoints)`);
        }

        console.log('[World] Async Initialization Complete.');
    }



    /**
     * Raycasts vertically to find the ground height at (x, z).
     * Safety wrapper: If terrain isn't ready or returns 0 (suspicious), return safety height.
     * @param {number} x
     * @param {number} z
     * @returns {number} Height
     */
    getSafeHeight(x, z) {
        if (this.terrainManager) {
            const h = this.terrainManager.getGlobalHeight(x, z);
            if (h > 0.1) return h; // Return valid height
        }
        console.warn(`[World] Terrain not ready at (${x}, ${z}). Spawning at safety height Y=100.`);
        return 100; // Safety Height
    }

    spawnTowers() {
        // DEPRECATED: Handled by LevelManager.spawnBiomeTowers()
        console.warn("[World] spawnTowers() is deprecated. Using LevelManager.");
    }

    spawnBiomeChests() {
        console.log('[World] Spawning Biome-Distributed Chests (15 per Biome)...');

        const biomes = [
            { name: 'FOREST', angleStart: 0, angleEnd: 360, minR: 50, maxR: 250, count: 10 }, // Central Forest
            { name: 'JUNGLE', angleStart: -20, angleEnd: 20, minR: 300, maxR: 1800, count: 15 },
            { name: 'GOLD', angleStart: 20, angleEnd: 60, minR: 300, maxR: 1800, count: 15 },
            { name: 'LAVA', angleStart: 60, angleEnd: 100, minR: 300, maxR: 1800, count: 15 },
            { name: 'FIRE', angleStart: 100, angleEnd: 140, minR: 300, maxR: 1800, count: 15 },
            { name: 'CRYSTAL', angleStart: 140, angleEnd: 180, minR: 300, maxR: 1800, count: 15 },
            { name: 'LIGHTNING', angleStart: 180, angleEnd: 220, minR: 300, maxR: 1800, count: 15 },
            { name: 'AIR', angleStart: 220, angleEnd: 260, minR: 300, maxR: 1800, count: 15 },
            { name: 'ICE', angleStart: 260, angleEnd: 300, minR: 300, maxR: 1800, count: 15 },
            { name: 'SNOW', angleStart: 300, angleEnd: 340, minR: 300, maxR: 1800, count: 15 }
        ];

        let totalSpawned = 0;

        biomes.forEach(biome => {
            for (let i = 0; i < biome.count; i++) {
                // Random Polar Coordinates in Sector
                // Convert angle to Radians
                // Handle wrap around for angles > 360 or < 0? 
                // Using simple linear mapping for sectors

                let range = biome.angleEnd - biome.angleStart;
                let start = biome.angleStart;

                // Special case for Forest (Full Circle)
                if (biome.name === 'FOREST') {
                    range = 360;
                    start = 0;
                }

                const angleDeg = start + Math.random() * range;
                const angleRad = angleDeg * (Math.PI / 180);

                const dist = biome.minR + Math.random() * (biome.maxR - biome.minR);

                const x = Math.cos(angleRad) * dist;
                const z = Math.sin(angleRad) * dist;

                let y = this.getSafeHeight(x, z);

                // Water Check (Skip underwater mostly, except specialized)
                if (y < 2.5) continue;

                y += 0.5; // Sit on ground

                // Tier Logic (Distance Based)
                let tier = 1;
                if (dist > 600) tier = 2;
                if (dist > 1200) tier = 3;
                if (dist > 1600 && Math.random() > 0.5) tier = 4; // Legendary at edges

                // ID for Persistence
                const chestId = `chest_${biome.name}_${i}`;

                // Create Chest
                const chest = new Chest(this.game, this, new THREE.Vector3(x, y, z), tier, false, chestId);

                // Lock Logic (Tier 3+ has high chance), unless ALREADY OPEN (handled by Chest constructor)
                // We check locked state here for NEW chests, but Chest constructor overrides if isOpen is true.
                if (!chest.isOpen && tier >= 3 && Math.random() < 0.4) {
                    chest.locked = true;
                    chest.lockMat.color.setHex(0xFF0000);
                }

                this.chests.push(chest);
                totalSpawned++;
            }
        });

        console.log(`[World] Spawned ${totalSpawned} chests across ${biomes.length} biomes.`);
    }

    generateForest() {
        this.forest = new ForestGenerator(this);
        this.forest.generate();
    }

    spawnWaypoints() {
        console.warn("[World] spawnWaypoints() is deprecated. Using LevelManager.");
        /*
        if (!this.game.waypointManager) return;
        console.log('[World] Spawning 100 Biome Waypoints (Distributed)...');
        // ... LEGACY CODE REMOVED ...
        */
    }



    /**
     * @param {THREE.Vector3} position
     */
    spawnLoot(position) {
        // Minimal implementation to prevent crash
        // Spawn a visual particle or orb
        const geo = new THREE.SphereGeometry(0.3, 8, 8);
        const mat = new THREE.MeshBasicMaterial({ color: 0x00ff00 }); // HP Orb color
        const loot = new THREE.Mesh(geo, mat);
        loot.position.copy(position);
        loot.position.y += 0.5;
        this.scene.add(loot);

        // Simple floating animation
        const animate = () => {
            if (!loot.parent) return; // Removed
            loot.position.y += Math.sin(Date.now() * 0.005) * 0.01;
            loot.rotation.y += 0.05;

            // Proximity pickup logic could go here
            if (this.game && this.game.player && this.game.player.mesh) {
                const dist = this.game.player.mesh.position.distanceTo(loot.position);
                if (dist < 2.0) {
                    this.scene.remove(loot);
                    this.game.player.hp = Math.min(this.game.player.hp + 10, this.game.player.maxHp);
                    if (this.game.ui) this.game.ui.update(this.game.player);
                    this.game.ui.playSound('ui_ding');
                } else {
                    requestAnimationFrame(animate);
                }
            }
        };
        requestAnimationFrame(animate);
    }

    /**
     * Populate starting zone with quest items
     */
    populateStartingZone() {
        console.log('[World] Populating starting zone...');

        // Spawn Ancient Communicator at BEACON POSITION (-990, 1, -15) (West Edge)
        const itemPos = { x: -990, y: 1, z: -15 };

        // Create small cube - MeshBasicMaterial (always visible)
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshBasicMaterial({
            color: 0x00FFFF,
            transparent: false
        });

        const questItemMesh = new THREE.Mesh(geometry, material);
        questItemMesh.position.set(itemPos.x, itemPos.y, itemPos.z);
        questItemMesh.userData.isQuestItem = true;
        questItemMesh.userData.itemId = 'ancient_communicator';
        this.scene.add(questItemMesh);

        // Add bright light
        const light = new THREE.PointLight(0x00FFFF, 5, 10);
        light.position.copy(questItemMesh.position);
        this.scene.add(light);

        // Store reference
        this.questItems.push({ mesh: questItemMesh, light: light, time: 0 });

        console.log(`[World] ✅ Quest item at BEACON position(${itemPos.x}, ${itemPos.y}, ${itemPos.z})`);
        console.log(`[World] Quest items count: ${this.questItems.length} `);
    }

    /**
     * Raycasts vertically to find the ground height at (x, z).
     * @param {number} x 
     * @param {number} z 
     * @returns {number|null} Height or null if no ground found
     */
    getGroundHeight(x, z) {
        // Use the Truth from TerrainManager
        if (this.terrainManager) {
            return this.terrainManager.getGlobalHeight(x, z);
        }
        return 0;
    }

    setupLights() {
        // 1️⃣ AMBIENT LIGHT (Global Illumination)
        // User Request: Intensity 1.5 to ensure terrain is visible
        this.ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
        this.scene.add(this.ambientLight);

        // 2️⃣ DIRECTIONAL LIGHT (Sun)
        this.sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
        this.sunLight.position.set(50, 100, 50); // High angle
        this.sunLight.castShadow = true;

        // Shadow Settings
        this.sunLight.shadow.mapSize.width = 1024; // Optimized from 2048
        this.sunLight.shadow.mapSize.height = 1024;
        this.sunLight.shadow.bias = -0.0005;
        this.sunLight.shadow.normalBias = 0.05;

        // Shadow Camera
        const d = 100;
        this.sunLight.shadow.camera.left = -d;
        this.sunLight.shadow.camera.right = d;
        this.sunLight.shadow.camera.top = d;
        this.sunLight.shadow.camera.bottom = -d;
        this.sunLight.shadow.camera.near = 0.5;
        this.sunLight.shadow.camera.far = 500;

        this.scene.add(this.sunLight.target);

        // 3️⃣ MOON LIGHT (Restored)
        this.moonLight = new THREE.DirectionalLight(0x6666ff, 0.0); // Starts off (Day)
        this.scene.add(this.moonLight);
        this.scene.add(this.moonLight.target);
    }

    createSky() {
        const vertexShader = `
        varying vec3 vWorldPosition;
void main() {
            vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
        const fragmentShader = `
        varying vec3 vWorldPosition;
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        uniform float time;

        // Simple Star Noise
        float rand(vec2 co){
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
            float h = normalize(vWorldPosition + vec3(0, offset, 0)).y;
            float mixVal = max(pow(max(h, 0.0), exponent), 0.0);
            vec3 sky = mix(bottomColor, topColor, mixVal);

            // Stars (only visible when dark)
            float brightness = length(topColor);
    if (brightness < 0.5) {
                float starThreshold = 0.995;
                float r = rand(gl_FragCoord.xy * 0.001); // Screen space noise for twinkling? No, world space better
                // Let's use direction for fixed stars
                vec3 dir = normalize(vWorldPosition);
                float s = rand(dir.xz * 100.0 + dir.y * 100.0);

        if (s > starThreshold) {
                    float twinkle = sin(time * 2.0 + s * 100.0) * 0.5 + 0.5;
            sky += vec3(twinkle) * (1.0 - brightness * 2.0); // Fade out as it gets brighter
        }
    }

    gl_FragColor = vec4(sky, 1.0);
}
`;
        const uniforms = {
            topColor: { value: new THREE.Color(0x0077ff) },
            bottomColor: { value: new THREE.Color(0xffffff) },
            offset: { value: 33 },
            exponent: { value: 0.6 },
            time: { value: 0 }
        };
        const material = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            uniforms,
            side: THREE.BackSide
        });
        const geometry = new THREE.SphereGeometry(500, 32, 32);
        this.skyMesh = new THREE.Mesh(geometry, material);
        this.scene.add(this.skyMesh);
    }

    createClouds() {
        const geometry = new THREE.DodecahedronGeometry(1, 0);
        const material = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            flatShading: true,
            roughness: 0.0,
            metalness: 0.0
        });

        this.clouds = new THREE.Group();
        for (let i = 0; i < 40; i++) {
            const cloud = new THREE.Mesh(geometry, material);
            cloud.position.set(
                (Math.random() - 0.5) * 800,
                120 + Math.random() * 40,
                (Math.random() - 0.5) * 800
            );
            cloud.scale.setScalar(10 + Math.random() * 15);
            cloud.rotation.set(Math.random(), Math.random(), Math.random());
            this.clouds.add(cloud);
        }
        this.scene.add(this.clouds);
    }

    createWater() {
        const geometry = new THREE.PlaneGeometry(10000, 10000, 128, 128);

        // Water Shader
        const vertexShader = `
        uniform float time;
        varying vec2 vUv;
        varying float vWave;

void main() {
    vUv = uv;
            vec3 pos = position;

            // Gerstner-like Waves
            float wave1 = sin(pos.x * 0.05 + time * 1.0) * 0.5;
            float wave2 = cos(pos.y * 0.05 + time * 0.8) * 0.5; // y is z here before rotation? No, plane is XY.
    // Actually plane is XY, rotated -90 X later. So pos.y is "North".

    pos.z += wave1 + wave2; // Z is height in PlaneGeometry
    vWave = pos.z;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

        const fragmentShader = `
        uniform float time;
        uniform vec3 colorDeep;
        uniform vec3 colorShallow;
        varying vec2 vUv;
        varying float vWave;

void main() {
            // Mix colors based on wave height
            vec3 color = mix(colorDeep, colorShallow, vWave * 0.5 + 0.5);

            // Foam lines
            float foam = step(0.8, sin(vUv.x * 100.0 + time) * sin(vUv.y * 100.0 + time));
    color += vec3(foam * 0.1);

    gl_FragColor = vec4(color, 0.8);
}
`;

        const material = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            uniforms: {
                time: { value: 0 },
                colorDeep: { value: new THREE.Color(0x0044ff) },
                colorShallow: { value: new THREE.Color(0x00ccff) }
            },
            transparent: true,
            side: THREE.DoubleSide
        });

        this.water = new THREE.Mesh(geometry, material);
        this.water.rotation.x = -Math.PI / 2;
        this.water.position.y = 1.5; // Sea Level
        this.scene.add(this.water);
    }

    createAmbientParticles() {
        const count = 1000;
        const geometry = new THREE.BufferGeometry();
        const positions = [];
        const speeds = [];

        for (let i = 0; i < count; i++) {
            positions.push(
                (Math.random() - 0.5) * 100,
                Math.random() * 20,
                (Math.random() - 0.5) * 100
            );
            speeds.push(Math.random() * 0.5 + 0.1);
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('speed', new THREE.Float32BufferAttribute(speeds, 1));

        const material = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.2,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        });

        this.ambientParticles = new THREE.Points(geometry, material);
        this.scene.add(this.ambientParticles);
    }

    updateAmbientParticles(dt, playerPos) {
        if (!this.ambientParticles) return;

        const positions = this.ambientParticles.geometry.attributes.position.array;
        const speeds = this.ambientParticles.geometry.attributes.speed.array;
        const count = positions.length / 3;

        for (let i = 0; i < count; i++) {
            let x = positions[i * 3];
            let y = positions[i * 3 + 1];
            let z = positions[i * 3 + 2];
            const speed = speeds[i];

            // Float Up
            y += speed * dt;

            // Wrap around player
            const range = 50;
            if (y > playerPos.y + 20) y = playerPos.y - 5;
            if (x > playerPos.x + range) x -= range * 2;
            if (x < playerPos.x - range) x += range * 2;
            if (z > playerPos.z + range) z -= range * 2;
            if (z < playerPos.z - range) z += range * 2;

            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;
        }
        this.ambientParticles.geometry.attributes.position.needsUpdate = true;
    }

    createGrassField() {
        if (!this.terrainManager) return;

        const instanceCount = 100000;
        const geometry = new THREE.PlaneGeometry(0.05, 0.8);
        geometry.translate(0, 0.4, 0);

        const material = new THREE.ShaderMaterial({
            vertexShader: `
            uniform float time;
            varying vec2 vUv;
            varying float vHeight;

            // Simple Noise
            float rand(vec2 n) {
    return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
}

            float noise(vec2 p){
                vec2 ip = floor(p);
                vec2 u = fract(p);
    u = u * u * (3.0 - 2.0 * u);
                float res = mix(
        mix(rand(ip), rand(ip + vec2(1.0, 0.0)), u.x),
        mix(rand(ip + vec2(0.0, 1.0)), rand(ip + vec2(1.0, 1.0)), u.x), u.y);
    return res * res;
}

void main() {
    vUv = uv;
    vHeight = position.y;
                vec3 pos = position;

                // Wind Effect
                vec4 worldPosition = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);

                // Large scale wind waves
                float windWave = sin(time * 0.5 + worldPosition.x * 0.05 + worldPosition.z * 0.05);

                // Small detailed noise
                float n = noise(worldPosition.xz * 0.2 + time * 1.0);

                // Combine
                float wind = (windWave * 0.5 + n * 0.5) * 0.5;

                // Apply wind only to top of grass, non-linearly
                float bend = pow(uv.y, 2.0);
    pos.x += wind * bend * 2.0;
    pos.z += wind * bend * 0.5;

    // Droop effect when wind blows hard
    pos.y -= abs(wind) * bend * 0.3;
                
                vec4 finalPos = instanceMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * viewMatrix * finalPos;
}
`,
            fragmentShader: `
            varying vec2 vUv;
            varying float vHeight;
            uniform vec3 colorTop;
            uniform vec3 colorBottom;

void main() {
                vec3 color = mix(colorBottom, colorTop, vUv.y);
    color *= smoothstep(0.0, 0.4, vUv.y + 0.2);
    gl_FragColor = vec4(color, 1.0);
}
`,
            uniforms: {
                time: { value: 0 },
                colorTop: { value: new THREE.Color(0x8bc34a) },
                colorBottom: { value: new THREE.Color(0x33691e) }
            },
            side: THREE.DoubleSide
        });

        this.grassMesh = new THREE.InstancedMesh(geometry, material, instanceCount);
        const dummy = new THREE.Object3D();

        for (let i = 0; i < instanceCount; i++) {
            const x = (Math.random() - 0.5) * 200; // 200x200 area
            const z = (Math.random() - 0.5) * 200;
            const y = this.terrainManager.getGlobalHeight(x, z);

            // Don't spawn underwater
            if (y < 1.5) {
                // Move out of view or skip
                dummy.position.set(0, -100, 0);
            } else {
                dummy.position.set(x, y, z);
            }

            dummy.rotation.y = Math.random() * Math.PI;
            dummy.scale.setScalar(0.8 + Math.random() * 0.6);
            dummy.updateMatrix();
            this.grassMesh.setMatrixAt(i, dummy.matrix);
        }
        this.grassMesh.receiveShadow = true;
        this.scene.add(this.grassMesh);
    }

    // createPhysicsFloor removed to avoid conflict with TerrainManager

    createWall(material) {
        const geometry = new THREE.BoxGeometry(10, 20, 2);
        const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0x888888 }));
        mesh.position.set(0, 10, -10);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);

        const shape = new CANNON.Box(new CANNON.Vec3(5, 10, 1));
        const body = new CANNON.Body({ mass: 0, material: material });
        body.addShape(shape);
        body.position.set(0, 10, -10);
        this.physicsWorld.addBody(body);

        this.interactables.push(mesh);
    }

    createArena(position) {
        // Visual
        const geometry = new THREE.CylinderGeometry(20, 20, 1, 32);
        const material = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.8 });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(position);
        mesh.receiveShadow = true;
        this.scene.add(mesh);

        // Physics
        const shape = new CANNON.Cylinder(20, 20, 1, 32);
        const body = new CANNON.Body({ mass: 0, material: this.defaultMaterial });
        // Cannon cylinder is oriented along Z, Three is along Y. Rotate.
        const q = new CANNON.Quaternion();
        q.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
        body.addShape(shape, new CANNON.Vec3(0, 0, 0), q);

        body.position.set(position.x, position.y, position.z);
        this.physicsWorld.addBody(body);

        this.interactables.push(mesh);
    }

    createEnemies() {
        // Create Bokoblins using Factory
        const mob1 = this.monsterFactory.createMob('bokoblin');
        this.enemies.push(new Enemy(this, new CANNON.Vec3(5, 5, 5), Elements.CRYO, mob1));

        const mob2 = this.monsterFactory.createMob('bokoblin');
        this.enemies.push(new Enemy(this, new CANNON.Vec3(-5, 5, 10), Elements.HYDRO, mob2));

        const mob3 = this.monsterFactory.createMob('bokoblin');
        this.enemies.push(new Enemy(this, new CANNON.Vec3(10, 5, -5), Elements.NONE, mob3));
    }

    spawnEnemy(position) {
        // Snap to ground
        if (this.terrainManager) {
            const y = this.terrainManager.getGlobalHeight(position.x, position.z);
            position.y = y + 1; // +1 for safety
        }
        const enemy = new Enemy(this, position);
        this.enemies.push(enemy);
    }

    spawnGolem(position) {
        if (this.terrainManager) {
            const y = this.terrainManager.getGlobalHeight(position.x, position.z);
            position.y = y;
        }
        this.golem = new Golem(this, position);
        // console.log("Golem Spawned!");
    }

    spawnTower(x, z, id) {
        let y = 0;
        if (this.terrainManager) {
            y = this.terrainManager.getGlobalHeight(x, z);
        }
        const tower = new Tower(this, x, z, id, y);
        this.towers.push(tower);
        this.interactables.push(tower);

        // Add Map Icon
        if (this.game.ui && this.game.ui.mapManager) {
            this.game.ui.mapManager.addTowerIcon(tower);
        }
    }

    updateLoot(dt, playerBody) {
        if (!this.loot) return;

        for (let i = this.loot.length - 1; i >= 0; i--) {
            const item = this.loot[i];
            if (!item.active) continue;

            // Physics (Simple bounce)
            item.mesh.position.y += item.velocity.y * dt;
            item.velocity.y -= 15 * dt; // Gravity

            if (item.mesh.position.y < 0.3) {
                item.mesh.position.y = 0.3;
                item.velocity.y *= -0.5; // Bounce
            }

            // Magnet Logic
            const dist = item.mesh.position.distanceTo(playerBody.position);

            if (dist < 5) {
                // Fly to player
                const dir = new THREE.Vector3().subVectors(playerBody.position, item.mesh.position).normalize();
                item.mesh.position.addScaledVector(dir, 10 * dt);
                item.velocity.set(0, 0, 0); // Cancel gravity
            }

            if (dist < 1) {
                // Pickup
                // console.log("Loot Collected!");
                this.scene.remove(item.mesh);
                this.loot.splice(i, 1);
                // TODO: Add to inventory
            }

            item.mesh.rotation.y += dt;
        }
    }




    init() {
        this.loadPrologue();
    }

    loadPrologue() {
        // Lumina removed (replaced by Elara)

        // Spawn Starting Chest
        const chestPos = new THREE.Vector3(8, 0, 8);
        if (this.terrainManager) {
            chestPos.y = this.terrainManager.getGlobalHeight(chestPos.x, chestPos.z);
        }
        // New Chest Class Usage
        const chest = new Chest(this.game, this, chestPos, 'sword_starter');
        this.chests.push(chest);
    }

    generateFogGrid() {
        this.fogGrid = [];
        const worldSize = 4000; // Updated to match new map size
        const gridSize = 10; // 10 meters (High Resolution)
        const halfSize = worldSize / 2;

        for (let x = -halfSize; x < halfSize; x += gridSize) {
            for (let z = -halfSize; z < halfSize; z += gridSize) {
                this.fogGrid.push({
                    x: x,
                    z: z,
                    isDiscovered: false
                });
            }
        }
        // console.log(`Generated Fog Grid: ${ this.fogGrid.length } points`);
    }

    getClosestInteractable(position, range) {
        let closest = null;
        let minDist = range;

        // Check Towers
        if (this.towers) {
            for (const tower of this.towers) {
                const dist = position.distanceTo(tower.mesh.position);
                if (dist < minDist) {
                    minDist = dist;
                    closest = tower;
                }
            }
        }

        // Check NPCs
        if (this.npcs) {
            for (const npc of this.npcs) {
                const dist = position.distanceTo(npc.mesh.position);
                if (dist < minDist) {
                    minDist = dist;
                    closest = npc;
                }
            }
        }

        // Check Chests
        if (this.chests) {
            for (const chest of this.chests) {
                const dist = position.distanceTo(chest.mesh.position);
                if (dist < minDist) {
                    minDist = dist;
                    closest = chest;
                }
            }
        }

        // Check Generic Interactables
        if (this.interactables) {
            for (const obj of this.interactables) {
                const dist = position.distanceTo(obj.position);
                if (dist < minDist) {
                    minDist = dist;
                    closest = obj;
                }
            }
        }

        return closest;
    }

    updateDayNightCycle(dt) {
        // 1. Sécurité (Null Check)
        if (!this.sunLight || !this.game.player || !this.game.player.mesh) return;

        this.gameTime += dt / this.dayDuration;
        if (this.gameTime >= 1.0) this.gameTime = 0.0;

        const time = this.gameTime;
        const sunAngle = (time - 0.25) * Math.PI * 2; // Noon at 0.5

        // Player Position for Following
        const playerPos = this.game.player.mesh.position;

        // Sun Position (Relative to Player)
        const sunDist = 100;
        this.sunLight.position.x = playerPos.x + Math.cos(sunAngle) * sunDist;
        this.sunLight.position.y = playerPos.y + Math.sin(sunAngle) * sunDist;
        this.sunLight.position.z = playerPos.z - 50; // Offset Z slightly

        // Update Target to follow player
        this.sunLight.target.position.copy(playerPos);
        this.sunLight.target.updateMatrixWorld();

        // Moon Position (Opposite)
        this.moonLight.position.x = playerPos.x - Math.cos(sunAngle) * sunDist;
        this.moonLight.position.y = playerPos.y - Math.sin(sunAngle) * sunDist;
        this.moonLight.position.z = playerPos.z + 50;

        this.moonLight.target.position.copy(playerPos);
        this.moonLight.target.updateMatrixWorld();

        // Colors
        const isDay = time > 0.25 && time < 0.75;

        if (isDay) {
            this.sunLight.intensity = 1.2;
            this.moonLight.intensity = 0.0;
            this.scene.background = new THREE.Color(0x87CEEB); // Sky Blue
            if (this.scene.fog) {
                this.scene.fog.color.setHex(0x87CEEB);
                this.scene.fog.density = 0.002;
            }
        } else {
            this.sunLight.intensity = 0.0;
            this.moonLight.intensity = 1.5; // Bright Moon
            this.scene.background = new THREE.Color(0x1a1a3d); // Deep Blue Night
            if (this.scene.fog) {
                this.scene.fog.color.setHex(0x1a1a3d);
                this.scene.fog.density = 0.005;
            }
        }

        // Update Sky Mesh Uniforms
        // Update Sky Mesh Uniforms
        if (this.skyMesh) {
            this.skyMesh.position.copy(playerPos); // Sky follows player
            this.skyMesh.material.uniforms.time.value = time;
        }
    }

    update(dt, playerBody) {
        // Step Physics World
        this.physicsWorld.step(1 / 60, dt, 3);

        this.updateDayNightCycle(dt);

        if (this.terrainManager && this.terrainManager.update) {
            this.terrainManager.update(playerBody ? playerBody.position : null);
        }

        // Update Level Manager (City Streaming)
        if (this.levelManager) this.levelManager.update(dt);

        if (playerBody) {
            this.updateLoot(dt, playerBody);
            this.updateUpdrafts(dt, playerBody);
        }

        if (this.npcs) {
            this.npcs.forEach(npc => npc.update(dt));
        }

        // 👾 UPDATE ENEMIES with aggressive optimizations
        if (this.enemies && this.enemies.length > 0) {
            const playerPos = this.game.player?.body?.position;
            let updatedCount = 0;
            const MAX_UPDATES_PER_FRAME = 30; // Balanced limit
            const CULL_DISTANCE_SQ = 8100; // 90^2 (reduced from 100)

            // Remove dead enemies (do this less frequently)
            if (!this._enemyCleanupFrame) this._enemyCleanupFrame = 0;
            this._enemyCleanupFrame++;
            if (this._enemyCleanupFrame % 60 === 0) { // Every 60 frames (~1 second)
                this.enemies = this.enemies.filter(enemy => !enemy.isDead);
            }

            this.enemies.forEach((enemy, index) => {
                if (!enemy) return;

                // Distance culling: only update enemies within 90 units
                if (playerPos) {
                    const dx = enemy.body.position.x - playerPos.x;
                    const dz = enemy.body.position.z - playerPos.z;
                    const distSq = dx * dx + dz * dz;

                    if (distSq > CULL_DISTANCE_SQ) {
                        return; // Skip distant enemies
                    }

                    // Frame skipping for medium-distance enemies (50-90 units)
                    if (distSq > 2500 && index % 2 !== 0) { // 50^2
                        return; // Update only every other enemy at medium distance
                    }
                }

                // Limit updates per frame
                if (updatedCount >= MAX_UPDATES_PER_FRAME) {
                    return;
                }

                enemy.update(dt, playerBody ? playerBody.position : null);
                updatedCount++;
            });
        } // Close if(enemies)

        if (this.waypoints) {
            this.waypoints.forEach(waypoint => {
                if (waypoint && waypoint.update) waypoint.update(dt);
            });
        }

        if (this.chests) {
            this.chests.forEach(chest => chest.update(dt));
        }

        if (this.towers) {
            this.towers.forEach(tower => tower.update(dt));
        }

        if (this.levelManager && this.levelManager.update) {
            this.levelManager.update(dt);
        }

        // Update quest items (floating animation)
        if (this.questItems && this.questItems.length > 0) {
            this.questItems.forEach(item => {
                item.time += dt;
                item.mesh.position.y = 1.5 + Math.sin(item.time * 2) * 0.2;
                item.mesh.rotation.y += dt;
                item.light.position.copy(item.mesh.position);
            });
        }
    } // End of update()

    createUpdraft(position) {
        const geometry = new THREE.CylinderGeometry(1, 1, 5, 8);
        const material = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.3,
            wireframe: true
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(position);
        mesh.position.y += 2.5; // Center it
        this.scene.add(mesh);

        this.updrafts.push({
            mesh: mesh,
            position: position.clone(),
            life: 5.0
        });
    }

    updateUpdrafts(dt, playerBody) {
        for (let i = this.updrafts.length - 1; i >= 0; i--) {
            const up = this.updrafts[i];
            up.life -= dt;
            up.mesh.rotation.y += 5 * dt;

            const dist = new THREE.Vector3(playerBody.position.x, 0, playerBody.position.z)
                .distanceTo(new THREE.Vector3(up.position.x, 0, up.position.z));

            if (dist < 1.5 && playerBody.position.y < up.position.y + 5) {
                playerBody.velocity.y += 20 * dt;
            }

            if (up.life <= 0) {
                this.scene.remove(up.mesh);
                this.updrafts.splice(i, 1);
            }
        }
    }

    // 🏕️ ========== CAMP CLEARING SYSTEM ==========

    /**
     * Register a camp with enemies and a chest
     * @param {Enemy[]} enemies 
     * @param {Chest} chest 
     */
    registerCamp(enemies, chest) {
        const campId = `camp_${this.camps.length + 1} `;
        this.camps.push({
            id: campId,
            enemies: enemies,
            chest: chest,
            cleared: false
        });
        console.log(`📍 Registered ${campId} with ${enemies.length} enemies`);
    }

    /**
     * Called when an enemy dies - checks if camp is cleared
     * @param {Enemy} enemy 
     */
    notifyEnemyDeath(enemy) {
        // Find camp containing this enemy
        const camp = this.camps.find(c => c.enemies.includes(enemy));
        if (!camp) return;

        // Remove from camp
        const index = camp.enemies.indexOf(enemy);
        if (index > -1) camp.enemies.splice(index, 1);

        // Check if camp cleared
        if (camp.enemies.length === 0 && !camp.cleared) {
            this.clearCamp(camp);
        }
    }

    /**
     * Clears a camp - unlocks chest and shows feedback
     * @param {object} camp 
     */
    clearCamp(camp) {
        camp.cleared = true;

        // Unlock chest
        if (camp.chest && camp.chest.unlock) {
            camp.chest.unlock();
        }

        // Feedback
        if (this.game.audio) {
            this.game.audio.playSFX('secret_solved');
        }
        if (this.game.ui && this.game.ui.showToast) {
            this.game.ui.showToast('🏕️ Camp Cleared!');
        }

        console.log(`✅ Camp ${camp.id} cleared!`);
    }
}
