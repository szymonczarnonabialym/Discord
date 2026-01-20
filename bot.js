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
                    const messageOptions = {
                        content: task.message || ''
                    };

                    if (task.imagePath) {
                        messageOptions.files = [task.imagePath];
                    }

                    // Don't send empty message
                    if (messageOptions.content || messageOptions.files) {
                        await channel.send(messageOptions);
                        console.log(`Sent scheduled message ${task.id}`);
                    }

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

const { ChannelType } = require('discord.js');

// ... existing code ...

function getChannels() {
    const guildId = process.env.GUILD_ID;
    if (!client.isReady()) return null;
    if (!guildId) return [];

    const guild = client.guilds.cache.get(guildId);
    if (!guild) return [];

    return guild.channels.cache
        .filter(c => c.type === ChannelType.GuildText)
        .map(c => ({ id: c.id, name: c.name }))
        .sort((a, b) => a.name.localeCompare(b.name));
}

module.exports = { client, getChannels };
