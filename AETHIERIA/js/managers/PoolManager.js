
import * as THREE from 'three';

export class PoolManager {
    constructor(game) {
        this.game = game;
        this.pools = {};
        this.factories = {};
    }

    register(type, createFn, initialSize = 10) {
        if (!this.game || !this.game.world) {
            console.warn("PoolManager: Game or World not ready during register.");
            return;
        }
        this.factories[type] = createFn;
        this.pools[type] = [];

        for (let i = 0; i < initialSize; i++) {
            const obj = createFn();
            this.deactivate(obj);
            this.pools[type].push({ inUse: false, object: obj });
            // Add to scene if it's a mesh, but keep hidden
            if (obj instanceof THREE.Object3D) {
                this.game.world.scene.add(obj);
            }
        }
    }

    get(type) {
        if (!this.pools[type]) {
            console.warn(`Pool '${type}' not registered.`);
            return null;
        }

        // Find unused
        let entry = this.pools[type].find(e => !e.inUse);

        if (!entry) {
            // Expand pool
            console.log(`Expanding pool '${type}'`);
            const obj = this.factories[type]();
            this.game.world.scene.add(obj);
            entry = { inUse: false, object: obj };
            this.pools[type].push(entry);
        }

        entry.inUse = true;
        this.activate(entry.object);
        return entry.object;
    }

    return(type, object) {
        if (!this.pools[type]) return;

        const entry = this.pools[type].find(e => e.object === object);
        if (entry) {
            entry.inUse = false;
            this.deactivate(object);
        }
    }

    activate(obj) {
        obj.visible = true;
        // Physics activation handled by caller usually, but we can ensure it's awake if needed
        if (obj.body) {
            obj.body.wakeUp();
        }
    }

    deactivate(obj) {
        obj.visible = false;
        if (obj.body) {
            obj.body.sleep();
            obj.body.position.set(0, -1000, 0); // Move away
            obj.body.velocity.set(0, 0, 0);
            obj.body.angularVelocity.set(0, 0, 0);
        }
    }
}
