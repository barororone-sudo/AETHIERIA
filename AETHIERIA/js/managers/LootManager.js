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
     * @param {number} rarity 
     * @returns {number} Hex Color
     */
    getRarityColor(rarity) {
        switch (rarity) {
            case 1: return 0xFFFFFF; // Common: White
            case 2: return 0x00FF00; // Uncommon: Green
            case 3: return 0x0088FF; // Rare: Blue
            case 4: return 0x9D00FF; // Epic: Purple
            case 5: return 0xFFAA00; // Legendary: Orange
            default: return 0xFFFFFF;
        }
    }

    /**
     * Creates a text sprite (billboard)
     */
    createFloatingLabel(text, color) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;

        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillRect(0, 0, 256, 64);

        ctx.font = "bold 32px Arial";
        ctx.fillStyle = "#" + new THREE.Color(color).getHexString();
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text, 128, 32);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(2, 0.5, 1);
        sprite.position.y = 1.5; // Above item
        sprite.visible = false; // Hidden by default (shown on proximity)
        return sprite;
    }

    spawnLootParticles(position, color) {
        if (!this.game.world) return;

        const count = 20;
        const geometry = new THREE.BufferGeometry();
        const positions = [];
        const velocities = [];

        for (let i = 0; i < count; i++) {
            positions.push(position.x, position.y, position.z);
            velocities.push(
                (Math.random() - 0.5) * 5,
                Math.random() * 5,
                (Math.random() - 0.5) * 5
            );
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        const material = new THREE.PointsMaterial({
            color: color,
            size: 0.1,
            transparent: true,
            opacity: 1,
            blending: THREE.AdditiveBlending
        });

        const particles = new THREE.Points(geometry, material);
        this.game.world.scene.add(particles);

        // Simple animation loop for this burst
        const startTime = Date.now();
        const animate = () => {
            const elapsed = (Date.now() - startTime) / 1000;
            if (elapsed > 1.0) {
                this.game.world.scene.remove(particles);
                geometry.dispose();
                material.dispose();
                return;
            }

            const positions = particles.geometry.attributes.position.array;
            for (let i = 0; i < count; i++) {
                positions[i * 3] += velocities[i * 3] * 0.016; // Simple Euler
                positions[i * 3 + 1] += velocities[i * 3 + 1] * 0.016 - (9.8 * 0.016 * 0.016); // Grav
                velocities[i * 3 + 1] -= 9.8 * 0.016;
            }
            particles.geometry.attributes.position.needsUpdate = true;
            material.opacity = 1.0 - elapsed;
            requestAnimationFrame(animate);
        };
        animate();
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

            const rarityColor = this.getRarityColor(item.rarity || 1);

            // 1. Create Mesh
            let mesh;
            if (item.category === 'WEAPON' || item.type === 'WEAPON') { // Check category too
                try {
                    mesh = WeaponGenerator.createWeapon(item);
                    mesh.scale.setScalar(0.5);
                } catch (e) {
                    // Fallback
                    mesh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshStandardMaterial({ color: rarityColor }));
                }
            } else {
                // Orb for material/potion
                mesh = new THREE.Mesh(
                    new THREE.SphereGeometry(0.2, 8, 8),
                    new THREE.MeshStandardMaterial({ color: rarityColor, emissive: rarityColor, emissiveIntensity: 0.5 })
                );
            }

            // 2. BEAM (All loot gets a beam for satisfaction, intensity based on rarity)
            const beamGeo = new THREE.CylinderGeometry(0.05, 0.05, 20, 8);
            beamGeo.translate(0, 10, 0);
            const beamMat = new THREE.MeshBasicMaterial({
                color: rarityColor,
                transparent: true,
                opacity: (item.rarity || 1) * 0.15, // Rarer = Brighter
                blending: THREE.AdditiveBlending,
                side: THREE.DoubleSide,
                depthWrite: false
            });
            const beam = new THREE.Mesh(beamGeo, beamMat);
            mesh.add(beam);

            // 3. LIGHT
            const light = new THREE.PointLight(rarityColor, 1, 5);
            light.position.y = 0.5;
            mesh.add(light);

            // 4. BILLBOARD TEXT
            const label = this.createFloatingLabel(item.name, rarityColor);
            mesh.add(label);
            mesh.userData.label = label; // Store ref for update

            // 5. Position & Velocity
            const offset = Utils.randomPointOnCircle(0.5);
            mesh.position.copy(position);
            mesh.position.y += 1.0;

            const velocity = new THREE.Vector3(
                offset.x * 2,
                4 + Math.random() * 2,
                offset.z * 2
            );

            this.game.world.scene.add(mesh);

            // 6. PARTICLES BURST
            this.spawnLootParticles(position, rarityColor);

            // Track
            this.droppedItems.push({
                mesh: mesh,
                velocity: velocity,
                item: item,
                count: drop.count,
                life: 120.0, // 2 min
                grounded: false
            });

            // SFX
            if (this.game.audio) {
                // Pitch based on rarity?
                this.game.audio.playSFX('ui_hover'); // Placeholder
            }
        });
    }

    update(dt) {
        if (!this.game.player) return;
        const pPos = this.game.player.body.position;
        const playerVec3 = new THREE.Vector3(pPos.x, pPos.y, pPos.z);
        const pickupRange = 2.0;
        const textRange = 10.0; // Show text when close
        const gravity = -15;

        for (let i = this.droppedItems.length - 1; i >= 0; i--) {
            const drop = this.droppedItems[i];

            // Physics
            if (!drop.grounded) {
                drop.velocity.y += gravity * dt;
                drop.mesh.position.addScaledVector(drop.velocity, dt);

                let floorY = 0;
                if (this.game.world.terrainManager) {
                    floorY = this.game.world.terrainManager.getGlobalHeight(drop.mesh.position.x, drop.mesh.position.z);
                }
                if (isNaN(floorY)) floorY = 0;

                if (drop.mesh.position.y < floorY + 0.3) {
                    drop.mesh.position.y = floorY + 0.3;
                    drop.velocity.set(0, 0, 0);
                    drop.grounded = true;
                } else if (drop.mesh.position.y < -5) {
                    drop.mesh.position.y = floorY + 0.5;
                    drop.velocity.set(0, 0, 0);
                    drop.grounded = true;
                }
            } else {
                // Float & Rotate Animation
                drop.mesh.rotation.y += dt;
                drop.mesh.position.y += Math.sin(Date.now() * 0.003) * 0.001; // Gentle bob
            }

            // Billboard Visibility
            const dist = drop.mesh.position.distanceTo(playerVec3);
            if (drop.mesh.userData.label) {
                if (dist < textRange) {
                    drop.mesh.userData.label.visible = true;
                    // Fade in/out could go here, simple toggle for now
                } else {
                    drop.mesh.userData.label.visible = false;
                }
            }

            // Despawn
            drop.life -= dt;
            if (drop.life <= 0) {
                this.removeDrop(i);
                continue;
            }

            // Pickup
            if (dist < pickupRange) {
                this.collectLoot(i);
            }
        }
    }

    collectLoot(index) {
        const drop = this.droppedItems[index];

        if (this.game.player.inventory) {
            this.game.player.inventory.addItem(drop.item.id, drop.count);
        }

        if (this.game.combatUI) {
            // Need to support string in showDamage or add new method. 
            // Assuming showDamage(pos, val, isCrit) handles val as string purely for display
            this.game.combatUI.showDamage(drop.mesh.position, `+${drop.count} ${drop.item.name}`, false);
        }
        if (this.game.story) {
            this.game.story.notify('ITEM_PICKUP', drop.item.id);
        }

        if (this.game.audio) {
            this.game.audio.playSFX('pickup');
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
