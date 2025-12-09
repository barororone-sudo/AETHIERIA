/**
 * WeaponTrail.js
 * Crée des traînées visuelles derrière les armes pendant les attaques
 */

import * as THREE from 'three';

export class WeaponTrail {
    constructor(scene, weaponType = 'sword') {
        this.scene = scene;
        this.weaponType = weaponType;

        // Configuration
        this.maxPositions = 10;       // Nombre de positions à tracker
        this.positions = [];
        this.isActive = false;
        this.fadeSpeed = 0.05;

        // Couleurs par type d'arme
        this.colors = {
            sword: 0x00aaff,   // Bleu électrique
            axe: 0xff4400,     // Rouge feu
            bow: 0x00ff88,     // Vert émeraude
            staff: 0xff00ff,   // Magenta
            dagger: 0xff00aa,  // Rose vif (rapide et mortel)
            spear: 0xffaa00    // Orange (portée)
        };

        // Créer la géométrie et le matériau
        this.createTrailMesh();
    }

    createTrailMesh() {
        // Géométrie dynamique
        const geometry = new THREE.BufferGeometry();

        // Positions initiales (vides)
        const positions = new Float32Array(this.maxPositions * 3 * 2); // 2 vertices par position
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        // Couleurs avec alpha gradient
        const colors = new Float32Array(this.maxPositions * 3 * 2);
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        // Matériau avec transparence
        const color = this.colors[this.weaponType] || this.colors.sword;
        const material = new THREE.LineBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            linewidth: 3
        });

        // Mesh
        this.mesh = new THREE.Line(geometry, material);
        this.mesh.visible = false;
        this.scene.add(this.mesh);
    }

    /**
     * Démarre la traînée
     * @param {THREE.Vector3} startPosition Position de départ de l'arme
     */
    start(startPosition = new THREE.Vector3(0, 1, 0)) {
        this.isActive = true;
        this.mesh.visible = true;
        this.positions = [];

        // Ajouter position initiale
        this.addPosition(startPosition);
    }

    /**
     * Arrête la traînée
     */
    stop() {
        this.isActive = false;
        // Fade out progressif
        setTimeout(() => {
            this.mesh.visible = false;
            this.positions = [];
        }, 200);
    }

    /**
     * Ajoute une position à la traînée
     * @param {THREE.Vector3} position
     */
    addPosition(position) {
        this.positions.push(position.clone());

        // Limiter le nombre de positions
        if (this.positions.length > this.maxPositions) {
            this.positions.shift();
        }

        this.updateGeometry();
    }

    /**
     * Met à jour la géométrie de la traînée
     */
    updateGeometry() {
        if (this.positions.length < 2) return;

        const geometry = this.mesh.geometry;
        const positionAttribute = geometry.getAttribute('position');
        const positions = positionAttribute.array;

        // Largeur de la traînée
        const width = 0.1;

        // Remplir les positions
        for (let i = 0; i < this.positions.length; i++) {
            const pos = this.positions[i];
            const idx = i * 6; // 2 vertices * 3 coords

            // Vertex gauche
            positions[idx] = pos.x - width;
            positions[idx + 1] = pos.y;
            positions[idx + 2] = pos.z;

            // Vertex droit
            positions[idx + 3] = pos.x + width;
            positions[idx + 4] = pos.y;
            positions[idx + 5] = pos.z;
        }

        positionAttribute.needsUpdate = true;

        // Mettre à jour l'opacité (fade out)
        const opacity = this.isActive ? 0.8 : Math.max(0, this.mesh.material.opacity - this.fadeSpeed);
        this.mesh.material.opacity = opacity;
    }

    /**
     * Update appelé chaque frame
     * @param {THREE.Vector3} weaponPosition Position actuelle de l'arme
     */
    update(weaponPosition) {
        if (this.isActive && weaponPosition) {
            this.addPosition(weaponPosition);
        } else if (!this.isActive && this.mesh.visible) {
            // Fade out
            this.updateGeometry();
            if (this.mesh.material.opacity <= 0) {
                this.mesh.visible = false;
            }
        }
    }

    /**
     * Change le type d'arme et la couleur
     * @param {string} weaponType
     */
    setWeaponType(weaponType) {
        this.weaponType = weaponType;
        const color = this.colors[weaponType] || this.colors.sword;
        this.mesh.material.color.setHex(color);
    }

    /**
     * Nettoie les ressources
     */
    dispose() {
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
        this.scene.remove(this.mesh);
    }
}
