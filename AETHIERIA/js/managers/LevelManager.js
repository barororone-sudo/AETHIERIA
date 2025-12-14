import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Switch } from '../world/Switch.js';
import { Enemy } from '../Enemy.js';
import { Chest } from '../world/Chest.js';
import { EnemiesDb } from '../data/EnemiesDb.js';
import { Waypoint } from '../world/Waypoint.js';
import { Tower } from '../world/Tower.js';
import { CityGenerator } from '../world/CityGenerator.js';
import { SceneDecorationManager } from '../world/SceneDecorationManager.js';

export class LevelManager {
    constructor(world) {
        this.world = world;
        // Getter for game to ensure it's always current
        Object.defineProperty(this, 'game', { get: () => this.world.game });
        this.scene = world.scene;
        this.terrain = world.terrainManager;
        this.activeCamps = []; // { x, z, chest: Chest, enemies: Enemy[], cleared: bool }
        this.switches = [];
        this.generatedObjects = [];

        // EXPOSE FORCE SPAWN GLOBAL
        window.forceSpawn = () => {
            console.warn("FORCE SPAWNING WORLD...");
            this.spawnBiomeTowers();
            this.spawnCities(); // Fix: Include Cities
            this.spawnDecorations(); // Fix: Include Decor
            this.spawnWaypoints();
            console.error("FORCE SPAWN COMPLETE. Check Debug Overlay.");
        };
    }


    generate() {
        console.log("Generating World Population... (LOUD CHECK)");
        if (this.game && this.game.ui) this.game.ui.showToast("DEBUG: LevelManager.generate STARTED", "info");

        this.spawnTutorialChest();
        this.spawnBiomeTowers();
        this.spawnCities(); // New: Procedural Cities
        this.spawnDecorations(); // New: Instanced Biome Decor
        this.spawnWaypoints(); // New: Waypoints via LevelManager
        this.populateCamps();
        this.spawnHiddenChests();
        this.spawnLegendaryChest();
    }

