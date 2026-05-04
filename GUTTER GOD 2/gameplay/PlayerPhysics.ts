import { Ray, Scene, Vector3 } from '@babylonjs/core';

export interface PlayerPhysicsConfig {
  height: number;
  groundOffset?: number;
  rayStart?: number;
  rayLength?: number;
  snapSpeed?: number;
}

export interface PlayerBodyLike {
  position: Vector3;
  velocity?: Vector3;
}

export class PlayerPhysics {
  private readonly rayOrigin = new Vector3();
  private readonly rayDirection = new Vector3(0, -1, 0);
  private readonly ray = new Ray(this.rayOrigin, this.rayDirection, 100);
  private grounded = false;

  constructor(
    private readonly scene: Scene,
    private readonly config: PlayerPhysicsConfig,
  ) {}

  update(body: PlayerBodyLike, deltaSeconds: number): boolean {
    const rayStart = this.config.rayStart ?? 8;
    const rayLength = this.config.rayLength ?? 32;
    const groundOffset = this.config.groundOffset ?? 0;
    const snapSpeed = this.config.snapSpeed ?? 40;

    this.rayOrigin.set(body.position.x, body.position.y + rayStart, body.position.z);
    this.ray.length = rayLength;

    const hit = this.scene.pickWithRay(this.ray, (mesh) => {
      return mesh.isPickable && mesh.name !== 'player' && mesh.metadata?.player !== true;
    }, true);

    const groundY = hit?.hit && hit.pickedPoint ? hit.pickedPoint.y : 0;
    const targetY = groundY + this.config.height * 0.5 + groundOffset;
    const alpha = Math.min(1, snapSpeed * deltaSeconds);

    if (body.position.y <= targetY + 0.4) {
      body.position.y += (targetY - body.position.y) * alpha;
      if (body.position.y < targetY) body.position.y = targetY;
      if (body.velocity && body.velocity.y < 0) body.velocity.y = 0;
      this.grounded = true;
    } else {
      this.grounded = false;
    }

    return this.grounded;
  }

  isGrounded(): boolean {
    return this.grounded;
  }
}

