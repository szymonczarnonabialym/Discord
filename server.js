const express = require('express');
const session = require('express-session');
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

// Session Configuration
app.use(session({
    secret: 'discord-planer-secret-key-123',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

app.use(express.json());

// Auth Middleware
const isAuthenticated = (req, res, next) => {
    // Exclude login page and API from protection
    if (req.path === '/login.html' || req.path === '/api/login' || req.path.startsWith('/style.css')) {
        return next();
    }

    if (req.session.authenticated) {
        return next();
    }

    res.redirect('/login.html');
};

app.use(isAuthenticated);

app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// API: Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'Szymon' && password === 'Discordplaner2026@') {
        req.session.authenticated = true;
        return res.json({ success: true });
    }
    res.status(401).json({ error: 'Błędny login lub hasło' });
});

// API: Get all schedules
app.get('/api/schedules', (req, res) => {
    res.json(db.getAll());
});

// API: Create new schedule
app.post('/api/schedule', upload.single('image'), (req, res) => {
    const { datetime, channelId, channelName, recurrence, message } = req.body;
    const imagePath = req.file ? req.file.path : null;
    const scheduledTime = dayjs(datetime).valueOf();

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
    db.deleteTask(parseInt(req.params.id));
    res.json({ success: true });
});

// API: Get channels
app.get('/api/channels', (req, res) => {
    const bot = require('./bot');
    const channels = bot.getChannels();
    if (!channels) {
        return res.status(503).json({ error: 'Bot not ready' });
    }
    res.json(channels);
});

module.exports = app;
