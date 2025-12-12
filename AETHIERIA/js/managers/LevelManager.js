import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Switch } from '../world/Switch.js';
import { Enemy } from '../Enemy.js';
import { Chest } from '../world/Chest.js';
import { EnemiesDb } from '../data/EnemiesDb.js';

export class LevelManager {
    constructor(world) {
        this.world = world;
        this.game = world.game;
        this.scene = world.scene;
        this.terrain = world.terrainManager;
        this.activeCamps = []; // { x, z, chest: Chest, enemies: Enemy[], cleared: bool }
        this.switches = [];
        this.generatedObjects = [];
    }

    generate() {
        console.log("Generating World Population...");
        this.spawnTutorialChest(); // NOUVEAU: Coffre de tutoriel au spawn
        this.populateCamps();
        this.spawnHiddenChests();
        this.spawnLegendaryChest();
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
        const SPAWN_DIST = 30; // Close range for testing (normally 60-80)
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
        // console.log(`Spawning enemies for camp at ${camp.x}, ${camp.z}`);
        camp.enemies = []; // Reset array
        camp.enemiesSpawned = true;

        // Biome-specific enemy selection logic could go here if needed per-enemy
        // For now relying on camp.enemyType set during spawnCamp

        // Register
        // (Handled by specific enemy spawning logic usually, but ensure consistency)
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
        const y = this.terrain ? this.terrain.getGlobalHeight(x, z) : 0;

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
        console.log("Clearing Procedural World...");
        // Remove tracked enemies
        // Note: This relies on tracked objects being valid.
        // If World.enemies has other stuff, this might desync.
        // Ideally we iterate world.enemies and remove?

        // Simple approach: Clear World.enemies entirely for now (Roguelike reset)
        if (this.world.enemies) {
            for (const e of this.world.enemies) {
                this.scene.remove(e.mesh);
                this.world.physicsWorld.removeBody(e.body);
            }
            this.world.enemies = []; // Wipe
        }

        // Clear Chests
        if (this.world.chests) {
            for (const c of this.world.chests) {
                this.scene.remove(c.mesh);
                // Physics? Chests might have bodies?
            }
            this.world.chests = [];
        }

        this.activeCamps = [];
        this.generatedObjects = [];
    }
}