    spawnBiomeTowers() {
        console.log("Spawning 10 Biome Towers (Genshin Style - Radial)...");
        if (this.world.towers) this.world.towers = [];

        // RADIAL COORDINATES (Matching TerrainManager.js)
        // Center: Forest
        // Ring (R=1400): 9 Biomes
        const R = 1400;
        const angleStep = (Math.PI * 2) / 9;
        const offset = angleStep / 2; // Center of sector

        const biomes = [
            { name: 'FOREST', x: 0, z: 0 }, // Center Hub
            { name: 'JUNGLE', x: Math.cos(0 * angleStep + offset) * R, z: Math.sin(0 * angleStep + offset) * R },
            { name: 'GOLD', x: Math.cos(1 * angleStep + offset) * R, z: Math.sin(1 * angleStep + offset) * R },
            { name: 'LAVA', x: Math.cos(2 * angleStep + offset) * R, z: Math.sin(2 * angleStep + offset) * R },
            { name: 'FIRE', x: Math.cos(3 * angleStep + offset) * R, z: Math.sin(3 * angleStep + offset) * R },
            { name: 'CRYSTAL', x: Math.cos(4 * angleStep + offset) * R, z: Math.sin(4 * angleStep + offset) * R },
            { name: 'LIGHTNING', x: Math.cos(5 * angleStep + offset) * R, z: Math.sin(5 * angleStep + offset) * R },
            { name: 'AIR', x: Math.cos(6 * angleStep + offset) * R, z: Math.sin(6 * angleStep + offset) * R },
            { name: 'ICE', x: Math.cos(7 * angleStep + offset) * R, z: Math.sin(7 * angleStep + offset) * R },
            { name: 'SNOW', x: Math.cos(8 * angleStep + offset) * R, z: Math.sin(8 * angleStep + offset) * R }
        ];

        // 1. CLEAR EXISTING TOWERS (Prevent Duplicates)
        if (this.world.towers && this.world.towers.length > 0) {
            console.warn("[LevelManager] Clearing existing towers before spawn...");
            this.world.towers.forEach(t => {
                if (t.mesh) this.scene.remove(t.mesh);
                if (t.body) this.world.physicsWorld.removeBody(t.body);
                // Icon removal? MapManager handles icons via sync usually, or we can manually remove if needed.
                // Assuming MapManager.syncMapIcons() handles orphan icons or we force refresh.
            });
            this.world.towers = [];
            // Remove from interactables too?
            if (this.world.interactables) {
                this.world.interactables = this.world.interactables.filter(i => !i.isTower); // Assuming isTower flag or class check
                // Simpler: Just rely on garbage collection if interactables are weak refs? No.
                // Filter out destroyed towers:
                // We'll leave interactables update to the end or filter manually.
            }
        } else {
            this.world.towers = [];
        }

        let count = 0;
        try {
            biomes.forEach(b => {
                // FORCE HEIGHT (Bypass Terrain Check Debugging)
                let h = 60; // High up so we can see them falling/existing

                try {
                    if (this.terrain) h = this.terrain.getHeightAt(b.x, b.z);
                } catch (e) { console.warn("Height check failed", e); }
                if (h < 5) h = 5;

                // DIRECT SPAWN (Bypass World Method)
                const tower = new Tower(this.world, b.x, b.z, `tower_${b.name}`, h);
                this.world.towers.push(tower);
                // Ensure it's in interactables
                if (this.world.interactables && !this.world.interactables.includes(tower)) {
                    this.world.interactables.push(tower);
                }

                // Add Icon Immediately (in case MapManager missed it)
                if (this.game.ui && this.game.ui.mapManager) {
                    this.game.ui.mapManager.addTowerIcon(tower, count);
                }

                count++;
            });
        } catch (e) {
            console.error("Critical Tower Spawn Error:", e);
            if (this.game && this.game.ui) this.game.ui.showToast("ERREUR: Generation Tours!" + e.message, "error");
        }

        console.log(`[LevelManager] ${count} Biome Towers Created (Radial Layout).`);
        if (this.game && this.game.ui) this.game.ui.showToast(`Monde Généré: ${count} Tours`, "success");
    }

    spawnCities() {
        console.log("Spawning Biome Cities...");
        if (!this.cityGenerator) {
            this.cityGenerator = new CityGenerator(this.world);
        }

        // Initialize storage
        this.world.cities = [];

        // Same Biomes as Towers for positioning
        const R = 1400;
        const angleStep = (Math.PI * 2) / 9;
        const offset = angleStep / 2;

        const biomes = [
            { name: 'FOREST', x: 0, z: 0 },
            { name: 'JUNGLE', x: Math.cos(0 * angleStep + offset) * R, z: Math.sin(0 * angleStep + offset) * R },
            { name: 'GOLD', x: Math.cos(1 * angleStep + offset) * R, z: Math.sin(1 * angleStep + offset) * R },
            { name: 'LAVA', x: Math.cos(2 * angleStep + offset) * R, z: Math.sin(2 * angleStep + offset) * R },
            { name: 'FIRE', x: Math.cos(3 * angleStep + offset) * R, z: Math.sin(3 * angleStep + offset) * R },
            { name: 'CRYSTAL', x: Math.cos(4 * angleStep + offset) * R, z: Math.sin(4 * angleStep + offset) * R },
            { name: 'LIGHTNING', x: Math.cos(5 * angleStep + offset) * R, z: Math.sin(5 * angleStep + offset) * R },
            { name: 'AIR', x: Math.cos(6 * angleStep + offset) * R, z: Math.sin(6 * angleStep + offset) * R },
            { name: 'ICE', x: Math.cos(7 * angleStep + offset) * R, z: Math.sin(7 * angleStep + offset) * R },
            { name: 'SNOW', x: Math.cos(8 * angleStep + offset) * R, z: Math.sin(8 * angleStep + offset) * R }
        ];

        biomes.forEach(b => {
            // Place city slightly offset from Tower (so they don't overlap)
            // Offset by 150m roughly
            const cityX = b.x + 120;
            const cityZ = b.z + 120;

            // REGISTER only (Do not load yet)
            const city = {
                x: cityX,
                z: cityZ,
                biome: b.name,
                name: `${b.name} City`,
                isLoaded: false,
                activeObjects: null
            };
            this.world.cities.push(city);

            // Add Icon Helper
            if (this.game.ui && this.game.ui.mapManager) {
                this.game.ui.mapManager.addCityIcon(city);
            }
        });

        console.log(`[LevelManager] ${biomes.length} Cities Generated.`);
    }

