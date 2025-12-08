# Guide de Démarrage - Système de Sauvegarde JSON

## 🚀 Démarrage Rapide

### 1. Installer les dépendances
```bash
npm install
```

### 2. Démarrer le serveur de sauvegarde
**Terminal 1** :
```bash
npm run save-server
```

Vous devriez voir :
```
🎮 AETHERIA Save Server
📡 Running on http://localhost:3003
💾 Saves directory: C:\AETHIERIA\saves
```

### 3. Démarrer le jeu (Docker)
**Terminal 2** :
```bash
docker-compose up
```

### 4. Jouer !
Ouvrez : `http://localhost:3002`

---

## ✨ Fonctionnalités

### Sauvegarde Automatique
- ⏱️ **Toutes les 30 secondes** pendant le jeu
- 💾 Sauvegarde au moment de quitter/rafraîchir
- 📁 Fichiers JSON dans `saves/slot_1.json`, `saves/slot_2.json`, `saves/slot_3.json`

### Restauration Automatique
- 🔄 Au démarrage, le jeu charge automatiquement les slots disponibles
- 📂 Sélection de profil avec métadonnées (niveau, temps de jeu, localisation)

### Suppression de Profil
- 🗑️ Bouton ✕ sur chaque carte de profil
- ⚠️ Confirmation avant suppression
- 🔥 Supprime le fichier JSON correspondant

---

## 📊 Structure des Sauvegardes

### Fichier JSON (`saves/slot_1.json`)
```json
{
  "position": { "x": 0, "y": 10, "z": 0 },
  "inventory": [...],
  "stats": {
    "hp": 500,
    "stamina": 100,
    "level": 5,
    "exp": 1250
  },
  "worldGen": { "camps": [...] },
  "story": { "state": "..." },
  "world": {
    "time": 12000,
    "fog": [1, 5, 12, ...],
    "towers": {...},
    "chests": [...]
  },
  "metadata": {
    "date": "08/12/2024 10:45",
    "location": "Plaines de l'Aube",
    "timestamp": 1733652300000,
    "playtime": 3600,
    "level": 5
  }
}
```

---

## 🔧 Dépannage

### Le serveur de sauvegarde ne démarre pas
```bash
# Vérifier que le port 3003 est libre
netstat -ano | findstr :3003

# Réinstaller les dépendances
npm install
```

### Les sauvegardes ne fonctionnent pas
1. Vérifier que le serveur de sauvegarde est démarré
2. Ouvrir la console (F12) et chercher les erreurs
3. Vérifier que `http://localhost:3003/api/saves` est accessible

### Fichiers JSON corrompus
Supprimez le fichier problématique dans `saves/` et recommencez une nouvelle partie.

---

## 📝 Notes

- **RAM utilisée** : ~10-20 MB pour le serveur de sauvegarde
- **Persistance** : Les fichiers JSON restent même après redémarrage
- **Backup** : Copiez simplement le dossier `saves/` pour sauvegarder vos parties
