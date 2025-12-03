// js/Debug.js

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

        this.container.innerHTML = `
            <h3>DEBUG MENU (F3)</h3>
            <button id="dbg-teleport">Teleport to (0,10,0)</button><br>
            <button id="dbg-items">Give All Items</button><br>
            <button id="dbg-enemy">Spawn Enemy</button><br>
            <button id="dbg-golem">Spawn Golem Boss</button><br>
            <button id="dbg-god">Toggle God Mode</button><br>
            <button id="dbg-map">Verify Minimap</button><br>
            <div id="dbg-info"></div>
        `;

        document.body.appendChild(this.container);

        document.getElementById('dbg-teleport').onclick = () => {
            this.game.player.body.position.set(0, 10, 0);
            this.game.player.body.velocity.set(0, 0, 0);
        };

        document.getElementById('dbg-items').onclick = () => {
            this.game.player.inventory.addItem('sword_iron', 1);
            this.game.player.inventory.addItem('potion_health', 10);
            this.game.player.inventory.addItem('crystal_pyro', 5);
            console.log("Debug: Items Given");
        };

        document.getElementById('dbg-enemy').onclick = () => {
            const pos = this.game.player.body.position.clone();
            pos.x += 5;
            this.game.world.spawnEnemy(pos);
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