    spawnDecorations() {
        console.log("Initializing Dynamic Decoration System...");
        if (!this.decorManager) {
            this.decorManager = new SceneDecorationManager(this.world);
        }
        // No pre-population. Dynamic Streaming only.
    }

    updateDecorStreaming(playerPos) {
        if (!this.decorManager) return;

        const CHUNK_SIZE = 50;
        const VIEW_DIST = 8; // Increased range (400m)

        const px = Math.floor(playerPos.x / CHUNK_SIZE) * CHUNK_SIZE;
        const pz = Math.floor(playerPos.z / CHUNK_SIZE) * CHUNK_SIZE;

        // Load Nearby
        for (let x = -VIEW_DIST; x <= VIEW_DIST; x++) {
            for (let z = -VIEW_DIST; z <= VIEW_DIST; z++) {
                const cx = px + x * CHUNK_SIZE;
                const cz = pz + z * CHUNK_SIZE;

                // Distance Check (Circular)
                const distSq = (cx - playerPos.x) ** 2 + (cz - playerPos.z) ** 2;
                if (distSq > (VIEW_DIST * CHUNK_SIZE) ** 2) continue;

                let biome = 'WILD';
                if (this.terrain) biome = this.terrain.getBiome(cx, cz);

                this.decorManager.loadChunk(cx, cz, CHUNK_SIZE, biome);
            }
        }

        // Cleanup Far Chunks (Simple garbage collection)
        // Ideally this should be more efficient, but Map iteration is okay-ish.
        // Let's do it every 60 frames?
        if (Math.random() < 0.05) { // Occasional cleanup
            for (const [key, objects] of this.decorManager.activeChunks) {
                const [sx, sz] = key.split(',').map(Number);
                const distSq = (sx - playerPos.x) ** 2 + (sz - playerPos.z) ** 2;

                if (distSq > (VIEW_DIST * CHUNK_SIZE + 100) ** 2) {
                    this.decorManager.unloadChunk(sx, sz);
                }
            }
        }
    }

    spawnWaypoints() {
        console.log("Populating 100 Waypoints (Radial Distribution)...");

        // 1. CLEAR EXISTING
        if (this.world.waypoints && this.world.waypoints.length > 0) {
            this.world.waypoints.forEach(w => {
                if (w.mesh) this.scene.remove(w.mesh);
                // Icons handled by MapManager sync usually
            });
            this.world.waypoints = [];
        } else {
            this.world.waypoints = [];
        }

        const MIN_DIST = 150;
        let placed = 0;
        let attempts = 0;
        const MAX_ATTEMPTS = 500;

        // Try to place 100 waypoints uniformly in R=2200 circle
        while (placed < 100 && attempts < MAX_ATTEMPTS) {
            attempts++;

            // Random Point in Circle
            const r = Math.random() * 2000; // Slightly reduced radius
            const theta = Math.random() * Math.PI * 2;
            const tx = Math.cos(theta) * r;
            const tz = Math.sin(theta) * r;

            // HEIGHT CHECK
            let ty = 60; // Default High
            try {
                if (this.terrain) ty = this.terrain.getHeightAt(tx, tz) + 2.0; // +2m Safety Offset
            } catch (e) { }

            // If water (or noise fail), default to land height for test? 
            // Or skip. Let's skip water but be lenient.
            if (ty < 2.5) continue;

            // Dist Checks
            let ok = true;
            for (const wp of this.world.waypoints) {
                const d = (wp.position.x - tx) ** 2 + (wp.position.z - tz) ** 2;
                if (d < MIN_DIST * MIN_DIST) { ok = false; break; }
            }
            if (this.world.towers) {
                for (const t of this.world.towers) {
                    const d = (t.position.x - tx) ** 2 + (t.position.z - tz) ** 2;
                    if (d < 100 * 100) { ok = false; break; }
                }
            }

            if (!ok) continue;

            // Create
            // Biome helper for ID
            const biome = this.terrain ? this.terrain.getBiome(tx, tz) : 'WILD';
            const wp = new Waypoint(this.world, tx, tz, `wp_${biome}_${placed}`, ty);
            this.world.waypoints.push(wp);

            // Add Icon
            if (this.game.ui && this.game.ui.mapManager) {
                this.game.ui.mapManager.addWaypointIcon(wp);
            }

            placed++;
        }
        console.log(`[LevelManager] Created ${placed} Waypoints.`);
    }

