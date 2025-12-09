import * as THREE from 'three';
import { Utils } from './Utils.js';

export class MonsterFactory {
    /**
     * @param {import('./main.js').Game} game
     */
    constructor(game) {
        this.game = game;
    }

    /**
     * @param {object} visualConfig - The visual config object from EnemiesDb
     * @returns {THREE.Group}
     */
    createEnemy(visualConfig) {
        const group = new THREE.Group();
        group.castShadow = true;
        group.receiveShadow = true;

        const color = visualConfig.color || 0xffffff;
        const scale = visualConfig.scale || 1.0;
        const shape = visualConfig.shape || 'SLIME';

        let mesh;

        switch (shape) {
            case 'SLIME':
                mesh = this.createSlime(color);
                break;
            case 'GOBELIN':
                mesh = this.createGoblin(color, visualConfig);
                break;
            case 'ORC':
                mesh = this.createOrc(color, visualConfig);
                break;
            case 'CONSTRUCT':
                mesh = this.createConstruct(color, visualConfig);
                break;
            default:
                mesh = this.createSlime(color);
                break;
        }

        mesh.scale.setScalar(scale);

        // 🔧 CRITICAL FIX: Ensure all children receive shadows
        mesh.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                child.visible = true; // Ensure visibility

                // Fix materials that might be invisible
                if (child.material) {
                    child.material.needsUpdate = true;
                }
            }
        });

        group.add(mesh);

        return group;
    }

    // --- GENERATORS ---

    createSlime(color) {
        const group = new THREE.Group();

        // Sphere slightly flattened
        const geo = new THREE.SphereGeometry(0.5, 16, 16);
        geo.scale(1, 0.8, 1);
        geo.translate(0, 0.4, 0); // Base at 0

        const mat = new THREE.MeshToonMaterial({
            color: color,
            transparent: true,
            opacity: 0.8
        });

        const body = new THREE.Mesh(geo, mat);
        body.castShadow = true;
        group.add(body);

        // Eyes
        const eyeGeo = new THREE.SphereGeometry(0.1, 8, 8);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const pupilMat = new THREE.MeshBasicMaterial({ color: 0x000000 });

        const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
        eyeL.position.set(-0.2, 0.5, 0.35);
        body.add(eyeL);
        const pupilL = new THREE.Mesh(new THREE.SphereGeometry(0.05), pupilMat);
        pupilL.position.z = 0.08;
        eyeL.add(pupilL);

        const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
        eyeR.position.set(0.2, 0.5, 0.35);
        body.add(eyeR);
        const pupilR = new THREE.Mesh(new THREE.SphereGeometry(0.05), pupilMat);
        pupilR.position.z = 0.08;
        eyeR.add(pupilR);

        // Inner Core (Nuncleus)
        const coreGeo = new THREE.DodecahedronGeometry(0.2);
        const coreMat = new THREE.MeshBasicMaterial({ color: color, wireframe: true });
        const core = new THREE.Mesh(coreGeo, coreMat);
        core.position.y = 0.4;
        body.add(core);

        // Float Animation Helper (handled by Enemy.js update usually, but visual offset helps)

        return group;
    }

    createGoblin(color, config) {
        const group = new THREE.Group();
        const skinMat = new THREE.MeshToonMaterial({ color: color });
        const clothesMat = new THREE.MeshToonMaterial({ color: 0x8b4513 }); // Loincloth

        // Body: Cylinder
        const bodyGeo = new THREE.CylinderGeometry(0.15, 0.2, 0.6, 8);
        const body = new THREE.Mesh(bodyGeo, skinMat);
        body.position.y = 0.6; // Legs below
        body.castShadow = true;
        group.add(body);

        // Head: Cone (Pointy Chin/Head)
        const headGeo = new THREE.ConeGeometry(0.25, 0.5, 8);
        const head = new THREE.Mesh(headGeo, skinMat);
        head.position.y = 0.45;
        head.rotation.x = -0.2; // Look slightly down/forward
        body.add(head);

        // Ears: Wide and Long
        const earGeo = new THREE.ConeGeometry(0.05, 0.4, 4);
        const earL = new THREE.Mesh(earGeo, skinMat);
        earL.position.set(-0.25, 0, 0);
        earL.rotation.z = 1.5;
        earL.rotation.y = -0.5;
        head.add(earL);

        const earR = new THREE.Mesh(earGeo, skinMat);
        earR.position.set(0.25, 0, 0);
        earR.rotation.z = -1.5;
        earR.rotation.y = 0.5;
        head.add(earR);

        // Eyes (Yellow)
        const eyeGeo = new THREE.SphereGeometry(0.05);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
        eyeL.position.set(-0.1, 0, 0.15);
        head.add(eyeL);
        const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
        eyeR.position.set(0.1, 0, 0.15);
        head.add(eyeR);

        // Limbs
        const legGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.4);
        const legL = new THREE.Mesh(legGeo, skinMat);
        legL.position.set(-0.1, -0.4, 0);
        body.add(legL);
        const legR = new THREE.Mesh(legGeo, skinMat);
        legR.position.set(0.1, -0.4, 0);
        body.add(legR);

        const armGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.5);
        const armL = new THREE.Mesh(armGeo, skinMat);
        armL.position.set(-0.25, 0.1, 0);
        armL.rotation.z = 0.5;
        body.add(armL);
        const armR = new THREE.Mesh(armGeo, skinMat);
        armR.position.set(0.25, 0.1, 0);
        armR.rotation.z = -0.5;
        body.add(armR);

        // Weapon
        if (config.weapon) this.addWeapon(armR, config.weapon);
        if (config.weapon === 'dagger_dual') this.addWeapon(armL, 'dagger');

        return group;
    }

    createOrc(color, config) {
        const group = new THREE.Group();
        const skinMat = new THREE.MeshToonMaterial({ color: color });
        const armorMat = new THREE.MeshToonMaterial({ color: 0x333333 });

        // Heavy Body
        const torsoGeo = new THREE.BoxGeometry(0.6, 0.7, 0.4);
        const torso = new THREE.Mesh(torsoGeo, skinMat);
        torso.position.y = 0.8;
        torso.castShadow = true;
        group.add(torso);

        // Massive Shoulders
        const shoulderGeo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
        const shoulderL = new THREE.Mesh(shoulderGeo, armorMat);
        shoulderL.position.set(-0.45, 0.2, 0);
        torso.add(shoulderL);
        const shoulderR = new THREE.Mesh(shoulderGeo, armorMat);
        shoulderR.position.set(0.45, 0.2, 0);
        torso.add(shoulderR);

        // Head (Square jaw)
        const headGeo = new THREE.BoxGeometry(0.3, 0.35, 0.3);
        const head = new THREE.Mesh(headGeo, skinMat);
        head.position.y = 0.55;
        torso.add(head);

        // Tusk
        const tuskGeo = new THREE.ConeGeometry(0.02, 0.1, 4);
        const tuskMat = new THREE.MeshBasicMaterial({ color: 0xeeeeee });
        const tuskL = new THREE.Mesh(tuskGeo, tuskMat);
        tuskL.position.set(-0.08, -0.1, 0.18);
        tuskL.rotation.x = -0.5;
        head.add(tuskL);
        const tuskR = new THREE.Mesh(tuskGeo, tuskMat);
        tuskR.position.set(0.08, -0.1, 0.18);
        tuskR.rotation.x = -0.5;
        head.add(tuskR);

        // Limbs (Thick)
        const legGeo = new THREE.BoxGeometry(0.2, 0.5, 0.2);
        const legL = new THREE.Mesh(legGeo, skinMat);
        legL.position.set(-0.2, -0.6, 0);
        torso.add(legL);
        const legR = new THREE.Mesh(legGeo, skinMat);
        legR.position.set(0.2, -0.6, 0);
        torso.add(legR);

        const armGeo = new THREE.BoxGeometry(0.15, 0.6, 0.15);
        const armL = new THREE.Mesh(armGeo, skinMat);
        armL.position.set(-0.4, 0, 0);
        torso.add(armL);
        const armR = new THREE.Mesh(armGeo, skinMat);
        armR.position.set(0.4, 0, 0);
        torso.add(armR);

        // Equipment
        if (config.weapon) this.addWeapon(armR, config.weapon);
        if (config.weapon === 'axe_dual') this.addWeapon(armL, 'axe');
        if (config.shield) this.addShield(armL);

        return group;
    }

    createConstruct(color, config) {
        const group = new THREE.Group();
        const stoneMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.9 });
        const glowMat = new THREE.MeshBasicMaterial({ color: config.glow || 0x00ffff });

        // Core (Floating Cube)
        const coreGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
        const core = new THREE.Mesh(coreGeo, stoneMat);
        core.position.y = 1.5;
        core.castShadow = true;
        group.add(core);

        // Eye (Glow)
        const eye = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.1), glowMat);
        eye.position.z = 0.41;
        core.add(eye);

        // Floating Limbs
        const limbGeo = new THREE.BoxGeometry(0.3, 0.6, 0.3);

        // Shoulders
        const shL = new THREE.Mesh(limbGeo, stoneMat);
        shL.position.set(-0.8, 0, 0);
        core.add(shL);
        const shR = new THREE.Mesh(limbGeo, stoneMat);
        shR.position.set(0.8, 0, 0);
        core.add(shR);

        // Hands (Lower)
        const handL = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), stoneMat);
        handL.position.set(0, -0.8, 0);
        shL.add(handL);

        const handR = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), stoneMat);
        handR.position.set(0, -0.8, 0);
        shR.add(handR);

        // No legs, it floats
        // Maybe some debris below?
        const debris = new THREE.Mesh(new THREE.TetrahedronGeometry(0.3), stoneMat);
        debris.position.y = -1.0;
        core.add(debris);

        return group;
    }

    addWeapon(arm, type) {
        // Simple primitives for weapons
        const wood = new THREE.MeshToonMaterial({ color: 0x5c3a21 });
        const metal = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.8, roughness: 0.2 });

        const holder = new THREE.Group();
        holder.position.y = -0.25; // Hand position
        arm.add(holder);

        if (type.includes('dagger')) {
            const blade = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.3, 4), metal);
            blade.position.y = 0.15;
            blade.scale.z = 0.2; // Flat
            holder.add(blade);
            const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.1), wood);
            holder.add(hilt);
            holder.rotation.x = -Math.PI / 2; // Point forward
        } else if (type.includes('axe')) {
            const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.8), wood);
            holder.add(handle);
            const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.05), metal);
            head.position.y = 0.3;
            holder.add(head);
            holder.rotation.x = -Math.PI / 2;
        } else if (type.includes('bow')) {
            const curve = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.02, 4, 8, Math.PI), wood);
            holder.add(curve);
            holder.rotation.y = Math.PI / 2;
        }
    }

    addShield(arm) {
        const wood = new THREE.MeshToonMaterial({ color: 0x5c3a21 });
        const metal = new THREE.MeshStandardMaterial({ color: 0x888888 });

        const shieldGroup = new THREE.Group();
        shieldGroup.position.set(0.15, 0, 0); // Side of arm
        arm.add(shieldGroup);

        const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 8), wood);
        plate.rotation.z = Math.PI / 2;
        shieldGroup.add(plate);

        const boss = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), metal);
        boss.rotation.z = -Math.PI / 2;
        boss.position.x = 0.03;
        shieldGroup.add(boss);
    }

    /**
     * Legacy support
     */
    createMob(type) {
        // Map old request to new system if possible, or return generic
        return this.createEnemy({ shape: 'GOBELIN', color: 0x00aa00, weapon: 'dagger' });
    }
}
