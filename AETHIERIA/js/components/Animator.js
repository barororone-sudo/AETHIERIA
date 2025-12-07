import * as THREE from 'three';

export class Animator {
    /**
     * @param {import('../Player.js').Player} player 
     */
    constructor(player) {
        this.player = player;
        this.animations = {};
        this.currentAnim = null;
        this.currentTime = 0;
        this.isPlaying = false;
        this.speed = 1.0;
        this.blendSpeed = 10.0;

        // Base rotations to return to
        this.basePose = {
            rightArm: { x: 0, y: 0, z: 0 },
            leftArm: { x: 0, y: 0, z: 0 },
            torso: { x: 0, y: 0, z: 0 }
        };
    }

    /**
     * @param {string} name 
     * @param {Object} data - { duration: number, keys: Array<{t: number, pose: Object}> }
     */
    register(name, data) {
        this.animations[name] = data;
    }

    play(name, speed = 1.0) {
        if (!this.animations[name]) {
            console.warn(`Animation ${name} not found`);
            return;
        }
        this.currentAnim = this.animations[name];
        this.currentTime = 0;
        this.speed = speed;
        this.isPlaying = true;
    }

    stop() {
        this.isPlaying = false;
        this.currentAnim = null;
    }

    update(dt) {
        // If not playing, lerp back to base pose (Idle)
        if (!this.isPlaying || !this.currentAnim) {
            this.lerpToPose(this.basePose, dt * 5.0);
            return;
        }

        this.currentTime += dt * this.speed;

        // Check end
        if (this.currentTime >= this.currentAnim.duration) {
            this.isPlaying = false;
            this.currentAnim = null;
            return;
        }

        // Find Keyframes
        const keys = this.currentAnim.keys;
        let k1 = keys[0];
        let k2 = keys[keys.length - 1];

        for (let i = 0; i < keys.length - 1; i++) {
            if (this.currentTime >= keys[i].t && this.currentTime < keys[i + 1].t) {
                k1 = keys[i];
                k2 = keys[i + 1];
                break;
            }
        }

        // Interpolate
        const range = k2.t - k1.t;
        const progress = (this.currentTime - k1.t) / (range > 0 ? range : 1.0);
        // Ease?
        // const t = progress; 
        // Cubic Ease Out maybe?
        const t = 1 - Math.pow(1 - progress, 3); // Cubic Out

        const targetPose = {};
        for (const limbName in k2.pose) {
            const r1 = k1.pose[limbName] || this.basePose[limbName] || { x: 0, y: 0, z: 0 };
            const r2 = k2.pose[limbName];

            targetPose[limbName] = {
                x: THREE.MathUtils.lerp(r1.x, r2.x, t),
                y: THREE.MathUtils.lerp(r1.y, r2.y, t),
                z: THREE.MathUtils.lerp(r1.z, r2.z, t)
            };
        }

        this.applyPose(targetPose);
    }

    lerpToPose(pose, lerpFactor) {
        // We can check Player for limbs
        if (this.player.rightArm) this.lerpLimb(this.player.rightArm, pose.rightArm, lerpFactor);
        if (this.player.leftArm) this.lerpLimb(this.player.leftArm, pose.leftArm, lerpFactor);
        if (this.player.bodyMesh) this.lerpLimb(this.player.bodyMesh, pose.torso, lerpFactor); // Torso usually rotates smoothly
    }

    applyPose(pose) {
        // Direct Apply? Or Lerp?
        // For Keyframes, we calculated exact pos 'targetPose', so we apply it directly?
        // Actually, update loop is running per frame. 'targetPose' IS the interpolated value.
        // So we set it directly.
        if (this.player.rightArm && pose.rightArm) this.setLimb(this.player.rightArm, pose.rightArm);
        if (this.player.leftArm && pose.leftArm) this.setLimb(this.player.leftArm, pose.leftArm);
        if (this.player.bodyMesh && pose.torso) {
            // Basic torso rotation (Y mostly)
            this.player.bodyMesh.rotation.x = pose.torso.x;
            this.player.bodyMesh.rotation.y = pose.torso.y;
            this.player.bodyMesh.rotation.z = pose.torso.z;
        }
    }

    lerpLimb(mesh, rot, f) {
        if (!rot) return;
        mesh.rotation.x = THREE.MathUtils.lerp(mesh.rotation.x, rot.x, f);
        mesh.rotation.y = THREE.MathUtils.lerp(mesh.rotation.y, rot.y, f);
        mesh.rotation.z = THREE.MathUtils.lerp(mesh.rotation.z, rot.z, f);
    }

    setLimb(mesh, rot) {
        mesh.rotation.set(rot.x, rot.y, rot.z);
    }
}