    populateCamps() {
        console.log("Populating World with Monster Camps (10 per Biome - Distributed)...");

        // Exact same grid as Waypoints for consistency
        const biomes = [
            { name: 'ICE', minX: -2000, maxX: -1200, minZ: -1900, maxZ: -200 },
            { name: 'SNOW', minX: -1200, maxX: -400, minZ: -1900, maxZ: -200 },
            { name: 'AIR', minX: -400, maxX: 400, minZ: -1900, maxZ: -200 },
            { name: 'LIGHTNING', minX: 400, maxX: 1200, minZ: -1900, maxZ: -200 },
            { name: 'CRYSTAL', minX: 1200, maxX: 2000, minZ: -1900, maxZ: -200 },
            { name: 'FOREST', minX: -2000, maxX: -1200, minZ: 200, maxZ: 1900 },
            { name: 'JUNGLE', minX: -1200, maxX: -400, minZ: 200, maxZ: 1900 },
            { name: 'GOLD', minX: -400, maxX: 400, minZ: 200, maxZ: 1900 },
            { name: 'FIRE', minX: 400, maxX: 1200, minZ: 200, maxZ: 1900 },
            { name: 'LAVA', minX: 1200, maxX: 2000, minZ: 200, maxZ: 1900 }
        ];

        let totalCamps = 0;
        const MIN_DIST = 200; // 200m separation

        biomes.forEach(biome => {
            let placed = 0;
            let attempts = 0;

            while (placed < 10 && attempts < 500) {
                attempts++;

                const x = biome.minX + Math.random() * (biome.maxX - biome.minX);
                const z = biome.minZ + Math.random() * (biome.maxZ - biome.minZ);

                // 1. Check Terrain
                const y = this.terrain ? this.terrain.getGlobalHeight(x, z) : 0;
                if (y < 2.2) continue; // Water

                // 2. Check Flatness (Critical for camps)
                let isFlat = true;
                if (this.terrain) {
                    const h1 = this.terrain.getGlobalHeight(x + 5, z);
                    const h2 = this.terrain.getGlobalHeight(x, z + 5);
                    if (Math.abs(y - h1) > 4.0 || Math.abs(y - h2) > 4.0) isFlat = false;
                }
                if (!isFlat) continue;

                // 3. Proximity Check
                let tooClose = false;
                for (const camp of this.activeCamps) {
                    const dx = camp.x - x;
                    const dz = camp.z - z;
                    if ((dx * dx + dz * dz) < MIN_DIST * MIN_DIST) {
                        tooClose = true;
                        break;
                    }
                }

                // Check against Towers (avoid stacking)
                if (!tooClose && this.world.towers) {
                    for (const t of this.world.towers) {
                        const dx = t.position.x - x;
                        const dz = t.position.z - z;
                        if (dx * dx + dz * dz < 100 * 100) {
                            tooClose = true;
                            break;
                        }
                    }
                }

                if (tooClose) continue;

                // VALID
                this.spawnCamp(x, z, biome.name);
                placed++;
                totalCamps++;
            }
        });

        console.log(`[LevelManager] Successfully placed ${totalCamps} camps.`);
    }

