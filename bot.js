const { Client, GatewayIntentBits } = require('discord.js');
const db = require('./database');
const dayjs = require('dayjs');
const fs = require('fs');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

client.once('ready', () => {
    console.log(`Bot logged in as ${client.user.tag}`);

    // Scheduler Loop (every 10s)
    setInterval(checkSchedules, 10 * 1000);
});

async function checkSchedules() {
    const now = Date.now();
    const tasks = db.getPending();

    for (const task of tasks) {
        if (task.scheduledTime <= now) {
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
                        db.reschedule(task.id, nextYear);
                        console.log(`Rescheduled task ${task.id} for next year`);
                    } else {
                        db.updateStatus(task.id, 'sent');
                    }
                }
            } catch (error) {
                console.error(`Failed to execute task ${task.id}:`, error);
            }
        }
    }
}

module.exports = client;
