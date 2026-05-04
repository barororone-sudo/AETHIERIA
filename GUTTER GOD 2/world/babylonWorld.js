import { Scene, Engine, Camera, Vector3, Mesh, MeshBuilder, StandardMaterial } from '@babylonjs/core';
import { BabylonChunkStreamer } from './babylonChunkStreamer.js';
import { initTerrain } from './babylonTerrain.js';
import { initPlayerCharacter } from './babylonPlayerCharacter.js';

class BabylonWorld {
  constructor(scene, engine, camera) {
    this.scene = scene;
    this.engine = engine;
    this.camera = camera;
    this.chunkStreamer = new BabylonChunkStreamer(scene, engine, camera);
    this.terrainMesh = null;
    this.playerCharacter = null;
  }

  init() {
    // Initialisation du système de chunk streaming
    this.chunkStreamer.init();

    // Création du terrain
    this.terrainMesh = initTerrain(this.scene, {
      texture: 'textures/terrain.png',
      normalMap: 'textures/terrain_normal.png',
    });

    // Création du personnage joueur
    this.playerCharacter = initPlayerCharacter(this.scene, new Vector3(0, 10, 0));

    // Mise en place du moteur de jeu
    this.engine.runRenderLoop(() => {
      this.scene.render();
      this.chunkStreamer.update();
      this.playerCharacter.syncPlayerMeshToPhysics();
    });
  }
}

export { BabylonWorld };
