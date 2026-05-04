import { Ray, Scene, UniversalCamera, Vector3 } from '@babylonjs/core';

export interface CameraGenshinConfig {
  radius: number;
  minRadius: number;
  maxRadius: number;
  heightOffset: number;
  pitch: number;
  verticalSmoothness: number;
  horizontalSmoothness: number;
  collisionMargin: number;
  verticalDeadZone: number;
}

const DEFAULT_CONFIG: CameraGenshinConfig = {
  radius: 6,
  minRadius: 2,
  maxRadius: 12,
  heightOffset: 1.6,
  pitch: 0.45,
  verticalSmoothness: 8,
  horizontalSmoothness: 14,
  collisionMargin: 0.35,
  verticalDeadZone: 0.035,
};

export class CameraGenshin {
  readonly camera: UniversalCamera;

  private readonly config: CameraGenshinConfig;
  private readonly target = new Vector3();
  private readonly rayOrigin = new Vector3();
  private readonly rayDirection = new Vector3();
  private readonly collisionRay = new Ray(this.rayOrigin, this.rayDirection, 1);

  private yaw = 0;
  private desiredRadius: number;
  private collisionRadius: number;

  constructor(scene: Scene, name = 'genshin-camera', config: Partial<CameraGenshinConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.desiredRadius = this.config.radius;
    this.collisionRadius = this.config.radius;
    this.camera = new UniversalCamera(name, new Vector3(0, 4, -this.config.radius), scene);
    this.camera.inputs.clear();
    this.camera.minZ = 0.15;
    this.camera.maxZ = 700;
  }

  setYaw(yaw: number): void {
    this.yaw = yaw;
  }

  zoom(delta: number): void {
    this.desiredRadius = clamp(
      this.desiredRadius + delta,
      this.config.minRadius,
      this.config.maxRadius,
    );
  }

  update(scene: Scene, playerPosition: Vector3, deltaSeconds: number): void {
    const horizontalAlpha = 1 - Math.exp(-this.config.horizontalSmoothness * deltaSeconds);
    const verticalAlpha = 1 - Math.exp(-this.config.verticalSmoothness * deltaSeconds);
    const targetY = playerPosition.y + this.config.heightOffset;

    this.target.x += (playerPosition.x - this.target.x) * horizontalAlpha;
    this.target.z += (playerPosition.z - this.target.z) * horizontalAlpha;

    const yDelta = targetY - this.target.y;
    if (Math.abs(yDelta) > this.config.verticalDeadZone) {
      this.target.y += yDelta * verticalAlpha;
    }

    const cp = Math.cos(this.config.pitch);
    this.rayDirection.set(
      Math.sin(this.yaw) * cp,
      Math.sin(this.config.pitch),
      Math.cos(this.yaw) * cp,
    );

    const safeRadius = this.computeCollisionRadius(scene);
    const radiusAlpha = safeRadius < this.collisionRadius ? 1 : 1 - Math.exp(-12 * deltaSeconds);
    this.collisionRadius += (safeRadius - this.collisionRadius) * radiusAlpha;

    this.camera.position.set(
      this.target.x + this.rayDirection.x * this.collisionRadius,
      this.target.y + this.rayDirection.y * this.collisionRadius,
      this.target.z + this.rayDirection.z * this.collisionRadius,
    );
    this.camera.setTarget(this.target);
  }

  private computeCollisionRadius(scene: Scene): number {
    this.rayOrigin.copyFrom(this.target);
    this.collisionRay.length = this.desiredRadius;

    const hit = scene.pickWithRay(this.collisionRay, (mesh) => {
      if (mesh.name === 'player' || mesh.metadata?.player === true) return false;
      return mesh.checkCollisions || mesh.metadata?.cameraCollider === true;
    }, true);

    if (!hit?.hit) return this.desiredRadius;
    return Math.max(this.config.minRadius, hit.distance - this.config.collisionMargin);
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

