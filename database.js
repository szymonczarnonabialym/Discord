const Database = require('better-sqlite3');
const db = new Database('schedules.db');

// Initialize database
db.exec(`
    CREATE TABLE IF NOT EXISTS schedules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        channelId TEXT NOT NULL,
        imagePath TEXT NOT NULL,
        scheduledTime INTEGER NOT NULL,
        recurrence TEXT DEFAULT 'once',
        status TEXT DEFAULT 'pending'
    );
`);

module.exports = db;
