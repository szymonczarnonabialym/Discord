const express = require('express');
const multer = require('multer');
const path = require('path');
const db = require('./database');
const dayjs = require('dayjs');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(express.static('public'));
app.use(express.json());

// API: Get all schedules
app.get('/api/schedules', (req, res) => {
    const tasks = db.getPending().sort((a, b) => a.scheduledTime - b.scheduledTime);
    res.json(tasks);
});

// API: Create new schedule
app.post('/api/schedule', upload.single('image'), (req, res) => {
    const { datetime, channelId, recurrence } = req.body;
    const imagePath = req.file.path;
    const scheduledTime = dayjs(datetime).valueOf();

    db.add({
        channelId,
        imagePath,
        scheduledTime,
        recurrence: recurrence || 'once'
    });

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
