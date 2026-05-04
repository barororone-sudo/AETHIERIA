```javascript
// Importation des dépendances nécessaires
import { AI } from './ai.js';

// Définition de la classe EnemyAI
class EnemyAI {
  constructor() {
    this.ai = new AI();
  }

  // Méthode pour initialiser l'IA des ennemis
  init() {
    this.ai.init();
  }

  // Méthode pour mettre à jour l'IA des ennemis
  update() {
    this.ai.update();
  }

  // Méthode pour gérer les comportements des ennemis
  handleBehavior() {
    // Code pour gérer les comportements des ennemis
  }
}

// Exportation de la classe EnemyAI
export { EnemyAI };
```
