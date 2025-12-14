import * as THREE from 'three';

export const DecorTypes = {
    TREE_PINE: 'tree_pine',
    TREE_PALM: 'tree_palm',
    ROCK_GREY: 'rock_grey',
    ROCK_LAVA: 'rock_lava',
    CRYSTAL: 'crystal',
    ICE_SPIKE: 'ice_spike',
    GOLD_PILLAR: 'gold_pillar',
    MUSHROOM: 'mushroom'
};

export class SceneDecorationManager {
    constructor(world) {
        this.world = world;
        this.scene = world.scene;
        this.activeChunks = new Map(); // Key: "x,z" -> [meshes]
    }

    getChunkKey(x, z) {
        return `${x},${z}`;
    }

    /**
     * Load decorations for a specific chunk
     */
    loadChunk(chunkX, chunkZ, size, biome) {
        const key = this.getChunkKey(chunkX, chunkZ);
        if (this.activeChunks.has(key)) return;

        const objects = [];

        // Populate Rules
        let count = 0;
        let type = null;

        switch (biome) {
            case 'FOREST': count = 40; type = 'PINE'; break;
            case 'JUNGLE': count = 60; type = 'PALM'; break;
            case 'ICE':
            case 'SNOW': count = 30; type = 'ICE'; break;
            case 'CRYSTAL': count = 40; type = 'CRYSTAL'; break;
            case 'FIRE':
            case 'LAVA': count = 30; type = 'LAVA_ROCK'; break;
            case 'GOLD': count = 20; type = 'GOLD_PILLAR'; break;
            default: count = 15; type = 'ROCK'; break;
        }

        for (let i = 0; i < count; i++) {
            const lx = (Math.random() - 0.5) * size;
            const lz = (Math.random() - 0.5) * size;
            const wx = chunkX + lx;
            const wz = chunkZ + lz;

            let y = 0;
            if (this.world.terrainManager) {
                y = this.world.terrainManager.getGlobalHeight(wx, wz);
            }
            if (y < 2.5) continue; // Water check

            let obj = null;
            if (type === 'PINE') obj = this.createPineTree();
            else if (type === 'PALM') obj = this.createPalmTree();
            else if (type === 'ICE') obj = this.createIceSpike();
            else if (type === 'CRYSTAL') obj = this.createCrystal();
            else if (type === 'LAVA_ROCK') obj = this.createRock(0x331111, 0xff4400);
            else if (type === 'GOLD_PILLAR') obj = this.createPillar(0xFFD700);
            else obj = this.createRock(0x888888, 0x000000);

            if (obj) {
                obj.position.set(wx, y, wz);

                // Random Scale/Rot
                const s = 0.8 + Math.random() * 0.5;
                obj.scale.set(s, s, s);
                obj.rotation.y = Math.random() * Math.PI * 2;

                this.scene.add(obj);
                objects.push(obj);
            }
        }

        this.activeChunks.set(key, objects);
    }

    unloadChunk(chunkX, chunkZ) {
        const key = this.getChunkKey(chunkX, chunkZ);
        if (!this.activeChunks.has(key)) return;

        const objects = this.activeChunks.get(key);
        objects.forEach(obj => {
            this.scene.remove(obj);
            // Dispose basic geometry/material if not shared
            // For now, let GC handle it or assume shared materials in future
        });
        this.activeChunks.delete(key);
    }

    // --- BUILDERS (High Detail) ---

    createPineTree() {
        const group = new THREE.Group();

        // Trunk
        const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.3, 0.5, 2, 6),
            new THREE.MeshStandardMaterial({ color: 0x5C4033 })
        );
        trunk.position.y = 1;
        trunk.castShadow = true;
        group.add(trunk);

        // Leaves (2 tiers)
        const l1 = new THREE.Mesh(
            new THREE.ConeGeometry(2, 3, 7),
            new THREE.MeshStandardMaterial({ color: 0x2E8B57 })
        );
        l1.position.y = 3;
        l1.castShadow = true;
        group.add(l1);

        const l2 = new THREE.Mesh(
            new THREE.ConeGeometry(1.5, 2.5, 7),
            new THREE.MeshStandardMaterial({ color: 0x3CB371 })
        );
        l2.position.y = 4.5;
        l2.castShadow = true;
        group.add(l2);

        return group;
    }

    createPalmTree() {
        const group = new THREE.Group();

        // Curved Trunk (Simulated by 2 segments)
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8B4513 });

        const t1 = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 2, 6), trunkMat);
        t1.position.y = 1;
        t1.rotation.z = 0.1;
        group.add(t1);

        const t2 = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 2, 6), trunkMat);
        t2.position.set(-0.2, 2.8, 0);
        t2.rotation.z = 0.2;
        group.add(t2);

        // Leaves (Crossed Planes)
        const leavesMat = new THREE.MeshStandardMaterial({ color: 0x228B22, side: THREE.DoubleSide });

        for (let i = 0; i < 4; i++) {
            const leaf = new THREE.Mesh(new THREE.PlaneGeometry(1, 3), leavesMat);
            leaf.position.set(-0.5, 3.8, 0);
            leaf.rotation.y = (i / 4) * Math.PI * 2;
            leaf.rotation.x = -Math.PI / 3;
            leaf.castShadow = true;
            group.add(leaf);
        }

        return group;
    }

    createRock(color, emissive) {
        const mat = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.9,
            emissive: emissive,
            emissiveIntensity: emissive ? 0.5 : 0
        });
        const geo = new THREE.DodecahedronGeometry(1 + Math.random(), 0);
        return new THREE.Mesh(geo, mat);
    }

    createIceSpike() {
        const group = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({
            color: 0xCCFFFF,
            transparent: true,
            opacity: 0.6,
            roughness: 0.1
        });

        // Main Spike
        const m = new THREE.Mesh(new THREE.ConeGeometry(0.5, 4, 4), mat);
        m.position.y = 2;
        group.add(m);

        // Side Spike
        const s = new THREE.Mesh(new THREE.ConeGeometry(0.3, 2, 4), mat);
        s.position.set(0.5, 0.5, 0);
        s.rotation.z = -0.5;
        group.add(s);

        return group;
    }

    createCrystal() {
        const geo = new THREE.OctahedronGeometry(1, 0);
        const mat = new THREE.MeshStandardMaterial({
            color: 0xFF00FF,
            emissive: 0x440044,
            roughness: 0
        });
        const m = new THREE.Mesh(geo, mat);
        m.position.y = 1.5;
        m.scale.y = 2.5;
        return m;
    }

    createPillar(color) {
        const geo = new THREE.BoxGeometry(0.6, 3, 0.6);
        const mat = new THREE.MeshStandardMaterial({ color: color, metalness: 0.8, roughness: 0.2 });
        const m = new THREE.Mesh(geo, mat);
        m.position.y = 1.5;
        return m;
    }
}
