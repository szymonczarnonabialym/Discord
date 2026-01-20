const express = require('express');
const multer = require('multer');
const path = require('path');
const db = require('./database');
const dayjs = require('dayjs');

const app = express();
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

const upload = multer({ storage: storage });

app.use(express.static('public'));
app.use('/uploads', express.static('uploads')); // Serve uploaded images
app.use(express.json());

// API: Get all schedules
app.get('/api/schedules', (req, res) => {
    const tasks = db.getPending().sort((a, b) => a.scheduledTime - b.scheduledTime);
    res.json(tasks);
});

// API: Create new schedule
app.post('/api/schedule', upload.single('image'), (req, res) => {
    const { datetime, channelId, channelName, recurrence, message } = req.body;

    // Image is optional
    const imagePath = req.file ? req.file.path : null;
    const scheduledTime = dayjs(datetime).valueOf();

    // Validation: Require either message OR image
    if (!message && !imagePath) {
        return res.status(400).json({ error: 'Must provide either message or image.' });
    }

    db.add({
        channelId,
        channelName,
        message,
        imagePath,
        scheduledTime,
        recurrence: recurrence || 'once'
    });

    res.json({ success: true });
});

// API: Update schedule
app.put('/api/schedule/:id', upload.single('image'), (req, res) => {
    const { id } = req.params;
    const { datetime, channelId, channelName, recurrence, message } = req.body;
    const scheduledTime = dayjs(datetime).valueOf();

    const updateData = {
        channelId,
        channelName,
        message,
        scheduledTime,
        recurrence
    };

    if (req.file) {
        updateData.imagePath = req.file.path;
    }

    db.update(parseInt(id), updateData);
    res.json({ success: true });
});

// API: Delete schedule
app.delete('/api/schedule/:id', (req, res) => {
    db.delete(req.params.id);
    res.json({ success: true });
});

// API: Get Channels
app.get('/api/channels', async (req, res) => {
    try {
        const client = require('./bot');
        if (!client.isReady()) {
            return res.status(503).json({ error: 'Bot not ready yet' });
        }

        const channels = [];
        // Iterate over all guilds the bot is in
        client.guilds.cache.forEach(guild => {
            guild.channels.cache.forEach(channel => {
                // Filter for text channels where bot can send messages
                // ChannelType.GuildText = 0
                if (channel.type === 0) {
                    channels.push({
                        id: channel.id,
                        name: `${guild.name} - #${channel.name}`
                    });
                }
            });
        });

        res.json(channels);
    } catch (error) {
        console.error("Error fetching channels:", error);
        res.status(500).json({ error: 'Failed to fetch channels' });
    }
});

module.exports = app;
