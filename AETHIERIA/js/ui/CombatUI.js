import * as THREE from 'three';

export class CombatUI {
    constructor(game) {
        this.game = game;
        this.container = document.createElement('div');
        this.container.id = 'combat-ui';
        this.container.style.position = 'absolute';
        this.container.style.top = '0';
        this.container.style.left = '0';
        this.container.style.width = '100%';
        this.container.style.height = '100%';
        this.container.style.pointerEvents = 'none'; // Pass through clicks
        this.container.style.overflow = 'hidden';
        document.body.appendChild(this.container);

        this.elements = []; // { dom: HTMLElement, pos: THREE.Vector3, life: number, type: 'health'|'damage' }
        this.camera = game.camera;
    }

    /**
     * @param {import('../Enemy.js').Enemy} enemy 
     */
    createHealthBar(enemy) {
        const barContainer = document.createElement('div');
        barContainer.className = 'enemy-hp-bar';
        barContainer.style.position = 'absolute';
        barContainer.style.width = '60px';
        barContainer.style.height = '6px';
        barContainer.style.backgroundColor = '#333';
        barContainer.style.border = '1px solid #000';

        const fill = document.createElement('div');
        fill.style.width = '100%';
        fill.style.height = '100%';
        fill.style.backgroundColor = 'red';
        fill.style.transition = 'width 0.1s';
        barContainer.appendChild(fill);

        // Name Tag
        const nameTag = document.createElement('div');
        nameTag.innerText = enemy.name || 'Enemy';
        nameTag.style.position = 'absolute';
        nameTag.style.top = '-14px';
        nameTag.style.width = '100%';
        nameTag.style.textAlign = 'center';
        nameTag.style.fontSize = '10px';
        nameTag.style.color = '#fff';
        nameTag.style.textShadow = '1px 1px 0 #000';
        barContainer.appendChild(nameTag);

        this.container.appendChild(barContainer);

        // Track wrapper
        const tracker = {
            dom: barContainer,
            fill: fill,
            target: enemy,
            type: 'health',
            offsetY: enemy.height + 0.5
        };

        this.elements.push(tracker);
        return tracker;
    }

    showDamage(position, amount, isCritical = false) {
        const el = document.createElement('div');
        el.innerText = typeof amount === 'number' ? Math.round(amount) : amount;
        el.style.position = 'absolute';
        el.style.color = isCritical ? '#ffcc00' : '#ffffff';
        el.style.fontSize = isCritical ? '24px' : '16px';
        el.style.fontWeight = 'bold';
        el.style.textShadow = '2px 2px 0 #000';
        el.style.transition = 'opacity 0.5s';

        this.container.appendChild(el);

        this.elements.push({
            dom: el,
            pos: position.clone(), // Static world pos at moment of impact
            velocity: new THREE.Vector3(0, 1, 0), // Moves up
            life: 1.0, // Seconds
            type: 'damage'
        });
    }

    update(dt) {
        const widthHalf = window.innerWidth / 2;
        const heightHalf = window.innerHeight / 2;
        const camera = this.game.camera; // Ensure we get current camera if it changes

        // Iterate backwards to remove dead elements safely
        for (let i = this.elements.length - 1; i >= 0; i--) {
            const el = this.elements[i];

            let worldPos;

            if (el.type === 'health') {
                if (!el.target || el.target.isDead || el.target.hp <= 0) {
                    this.removeElement(i);
                    continue;
                }
                // Update Health Visual
                const pct = Math.max(0, el.target.hp / el.target.maxHp) * 100;
                el.fill.style.width = `${pct}%`;

                // Update Pos
                if (!el.target.mesh) continue;
                worldPos = el.target.mesh.position.clone();
                worldPos.y += el.offsetY;
            } else if (el.type === 'damage') {
                el.life -= dt;
                if (el.life <= 0) {
                    this.removeElement(i);
                    continue;
                }
                // Move logic
                el.pos.y += dt; // Float up
                worldPos = el.pos.clone();

                // Opacity fade
                if (el.life < 0.5) {
                    el.dom.style.opacity = el.life * 2;
                }
            }

            // Project to Screen
            worldPos.project(camera);

            const x = (worldPos.x * widthHalf) + widthHalf;
            const y = -(worldPos.y * heightHalf) + heightHalf;

            // Frustum cull/Behind camera check
            let isVisible = (worldPos.z < 1);

            // Distance Check (Zelda-style, only show if close)
            if (isVisible && el.type === 'health' && this.game.player && this.game.player.mesh) {
                const dist = this.game.player.mesh.position.distanceTo(el.target.mesh.position);
                if (dist > 20) {
                    isVisible = false;
                }
            }

            if (isVisible) {
                el.dom.style.display = 'block';
                el.dom.style.left = `${x - (el.dom.offsetWidth / 2)}px`;
                el.dom.style.top = `${y - (el.dom.offsetHeight / 2)}px`;
            } else {
                el.dom.style.display = 'none';
            }
        }
    }

    removeElement(index) {
        const el = this.elements[index];
        if (el.dom && el.dom.parentNode) {
            el.dom.parentNode.removeChild(el.dom);
        }
        this.elements.splice(index, 1);
    }
}
