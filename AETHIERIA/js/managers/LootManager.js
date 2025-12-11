import * as THREE from 'three';
import { Utils } from '../Utils.js';
import { getItemById, ItemsDb, ItemCategory, Rarity } from '../data/ItemsDb.js';
import { WeaponGenerator } from '../generators/WeaponGenerator.js';

export class LootManager {
    constructor(game) {
        this.game = game;
        this.droppedItems = []; // { mesh, velocity, itemData, life }
    }

    /**
     * @param {string} category 
     * @param {number} rarity 
     */
    getRandomItem(category, rarity) {
        const potential = ItemsDb.filter(i => i.category === category && i.rarity === rarity);
        if (potential.length === 0) return null;
        return potential[Math.floor(Math.random() * potential.length)];
    }

    /**
     * @param {number} tier 1=Common, 2=Exquisite, 3=Precious, 4=Legendary
     * @returns {Array<{itemId: string, count: number}>}
     */
    /**
     * @param {number} tier 
     * @returns {Array<{itemId: string, count: number}>}
     */
    getChestLoot(tier) {
        const drops = [];
        const add = (id, count = 1) => drops.push({ itemId: id, count: count });

        // Helper to get random weapon by rarity
        const getWeapon = (rarity) => {
            const pool = ItemsDb.filter(i => i.category === 'WEAPON' && i.rarity === rarity);
            if (pool.length === 0) return null;
            return pool[Math.floor(Math.random() * pool.length)].id;
        };

        // Helper to get random material
        const getMaterial = (rarity) => {
            const pool = ItemsDb.filter(i => (i.category === 'MATERIAL' || i.category === 'MATERIAL_WEAPON') && i.rarity === rarity);
            if (pool.length === 0) return 'iron_ore';
            return pool[Math.floor(Math.random() * pool.length)].id;
        };

        // PROBABILITY LOGIC
        // Tier 1 (Common Chest): 80% Common Wep, 10% Uncommon Wep
        // Tier 2 (Rare Chest): 60% Uncommon, 20% Rare
        // Tier 3 (Epic Chest): 50% Rare, 30% Epic
        // Tier 4 (Legendary Chest): 40% Epic, 40% Legendary

        const roll = Math.random();
        let weaponId = null;
        let materialId = null;

        if (tier === 1) {
            if (roll < 0.8) weaponId = getWeapon(1);
            else if (roll < 0.9) weaponId = getWeapon(2);
            materialId = 'iron_ore';
        } else if (tier === 2) {
            if (roll < 0.6) weaponId = getWeapon(2);
            else if (roll < 0.8) weaponId = getWeapon(3);
            else weaponId = getWeapon(1); // Filler
            materialId = 'crystal_ethereal';
        } else if (tier === 3) {
            if (roll < 0.5) weaponId = getWeapon(3);
            else if (roll < 0.8) weaponId = getWeapon(4);
            else weaponId = getWeapon(2);
            materialId = 'golem_core';
        } else if (tier >= 4) {
            if (roll < 0.4) weaponId = getWeapon(4);
            else if (roll < 0.8) weaponId = getWeapon(5);
            else weaponId = getWeapon(3);
            materialId = 'golem_core';
            add('ancient_key', 1); // Bonus key
        }

        if (weaponId) add(weaponId, 1);
        if (materialId) add(materialId, Math.floor(Math.random() * 3) + 1);

        // Potion Chance
        if (Math.random() < 0.5) add('potion_health', 1);

        return drops;
    }

    /**
     * Alias for spawnLoot as requested by user specs
     */
    dropLoot(position, drops) {
        this.spawnLoot(position, drops);
    }

    /**
     * Calculates loot drops for an enemy based on its table.
     * @param {import('../Enemy.js').Enemy} enemy 
     * @returns {Array<{itemId: string, count: number}>} list of items to drop
     */
    rollLoot(enemy) {
        if (!enemy || !enemy.config || !enemy.config.lootTable) {
            return [];
        }

        const drops = [];
        const table = enemy.config.lootTable;

        for (const entry of table) {
            if (Math.random() <= entry.chance) {
                const min = entry.min || 1;
                const max = entry.max || 1;
                const count = Math.floor(Math.random() * (max - min + 1)) + min;

                if (count > 0) {
                    drops.push({ itemId: entry.itemId, count: count });
                    console.log(`Loot Roll: ${enemy.name} dropped ${count}x ${entry.itemId}`);
                }
            }
        }

        return drops;
    }