    update(dt) {
        // Update Switches
        this.switches.forEach(s => s.update(dt));

        this.checkMobSpawning(dt);

        // OPTIMIZATION: Throttle Camp Checks
        this._campCheckTimer = (this._campCheckTimer || 0) - dt;
        if (this._campCheckTimer > 0) return;
        this._campCheckTimer = 2.0; // Check every 2 seconds

        // Monster Lock Logic
        this.activeCamps.forEach(camp => {
            if (!camp.cleared && camp.chest && camp.chest.locked && camp.enemiesSpawned) {
                const stillActive = camp.enemies.filter(e => this.world.enemies.includes(e) && !e.isDead);
                if (stillActive.length === 0) {
                    camp.cleared = true;
                    camp.chest.unlock();
                    this.game.ui.showToast("Camp nettoyé ! Coffre déverrouillé.", 'success');
                }
            }
        });
    }

    checkMobSpawning(dt) {
        if (!this.game.player || !this.game.player.mesh) return;
        const playerPos = this.game.player.mesh.position;
        const SPAWN_DIST = 80; // Changed from 30 to 80 for smoother gameplay
        const DESPAWN_DIST = 150;

        this.activeCamps.forEach(camp => {
            const dx = camp.x - playerPos.x;
            const dz = camp.z - playerPos.z;
            const distSq = dx * dx + dz * dz;

            // SPAWN LOGIC
            if (distSq < SPAWN_DIST * SPAWN_DIST && !camp.enemiesSpawned && !camp.cleared) {
                this.spawnCampEnemies(camp);
            }
            // DESPAWN LOGIC (Optimization)
            else if (distSq > DESPAWN_DIST * DESPAWN_DIST && camp.enemiesSpawned) {
                this.despawnCampEnemies(camp);
            }
        });
    }

    spawnCampEnemies(camp) {
        camp.enemies = [];
        camp.enemiesSpawned = true;
        const count = 3; // 3 Enemies per camp

        for (let i = 0; i < count; i++) {
            // Random position around fire
            const angle = Math.random() * Math.PI * 2;
            const r = 3 + Math.random() * 5;
            const ex = camp.x + Math.cos(angle) * r;
            const ez = camp.z + Math.sin(angle) * r;
            const ey = this.terrain ? this.terrain.getGlobalHeight(ex, ez) + 2.0 : camp.y + 2.0; // +2m Safety

            const enemy = new Enemy(this.world, new CANNON.Vec3(ex, ey, ez), camp.enemyType);

            camp.enemies.push(enemy);
            if (this.world.enemies) this.world.enemies.push(enemy);
        }
    }

    despawnCampEnemies(camp) {
        if (!camp.enemies) return;
        camp.enemies.forEach(e => {
            if (this.world.enemies) {
                const idx = this.world.enemies.indexOf(e);
                if (idx > -1) this.world.enemies.splice(idx, 1);
            }
            if (e.mesh) this.scene.remove(e.mesh);
            if (e.body) this.world.physicsWorld.removeBody(e.body);
        });
        camp.enemies = [];
        camp.enemiesSpawned = false;
    }

