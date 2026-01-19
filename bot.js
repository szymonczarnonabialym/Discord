const { Client, GatewayIntentBits } = require('discord.js');
const db = require('./database');
const dayjs = require('dayjs');
const fs = require('fs');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

client.once('ready', () => {
    console.log(`Bot logged in as ${client.user.tag}`);

    // Scheduler Loop (every 60s)
    setInterval(checkSchedules, 60 * 1000);
});

async function checkSchedules() {
    const now = Date.now();
    const tasks = db.prepare("SELECT * FROM schedules WHERE status = 'pending' AND scheduledTime <= ?").all(now);

    for (const task of tasks) {
        try {
            const channel = await client.channels.fetch(task.channelId);
            if (channel) {
                await channel.send({
                    files: [task.imagePath] // Send the image
                });
                console.log(`Sent scheduled message ${task.id}`);

                // Handle Recurrence
                if (task.recurrence === 'yearly') {
                    const nextYear = dayjs(task.scheduledTime).add(1, 'year').valueOf();
                    db.prepare("UPDATE schedules SET scheduledTime = ? WHERE id = ?").run(nextYear, task.id);
                    console.log(`Rescheduled task ${task.id} for next year`);
                } else {
                    db.prepare("UPDATE schedules SET status = 'sent' WHERE id = ?").run(task.id);

                    // Cleanup image file if not recurring
                    /* fs.unlink(task.imagePath, (err) => {
                       if (err) console.error("Failed to delete image:", err);
                   }); */ // Commented out for now, maybe user wants to keep history
                }
            }
        } catch (error) {
            console.error(`Failed to execute task ${task.id}:`, error);
        }
    }
}

module.exports = client;
