const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;
const SAVE_DIR = path.join(__dirname, 'saves');
const SAVE_FILE = path.join(SAVE_DIR, 'global_save.json');

// Middleware
app.use(express.json()); // Parse JSON bodies
app.use(express.static('.')); // Serve static files from current directory

// Ensure saves directory exists
if (!fs.existsSync(SAVE_DIR)) {
    fs.mkdirSync(SAVE_DIR);
    console.log(`Created saves directory: ${SAVE_DIR}`);
}

// --- API ROUTES ---

// Helper to get save path
const getSavePath = (id) => path.join(SAVE_DIR, `save_slot_${id}.json`);

// POST /api/save/:id
app.post('/api/save/:id', (req, res) => {
    try {
        const slotId = req.params.id;
        const saveData = req.body;

        if (!saveData) return res.status(400).json({ error: "No data provided" });

        const filePath = getSavePath(slotId);
        fs.writeFileSync(filePath, JSON.stringify(saveData, null, 2));

        console.log(`Game saved to Slot ${slotId}`);
        res.json({ success: true, slotId });
    } catch (error) {
        console.error('Save failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/load/:id
app.get('/api/load/:id', (req, res) => {
    try {
        const slotId = req.params.id;
        const filePath = getSavePath(slotId);

        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf8');
            const jsonData = JSON.parse(data);
            console.log(`Game loaded from Slot ${slotId}`);
            res.json(jsonData);
        } else {
            console.log(`No save file for Slot ${slotId}`);
            res.status(404).json({ empty: true });
        }
    } catch (error) {
        console.error('Load failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE /api/save/:id
app.delete('/api/save/:id', (req, res) => {
    try {
        const slotId = req.params.id;
        const filePath = getSavePath(slotId);

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`Deleted Slot ${slotId}`);
            res.json({ success: true });
        } else {
            res.status(404).json({ error: "Slot not found" });
        }
    } catch (error) {
        console.error('Delete failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/slots (List all saves metadata)
app.get('/api/slots', (req, res) => {
    try {
        const slots = [];
        for (let i = 1; i <= 3; i++) {
            const filePath = getSavePath(i);
            if (fs.existsSync(filePath)) {
                try {
                    // Read only start of file or full file? Full file is fine for 3 small saves.
                    // Accessing file directly to get metadata
                    const content = fs.readFileSync(filePath, 'utf8');
                    const data = JSON.parse(content);

                    slots.push({
                        id: i,
                        exists: true,
                        level: 1, // Placeholder
                        date: data.timestamp ? new Date(data.timestamp).toLocaleString() : 'Unknown',
                        location: data.position ? `X: ${Math.round(data.position.x)}, Z: ${Math.round(data.position.z)}` : 'Unknown'
                    });
                } catch (e) {
                    console.error(`Error reading slot ${i}:`, e);
                    slots.push({ id: i, exists: false, error: "Corrupt" });
                }
            } else {
                slots.push({ id: i, exists: false });
            }
        }
        res.json(slots);
    } catch (error) {
        console.error('Slots list failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`External access via Docker: http://localhost:3002`);
});
