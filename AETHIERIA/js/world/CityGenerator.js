import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class CityGenerator {
    constructor(world) {
        this.world = world;
        this.scene = world.scene;
        this.physicsWorld = world.physicsWorld;
        this.terrain = world.terrainManager;
    }

    /**
     * Generate a city at specific coordinates for a biome
     */
    /**
     * Load a city (High Detail) into the scene
     */
    loadCity(cityData) {
        if (cityData.isLoaded) return;

        const { x, z, biome } = cityData;
        console.log(`[CityGenerator] Loading ${biome} City at (${Math.round(x)}, ${Math.round(z)})`);

        cityData.activeObjects = {
            meshes: [],
            bodies: []
        };

        const style = this.getBiomeStyle(biome);

        // 1. Central Plaza Feature (More detail?)
        this.buildPlaza(x, z, style, cityData);

        // 2. Houses (High Density: 12-18 houses)
        const houseCount = 12 + Math.floor(Math.random() * 6);
        const radius = 40; // Larger radius

        for (let i = 0; i < houseCount; i++) {
            // Cluster logic: Spiral or Randomized Rings
            const angle = (i / houseCount) * Math.PI * 2 + (Math.random() * 0.5);
            // Variance in distance for organic look
            const r = radius + (Math.random() - 0.5) * 20;

            const hx = x + Math.cos(angle) * r;
            const hz = z + Math.sin(angle) * r;

            this.buildHouse(hx, hz, style, cityData);
        }

        // 3. Decorations (Fences, Lamps - mocked for now)
        // Would be cool to add street lamps.

        cityData.isLoaded = true;
    }

    unloadCity(cityData) {
        if (!cityData.isLoaded) return;
        console.log(`[CityGenerator] Unloading ${cityData.biome} City...`);

        // Clean Meshes
        if (cityData.activeObjects.meshes) {
            cityData.activeObjects.meshes.forEach(mesh => {
                this.scene.remove(mesh);
                if (mesh.geometry) mesh.geometry.dispose();
                // Material dispose handling if unique? 
                // We share mats usually, careful not to dispose shared mats.
            });
        }

        // Clean Physics
        if (cityData.activeObjects.bodies) {
            cityData.activeObjects.bodies.forEach(body => {
                this.physicsWorld.removeBody(body);
            });
        }

        cityData.activeObjects = null;
        cityData.isLoaded = false;
    }

    getBiomeStyle(biome) {
        switch (biome) {
            case 'FOREST':
            case 'JUNGLE':
                return {
                    wallColor: 0x8B4513, // Wood
                    roofColor: 0x228B22, // Leaves/Thatch
                    material: 'wood',
                    roofType: 'cone'
                };
            case 'ICE':
            case 'SNOW':
                return {
                    wallColor: 0xADD8E6, // Light Blue
                    roofColor: 0xFFFFFF, // Snow
                    material: 'ice',
                    roofType: 'pyramid',
                    emissive: 0x112244
                };
            case 'FIRE':
            case 'LAVA':
                return {
                    wallColor: 0x222222, // Obsidian
                    roofColor: 0xFF4500, // Lava/Red
                    material: 'stone',
                    roofType: 'flat',
                    emissive: 0x441100
                };
            case 'GOLD':
                return {
                    wallColor: 0xF0E68C, // Khaki/Sand
                    roofColor: 0xFFD700, // Gold
                    material: 'gold',
                    roofType: 'dome'
                };
            case 'CRYSTAL':
                return {
                    wallColor: 0xFF69B4, // Pink
                    roofColor: 0x9932CC, // Purple
                    material: 'crystal',
                    roofType: 'spire',
                    emissive: 0x220022
                };
            case 'LIGHTNING':
                return {
                    wallColor: 0x4B0082, // Indigo
                    roofColor: 0x00FFFF, // Cyan
                    material: 'stone',
                    roofType: 'spire'
                };
            default: // Air, Wild, etc.
                return {
                    wallColor: 0xAAAAAA, // Grey
                    roofColor: 0x555555, // Dark Grey
                    material: 'stone',
                    roofType: 'gable'
                };
        }
    }

    buildPlaza(x, z, style, cityData) {
        // Get Height
        let y = 0;
        if (this.terrain) y = this.terrain.getGlobalHeight(x, z);

        // Base Platform
        const geo = new THREE.CylinderGeometry(8, 8, 0.5, 16);
        const mat = new THREE.MeshStandardMaterial({ color: 0x555555 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y + 0.25, z);
        this.scene.add(mesh);
        cityData.activeObjects.meshes.push(mesh); // TRACK

        // Centerpiece (Statue/Column)
        const colGeo = new THREE.BoxGeometry(2, 6, 2);
        const colMat = new THREE.MeshStandardMaterial({
            color: style.wallColor,
            emissive: style.emissive || 0x000000,
            emissiveIntensity: 0.5
        });
        const col = new THREE.Mesh(colGeo, colMat);
        col.position.set(x, y + 3, z);
        this.scene.add(col);
        cityData.activeObjects.meshes.push(col); // TRACK

        // Light
        const light = new THREE.PointLight(style.roofColor, 1, 20);
        light.position.set(x, y + 5, z);
        this.scene.add(light);
        cityData.activeObjects.meshes.push(light); // TRACK
    }

    buildHouse(x, z, style, cityData) {
        // 1. Find Ground Height
        let y = 0;
        if (this.terrain) y = this.terrain.getGlobalHeight(x, z);

        // Ensure not in water
        if (y < 2.5) return;

        // 2. Main Body
        const width = 4 + Math.random() * 3; // Wider
        const depth = 4 + Math.random() * 3;
        const height = 4 + Math.random() * 2; // Taller

        const bodyGeo = new THREE.BoxGeometry(width, height, depth);
        const bodyMat = new THREE.MeshStandardMaterial({ color: style.wallColor });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.set(x, y + height / 2, z);
        body.castShadow = true;
        body.receiveShadow = true;
        this.scene.add(body);
        cityData.activeObjects.meshes.push(body); // TRACK

        // Physics Body (Static Box)
        const shape = new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, depth / 2));
        const bodyPhys = new CANNON.Body({
            mass: 0, // Static
            position: new CANNON.Vec3(x, y + height / 2, z)
        });
        bodyPhys.addShape(shape);
        this.physicsWorld.addBody(bodyPhys);
        cityData.activeObjects.bodies.push(bodyPhys); // TRACK


        // 3. Roof
        let roofGeo;
        const roofHeight = 2.5;

        if (style.roofType === 'cone' || style.roofType === 'spire') {
            const h = style.roofType === 'spire' ? 8 : 3.5;
            roofGeo = new THREE.ConeGeometry(Math.max(width, depth) / 1.4, h, 4);
        } else if (style.roofType === 'dome') {
            roofGeo = new THREE.SphereGeometry(width / 1.4, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2);
        } else {
            // Default Pyramid/Gableish
            roofGeo = new THREE.ConeGeometry(Math.max(width, depth) / 1.2, roofHeight, 4);
        }

        const roofMat = new THREE.MeshStandardMaterial({
            color: style.roofColor,
            emissive: style.emissive || 0x000000,
            emissiveIntensity: 0.2
        });
        const roof = new THREE.Mesh(roofGeo, roofMat);

        // Adjust Roof Pos
        const roofY = y + height + (style.roofType === 'spire' ? 4 : 1.25);
        roof.position.set(x, roofY, z);

        if (style.roofType === 'cone' || style.roofType === 'pyramid') {
            roof.rotation.y = Math.PI / 4; // Align square pyramid
        }

        this.scene.add(roof);
        cityData.activeObjects.meshes.push(roof); // TRACK

        // 4. Door (Visual)
        const doorGeo = new THREE.PlaneGeometry(1.4, 2.5);
        const doorMat = new THREE.MeshStandardMaterial({ color: 0x331100, side: THREE.DoubleSide });
        const door = new THREE.Mesh(doorGeo, doorMat);
        // Place door on one side (randomly)
        door.position.set(x, y + 1.25, z + depth / 2 + 0.05);
        this.scene.add(door);
        cityData.activeObjects.meshes.push(door); // TRACK
    }
}
