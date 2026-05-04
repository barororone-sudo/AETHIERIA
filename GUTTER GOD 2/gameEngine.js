import { Game } from './game';

class GameEngine {
  constructor() {
    this.game = new Game();
  }

  init() {
    this.game.init();
  }

  run() {
    this.game.run();
  }
}

export default GameEngine;
