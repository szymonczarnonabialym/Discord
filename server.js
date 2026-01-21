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

app.post('/api/generate-content', upload.single('image'), async (req, res) => {
    try {
        const { topic, channelId, channelName, startTime, delayDays } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;
        const imageFile = req.file;

        if (!apiKey) {
            return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        let promptParts = [];

        // Base prompt instructions
        const systemInstruction = `
        Jesteś nauczycielem i ekspertem. Stwórz post z zadaniem oraz osobny post z rozwiązaniem.
        Temat lub kontekst: "${topic}".
        
        Wymagania:
        1. Jeśli otrzymałeś zdjęcie, zadanie ma opierać się na tym zdjęciu (rozwiąż je, ale w poście z zadaniem tylko je opisz/wprowadź).
        2. Formatowanie Discorda (emoji, bold).
        3. Wynik TYLKO JSON:
        {
            "task_content": "Treść posta z zadaniem (wprowadzenie)...",
            "solution_content": "Pełne rozwiązanie i wytłumaczenie..."
        }
        `;

        promptParts.push(systemInstruction);

        // Add Image if present
        if (imageFile) {
            const mimeType = imageFile.mimetype;
            const imagePath = imageFile.path;
            const imageBuffer = fs.readFileSync(imagePath);
            const base64Image = imageBuffer.toString('base64');

            promptParts.push({
                inlineData: {
                    data: base64Image,
                    mimeType: mimeType
                }
            });
        }

        const result = await model.generateContent(promptParts);
        const response = await result.response;
        let text = response.text();

        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const content = JSON.parse(text);

        // Determine if image should be attached
        const shouldAttach = req.body.attachImage === 'on' || req.body.attachImage === 'true';
        const finalImagePath = (shouldAttach && imageFile) ? imageFile.path : null;

        // Schedule Task
        const taskTime = dayjs(startTime).valueOf();
        db.add({
            channelId,
            channelName,
            message: content.task_content,
            scheduledTime: taskTime,
            recurrence: 'once',
            imagePath: finalImagePath
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