    spawnCamp(x, z, biome = 'FOREST') {
        const y = this.terrain ? this.terrain.getGlobalHeight(x, z) + 0.5 : 0; // +0.5m Slight offset

        // Define Enemy Type based on Biome
        let enemyType = 'goblin_warrior'; // Default
        if (biome === 'ICE' || biome === 'SNOW') enemyType = 'slime_blue';
        else if (biome === 'FIRE' || biome === 'LAVA') enemyType = 'slime_red';
        else if (biome === 'FOREST') enemyType = 'goblin_warrior';
        else if (biome === 'JUNGLE') enemyType = 'goblin_shaman';
        else if (biome === 'GOLD') enemyType = 'goblin_thief';
        else if (biome === 'LIGHTNING') enemyType = 'orc_warrior';
        else if (biome === 'CRYSTAL') enemyType = 'construct_sentinel';
        else if (biome === 'AIR') enemyType = 'goblin_archer';

        const camp = {
            x: x,
            y: y,
            z: z,
            biome: biome,
            enemyType: enemyType,
            cleared: false,
            enemiesSpawned: false,
            enemies: [],
            mapIcon: null
        };

        const dist = Math.sqrt(x * x + z * z);

        // Campfire Visuals
        const fireGeo = new THREE.CylinderGeometry(0.2, 0.5, 0.2, 8);
        const fireMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const fireBase = new THREE.Mesh(fireGeo, fireMat);
        fireBase.position.set(x, y, z);
        this.world.scene.add(fireBase);
        camp.mesh = fireBase; // Track mesh

        // Chest
        const chestTier = dist > 1000 ? 3 : 2;
        const chestPos = new THREE.Vector3(x + 2, y, z);
        const chest = new Chest(this.game, this.world, chestPos, chestTier, true); // belongsToCamp=true
        if (this.world.chests) this.world.chests.push(chest);
        camp.chest = chest;

        this.activeCamps.push(camp);

        // Map Icon
        if (this.game.ui && this.game.ui.mapManager) {
            this.game.ui.mapManager.addCampIcon(camp);
        }
    }

    /**
     * Coffre de Tutoriel - Immanquable au spawn
     */
    spawnTutorialChest() {
        // Position juste devant le joueur au spawn (0, 0, -10)
        const x = 0;
        const z = -10;
        const y = this.terrain ? this.terrain.getGlobalHeight(x, z) : 0;

        console.log(`Spawning Tutorial Chest at (${x}, ${y}, ${z})`);

        // Coffre Tier 1 (Common) avec sword_starter garanti
        const chest = new Chest(this.game, this.world, new THREE.Vector3(x, y, z), 1, false);

        // Forcer le contenu pour le tutoriel
        // Note: Chest.js génère du loot aléatoire, on pourrait override ici
        // Pour l'instant, on fait confiance au système de loot Tier 1

        if (this.world.chests) this.world.chests.push(chest);

        console.log("Tutorial Chest spawned! Open it to start your adventure.");
    }

    spawnHiddenChests() {
        // Scatter chests across the map with different tiers
        const chestConfigs = [
            { count: 40, tier: 1, minDist: 100, maxDist: 1800 },  // Common
            { count: 15, tier: 3, minDist: 300, maxDist: 1800 },  // Rare
            { count: 4, tier: 4, minDist: 800, maxDist: 1800 }    // Epic
        ];

        const minChestDistance = 100; // Minimum spacing between chests
        const spawnedChests = [];

        chestConfigs.forEach(config => {
            for (let i = 0; i < config.count; i++) {
                let attempts = 0;
                let placed = false;

                while (attempts < 20 && !placed) {
                    const angle = Math.random() * Math.PI * 2;
                    const r = config.minDist + Math.random() * (config.maxDist - config.minDist);
                    const x = Math.cos(angle) * r;
                    const z = Math.sin(angle) * r;
                    const y = this.terrain ? this.terrain.getGlobalHeight(x, z) : 0;

                    // Check distance from other chests
                    const tooClose = spawnedChests.some(pos => {
                        const dx = pos.x - x;
                        const dz = pos.z - z;
                        return Math.sqrt(dx * dx + dz * dz) < minChestDistance;
                    });

                    // Not underwater and not too close
                    if (!tooClose && y >= 2.0) {
                        const chest = new Chest(this.game, this.world, new THREE.Vector3(x, y, z), config.tier, false);
                        if (this.world.chests) this.world.chests.push(chest);
                        spawnedChests.push({ x, z });
                        placed = true;
                    }
                    attempts++;
                }
            }
        });

        console.log(`[LevelManager] Spawned ${spawnedChests.length} hidden chests.`);
    }

