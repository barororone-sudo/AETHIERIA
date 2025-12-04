// js/World.js
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Enemy } from './Enemy.js';
import { Golem } from './Golem.js';
import { Elements } from './Chemistry.js';
import { NPC } from './NPC.js';
import { Tower } from './world/Tower.js';
import { MonsterFactory } from './MonsterFactory.js';
import { TerrainManager } from './world/TerrainManager.js';

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

        // --- LIGHTING ---
        this.setupLights();

        // --- ENVIRONMENT ---
        this.createSky();
        this.createClouds();
        // this.createGrassField(); // Replaced by TerrainManager
        // this.createPhysicsFloor(this.defaultMaterial); // Replaced by TerrainManager
        this.createWater();

        // --- GAMEPLAY OBJECTS ---
        this.interactables = [];
        this.generateFogGrid();
        this.createWall(this.defaultMaterial);
        this.createArena(new THREE.Vector3(0, 0.5, -40));

        // --- ENEMIES ---
        this.enemies = [];
        this.createEnemies();

        // Spawn Golem Boss by default
        this.spawnGolem(new CANNON.Vec3(0, 5, -40));

        // --- NPCS ---
        this.npcs = [];


        // UPDRAFTS
        this.updrafts = [];

        // TOWERS
        this.towers = [];

        this.time = 0;
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

    /**
     * @param {THREE.Vector3} position 
     * @param {number} radius 
     */
    getClosestInteractable(position, radius) {
        let closest = null;
        let minDist = radius;

        // Check Interactables (Chests, Towers, etc.)
        if (this.interactables) {
            for (const obj of this.interactables) {
                const pos = obj.position || obj.mesh.position;
                const dist = position.distanceTo(pos);
                if (dist < minDist) {
                    minDist = dist;
                    closest = obj;
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

        return closest;
    }

    init() {
        // Called after all managers are created
        this.loadPrologue();
    }

    loadPrologue() {
        // Spawn Lumina (Guide)
        const luminaData = this.game.data.getDialogue('lumina_intro');
        if (luminaData) {
            const lumina = new NPC(this.game, this, new THREE.Vector3(5, 20, 5), 'lumina_intro');
            lumina.name = "Lumina"; // Override default
            this.npcs.push(lumina);
        }

        // Spawn Chest with Sword
        this.spawnChest(new THREE.Vector3(15, 0.5, 10), 'sword_01');

        // Spawn Guardian (Boss) - Initially inactive or distant?
        // Let's keep the Golem spawn for now but maybe move it
        this.spawnGolem(new CANNON.Vec3(0, 20, -40)); // Raised from 5 to 10 to prevent floor clipping

        // Map Towers
        this.spawnTower(50, 50, 'tower_central');
        this.spawnTower(-100, 100, 'tower_north_west');
        this.spawnTower(150, -50, 'tower_south_east');
    }

    spawnChest(position, itemId) {
        // Visuals
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshStandardMaterial({ color: 0x8B4513 }); // Brown
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(position);
        this.scene.add(mesh);

        // Physics
        const shape = new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5));
        const body = new CANNON.Body({ mass: 0 });
        body.addShape(shape);
        body.position.copy(position);
        this.physicsWorld.addBody(body);

        // Interaction Logic (Simplified)
        mesh.userData = {
            type: 'chest',
            itemId: itemId,
            interact: () => {
                console.log(`Opening chest with ${itemId}`);
                this.game.player.inventory.addItem(itemId, 1);
                this.scene.remove(mesh); // Poof
                // Show notification
                this.game.ui.showToast(`Obtenu: ${this.game.data.getItem(itemId).name}`);

                // Update Dialogue State if needed
                if (itemId === 'sword_01') {
                    // Hacky way to update NPC dialogue for now
                    const lumina = this.npcs.find(n => n.name === 'Lumina');
                    if (lumina) lumina.dialogueData = 'lumina_sword_found';
                }
            }
        };
        this.interactables.push(mesh);
    }

    setupLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
        directionalLight.position.set(10, 20, 10);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);
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
                return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
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
        for (let i = 0; i < 20; i++) {
            const cloud = new THREE.Mesh(geometry, material);
            cloud.position.set(
                (Math.random() - 0.5) * 100,
                20 + Math.random() * 10,
                (Math.random() - 0.5) * 100
            );
            cloud.scale.setScalar(3 + Math.random() * 5);
            cloud.rotation.set(Math.random(), Math.random(), Math.random());
            this.clouds.add(cloud);
        }
        this.scene.add(this.clouds);
    }

    createWater() {
        const geometry = new THREE.PlaneGeometry(10000, 10000);
        const material = new THREE.MeshStandardMaterial({
            color: 0x0099ff,
            transparent: true,
            opacity: 0.6,
            roughness: 0.1,
            metalness: 0.1,
            side: THREE.DoubleSide
        });
        this.water = new THREE.Mesh(geometry, material);
        this.water.rotation.x = -Math.PI / 2;
        this.water.position.y = 1.5; // Sea Level
        this.scene.add(this.water);
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
                    u = u*u*(3.0-2.0*u);
                    float res = mix(
                        mix(rand(ip), rand(ip+vec2(1.0,0.0)), u.x),
                        mix(rand(ip+vec2(0.0,1.0)), rand(ip+vec2(1.0,1.0)), u.x), u.y);
                    return res*res;
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
        console.log("Golem Spawned!");
    }

    spawnTower(x, z, id) {
        let y = 0;
        if (this.terrainManager) {
            y = this.terrainManager.getGlobalHeight(x, z);
        }
        const tower = new Tower(this, x, z, id, y);
        this.towers.push(tower);
        this.interactables.push(tower);
    }

    spawnChest(position, itemId) {
        if (this.terrainManager) {
            const y = this.terrainManager.getGlobalHeight(position.x, position.z);
            position.y = y + 0.5; // Half height
        }

        // Visuals
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(position);
        this.scene.add(mesh);

        // Physics
        const shape = new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5));
        const body = new CANNON.Body({ mass: 0 });
        body.addShape(shape);
        body.position.copy(position);
        this.physicsWorld.addBody(body);

        // Interaction Logic
        mesh.userData = {
            type: 'chest',
            itemId: itemId,
            interact: () => {
                console.log(`Opening chest with ${itemId}`);
                this.game.player.inventory.addItem(itemId, 1);
                this.scene.remove(mesh);
                this.physicsWorld.removeBody(body); // Remove physics too
                this.game.ui.showToast(`Obtenu: ${this.game.data.getItem(itemId).name}`);

                if (itemId === 'sword_01') {
                    const lumina = this.npcs.find(n => n.name === 'Lumina');
                    if (lumina) lumina.dialogueData = 'lumina_sword_found';
                }
            }
        };
        this.interactables.push(mesh);
    }

    spawnLoot(position) {
        if (!this.loot) this.loot = [];

        const geometry = new THREE.DodecahedronGeometry(0.3);
        const material = new THREE.MeshBasicMaterial({ color: 0xFFD700 });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(position);
        mesh.position.y += 0.5;

        this.scene.add(mesh);

        this.loot.push({
            mesh: mesh,
            active: true,
            velocity: new THREE.Vector3(0, 5, 0)
        });
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
                console.log("Loot Collected!");
                this.scene.remove(item.mesh);
                this.loot.splice(i, 1);
                // TODO: Add to inventory
            }

            item.mesh.rotation.y += dt;
        }
    }



    generateFogGrid() {
        this.fogGrid = [];
        const gridSize = 50; // 50 meters
        const worldSize = 2000; // Assuming 2000x2000 world
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
        console.log(`Generated Fog Grid: ${this.fogGrid.length} points`);
    }

    updateFog(playerPos) {
        if (!this.fogGrid) return;

        const discoveryRadius = 30; // 30m radius
        let changed = false;

        for (const point of this.fogGrid) {
            if (point.isDiscovered) continue;

            const dx = playerPos.x - point.x;
            const dz = playerPos.z - point.z;
            const distSq = dx * dx + dz * dz;

            if (distSq < discoveryRadius * discoveryRadius) {
                point.isDiscovered = true;
                changed = true;
            }
        }
    }

    revealFog(cx, cz, radius) {
        if (!this.fogGrid) return;
        const rSq = radius * radius;

        for (const point of this.fogGrid) {
            if (point.isDiscovered) continue;
            const dx = cx - point.x;
            const dz = cz - point.z;
            if (dx * dx + dz * dz < rSq) {
                point.isDiscovered = true;
            }
        }
    }

    update(dt, playerBody) {
        this.time += dt;
        this.physicsWorld.step(1 / 60, dt, 3);

        // Update Terrain
        if (playerBody) {
            this.terrainManager.update(playerBody.position);
        }

        // Update Fog Discovery
        if (playerBody) {
            this.updateFog(playerBody.position);
        }

        // --- DYNAMIC VEGETATION ---
        if (this.grassMesh && this.grassMesh.material.uniforms) {
            this.grassMesh.material.uniforms.time.value = this.time;
        }

        // --- DAY/NIGHT CYCLE ---
        this.updateDayNightCycle(dt);

        if (this.clouds) {
            this.clouds.rotation.y += dt * 0.005; // Slower clouds
        }

        // Update Enemies
        if (playerBody && this.enemies && this.enemies.length > 0) {
            this.enemies.forEach(enemy => {
                if (!enemy.isDead) enemy.update(dt, playerBody.position);
            });
        }

        if (playerBody && this.golem && !this.golem.isDead) {
            this.golem.update(dt, playerBody.position);
        }

        // Update Loot
        if (playerBody) {
            this.updateLoot(dt, playerBody);
        }

        // Update NPCs
        if (this.npcs && this.npcs.length > 0) {
            this.npcs.forEach(npc => npc.update(dt));
        }

        // Update Updrafts
        this.updateUpdrafts(dt, playerBody);

        // Update Towers
        this.towers.forEach(tower => tower.update(dt));
    }

    updateDayNightCycle(dt) {
        const dayDuration = 120; // 2 minutes for full day
        const dayTime = (this.time % dayDuration) / dayDuration; // 0 to 1
        const sunAngle = dayTime * Math.PI * 2;
        const sunRadius = 100;

        // Find Sun
        const sun = this.scene.children.find(c => c.isDirectionalLight);
        if (sun) {
            sun.position.set(
                Math.cos(sunAngle) * sunRadius,
                Math.sin(sunAngle) * sunRadius,
                20
            );

            // Sun Intensity: Peak at noon (sin=1), 0 at horizon
            const sunHeight = Math.sin(sunAngle);
            sun.intensity = Math.max(0, sunHeight) * 2.0;

            // Turn off shadows at night to save perf / avoid weird artifacts
            sun.castShadow = sunHeight > 0.1;
        }

        // Sky & Fog Colors
        // 0.0 = Sunrise, 0.25 = Noon, 0.5 = Sunset, 0.75 = Midnight
        let skyColor = new THREE.Color();
        let fogColor = new THREE.Color();
        let ambientIntensity = 0.5;

        if (dayTime < 0.1) { // Sunrise
            const t = dayTime / 0.1;
            skyColor.lerpColors(new THREE.Color(0x000033), new THREE.Color(0xffaa00), t);
            fogColor.lerpColors(new THREE.Color(0x000033), new THREE.Color(0xffaa00), t);
            ambientIntensity = 0.2 + t * 0.3;
        } else if (dayTime < 0.4) { // Day
            const t = (dayTime - 0.1) / 0.3;
            skyColor.lerpColors(new THREE.Color(0xffaa00), new THREE.Color(0x87CEEB), t);
            fogColor.lerpColors(new THREE.Color(0xffaa00), new THREE.Color(0x87CEEB), t);
            ambientIntensity = 0.5 + t * 0.2; // Brightest at noon
        } else if (dayTime < 0.6) { // Sunset
            const t = (dayTime - 0.4) / 0.2;
            skyColor.lerpColors(new THREE.Color(0x87CEEB), new THREE.Color(0xFF4500), t);
            fogColor.lerpColors(new THREE.Color(0x87CEEB), new THREE.Color(0xFF4500), t);
            ambientIntensity = 0.7 - t * 0.4;
        } else { // Night
            const t = (dayTime - 0.6) / 0.4;
            skyColor.lerpColors(new THREE.Color(0xFF4500), new THREE.Color(0x000033), Math.min(1, t * 2)); // Fade to night quickly
            fogColor.lerpColors(new THREE.Color(0xFF4500), new THREE.Color(0x000011), Math.min(1, t * 2));
            ambientIntensity = 0.3;
        }

        this.scene.background = skyColor;
        this.scene.fog.color = fogColor;

        // Update Ambient Light
        const ambient = this.scene.children.find(c => c.isAmbientLight);
        if (ambient) ambient.intensity = ambientIntensity;
    }

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
}
