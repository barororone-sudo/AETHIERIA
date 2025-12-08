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
        const isText = typeof amount === 'string';

        // Déterminer le contenu et le style
        if (isText) {
            // LOOT TEXT (String)
            el.innerText = amount;

            // Couleur : Or si "Légendaire", sinon Vert
            const isLegendary = amount.toLowerCase().includes('légendaire') ||
                amount.toLowerCase().includes('legendary');
            el.style.color = isLegendary ? '#FFD700' : '#00FF00';
            el.style.fontSize = '20px'; // Un peu plus petit que les crits

        } else {
            // DAMAGE NUMBER (Number)
            el.innerText = Math.round(amount);
            el.style.color = isCritical ? '#ffcc00' : '#ffffff';
            el.style.fontSize = isCritical ? '24px' : '16px';
        }

        // Styles communs
        el.style.position = 'absolute';
        el.style.fontWeight = 'bold';
        el.style.textShadow = '2px 2px 0 #000';
        el.style.transition = isText ? 'opacity 1s' : 'opacity 0.5s';
        el.style.pointerEvents = 'none';

        this.container.appendChild(el);

        // Offset aléatoire pour éviter le chevauchement
        const randomOffsetX = (Math.random() - 0.5) * 0.5; // ±0.25 unités
        const randomOffsetY = (Math.random() - 0.5) * 0.3; // ±0.15 unités

        const offsetPosition = position.clone();
        offsetPosition.x += randomOffsetX;
        offsetPosition.y += randomOffsetY;

        this.elements.push({
            dom: el,
            pos: offsetPosition,
            velocity: new THREE.Vector3(0, isText ? 0.5 : 1, 0), // Loot monte plus lentement
            life: isText ? 2.0 : 1.0, // Loot visible 2s, dégâts 1s
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
                // Move logic - utilise la vélocité pour un mouvement fluide
                el.pos.add(el.velocity.clone().multiplyScalar(dt));
                worldPos = el.pos.clone();

                // Opacity fade - commence à fader dans le dernier quart de vie
                const fadeThreshold = el.life < 0.5 ? 0.5 : 1.0;
                if (el.life < fadeThreshold) {
                    el.dom.style.opacity = el.life / fadeThreshold;
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