    spawnLegendaryChest() {
        // Far away Boss Chest
        const x = 0, z = -180; // "End of level"
        const y = this.terrain ? this.terrain.getGlobalHeight(x, z) : 0;

        // Spawn Platform
        // ... (Platform visual optional)

        // Chest
        const chest = new Chest(this.game, this.world, new THREE.Vector3(x, y, z), 4, true);
        if (this.world.chests) this.world.chests.push(chest);

        // Switch to unlock
        const switchPos = new THREE.Vector3(x + 5, y, z + 5);
        const s = new Switch(this.game, this.world, switchPos, chest);
        this.switches.push(s);

        // Guardian Golem nearby
        const golem = new Enemy(this.world, new CANNON.Vec3(x - 5, y + 2, z), 'golem_ancient');
        if (this.world.enemies) this.world.enemies.push(golem);
    }

    spawnGuardian() {
        // Guardian at Tower 1
        const tx = 50;
        const tz = 50;
        const ty = this.terrain ? this.terrain.getGlobalHeight(tx, tz) : 0;

        // Offset slightly so it's not Inside the tower
        const gx = tx - 8;
        const gz = tz - 8;
        const gy = this.terrain ? this.terrain.getGlobalHeight(gx, gz) : 0;

        console.log("Spawning Guardian Golem!");
        new Enemy(this.world, new CANNON.Vec3(gx, gy + 2, gz), 'golem_ancient');
    }

    getData() {
        // Return only the serializable camp descriptors
        return {
            camps: this.activeCamps.map(camp => ({
                x: camp.x,
                z: camp.z,
                cleared: camp.cleared
            }))
        };
    }

    loadData(data) {
        if (data.camps && Array.isArray(data.camps)) {
            this.clear();
            console.log("Loading World from Save...");
            data.camps.forEach(camp => {
                this.spawnCamp(camp.x, camp.z);
            });
            // Re-spawn criticals/guardian if tracked separately
        }
    }

    clear() {
        console.log("Resetting Dynamic World (Enemies/Chests/Camps)...");
        // Remove tracked enemies
        if (this.world.enemies) {
            for (const e of this.world.enemies) {
                if (e.mesh) this.scene.remove(e.mesh);
                if (e.body) this.world.physicsWorld.removeBody(e.body);
            }
            this.world.enemies = []; // Wipe
        }

        // Clear Chests
        if (this.world.chests) {
            for (const c of this.world.chests) {
                if (c.mesh) this.scene.remove(c.mesh);
                // Physics? Chests might have bodies?
            }
            this.world.chests = [];
        }

        this.activeCamps = [];
        this.generatedObjects = []; // Ensure Towers/Waypoints are NOT in here

        // DO NOT WIPE TOWERS OR WAYPOINTS
        // They are static and persistent.
    }

    update(dt) {
        if (this.game.player && this.game.player.mesh) {
            this.updateCityStreaming(this.game.player.mesh.position);
        }
    }

    updateCityStreaming(playerPos) {
        if (!this.world.cities) return;
        if (!this.cityGenerator) return;

        const LOAD_DIST = 350;
        const UNLOAD_DIST = 450;

        this.world.cities.forEach(city => {
            const dx = city.x - playerPos.x;
            const dz = city.z - playerPos.z;
            const distSq = dx * dx + dz * dz;

            if (city.isLoaded) {
                // Check Unload
                if (distSq > UNLOAD_DIST * UNLOAD_DIST) {
                    this.cityGenerator.unloadCity(city);
                }
            } else {
                // Check Load
                if (distSq < LOAD_DIST * LOAD_DIST) {
                    this.cityGenerator.loadCity(city);
                }
            }
        });
    }
}
