// js/managers/PoolManager.js
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Enemy } from '../Enemy.js';

export class PoolManager {
    constructor(world) {
        this.world = world;
        this.pools = new Map(); // type -> Array<Object>

        // Configuration map for constructors
        this.constructors = {
            'enemy': Enemy
            // Add projectiles, vfx, etc. later
        };

        // Factories for simple objects (Combat.js support)
        this.factories = new Map();
    }

    /**
     * Register a factory for simple object pooling (Projectiles)
     * @param {string} id 
     * @param {Function} factoryFn 
     * @param {number} count Initial count
     */
    register(id, factoryFn, count = 0) {
        this.factories.set(id, factoryFn);
        if (!this.pools.has(id)) {
            this.pools.set(id, []);
        }

        // Pre-populate
        for (let i = 0; i < count; i++) {
            const obj = factoryFn();
            if (obj && obj instanceof THREE.Object3D) obj.visible = false;
            this.pools.get(id).push(obj);
        }
    }

    /**
     * Get object by ID (Combat.js style)
     * @param {string} id 
     * @returns {any}
     */
    get(id) {
        if (!this.pools.has(id)) return null;

        const pool = this.pools.get(id);
        let obj = null;

        if (pool.length > 0) {
            obj = pool.pop();
        } else {
            // Expand
            const factory = this.factories.get(id);
            if (factory) {
                obj = factory();
            }
        }

        if (obj) {
            if (obj.visible !== undefined) obj.visible = true;
            // Reset active flag if it exists (some systems use this)
            if (obj.active !== undefined) obj.active = true;
        }
        return obj;
    }

    /**
     * Return object to pool (Combat.js style)
     * @param {string} id 
     * @param {any} object 
     */
    return(id, object) {
        if (!this.pools.has(id)) {
            this.pools.set(id, []);
        }

        // Reset properties
        if (object.visible !== undefined) object.visible = false;
        if (object.active !== undefined) object.active = false;

        this.pools.get(id).push(object);
    }

    /**
     * Get an object from the pool or create a new one
     * @param {string} category 'enemy'
     * @param {string|object} typeOrConfig Detailed type (e.g. 'goblin')
     * @param {CANNON.Vec3} position 
     * @returns {any} The spawned object
     */
    spawn(category, typeOrConfig, position) {
        // Ensure pool exists
        if (!this.pools.has(category)) {
            this.pools.set(category, []);
        }

        const pool = this.pools.get(category);

        // 1. Try to find a dead/inactive object in the pool
        // For enemies, we might want to match specific ID if possible, 
        // OR we just reset a generic Enemy instance with new config.
        // For now, let's assume we reuse generic container and fully reset.

        let object = pool.find(obj => obj.isDead && !obj.active);

        if (object) {
            // REUSE
            // console.log(`♻️ Reusing ${category} from pool`);
            object.active = true;
            object.isDead = false; // Revive

            // Call generic reset if available
            if (object.reset) {
                object.reset(position, typeOrConfig);
            }
            return object;
        } else {
            // CREATE NEW
            // console.log(`✨ Creating new ${category}`);
            const Constructor = this.constructors[category];
            if (!Constructor) {
                console.error(`PoolManager: No constructor for ${category}`);
                return null;
            }

            // Create instance (it should handle adding itself to world usually, 
            // but we might need to manage that if we want strict pooling)
            // Existing Enemy constructor adds mesh/body to world.
            const newObj = new Constructor(this.world, position, typeOrConfig);

            // Mark as poolable
            newObj.poolCategory = category;
            newObj.active = true;
            newObj.isDead = false;

            pool.push(newObj);
            return newObj;
        }
    }

    /**
     * Despawn object (return to pool)
     * @param {any} object 
     */
    despawn(object) {
        if (!object) return;

        // Deactivate
        object.active = false;
        object.isDead = true;

        if (object.mesh) object.mesh.visible = false;

        // Sleep physics
        if (object.body) {
            object.body.sleep();
            object.body.position.set(0, -1000, 0); // Move to void
            // Do NOT remove from physics world, just sleep/move
        }

        // Custom cleanup
        if (object.onDespawn) {
            object.onDespawn();
        }

        // console.log(`💤 Despawned ${object.poolCategory || 'object'}`);
    }
}
