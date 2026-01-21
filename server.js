const express = require('express');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const db = require('./database');
const dayjs = require('dayjs');

const fs = require('fs');

const app = express();

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

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

// Auth Middleware (Defined before use)
const isAuthenticated = (req, res, next) => {
    if (req.path === '/login.html' || req.path === '/api/login' || req.path.startsWith('/style.css')) {
        return next();
    }
    if (req.session.authenticated) {
        return next();
    }
    res.redirect('/login.html');
};

// Health Checks (Public - above auth)
app.get('/ping', (req, res) => res.send('pong-v5'));

app.get('/api/diagnose', (req, res) => {
    try {
        const botModule = require('./bot');
        const client = botModule.client || botModule;
        res.json({
            status: 'online',
            version: 'v4',
            node_version: process.version,
            bot_ready: client ? (typeof client.isReady === 'function' ? client.isReady() : !!client.user) : false,
            token_present: !!process.env.DISCORD_TOKEN,
            guild_id_present: !!process.env.GUILD_ID,
            uptime: process.uptime(),
            time: new Date().toISOString(),
            timestamp: Date.now()
        });
    } catch (err) {
        res.status(500).json({ error: err.message, stack: err.stack });
    }
});

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

// API: Get all pending future schedules
app.get('/api/schedules', (req, res) => {
    const now = Date.now();
    const allTasks = db.getAll();
    const pendingTasks = allTasks.filter(t => {
        const isFuture = t.scheduledTime > now;
        const isPending = t.status === 'pending';
        return isPending && isFuture;
    });

    console.log(`[API] Returning ${pendingTasks.length} pending tasks out of ${allTasks.length}. Current time: ${now}`);
    res.json(pendingTasks);
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
    if (db.delete) {
        db.delete(parseInt(req.params.id));
    } else {
        // Fallback or error if db.delete is missing (should not happen based on inspection)
        console.error("db.delete is not defined");
    }
    res.json({ success: true });
});

// API: Get channels
app.get('/api/channels', (req, res) => {
    // ... existing code ...
    try {
        const { getChannels } = require('./bot');
        const channels = getChannels();
        if (!channels) {
            const { client } = require('./bot');
            if (!client.isReady()) return res.status(503).json({ error: 'Bot starting or login failed' });
            return res.json([]);
        }
        res.json(channels);
    } catch (error) {
        console.error("Error in /api/channels:", error);
        res.status(500).json({ error: error.message });
    }
});

// AI Integration
const { GoogleGenerativeAI } = require("@google/generative-ai");

app.post('/api/generate-content', async (req, res) => {
    try {
        const { topic, channelId, channelName, startTime, delayDays } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        const prompt = `
        Jesteś nauczycielem i ekspertem. Stwórz zadanie edukacyjne i jego rozwiązanie na temat: "${topic}".
        
        Wymagania:
        1. Treść ma być angażująca i sformatowana pod Discorda (używaj **pogrubień**, emoji itp.).
        2. Zwróć wynik TYLKO w formacie JSON (bez markdowna ```json```).
        3. Struktura JSON:
        {
            "task_content": "Treść samego zadania...",
            "solution_content": "Treść rozwiązania..."
        }
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        // Cleanup potential markdown code blocks if AI adds them
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        const content = JSON.parse(text);

        // Schedule Task
        const taskTime = dayjs(startTime).valueOf();
        db.add({
            channelId,
            channelName,
            message: content.task_content,
            scheduledTime: taskTime,
            recurrence: 'once'
        });

        // Schedule Solution
        const solutionTime = dayjs(startTime).add(parseInt(delayDays), 'day').valueOf();
        db.add({
            channelId,
            channelName,
            message: `✅ **Rozwiązanie zadania!**\n\n${content.solution_content}`,
            scheduledTime: solutionTime,
            recurrence: 'once'
        });

        res.json({ success: true, count: 2 });

    } catch (error) {
        console.error("AI Error:", error);
        res.status(500).json({ error: "Failed to generate content: " + error.message });
    }
});



module.exports = app;
