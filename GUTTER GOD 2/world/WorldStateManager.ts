import {
  Color3,
  Color4,
  CubeTexture,
  Material,
  PBRMaterial,
  Scene,
  StandardMaterial,
} from '@babylonjs/core';

export enum WorldStateId {
  STATE_NORMAL = 'STATE_NORMAL',
  STATE_FRACTURED = 'STATE_FRACTURED',
  STATE_DIVINE_RAIN = 'STATE_DIVINE_RAIN',
}

export type WorldSecretId =
  | 'SKY_DOME_FIRST_CRACK'
  | 'LUMINOUS_WATER_SOURCE'
  | 'FALLEN_DIVINE_ENGINE'
  | string;

export interface WorldStateDefinition {
  id: WorldStateId;
  clearColor: Color4;
  fogColor: Color3;
  fogDensity: number;
  skyboxTexture?: string;
  skyEmissive: Color3;
  waterEmissive: Color3;
  waterGlowIntensity: number;
  gravityScale: number;
  enabledTags: readonly string[];
}

export interface WorldStateTargets {
  skyMaterial?: StandardMaterial | PBRMaterial;
  skyboxMaterial?: StandardMaterial | PBRMaterial;
  waterMaterials?: Material[];
  taggedMeshes?: Map<string, { setEnabled(enabled: boolean): void }[]>;
}

const WORLD_STATE_DEFS: Record<WorldStateId, WorldStateDefinition> = {
  [WorldStateId.STATE_NORMAL]: {
    id: WorldStateId.STATE_NORMAL,
    clearColor: new Color4(0.55, 0.72, 0.92, 1),
    fogColor: new Color3(0.65, 0.78, 0.92),
    fogDensity: 0.0025,
    skyEmissive: new Color3(0.35, 0.55, 0.85),
    waterEmissive: new Color3(0.02, 0.08, 0.12),
    waterGlowIntensity: 0.15,
    gravityScale: 1,
    enabledTags: ['normal'],
  },
  [WorldStateId.STATE_FRACTURED]: {
    id: WorldStateId.STATE_FRACTURED,
    clearColor: new Color4(0.30, 0.13, 0.44, 1),
    fogColor: new Color3(0.42, 0.18, 0.58),
    fogDensity: 0.004,
    skyboxTexture: 'assets/sky/fractured-sky.env',
    skyEmissive: new Color3(0.82, 0.30, 1.0),
    waterEmissive: new Color3(0.05, 0.85, 1.0),
    waterGlowIntensity: 1.35,
    gravityScale: 0.82,
    enabledTags: ['normal', 'fractured', 'divine-debris'],
  },
  [WorldStateId.STATE_DIVINE_RAIN]: {
    id: WorldStateId.STATE_DIVINE_RAIN,
    clearColor: new Color4(0.18, 0.12, 0.24, 1),
    fogColor: new Color3(0.38, 0.32, 0.62),
    fogDensity: 0.006,
    skyEmissive: new Color3(0.70, 0.62, 1.0),
    waterEmissive: new Color3(0.35, 1.0, 0.85),
    waterGlowIntensity: 1.75,
    gravityScale: 0.65,
    enabledTags: ['normal', 'fractured', 'divine-debris', 'divine-rain'],
  },
};

export class WorldStateManager {
  private state: WorldStateId = WorldStateId.STATE_NORMAL;
  private discoveredSecrets = new Set<WorldSecretId>();
  private targets: WorldStateTargets = {};
  private readonly listeners = new Set<(state: WorldStateId) => void>();

  constructor(private readonly scene: Scene) {}

  bindTargets(targets: WorldStateTargets): void {
    this.targets = targets;
    this.applyCurrentState();
  }

  getState(): WorldStateId {
    return this.state;
  }

  hasSecret(secretId: WorldSecretId): boolean {
    return this.discoveredSecrets.has(secretId);
  }

  discoverSecret(secretId: WorldSecretId): WorldStateId {
    this.discoveredSecrets.add(secretId);

    if (secretId === 'SKY_DOME_FIRST_CRACK') {
      return this.setState(WorldStateId.STATE_FRACTURED);
    }

    if (secretId === 'LUMINOUS_WATER_SOURCE') {
      return this.setState(WorldStateId.STATE_DIVINE_RAIN);
    }

    this.applyCurrentState();
    return this.state;
  }

  setState(nextState: WorldStateId): WorldStateId {
    if (this.state === nextState) return this.state;
    this.state = nextState;
    this.applyCurrentState();
    for (const listener of this.listeners) listener(this.state);
    return this.state;
  }

  onStateChanged(listener: (state: WorldStateId) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  applyCurrentState(): void {
    const def = WORLD_STATE_DEFS[this.state];
    this.scene.clearColor = def.clearColor;
    this.scene.fogColor = def.fogColor;
    this.scene.fogDensity = def.fogDensity;

    this.applySky(def);
    this.applyWater(def);
    this.applyMeshTags(def);
  }

  private applySky(def: WorldStateDefinition): void {
    const skyMat = this.targets.skyMaterial ?? this.targets.skyboxMaterial;
    if (!skyMat) return;

    skyMat.emissiveColor = def.skyEmissive;

    if (def.skyboxTexture && skyMat instanceof StandardMaterial) {
      skyMat.reflectionTexture = CubeTexture.CreateFromPrefilteredData(def.skyboxTexture, this.scene);
    }
  }

  private applyWater(def: WorldStateDefinition): void {
    for (const material of this.targets.waterMaterials ?? []) {
      if (material instanceof PBRMaterial) {
        material.emissiveColor = def.waterEmissive;
        material.emissiveIntensity = def.waterGlowIntensity;
        material.metallic = 0;
        material.roughness = 0.82;
      } else if (material instanceof StandardMaterial) {
        material.emissiveColor = def.waterEmissive.scale(def.waterGlowIntensity);
      }
    }
  }

  private applyMeshTags(def: WorldStateDefinition): void {
    const tags = new Set(def.enabledTags);
    for (const [tag, meshes] of this.targets.taggedMeshes ?? []) {
      const enabled = tags.has(tag);
      for (const mesh of meshes) mesh.setEnabled(enabled);
    }
  }
}