    /**
     * Spawns physical loot in the world.
     * @param {THREE.Vector3} position 
     * @param {Array<{itemId: string, count: number}>} drops 
     */
    spawnLoot(position, drops) {
        if (!this.game.world) return;

        drops.forEach(drop => {
            const item = getItemById(drop.itemId) || {
                id: drop.itemId,
                name: drop.itemId,
                type: 'MATERIAL',
                rarity: 1,
                visualStats: { color: drop.itemId.includes('gold') ? '#FFD700' : '#FFFFFF' }
            };

            // 1. Create Mesh
            let mesh;
            if (item.type === 'WEAPON') {
                mesh = WeaponGenerator.createWeapon(item);
                mesh.scale.setScalar(0.5); // Miniature
            } else {
                // Orb for material/potion
                const color = item.visualStats ? item.visualStats.color : 0xffffff;
                mesh = new THREE.Mesh(
                    new THREE.SphereGeometry(0.2, 8, 8),
                    new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 0.5 })
                );
            }

            // High Rarity Beam
            if (item.rarity >= 3) { // Rare+
                const beamGeo = new THREE.CylinderGeometry(0.02, 0.02, 10, 4);
                beamGeo.translate(0, 5, 0); // Center beam bottom at mesh
                const beamColor = item.rarity === 3 ? 0x0088ff : (item.rarity === 4 ? 0xaa00aa : 0xffaa00);
                const beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: beamColor, transparent: true, opacity: 0.5 }));
                mesh.add(beam);

                // Point Light
                const light = new THREE.PointLight(beamColor, 1, 3);
                light.position.y = 0.5;
                mesh.add(light);
            }

            // 2. Position & Velocity
            // Spread
            const offset = Utils.randomPointOnCircle(0.5);
            mesh.position.copy(position);
            mesh.position.y += 1.0; // Start high

            // Fountain Velocity
            const velocity = new THREE.Vector3(
                offset.x * 3, // Outward
                5 + Math.random() * 2, // Up
                offset.z * 3
            );

            this.game.world.scene.add(mesh);

            // 3. Track
            this.droppedItems.push({
                mesh: mesh,
                velocity: velocity,
                item: item,
                count: drop.count,
                life: 60.0, // 1 min despawn
                grounded: false
            });

            // Initial burst sound?
        });
    }

    update(dt) {
        if (!this.game.player) return;
        const pPos = this.game.player.body.position;
        const pickupRange = 2.0;
        const gravity = -15;

        for (let i = this.droppedItems.length - 1; i >= 0; i--) {
            const drop = this.droppedItems[i];

            // Physics (Simple Euler)
            if (!drop.grounded) {
                drop.velocity.y += gravity * dt;
                drop.mesh.position.addScaledVector(drop.velocity, dt);

                // Floor check (Simple Y=0 + Terrain check if available)
                let floorY = 0;
                if (this.game.world.terrainManager) {
                    floorY = this.game.world.terrainManager.getGlobalHeight(drop.mesh.position.x, drop.mesh.position.z);
                }

                // Safety: Reset if NaN
                if (isNaN(floorY)) floorY = 0;

                // Stop if hit ground OR hit safety floor (-5)
                if (drop.mesh.position.y < floorY + 0.3) {
                    drop.mesh.position.y = floorY + 0.3;
                    drop.velocity.set(0, 0, 0);
                    drop.grounded = true;
                } else if (drop.mesh.position.y < -5) {
                    // Fell through world? Bring back up or just stop
                    drop.mesh.position.y = floorY + 0.5;
                    drop.velocity.set(0, 0, 0);
                    drop.grounded = true;
                }
            } else {
                // Float & Rotate
                drop.mesh.rotation.y += dt;
                drop.mesh.position.y += Math.sin(Date.now() * 0.003) * 0.002;
            }

            // Despawn Time
            drop.life -= dt;
            if (drop.life <= 0) {
                this.removeDrop(i);
                continue;
            }

            // 🎯 Pickup Check (Convert CANNON.Vec3 to THREE.Vector3)
            const playerPos = new THREE.Vector3(pPos.x, pPos.y, pPos.z);
            const dist = drop.mesh.position.distanceTo(playerPos);
            if (dist < pickupRange) {
                this.collectLoot(i);
            }
        }
    }

    collectLoot(index) {
        const drop = this.droppedItems[index];

        // Add to inventory
        if (this.game.player.inventory) {
            this.game.player.inventory.addItem(drop.item.id, drop.count);
        }

        // Notify UI (Text pop)
        if (this.game.combatUI) {
            this.game.combatUI.showDamage(drop.mesh.position, `+${drop.count} ${drop.item.name}`, false); // Reuse damage text for now? Or new method?
            // Actually, CombatUI showDamage takes number usually, need to verify if string works or modify CombatUI
            // I'll update CombatUI too if needed or pass dummy 0 + string logic 
        }
        if (this.game.story) {
            this.game.story.notify('ITEM_PICKUP', drop.item.id);
        }
        console.log(`✅ Picked up ${drop.count} ${drop.item.name}`);

        // 🔊 Pickup Sound
        if (this.game.audio) {
            this.game.audio.playSFX('pickup'); // Generic pickup sound
        }

        this.removeDrop(index);
    }

    removeDrop(index) {
        const drop = this.droppedItems[index];
        if (this.game.world) {
            this.game.world.scene.remove(drop.mesh);
        }
        this.droppedItems.splice(index, 1);
    }
}
