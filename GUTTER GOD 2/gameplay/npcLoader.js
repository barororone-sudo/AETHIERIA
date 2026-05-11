// gameplay/npcLoader.js — spawn world NPCs with dialogue trees

import { Vector3, MeshBuilder, StandardMaterial, Color3 } from '@babylonjs/core';
import { spawnNPC, NPC_ROLES, addDialogueTree } from './npcSystem.js';
import { getTerrainHeight } from '../world/babylonTerrain.js';
import { Events } from '../core/events.js';

function _createQuestMarker(scene, parentMesh) {
  const marker = MeshBuilder.CreatePlane('quest-marker', { size: 0.6 }, scene);
  marker.parent = parentMesh;
  marker.position.y = 2.5;
  marker.billboardMode = 7;

  const mat = new StandardMaterial('quest-mat-' + parentMesh.name, scene);
  mat.emissiveColor = new Color3(1, 0.84, 0);
  mat.disableLighting = true;
  mat.alpha = 0.9;
  marker.material = mat;

  let t = Math.random() * Math.PI * 2;
  scene.onBeforeRenderObservable.add(() => {
    t += 0.03;
    marker.position.y = 2.5 + Math.sin(t) * 0.15;
  });

  return marker;
}

export async function loadWorldNPCs(scene) {
  // ── ACT 1 NPCs ────────────────────────────────────────────

  // Mael — first quest giver near spawn
  const maelY = getTerrainHeight(8, -103);
  const mael = await spawnNPC({
    id: 'npc_mael',
    name: 'Mael',
    role: NPC_ROLES.QUEST_GIVER,
    position: new Vector3(8, maelY, -103),
    greetingRadius: 10,
    dialogueId: 'mael_greetings',
    questId: 'A1_MQ01',
  });
  _createQuestMarker(scene, mael.root);

  // Torben — blacksmith
  const forgeY = getTerrainHeight(25, -95);
  await spawnNPC({
    id: 'npc_forge',
    name: 'Torben le Forgeron',
    role: NPC_ROLES.BLACKSMITH,
    position: new Vector3(25, forgeY, -95),
    greetingRadius: 6,
    dialogueId: 'torben_greetings',
  });

  addDialogueTree('torben_greetings', {
    id: 'torben_greetings',
    speaker: 'Torben',
    lines: [
      { text: "Hmm. Ton arme a besoin de travail. Apporte-moi des materiaux et je la renforcerai.", emotion: 'gruff' },
    ],
    choices: [
      { text: 'Ameliorer mon arme', next: null },
      { text: 'Plus tard', next: null },
    ],
  });

  addDialogueTree('torben_greetings_return', {
    id: 'torben_greetings_return',
    speaker: 'Torben',
    lines: [
      { text: "Encore toi ? Tu as des materiaux cette fois ?", emotion: 'gruff' },
    ],
    choices: [
      { text: 'Ameliorer mon arme', next: null },
      { text: 'Non, pas encore', next: null },
    ],
  });

  // Elara — merchant
  const marchandeY = getTerrainHeight(13, -82);
  await spawnNPC({
    id: 'npc_elara',
    name: 'Elara la Marchande',
    role: NPC_ROLES.MERCHANT,
    position: new Vector3(13, marchandeY, -82),
    greetingRadius: 7,
    dialogueId: 'elara_greetings',
    inventory: ['potion_health', 'potion_stamina', 'flame_visage'],
  });

  addDialogueTree('elara_greetings', {
    id: 'elara_greetings',
    speaker: 'Elara',
    lines: [
      { text: "Bienvenue, voyageur ! J'ai des potions et des reliques rares.", emotion: 'cheerful' },
      { text: "Attention, certaines sont... instables. Mais puissantes !", emotion: 'mysterious' },
    ],
    choices: [
      { text: 'Voir les potions', next: null },
      { text: 'Voir les artefacts', next: null },
      { text: 'Dis-moi en plus sur ce monde', next: 'elara_lore' },
    ],
  });

  addDialogueTree('elara_greetings_return', {
    id: 'elara_greetings_return',
    speaker: 'Elara',
    lines: [
      { text: "De retour pour mes merveilles ? J'ai de nouvelles trouvailles.", emotion: 'cheerful' },
    ],
    choices: [
      { text: 'Voir les potions', next: null },
      { text: 'Voir les artefacts', next: null },
      { text: 'Quoi de neuf ?', next: 'elara_lore' },
    ],
  });

  addDialogueTree('elara_lore', {
    id: 'elara_lore',
    speaker: 'Elara',
    lines: [
      { text: "Ce monde... n'est pas ce qu'il semble. Le ciel est un dome. Nous sommes enfermes.", emotion: 'serious' },
      { text: "Cherche les archives de Vael-Dorn. Tu comprendras.", emotion: 'whisper' },
    ],
    choices: [],
  });

  // Sage Iven — lore and key quest
  const sageY = getTerrainHeight(-60, -50);
  const iven = await spawnNPC({
    id: 'npc_sage_iven',
    name: 'Sage Iven',
    role: NPC_ROLES.SAGE,
    position: new Vector3(-60, sageY, -50),
    greetingRadius: 8,
    dialogueId: 'iven_greetings',
  });
  _createQuestMarker(scene, iven.root);

  addDialogueTree('iven_greetings', {
    id: 'iven_greetings',
    speaker: 'Sage Iven',
    lines: [
      { text: "Je t'attendais. Les etoiles au-dessus du dome murmurent ton nom.", emotion: 'calm' },
      { text: "Tu cherches a briser le Verrou Celeste, n'est-ce pas ?", emotion: 'knowing' },
    ],
    choices: [
      { text: 'Comment savez-vous ?', next: 'iven_explain' },
      { text: 'Oui. Comment faire ?', next: 'iven_quest' },
      { text: 'De quoi parlez-vous ?', next: 'iven_confused' },
    ],
  });

  addDialogueTree('iven_explain', {
    id: 'iven_explain',
    speaker: 'Sage Iven',
    lines: [
      { text: "Les Fragments de Verrou resonent quand un elu approche. Tu en portes un, non ?", emotion: 'wise' },
    ],
    choices: [{ text: 'Continuez...', next: 'iven_quest' }],
  });

  addDialogueTree('iven_quest', {
    id: 'iven_quest',
    speaker: 'Sage Iven',
    lines: [
      { text: "Il faut 5 Fragments. Le premier est garde par le Gardien des Cendres, au nord.", emotion: 'serious' },
      { text: "Mais attention : chaque Fragment que tu prends... fissure un peu plus le ciel.", emotion: 'warning' },
    ],
    choices: [
      { text: 'Je suis pret', next: null, questId: 'A1_MQ03' },
      { text: "J'ai besoin de me preparer", next: null },
    ],
  });

  addDialogueTree('iven_greetings_return', {
    id: 'iven_greetings_return',
    speaker: 'Sage Iven',
    lines: [
      { text: "Les etoiles continuent de murmurer. As-tu avance dans ta quete ?", emotion: 'calm' },
    ],
    choices: [
      { text: 'Oui, je progresse', next: 'iven_progress' },
      { text: 'Pas encore', next: null },
    ],
  });

  addDialogueTree('iven_progress', {
    id: 'iven_progress',
    speaker: 'Sage Iven',
    lines: [
      { text: "Bien. Chaque Fragment compte. N'oublie pas : le ciel reagit a chaque morceau que tu prends.", emotion: 'wise' },
    ],
    choices: [],
  });

  addDialogueTree('iven_confused', {
    id: 'iven_confused',
    speaker: 'Sage Iven',
    lines: [
      { text: "Hmm. Tu n'es pas encore eveille. Reviens quand tu auras vu les fissures du ciel.", emotion: 'disappointed' },
    ],
    choices: [],
  });

  // ── ACT 2 NPCs ────────────────────────────────────────────

  // Rosa — innkeeper (heals HP)
  const innY = getTerrainHeight(176, -123);
  await spawnNPC({
    id: 'npc_innkeeper',
    name: "Rosa l'Aubergiste",
    role: NPC_ROLES.INNKEEPER,
    position: new Vector3(176, innY, -123),
    greetingRadius: 5,
    dialogueId: 'rosa_greetings',
  });

  addDialogueTree('rosa_greetings', {
    id: 'rosa_greetings',
    speaker: 'Rosa',
    lines: [
      { text: "Ah, un nouveau visage ! Installe-toi. La route est longue par ici.", emotion: 'warm' },
    ],
    choices: [
      { text: 'Se reposer (restaurer HP)', next: 'rosa_rest' },
      { text: 'Des nouvelles de la region ?', next: 'rosa_rumors' },
    ],
  });

  addDialogueTree('rosa_greetings_return', {
    id: 'rosa_greetings_return',
    speaker: 'Rosa',
    lines: [
      { text: "Re-bienvenue ! Tu as l'air fatigue. Un repos te ferait du bien.", emotion: 'warm' },
    ],
    choices: [
      { text: 'Se reposer (restaurer HP)', next: 'rosa_rest' },
      { text: 'Des nouvelles ?', next: 'rosa_rumors' },
    ],
  });

  addDialogueTree('rosa_rest', {
    id: 'rosa_rest',
    speaker: 'Rosa',
    lines: [{ text: "Voila. Repose-toi bien, voyageur.", emotion: 'caring' }],
    choices: [],
  });

  // Heal player when resting at inn
  Events.on('dialogue:started', ({ dialogue }) => {
    if (dialogue?.id === 'rosa_rest') {
      Events.emit('player:heal', { amount: 999 });
    }
  });

  addDialogueTree('rosa_rumors', {
    id: 'rosa_rumors',
    speaker: 'Rosa',
    lines: [
      { text: "On dit que la Tour d'Orval s'est remise a cracher du metal. Les routes sont dangereuses.", emotion: 'worried' },
      { text: "Et des gens voient des silhouettes au-dessus du dome la nuit...", emotion: 'fearful' },
    ],
    choices: [],
  });

  // Lysande — alchemist
  const alchY = getTerrainHeight(-180, -149);
  await spawnNPC({
    id: 'npc_alchemist',
    name: "Lysande l'Alchimiste",
    role: NPC_ROLES.ALCHEMIST,
    position: new Vector3(-180, alchY, -149),
    greetingRadius: 6,
    dialogueId: 'lysande_greetings',
  });

  addDialogueTree('lysande_greetings', {
    id: 'lysande_greetings',
    speaker: 'Lysande',
    lines: [
      { text: "Tu as l'air abime. J'ai des elixirs qui pourraient t'aider.", emotion: 'analytical' },
      { text: "Apporte-moi des ingredients et je te preparerai quelque chose de special.", emotion: 'excited' },
    ],
    choices: [
      { text: 'Que peux-tu preparer ?', next: null },
      { text: 'Ou trouver des ingredients ?', next: 'lysande_ingredients' },
    ],
  });

  addDialogueTree('lysande_greetings_return', {
    id: 'lysande_greetings_return',
    speaker: 'Lysande',
    lines: [
      { text: "Tu reviens ! As-tu trouve des ingredients interessants ?", emotion: 'excited' },
    ],
    choices: [
      { text: 'Que peux-tu preparer ?', next: null },
      { text: 'Ou trouver des ingredients ?', next: 'lysande_ingredients' },
    ],
  });

  addDialogueTree('lysande_ingredients', {
    id: 'lysande_ingredients',
    speaker: 'Lysande',
    lines: [
      { text: "Les herbes lumineuses poussent pres des puits d'eau. Les cristaux de fer tombent du ciel dans le biome ironrain.", emotion: 'instructive' },
      { text: "Et si tu trouves de la Resine de Racine... ne la touche pas a mains nues.", emotion: 'warning' },
    ],
    choices: [],
  });

  // Garde — patrol NPC near settlement
  const gardeY = getTerrainHeight(1, -92);
  await spawnNPC({
    id: 'npc_garde',
    name: 'Garde Varken',
    role: NPC_ROLES.VILLAGER,
    position: new Vector3(1, gardeY, -92),
    greetingRadius: 6,
    dialogueId: 'varken_greetings',
  });

  addDialogueTree('varken_greetings', {
    id: 'varken_greetings',
    speaker: 'Garde Varken',
    lines: [
      { text: "Halte. Les routes ne sont plus sures depuis les tremblements.", emotion: 'stern' },
      { text: "Si tu te diriges vers le nord, fais attention aux Rodeurs de Cendre.", emotion: 'warning' },
    ],
    choices: [
      { text: 'Merci du conseil', next: null },
      { text: 'Je peux me defendre', next: 'varken_tough' },
    ],
  });

  addDialogueTree('varken_greetings_return', {
    id: 'varken_greetings_return',
    speaker: 'Garde Varken',
    lines: [
      { text: "Toi encore. Les routes sont toujours dangereuses. Sois prudent.", emotion: 'stern' },
    ],
    choices: [
      { text: 'Merci', next: null },
      { text: 'Du nouveau ?', next: 'varken_news' },
    ],
  });

  addDialogueTree('varken_news', {
    id: 'varken_news',
    speaker: 'Garde Varken',
    lines: [
      { text: "On a repere des mutants pres du biome des racines. Evite cette zone si tu n'es pas prepare.", emotion: 'warning' },
    ],
    choices: [],
  });

  addDialogueTree('varken_tough', {
    id: 'varken_tough',
    speaker: 'Garde Varken',
    lines: [
      { text: "Ha ! C'est ce qu'ils disent tous. Bonne chance, guerrier.", emotion: 'amused' },
    ],
    choices: [],
  });

  // Phase 8G village population: each settlement gets trade, craft, quest and local voices.
  const extraVillagers = [
    {
      id: 'npc_mirelle',
      name: 'Mirelle la Puisatiere',
      role: NPC_ROLES.VILLAGER,
      x: 22,
      z: -110,
      dialogueId: 'mirelle_greetings',
      lines: [
        "La fontaine tient encore, mais l'eau chante la nuit. Ce n'est pas normal.",
        "Si Mael te demande d'aller au puits, prends une torche.",
      ],
    },
    {
      id: 'npc_iron_captain',
      name: 'Capitaine Ora',
      role: NPC_ROLES.QUEST_GIVER,
      x: 178,
      z: -136,
      dialogueId: 'ora_greetings',
      lines: [
        "Ironwatch tient parce que personne ne dort vraiment ici.",
        "Les ruines au nord-est ont recommence a pulser. J'ai besoin d'yeux courageux.",
      ],
      questId: 'A2_SQ_ELIANE',
    },
    {
      id: 'npc_iron_smith',
      name: 'Bram le Fer-Clos',
      role: NPC_ROLES.BLACKSMITH,
      x: 193,
      z: -126,
      dialogueId: 'bram_greetings',
      lines: [
        "Le metal tombe du ciel, mais il faut savoir l'ecouter avant de le forger.",
        "Pose tes armes. Je peux leur donner du mordant.",
      ],
    },
    {
      id: 'npc_iron_merchant',
      name: 'Sella des Routes',
      role: NPC_ROLES.MERCHANT,
      x: 171,
      z: -118,
      dialogueId: 'sella_greetings',
      lines: [
        "J'ai traverse trois pluies de fer pour arriver ici. Mes prix sont honnetes.",
        "Potions, cles, morceaux de ciel refroidi... choisis vite.",
      ],
    },
    {
      id: 'npc_iron_guard',
      name: 'Garde Pell',
      role: NPC_ROLES.VILLAGER,
      x: 166,
      z: -135,
      dialogueId: 'pell_greetings',
      lines: [
        "Ne reste pas sous les toits quand la pluie commence. Le fer traverse tout.",
        "La tour de signal revele la route, si tu arrives jusqu'en haut.",
      ],
    },
    {
      id: 'npc_iron_refugee',
      name: 'Nessa la Refugiee',
      role: NPC_ROLES.VILLAGER,
      x: 187,
      z: -112,
      dialogueId: 'nessa_greetings',
      lines: [
        "Mon village etait plus bas dans la vallee. Maintenant il brille sous l'eau.",
        "Si tu peux sauver des gens, ne laisse personne choisir a ta place.",
      ],
    },
    {
      id: 'npc_ember_seer',
      name: 'Seve l Eveillee',
      role: NPC_ROLES.QUEST_GIVER,
      x: -169,
      z: -166,
      dialogueId: 'seve_greetings',
      lines: [
        "Ember Hollow brule lentement, mais les cendres gardent les souvenirs.",
        "Sous la chapelle noire, un mur fissure cache un nom interdit.",
      ],
      questId: 'A3_SQ_EMBER',
    },
    {
      id: 'npc_ember_smith',
      name: 'Garron Cendre-Marteau',
      role: NPC_ROLES.BLACKSMITH,
      x: -156,
      z: -158,
      dialogueId: 'garron_greetings',
      lines: [
        "Ici, on forge avec ce qui reste. C'est souvent meilleur.",
        "Laisse-moi voir cette lame. Elle n'a pas encore assez souffert.",
      ],
    },
    {
      id: 'npc_ember_miner',
      name: 'Orren le Mineur',
      role: NPC_ROLES.VILLAGER,
      x: -184,
      z: -166,
      dialogueId: 'orren_greetings',
      lines: [
        "Les ruines toussent parfois des coffres. Mauvais signe, bon profit.",
        "Si un mur sonne creux, recule avant de frapper.",
      ],
    },
    {
      id: 'npc_ember_runner',
      name: 'Cindel la Messagere',
      role: NPC_ROLES.VILLAGER,
      x: -160,
      z: -145,
      dialogueId: 'cindel_greetings',
      lines: [
        "Je cours entre les feux de signal. Quand l'un s'eteint, on perd une route.",
        "La tour a l'est voit plus loin que les anciens.",
      ],
    },
  ];

  for (const npc of extraVillagers) {
    addDialogueTree(npc.dialogueId, {
      id: npc.dialogueId,
      speaker: npc.name,
      lines: npc.lines.map(text => ({ text, emotion: 'neutral' })),
      choices: npc.questId
        ? [{ text: 'Je vais regarder', next: null, questId: npc.questId }, { text: 'Plus tard', next: null }]
        : [{ text: 'Merci', next: null }],
    });
    addDialogueTree(`${npc.dialogueId}_return`, {
      id: `${npc.dialogueId}_return`,
      speaker: npc.name,
      lines: [{ text: npc.lines[0], emotion: 'neutral' }],
      choices: [{ text: 'A bientot', next: null }],
    });
    const y = getTerrainHeight(npc.x, npc.z);
    const spawned = await spawnNPC({
      id: npc.id,
      name: npc.name,
      role: npc.role,
      position: new Vector3(npc.x, y, npc.z),
      greetingRadius: npc.role === NPC_ROLES.QUEST_GIVER ? 8 : 6,
      dialogueId: npc.dialogueId,
    });
    if (npc.role === NPC_ROLES.QUEST_GIVER) _createQuestMarker(scene, spawned.root);
  }

  console.log('[NPCLoader] 17 NPCs loaded for Phase 8G villages');
}
