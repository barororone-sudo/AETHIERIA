```javascript
// Classe pour le joueur
class Player {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.vitesse = 5;
  }

  // Méthode pour initialiser le joueur
  init() {
    // Initialisation de la position du joueur
    this.x = 100;
    this.y = 100;
  }

  // Méthode pour mettre à jour le joueur
  update() {
    // Mise à jour de la position du joueur
    this.x += this.vitesse;
  }
}

export default Player;
```
