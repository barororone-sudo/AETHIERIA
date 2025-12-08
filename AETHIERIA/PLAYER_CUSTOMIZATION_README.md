# 🎨 Player Character Customization

## Quick Start

Want to use your own 3D character? Just change one line!

### 1. Open the file
`js/managers/AssetLoader.js`

### 2. Find this line (around line 12)
```javascript
export const PLAYER_MODEL_URL = 'https://...';
```

### 3. Replace with your GLB URL
```javascript
export const PLAYER_MODEL_URL = 'https://models.readyplayer.me/YOUR_ID.glb';
```

### 4. Reload the game
Press `Ctrl+Shift+R` in your browser

---

## Compatible Sources

✅ **Ready Player Me** - `https://models.readyplayer.me/YOUR_ID.glb`  
✅ **GitHub Raw Files** - `https://raw.githubusercontent.com/user/repo/main/model.glb`  
✅ **Any Public GLB/GLTF** - Any accessible URL works!

---

## Fallback System

The game has 3 levels of safety:

1. **Your Custom URL** - Tries your model first
2. **Backup Model** - Falls back to CesiumMan if yours fails
3. **Red Cube** 🟥 - Emergency fallback if everything fails

**The game will never crash!**

---

## Need Help?

See full documentation: `docs/PLAYER_CUSTOMIZATION.md`

Console logs (F12) will show you exactly what's happening:
- 🌐 Loading...
- ✅ Success!
- 📦 Animations found
- 🔴 Fallback activated
