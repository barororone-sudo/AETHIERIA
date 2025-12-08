// Serveur de sauvegarde léger pour AETHERIA
// RAM minimale : ~10-20 MB

const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3003;
const SAVES_DIR = path.join(__dirname, '../saves');

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Créer le dossier saves s'il n'existe pas
async function ensureSavesDir() {
    try {
        await fs.access(SAVES_DIR);
    } catch {
        await fs.mkdir(SAVES_DIR, { recursive: true });
        console.log('📁 Created saves directory');
    }
}

// GET /api/saves - Liste tous les slots
app.get('/api/saves', async (req, res) => {
    try {
        const slots = [];
        for (let i = 1; i <= 3; i++) {
            const filePath = path.join(SAVES_DIR, `slot_${i}.json`);
            try {
                const data = await fs.readFile(filePath, 'utf8');
                const saveData = JSON.parse(data);
                slots.push({
                    id: i,
                    exists: true,
                    ...saveData.metadata
                });
            } catch {
                slots.push({ id: i, exists: false });
            }
        }
        res.json(slots);
    } catch (error) {
        console.error('❌ Error listing saves:', error);
        res.status(500).json({ error: 'Failed to list saves' });
    }
});

// GET /api/saves/:id - Charge un slot
app.get('/api/saves/:id', async (req, res) => {
    try {
        const slotId = parseInt(req.params.id);
        if (slotId < 1 || slotId > 3) {
            return res.status(400).json({ error: 'Invalid slot ID' });
        }

        const filePath = path.join(SAVES_DIR, `slot_${slotId}.json`);
        const data = await fs.readFile(filePath, 'utf8');
        const saveData = JSON.parse(data);

        console.log(`📂 Loaded slot ${slotId}`);
        res.json(saveData);
    } catch (error) {
        if (error.code === 'ENOENT') {
            res.status(404).json({ error: 'Save not found' });
        } else {
            console.error('❌ Error loading save:', error);
            res.status(500).json({ error: 'Failed to load save' });
        }
    }
});

// POST /api/saves/:id - Sauvegarde un slot
app.post('/api/saves/:id', async (req, res) => {
    try {
        const slotId = parseInt(req.params.id);
        if (slotId < 1 || slotId > 3) {
            return res.status(400).json({ error: 'Invalid slot ID' });
        }

        const saveData = req.body;
        const filePath = path.join(SAVES_DIR, `slot_${slotId}.json`);

        // Écriture directe (pas de cache)
        await fs.writeFile(filePath, JSON.stringify(saveData, null, 2), 'utf8');

        console.log(`💾 Saved slot ${slotId}`);
        res.json({ success: true, slotId });
    } catch (error) {
        console.error('❌ Error saving:', error);
        res.status(500).json({ error: 'Failed to save' });
    }
});

// DELETE /api/saves/:id - Supprime un slot
app.delete('/api/saves/:id', async (req, res) => {
    try {
        const slotId = parseInt(req.params.id);
        if (slotId < 1 || slotId > 3) {
            return res.status(400).json({ error: 'Invalid slot ID' });
        }

        const filePath = path.join(SAVES_DIR, `slot_${slotId}.json`);
        await fs.unlink(filePath);

        console.log(`🗑️ Deleted slot ${slotId}`);
        res.json({ success: true, slotId });
    } catch (error) {
        if (error.code === 'ENOENT') {
            res.status(404).json({ error: 'Save not found' });
        } else {
            console.error('❌ Error deleting save:', error);
            res.status(500).json({ error: 'Failed to delete save' });
        }
    }
});

// Démarrage du serveur
async function start() {
    await ensureSavesDir();
    app.listen(PORT, () => {
        console.log(`\n🎮 AETHERIA Save Server`);
        console.log(`📡 Running on http://localhost:${PORT}`);
        console.log(`💾 Saves directory: ${SAVES_DIR}\n`);
    });
}

start().catch(console.error);
