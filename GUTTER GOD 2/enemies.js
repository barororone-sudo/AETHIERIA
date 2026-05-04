```javascript
// Classe pour les ennemis
class Enemies {
  constructor() {
    this.listeEnnemis = [];
  }

  // Méthode pour initialiser les ennemis
  init() {
    // Création d'une liste d'ennemis
    for (let i = 0; i < 10; i++) {
      this.listeEnnemis.push({ x: Math.random() * 100, y: Math.random() * 100 });
    }
  }

  // Méthode pour mettre à jour les ennemis
  update() {
    // Mise à jour de la position des ennemis
    for (let i = 0; i < this.listeEnnemis.length; i++) {
      this.listeEnnemis[i].x += 1;
    }
  }
}

export default Enemies;
```
