import { Vector3 } from '@babylonjs/core';
import { WorldSecretId, WorldStateId, WorldStateManager } from '../world/WorldStateManager';

export type QuestStepKind = 'proximity' | 'item' | 'kill' | 'interaction' | 'secret';

export interface QuestStep {
  id: string;
  label: string;
  kind: QuestStepKind;
  target?: Vector3;
  radius?: number;
  itemId?: string;
  enemyType?: string;
  count?: number;
  secretId?: WorldSecretId;
  completed?: boolean;
}

export interface QuestDefinition {
  id: string;
  title: string;
  description: string;
  steps: QuestStep[];
  unlocksSecret?: WorldSecretId;
  unlocksWorldState?: WorldStateId;
}

export interface QuestRuntimeContext {
  playerPosition: Vector3;
  inventory?: ReadonlySet<string>;
  killCounts?: ReadonlyMap<string, number>;
  interactions?: ReadonlySet<string>;
}

export class QuestEngine {
  private readonly active = new Map<string, QuestDefinition>();
  private readonly completed = new Set<string>();

  constructor(private readonly worldState: WorldStateManager) {}

  startQuest(definition: QuestDefinition): void {
    if (this.completed.has(definition.id)) return;
    this.active.set(definition.id, structuredCloneQuest(definition));
  }

  update(context: QuestRuntimeContext): void {
    for (const quest of this.active.values()) {
      for (const step of quest.steps) {
        if (step.completed) continue;
        step.completed = this.evaluateStep(step, context);
      }

      if (quest.steps.every((step) => step.completed)) {
        this.completeQuest(quest);
      }
    }
  }

  isCompleted(questId: string): boolean {
    return this.completed.has(questId);
  }

  getActiveQuests(): readonly QuestDefinition[] {
    return [...this.active.values()];
  }

  private evaluateStep(step: QuestStep, context: QuestRuntimeContext): boolean {
    if (step.kind === 'proximity' && step.target && step.radius != null) {
      return Vector3.DistanceSquared(context.playerPosition, step.target) <= step.radius * step.radius;
    }

    if (step.kind === 'item' && step.itemId) {
      return Boolean(context.inventory?.has(step.itemId));
    }

    if (step.kind === 'kill' && step.enemyType) {
      return (context.killCounts?.get(step.enemyType) ?? 0) >= (step.count ?? 1);
    }

    if (step.kind === 'interaction') {
      return Boolean(context.interactions?.has(step.id));
    }

    if (step.kind === 'secret' && step.secretId) {
      return this.worldState.hasSecret(step.secretId);
    }

    return false;
  }

  private completeQuest(quest: QuestDefinition): void {
    this.completed.add(quest.id);
    this.active.delete(quest.id);

    if (quest.unlocksSecret) {
      this.worldState.discoverSecret(quest.unlocksSecret);
    } else if (quest.unlocksWorldState) {
      this.worldState.setState(quest.unlocksWorldState);
    }
  }
}

function structuredCloneQuest(quest: QuestDefinition): QuestDefinition {
  return {
    ...quest,
    steps: quest.steps.map((step) => ({ ...step, target: step.target?.clone() })),
  };
}

export const FRACTURE_PROLOGUE_QUEST: QuestDefinition = {
  id: 'fracture-prologue',
  title: 'La Fracture du Ciel',
  description: 'Atteins le drain sacre sous Vael-Dorn et reveille le dome artificiel du Gutter.',
  unlocksSecret: 'SKY_DOME_FIRST_CRACK',
  steps: [
    {
      id: 'reach-divine-drain',
      label: 'Trouver le premier drain divin',
      kind: 'proximity',
      target: new Vector3(45, 0, 45),
      radius: 7,
    },
    {
      id: 'touch-sky-core',
      label: 'Toucher le coeur du ciel',
      kind: 'interaction',
    },
  ],
};

