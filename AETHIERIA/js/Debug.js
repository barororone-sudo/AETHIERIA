// js/Debug.js
import { ItemsDb } from './data/ItemsDb.js';
import { Enemy } from './Enemy.js';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class DebugManager {
    constructor(game) {
        this.game = game;
        this.isVisible = false;
        this.initUI();
        this.initInput();
    }

    initUI() {
        this.container = document.createElement('div');
        this.container.style.position = 'absolute';
        this.container.style.top = '10px';
        this.container.style.right = '10px';
        this.container.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        this.container.style.color = '#0f0';
        this.container.style.padding = '10px';
        this.container.style.fontFamily = 'monospace';
        this.container.style.display = 'none';
        this.container.style.zIndex = '1000';
        this.container.style.maxHeight = '90vh';
        this.container.style.overflowY = 'auto';

        this.container.innerHTML = `
            <h3>DEBUG MENU (F3)</h3>
            <div style="border: 1px solid #004400; padding: 5px; margin-bottom: 5px;">
                <strong>SHOOTING RANGE</strong><br>
                <select id="dbg-weapon-list" style="background:#000; color:#0f0; border:1px solid #0f0; max-width:150px;"></select>
                <button id="dbg-equip">Équiper</button><br><br>
                <button id="dbg-dummy">Spawn Dummy</button>
            </div>
            <button id="dbg-teleport">Teleport to (0,10,0)</button><br>
            <button id="dbg-items">Give All Items</button><br>
            <button id="dbg-enemy">Spawn Enemy</button><br>
            <button id="dbg-golem">Spawn Golem Boss</button><br>
            <button id="dbg-god">Toggle God Mode</button><br>
            <button id="dbg-map">Verify Minimap</button><br>
            <div id="dbg-info"></div>
        `;

        document.body.appendChild(this.container);

        this.populateWeaponList();

        // --- HANDLERS ---

        // Weapon Equip
        document.getElementById('dbg-equip').onclick = () => {
            const select = document.getElementById('dbg-weapon-list');
            // @ts-ignore
            const itemId = select.value;
            if (itemId) {
                this.game.player.equipWeapon(itemId);
                const item = ItemsDb.find(i => i.id === itemId);
                console.log(`Debug: Arme de test équipée : ${item ? item.name : itemId}`);
            }
        };

        // Dummy Spawner
        document.getElementById('dbg-dummy').onclick = () => {
            const player = this.game.player;
            if (!player || !player.mesh) return;

            // Calculate position 5m in front
            const forward = new THREE.Vector3(0, 0, -1);
            forward.applyQuaternion(player.mesh.quaternion);
            const spawnPos = player.mesh.position.clone().add(forward.multiplyScalar(5));
            // Ensure slightly above ground
            spawnPos.y += 2;

            // Spawn using World method but capture instance
            // We need to access the enemies list, which is in LevelManager or World?
            // World.spawnEnemy adds it to this.enemies usually.
            // Let's manually spawn one to control it specifically.
            const enemy = this.game.world.spawnEnemy(spawnPos);

            if (enemy) {
                // Disable AI
                enemy.state = 'DUMMY';
                // Override update to do nothing but sync physics (immobilized)
                enemy.update = (dt) => {
                    if (enemy.body) {
                        enemy.body.velocity.set(0, 0, 0); // No movement
                        enemy.body.angularVelocity.set(0, 0, 0);
                        if (enemy.mesh) {
                            enemy.mesh.position.copy(enemy.body.position);
                            enemy.mesh.quaternion.copy(enemy.body.quaternion);
                        }
                    }
                };
                // Make it look different?
                if (enemy.mesh && enemy.mesh.material) {
                    enemy.mesh.material.color.setHex(0xFFFF00); // Yellow Dummy
                }
                console.log("Debug: Training Dummy Spawned at", spawnPos);
            }
        };

        document.getElementById('dbg-teleport').onclick = () => {
            this.game.player.body.position.set(0, 10, 0);
            this.game.player.body.velocity.set(0, 0, 0);
        };

        document.getElementById('dbg-items').onclick = () => {
            // Weapons for testing
            this.game.player.inventory.addItem('sword_starter', 1);
            this.game.player.inventory.addItem('dagger_thief', 1);
            this.game.player.inventory.addItem('dagger_void', 1);
            this.game.player.inventory.addItem('greatsword_iron', 1);
            // Consumables
            this.game.player.inventory.addItem('potion_health', 10);
            this.game.player.inventory.addItem('crystal_pyro', 5);
            console.log("Debug: Items Given (including daggers!)");
        };

        document.getElementById('dbg-enemy').onclick = () => {
            const pos = this.game.player.body.position.clone();
            const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.game.player.mesh.quaternion);
            pos.vadd(new CANNON.Vec3(forward.x * 5, 0, forward.z * 5), pos);

            // Random from roster
            const types = [
                'slime_green', 'slime_red', 'slime_blue',
                'goblin_scout', 'goblin_archer', 'goblin_thief',
                'orc_warrior', 'orc_berserker', 'orc_chief',
                'construct_sentinel'
            ];
            const rndId = types[Math.floor(Math.random() * types.length)];

            console.log(`Debug: Spawning ${rndId}`);
            new Enemy(this.game.world, pos, rndId);
        };

        document.getElementById('dbg-golem').onclick = () => {
            const pos = new CANNON.Vec3(0, 5, -40); // On the Arena
            this.game.world.spawnGolem(pos);
        };

        document.getElementById('dbg-god').onclick = () => {
            this.game.player.isGodMode = !this.game.player.isGodMode;
            console.log("God Mode:", this.game.player.isGodMode);
        };

        document.getElementById('dbg-map').onclick = () => {
            const hud = document.getElementById('hud-minimap');
            const big = document.getElementById('big-map');
            console.log("Minimap Debug:");
            console.log("HUD Element:", hud);
            console.log("Big Map Element:", big);
            console.log("Big Map Visible:", big ? big.style.display : 'N/A');

            if (hud) {
                hud.style.border = '5px solid red';
                setTimeout(() => hud.style.border = '3px solid rgba(255, 255, 255, 0.8)', 1000);
            }
            alert("Minimap Verified! Check Console for details. HUD should flash red.");
        };
    }

    populateWeaponList() {
        const select = document.getElementById('dbg-weapon-list');
        if (!select) return;

        ItemsDb.forEach(item => {
            // Filter weapons by category
            if (item.category === 'WEAPON') {
                const opt = document.createElement('option');
                opt.value = item.id;
                // [TYPE] Name (Rarity)
                const typeInfo = item.weaponType ? `[${item.weaponType}] ` : '';
                opt.text = `${typeInfo}${item.name}`;
                select.appendChild(opt);
            }
        });
    }

    initInput() {
        document.addEventListener('keydown', (e) => {
            if (e.code === 'F3') {
                e.preventDefault();
                this.toggle();
            }
        });
    }

    toggle() {
        this.isVisible = !this.isVisible;
        this.container.style.display = this.isVisible ? 'block' : 'none';
        if (this.isVisible) {
            document.exitPointerLock();
        }
    }

    update() {
        if (!this.isVisible) return;
        const p = this.game.player;
        const info = document.getElementById('dbg-info');
        info.innerHTML = `
            Pos: ${p.body.position.x.toFixed(2)}, ${p.body.position.y.toFixed(2)}, ${p.body.position.z.toFixed(2)}<br>
            State: ${p.state}<br>
            FPS: ${Math.round(1 / this.game.clock.getDelta())}
        `;
    }
}
