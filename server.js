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
    const tasks = db.prepare("SELECT * FROM schedules WHERE status = 'pending' ORDER BY scheduledTime ASC").all();
    res.json(tasks);
});

// API: Create new schedule
app.post('/api/schedule', upload.single('image'), (req, res) => {
    const { datetime, channelId, recurrence } = req.body;
    const imagePath = req.file.path;
    const scheduledTime = dayjs(datetime).valueOf();

    const stmt = db.prepare("INSERT INTO schedules (channelId, imagePath, scheduledTime, recurrence) VALUES (?, ?, ?, ?)");
    stmt.run(channelId, imagePath, scheduledTime, recurrence || 'once');

    res.json({ success: true });
});

// API: Delete schedule
app.delete('/api/schedule/:id', (req, res) => {
    db.prepare("DELETE FROM schedules WHERE id = ?").run(req.params.id);
    res.json({ success: true });
});

module.exports = app;
