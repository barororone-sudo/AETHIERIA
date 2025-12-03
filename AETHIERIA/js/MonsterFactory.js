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
     * @param {string} type
     * @returns {THREE.Group}
     */
    createMob(type = 'bokoblin') {
        const group = new THREE.Group();
        group.castShadow = true;
        group.receiveShadow = true;

        const textures = this.game.loader.assets.textures;
        const maskTexture = textures['monster_mask'];

        // Materials
        const skinColor = type === 'bokoblin' ? 0xcc3333 : 0x3333cc; // Red or Blue
        const skinMat = new THREE.MeshToonMaterial({ color: skinColor });
        const loinclothMat = new THREE.MeshToonMaterial({ color: 0x8b4513 }); // Brown
        const boneMat = new THREE.MeshToonMaterial({ color: 0xdddddd });
        const woodMat = new THREE.MeshToonMaterial({ color: 0x5c3a21 });

        const addOutline = (mesh, geometry, thickness = 0.02, color = 0x000000) => {
            const outline = Utils.createOutlineMesh(geometry, thickness, color);
            mesh.add(outline);
        };

        // 1. BODY (Hunched)
        const torsoGeo = new THREE.CylinderGeometry(0.25, 0.2, 0.5, 8);
        const torso = new THREE.Mesh(torsoGeo, skinMat);
        torso.position.y = 0.7;
        torso.rotation.x = 0.3; // Lean forward
        torso.castShadow = true;
        torso.receiveShadow = true;
        addOutline(torso, torsoGeo, 0.02);
        group.add(torso);

        // Loincloth
        const loinGeo = new THREE.CylinderGeometry(0.21, 0.25, 0.25, 8);
        const loin = new THREE.Mesh(loinGeo, loinclothMat);
        loin.position.y = -0.3;
        torso.add(loin);

        // 2. HEAD (Large)
        const headGeo = new THREE.SphereGeometry(0.35, 16, 16);
        headGeo.scale(1, 0.8, 1.2); // Oblong
        const head = new THREE.Mesh(headGeo, skinMat);
        head.position.set(0, 0.4, 0.1);
        head.castShadow = true;
        head.receiveShadow = true;
        addOutline(head, headGeo, 0.02);
        torso.add(head);

        // Ears (Large Pointed)
        const earGeo = new THREE.ConeGeometry(0.1, 0.4, 4);
        const earL = new THREE.Mesh(earGeo, skinMat);
        earL.position.set(-0.3, 0.1, -0.1);
        earL.rotation.set(0, 0, 1.2);
        head.add(earL);

        const earR = new THREE.Mesh(earGeo, skinMat);
        earR.position.set(0.3, 0.1, -0.1);
        earR.rotation.set(0, 0, -1.2);
        head.add(earR);

        // Mask
        if (maskTexture) {
            const maskGeo = new THREE.PlaneGeometry(0.5, 0.5);
            const maskMat = new THREE.MeshBasicMaterial({
                map: maskTexture,
                transparent: true,
                side: THREE.DoubleSide
            });
            const mask = new THREE.Mesh(maskGeo, maskMat);
            mask.position.set(0, 0, 0.35); // Front of face
            head.add(mask);
        } else {
            // Fallback: Bone Mask
            const maskBase = new THREE.Mesh(new THREE.SphereGeometry(0.36, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2), boneMat);
            maskBase.rotation.x = -Math.PI / 2;
            maskBase.position.z = 0.05;
            head.add(maskBase);
        }

        // Horn
        const hornGeo = new THREE.ConeGeometry(0.05, 0.2, 8);
        const horn = new THREE.Mesh(hornGeo, boneMat);
        horn.position.set(0, 0.35, 0);
        head.add(horn);

        // 3. LIMBS (Short legs, long arms)
        const createLimb = (w, l, x, y, z, rotX = 0) => {
            const g = new THREE.Group();
            g.position.set(x, y, z);
            g.rotation.x = rotX;
            const m = new THREE.Mesh(new THREE.CylinderGeometry(w, w * 0.8, l, 8), skinMat);
            m.position.y = -l / 2;
            m.castShadow = true;
            addOutline(m, new THREE.CylinderGeometry(w, w * 0.8, l, 8), 0.02);
            g.add(m);
            return g;
        };

        // Legs (Short)
        const legL = createLimb(0.08, 0.4, -0.15, -0.4, 0);
        torso.add(legL);
        const legR = createLimb(0.08, 0.4, 0.15, -0.4, 0);
        torso.add(legR);

        // Arms (Long)
        const armL = createLimb(0.07, 0.6, -0.3, 0.2, 0, 0.2);
        torso.add(armL);
        const armR = createLimb(0.07, 0.6, 0.3, 0.2, 0, 0.2);
        torso.add(armR);

        // Weapon (Club)
        const clubGroup = new THREE.Group();
        clubGroup.position.set(0, -0.6, 0);
        armR.children[0].add(clubGroup); // Attach to mesh end

        const handleGeo = new THREE.CylinderGeometry(0.03, 0.04, 0.4, 6);
        const handle = new THREE.Mesh(handleGeo, woodMat);
        handle.position.y = 0.2;
        clubGroup.add(handle);

        const headClubGeo = new THREE.ConeGeometry(0.15, 0.4, 8);
        const headClub = new THREE.Mesh(headClubGeo, woodMat);
        headClub.position.y = 0.5;
        headClub.scale.y = -1; // Invert cone
        addOutline(headClub, headClubGeo, 0.02);
        clubGroup.add(headClub);

        // Spikes
        for (let i = 0; i < 6; i++) {
            const spike = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.1, 4), boneMat);
            const angle = (i / 6) * Math.PI * 2;
            spike.position.set(Math.sin(angle) * 0.1, 0.5, Math.cos(angle) * 0.1);
            spike.rotation.x = Math.PI / 2;
            spike.rotation.z = angle;
            clubGroup.add(spike);
        }

        // Animation Helper
        group.userData = {
            torso: torso,
            head: head,
            legL: legL,
            legR: legR,
            armL: armL,
            armR: armR,
            walkCycle: 0
        };

        return group;
    }
}
