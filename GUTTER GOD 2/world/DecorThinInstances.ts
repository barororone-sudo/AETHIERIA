import { Matrix, Mesh, Quaternion, Vector3 } from '@babylonjs/core';

export interface DecorInstanceTransform {
  position: Vector3;
  rotationY?: number;
  scale?: Vector3;
}

export class DecorThinInstanceBatch {
  private readonly chunks = new Map<string, Float32Array>();
  private readonly tmpMatrix = new Matrix();
  private readonly tmpScale = new Vector3(1, 1, 1);
  private readonly tmpRotation = Quaternion.Identity();

  constructor(private readonly template: Mesh) {
    this.template.isVisible = true;
    this.template.isPickable = false;
    this.template.freezeWorldMatrix();
  }

  setChunk(chunkKey: string, transforms: readonly DecorInstanceTransform[]): void {
    const buffer = new Float32Array(transforms.length * 16);

    for (let i = 0; i < transforms.length; i += 1) {
      const transform = transforms[i];
      const scale = transform.scale ?? this.tmpScale;
      Quaternion.FromEulerAnglesToRef(0, transform.rotationY ?? 0, 0, this.tmpRotation);
      Matrix.ComposeToRef(scale, this.tmpRotation, transform.position, this.tmpMatrix);
      this.tmpMatrix.copyToArray(buffer, i * 16);
    }

    this.chunks.set(chunkKey, buffer);
    this.flush();
  }

  removeChunk(chunkKey: string): void {
    if (!this.chunks.delete(chunkKey)) return;
    this.flush();
  }

  clear(): void {
    this.chunks.clear();
    this.template.thinInstanceCount = 0;
  }

  private flush(): void {
    let matrixCount = 0;
    for (const buffer of this.chunks.values()) matrixCount += buffer.length / 16;

    const merged = new Float32Array(matrixCount * 16);
    let offset = 0;
    for (const buffer of this.chunks.values()) {
      merged.set(buffer, offset);
      offset += buffer.length;
    }

    this.template.thinInstanceSetBuffer('matrix', merged, 16, false);
  }
}

