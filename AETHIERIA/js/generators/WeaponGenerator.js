import * as THREE from 'three';
import { WeaponType, Rarity } from '../data/ItemsDb.js';

export class WeaponGenerator {

    /**
     * Creates a Three.js Group representing the weapon based on item data.
     * @param {Object} itemData - The weapon item data from ItemsDb.
     * @returns {THREE.Group} The generated weapon mesh group.
     */
    static createWeapon(itemData) {
        const group = new THREE.Group();

        const type = itemData.weaponType || WeaponType.SWORD;
        const rarity = itemData.rarity || Rarity.COMMON;
        const vStats = itemData.visualStats || { color: '#888888', bladeLength: 1.0, guardType: 'SIMPLE', emissive: 0 };

        // --- Materials ---
        const bladeColor = new THREE.Color(vStats.color);
        const emissionIntensity = this.getEmissionByRarity(rarity, vStats.emissive);

        const bladeMat = new THREE.MeshStandardMaterial({
            color: bladeColor,
            roughness: Math.max(0.1, 0.6 - (rarity * 0.1)), // Shinier with rarity
            metalness: 0.8 + (rarity * 0.04), // More metallic with rarity
            emissive: bladeColor,
            emissiveIntensity: emissionIntensity
        });

        const handleMat = new THREE.MeshStandardMaterial({
            color: 0x5c4033, // Dark Wood/Leather
            roughness: 0.9
        });

        const guardMat = new THREE.MeshStandardMaterial({
            color: 0x444444, // Dark Grey
            roughness: 0.5,
            metalness: 0.9
        });

        // --- Geometry Generation based on Type ---
        switch (type) {
            case WeaponType.GREATSWORD:
                this.buildGreatsword(group, vStats, bladeMat, handleMat, guardMat);
                break;
            case WeaponType.DAGGER:
                this.buildDagger(group, vStats, bladeMat, handleMat, guardMat);
                break;
            case WeaponType.SWORD:
            default:
                this.buildSword(group, vStats, bladeMat, handleMat, guardMat);
                break;
        }

        // Apply Generic Shadows
        group.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        // Orientation Fix: Point forward (Z-axis) if needed, or align with hand
        // In Player.js, we usually rotate x: -Math.PI/2 to align cylinder Y with arm?
        // Let's assume the generator builds "Up" (Y) and Player rotates it.

        return group;
    }

    static getEmissionByRarity(rarity, baseEmissive) {
        // Base Emissive from DB can override
        if (baseEmissive > 0) return baseEmissive;

        // Auto-Emissive for High Rarity
        if (rarity >= Rarity.EPIC) return 0.5;
        if (rarity >= Rarity.LEGENDARY) return 1.5;
        return 0;
    }

    static buildSword(group, vStats, bladeMat, handleMat, guardMat) {
        const len = vStats.bladeLength || 1.0;
        const width = 0.15;

        // Blade
        const bladeGeo = new THREE.BoxGeometry(width, len, 0.05);
        // Taper the tip (hacky way: scale top vertices? No, basic box for now)
        const blade = new THREE.Mesh(bladeGeo, bladeMat);
        blade.position.y = len / 2 + 0.1; // 0.1 above guard
        group.add(blade);

        // Guard
        const guardGeo = new THREE.BoxGeometry(0.5, 0.05, 0.15);
        const guard = new THREE.Mesh(guardGeo, guardMat);
        guard.position.y = 0.1;
        group.add(guard);

        // Handle
        const handleGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.25, 8);
        const handle = new THREE.Mesh(handleGeo, handleMat);
        handle.position.y = -0.025; // Below guard
        group.add(handle);

        // Pommel
        const pommelGeo = new THREE.SphereGeometry(0.06);
        const pommel = new THREE.Mesh(pommelGeo, guardMat);
        pommel.position.y = -0.16;
        group.add(pommel);
    }

    static buildGreatsword(group, vStats, bladeMat, handleMat, guardMat) {
        const len = (vStats.bladeLength || 1.6);
        const width = 0.3;

        // Massive Blade
        const bladeGeo = new THREE.BoxGeometry(width, len, 0.08);
        const blade = new THREE.Mesh(bladeGeo, bladeMat);
        blade.position.y = len / 2 + 0.2;
        group.add(blade);

        // Heavy Guard
        const guardGeo = new THREE.BoxGeometry(0.8, 0.1, 0.2);
        const guard = new THREE.Mesh(guardGeo, guardMat);
        guard.position.y = 0.2;
        group.add(guard);

        // Long Handle
        const handleGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.6, 8);
        const handle = new THREE.Mesh(handleGeo, handleMat);
        handle.position.y = -0.1;
        group.add(handle);
    }

    static buildDagger(group, vStats, bladeMat, handleMat, guardMat) {
        const len = (vStats.bladeLength || 0.4);
        const width = 0.1;

        // Short Blade
        const bladeGeo = new THREE.BoxGeometry(width, len, 0.03);
        const blade = new THREE.Mesh(bladeGeo, bladeMat);
        blade.position.y = len / 2 + 0.05;
        group.add(blade);

        // Tiny Guard
        const guardGeo = new THREE.BoxGeometry(0.2, 0.03, 0.08);
        const guard = new THREE.Mesh(guardGeo, guardMat);
        guard.position.y = 0.05;
        group.add(guard);

        // Handle
        const handleGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.15, 8);
        const handle = new THREE.Mesh(handleGeo, handleMat);
        handle.position.y = -0.02;
        group.add(handle);
    }
}
