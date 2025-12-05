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
        this.generateFogGrid();
        // this.createWall(this.defaultMaterial); // Removed for procedural generation focus
        // this.createArena(new THREE.Vector3(0, 0.5, -40)); // Removed for procedural generation focus

        this.createAmbientParticles();

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

        // LOOT
        this.loot = [];

        // Day/Night Cycle
        this.gameTime = 0.25; // Start at 6am (0.25)
        this.dayDuration = 1440; // 24 minutes in seconds
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

        // Spawn Chest with Glider
        this.spawnChest(new THREE.Vector3(25, 0.5, 10), 'glider');

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
                // console.log(`Opening chest with ${itemId}`);
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
        // EMERGENCY LIGHT
        const emergencyLight = new THREE.AmbientLight(0xffffff, 1.0);
        this.scene.add(emergencyLight);

        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.2); // Lower base ambient
        this.scene.add(this.ambientLight);

        // SUN
        this.sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
        this.sunLight.position.set(10, 20, 10);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.width = 2048;
        this.sunLight.shadow.mapSize.height = 2048;
        this.sunLight.shadow.camera.near = 0.5;
        this.sunLight.shadow.camera.far = 500;
        this.sunLight.shadow.camera.left = -100;
        this.sunLight.shadow.camera.right = 100;
        this.sunLight.shadow.camera.top = 100;
        this.sunLight.shadow.camera.bottom = -100;
        this.scene.add(this.sunLight);
        this.scene.add(this.sunLight.target); // Important for following player

        // MOON
        this.moonLight = new THREE.DirectionalLight(0x4444ff, 0.3);
        this.moonLight.position.set(-10, -20, -10); // Opposite to sun
        this.moonLight.castShadow = true; // Moon shadows!
        this.scene.add(this.moonLight);
        this.scene.add(this.moonLight.target); // Important for following player
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
                if (itemId === 'glider') {
                    this.game.player.unlockGlider();
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
                // console.log("Loot Collected!");
                this.scene.remove(item.mesh);
                this.loot.splice(i, 1);
                // TODO: Add to inventory
            }

            item.mesh.rotation.y += dt;
        }
    }



    generateFogGrid() {
        this.fogGrid = [];
        const worldSize = 2000; // Assuming 2000x2000 world
        const gridSize = 50; // 50 meters
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
        // console.log(`Generated Fog Grid: ${this.fogGrid.length} points`);
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

        if (playerBody) {
            this.updateLoot(dt, playerBody);
            this.updateUpdrafts(dt, playerBody);
        }

        if (this.npcs) {
            this.npcs.forEach(npc => npc.update(dt));
        }

        if (this.towers) {
            this.towers.forEach(tower => tower.update(dt));
        }
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
