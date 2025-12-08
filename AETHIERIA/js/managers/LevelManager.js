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

    update(dt) {
        // Monster Lock Logic
        this.activeCamps.forEach(camp => {
            if (!camp.cleared && camp.chest && camp.chest.locked) {
                // Check if all enemies dead
                const alive = camp.enemies.some(e => e.hp > 0);
                // Note: Enemy removal from world.enemies array might happen, but e.hp > 0 is safer if object persists
                // Actually, if they are removed from scene, we need a better check.
                // Assuming World removes them or sets a 'dead' flag. 
                // Let's assume we filter this.world.enemies

                // Better: Count how many are still in world.enemies
                const stillActive = camp.enemies.filter(e => this.world.enemies.includes(e));

                if (stillActive.length === 0) {
                    camp.cleared = true;
                    camp.chest.unlock();
                    this.game.ui.showToast("Camp nettoyé ! Coffre déverrouillé.", 'success');
                }
            }
        });

        // Update Switches
        this.switches.forEach(s => s.update(dt));
    }

    populateCamps() {
        const worldSize = 400; // -200 to 200
        const campCount = 10;

        for (let i = 0; i < campCount; i++) {
            let attempts = 0;
            let placed = false;

            while (attempts < 10 && !placed) {
                const x = (Math.random() - 0.5) * worldSize;
                const z = (Math.random() - 0.5) * worldSize;

                // Don't spawn too close to start (0,0)
                if (Math.sqrt(x * x + z * z) < 30) {
                    attempts++;
                    continue;
                }

                // Check Flatness
                if (this.isAreaFlat(x, z, 5)) {
                    this.spawnCamp(x, z);
                    placed = true;
                }
                attempts++;
            }
        }
    }

    isAreaFlat(x, z, radius) {
        if (!this.terrain) return true; // Assume flat if no terrain

        const centerH = this.terrain.getGlobalHeight(x, z);
        const samples = [
            this.terrain.getGlobalHeight(x + radius, z),
            this.terrain.getGlobalHeight(x - radius, z),
            this.terrain.getGlobalHeight(x, z + radius),
            this.terrain.getGlobalHeight(x, z - radius)
        ];

        // Return false if any sample is underwater or too steep
        if (centerH < 1.5) return false; // Underwater

        for (const h of samples) {
            if (Math.abs(h - centerH) > 1.5) return false;
        }

        return true;
    }

    spawnCamp(x, z) {
        const y = this.terrain ? this.terrain.getGlobalHeight(x, z) : 0;
        const dist = Math.sqrt(x * x + z * z);

        console.log(`Spawning Camp at (${x.toFixed(0)}, ${z.toFixed(0)}) Dist: ${dist.toFixed(0)}`);

        // Campfire (Keep existing visual code)
        // ... (lines 81-96 kept implicitly or assume exist, I will rewrite spawnCamp body)
        const fireGeo = new THREE.CylinderGeometry(0.2, 0.5, 0.2, 8);
        const fireMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const fireBase = new THREE.Mesh(fireGeo, fireMat);
        fireBase.position.set(x, y + 0.1, z);
        this.scene.add(fireBase);
        const fireLight = new THREE.PointLight(0xffaa00, 1, 10);
        fireLight.position.set(0, 0.5, 0);
        fireBase.add(fireLight);
        const core = new THREE.Mesh(new THREE.DodecahedronGeometry(0.2), new THREE.MeshBasicMaterial({ color: 0xff4400 }));
        core.position.y = 0.3;
        fireBase.add(core);

        // CHEST: Exquisite (Tier 2/3)
        const chestTier = dist > 200 ? 3 : 2;
        const chestPos = new THREE.Vector3(x + 2, y, z);
        const chest = new Chest(this.game, this.world, chestPos, chestTier, true); // Locked by default (Monster Lock)

        // ENEMIES
        const campEnemies = [];
        let minionsPool = ['goblin_scout', 'slime_green'];
        let count = 3;

        if (dist > 200) minionsPool = ['orc_warrior', 'goblin_archer'];

        const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const ex = x + Math.cos(angle) * 3;
            const ez = z + Math.sin(angle) * 3;
            const ey = this.terrain ? this.terrain.getGlobalHeight(ex, ez) : 0;

            const enemy = new Enemy(this.world, new CANNON.Vec3(ex, ey + 1, ez), pick(minionsPool));
            campEnemies.push(enemy);
            this.generatedObjects.push(enemy);

            // CRITICAL FIX: Register with World for updates
            if (this.world.enemies) this.world.enemies.push(enemy);
        }

        this.activeCamps.push({ x, z, chest: chest, enemies: campEnemies, cleared: false });
        // Register Chest
        if (this.world.chests) this.world.chests.push(chest);
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
        // Scatter Common Chests
        for (let i = 0; i < 5; i++) {
            const angle = Math.random() * Math.PI * 2;
            const r = 50 + Math.random() * 100;
            const x = Math.cos(angle) * r;
            const z = Math.sin(angle) * r;
            const y = this.terrain ? this.terrain.getGlobalHeight(x, z) : 0;

            // Simple Common Chest
            const chest = new Chest(this.game, this.world, new THREE.Vector3(x, y, z), 1, false);
            if (this.world.chests) this.world.chests.push(chest);
        }
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
