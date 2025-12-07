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
            case WeaponType.SPEAR:
                this.buildSpear(group, vStats, bladeMat, handleMat, guardMat);
                break;
            case WeaponType.DOUBLE_BLADE:
                this.buildDoubleBlade(group, vStats, bladeMat, handleMat, guardMat);
                break;
            case WeaponType.BOW:
                this.buildBow(group, vStats, bladeMat, handleMat, guardMat);
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

    static buildSpear(group, vStats, bladeMat, handleMat, guardMat) {
        const len = (vStats.bladeLength || 2.0);

        // Long Shaft
        const shaftGeo = new THREE.CylinderGeometry(0.03, 0.03, len * 0.8, 8);
        const shaft = new THREE.Mesh(shaftGeo, handleMat);
        shaft.position.y = len * 0.4;
        group.add(shaft);

        // Pointer/Blade
        const tipGeo = new THREE.ConeGeometry(0.06, 0.4, 8);
        const tip = new THREE.Mesh(tipGeo, bladeMat);
        tip.position.y = len * 0.8 + 0.2;
        group.add(tip);

        // Guard / Decor near tip
        const guardGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.05, 8);
        const guard = new THREE.Mesh(guardGeo, guardMat);
        guard.position.y = len * 0.8;
        group.add(guard);
    }

    static buildDoubleBlade(group, vStats, bladeMat, handleMat, guardMat) {
        const len = (vStats.bladeLength || 2.0);

        // Central Grip
        const gripGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.4, 8);
        const grip = new THREE.Mesh(gripGeo, handleMat); // Hand holds this
        group.add(grip);

        // Shafts to blades
        const shaftGeo = new THREE.CylinderGeometry(0.03, 0.03, len, 8);
        const shaft = new THREE.Mesh(shaftGeo, handleMat);
        group.add(shaft);

        // Blade 1 (Top)
        const bladeGeo = new THREE.BoxGeometry(0.15, 0.6, 0.05);
        const blade1 = new THREE.Mesh(bladeGeo, bladeMat);
        blade1.position.y = len / 2;
        group.add(blade1);

        // Blade 2 (Bottom)
        const blade2 = new THREE.Mesh(bladeGeo, bladeMat);
        blade2.position.y = -len / 2;
        blade2.rotation.z = Math.PI;
        group.add(blade2);
    }

    static buildBow(group, vStats, bladeMat, handleMat, guardMat) {
        // Bow Body (Torus Segment)
        // Radius depends on "length"?
        const radius = 0.6;
        const tube = 0.05;
        const arc = Math.PI * 0.8;

        const bowGeo = new THREE.TorusGeometry(radius, tube, 8, 16, arc);
        const bow = new THREE.Mesh(bowGeo, handleMat);
        bow.rotation.z = Math.PI / 2 + arc / 2; // Orient upright curve
        // Center it?
        bow.position.x = -0.2; // Offset from hand
        group.add(bow);

        // String
        const h = Math.sin(arc / 2) * radius * 2;
        const stringGeo = new THREE.CylinderGeometry(0.005, 0.005, h, 4);
        const stringMat = new THREE.MeshBasicMaterial({ color: 0xCCCCCC });
        const string = new THREE.Mesh(stringGeo, stringMat);
        string.position.x = -0.2 + (Math.cos(arc / 2) * radius); // Inner side
        string.rotation.z = Math.PI / 2; // Vertical? No Cylinder is Y-up.
        // String needs to connect tips.
        // Tips are at +/- Y roughly if rotated.
        // Actually, let's simplify position.
        string.position.set(-0.5, 0, 0); // Approx
        // group.add(string); // String logic is hard to perfect procedurally without math.

        // Simple String approximation
        const points = [];
        points.push(new THREE.Vector3(0, radius, 0));
        points.push(new THREE.Vector3(0, -radius, 0));
        const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(lineGeo, stringMat);
        line.position.x = -radius * 0.5;
        group.add(line);

        // Emissive Parts (BladeMat) on tips?
        const tipGeo = new THREE.BoxGeometry(0.1, 0.2, 0.1);
        const tip1 = new THREE.Mesh(tipGeo, bladeMat);
        tip1.position.set(-0.2 + Math.cos(arc / 2) * radius, Math.sin(arc / 2) * radius, 0);
        group.add(tip1);

        const tip2 = tip1.clone();
        tip2.position.set(-0.2 + Math.cos(arc / 2) * radius, -Math.sin(arc / 2) * radius, 0);
        group.add(tip2);
    }
}
