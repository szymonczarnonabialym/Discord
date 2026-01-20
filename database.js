const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'schedules.json');

// Ensure DB file exists
if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ tasks: [] }, null, 2));
}

function readDB() {
    try {
        const data = fs.readFileSync(DB_PATH, 'utf8');
        const parsed = JSON.parse(data);
        if (!parsed || !Array.isArray(parsed.tasks)) {
            return { tasks: [] };
        }
        return parsed;
    } catch (error) {
        return { tasks: [] };
    }
}

function writeDB(data) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

module.exports = {
    getPending: () => {
        const db = readDB();
        return db.tasks.filter(t => t.status === 'pending');
    },
    getAll: () => {
        return readDB().tasks;
    },
    add: (task) => {
        const db = readDB();
        const id = Date.now();
        db.tasks.push({ ...task, id, status: 'pending' });
        writeDB(db);
    },
    delete: (id) => {
        const db = readDB();
        // Convert id to number just in case
        const numId = parseInt(id);
        db.tasks = db.tasks.filter(t => t.id !== numId);
        writeDB(db);
    },
    updateStatus: (id, status) => {
        const db = readDB();
        const task = db.tasks.find(t => t.id === id);
        if (task) {
            task.status = status;
            writeDB(db);
        }
    },
    update: (id, data) => {
        const db = readDB();
        const taskIndex = db.tasks.findIndex(t => t.id === id);
        if (taskIndex !== -1) {
            // Merge existing task with new data, ensuring we don't overwrite ID or status unless intended
            // We only update fields provided in data, but keep old imagePath if new one isn't provided (handled in server.js but good to be safe)
            const oldTask = db.tasks[taskIndex];
            db.tasks[taskIndex] = { ...oldTask, ...data };
            writeDB(db);
        }
    },
    reschedule: (id, newTime) => {
        const db = readDB();
        const task = db.tasks.find(t => t.id === id);
        if (task) {
            task.scheduledTime = newTime;
            writeDB(db);
        }
    }
};
