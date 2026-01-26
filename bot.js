const { Client, GatewayIntentBits, ChannelType } = require('discord.js');
const db = require('./database');
const dayjs = require('dayjs');
const fs = require('fs');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

// MUTEX: Prevent concurrent scheduler runs
let isSchedulerRunning = false;

client.once('ready', () => {
    console.log(`Bot logged in as ${client.user.tag}`);

    // Scheduler Loop (every 10s)
    setInterval(checkSchedules, 10 * 1000);
});

async function checkSchedules() {
    // MUTEX CHECK: Skip if already running
    if (isSchedulerRunning) {
        console.log('[Scheduler] Skipping - previous run still in progress');
        return;
    }

    isSchedulerRunning = true;
    console.log('[Scheduler] Starting check...');

    try {
        const now = Date.now();
        const tasks = db.getPending();

        for (const task of tasks) {
            if (task.scheduledTime <= now) {
                // CRITICAL: Try to claim the task. If claimTask returns false, another process took it.
                if (db.claimTask(task.id)) {
                    console.log(`[Scheduler] Claimed task ${task.id}, processing...`);

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
                                console.log(`[Scheduler] Sent message for task ${task.id}`);
                            }

                            // Handle Recurrence
                            if (task.recurrence === 'yearly') {
                                const nextYear = dayjs(task.scheduledTime).add(1, 'year').valueOf();
                                db.reschedule(task.id, nextYear);
                                db.updateStatus(task.id, 'pending'); // Reset to pending for next year
                                console.log(`[Scheduler] Rescheduled task ${task.id} for next year`);
                            } else {
                                // AUTO-CLEANUP: Delete file and remove from DB
                                if (task.imagePath && fs.existsSync(task.imagePath)) {
                                    try {
                                        fs.unlinkSync(task.imagePath);
                                        console.log(`[Scheduler] Deleted image: ${task.imagePath}`);
                                    } catch (err) {
                                        console.error(`[Scheduler] Failed to delete image: ${err}`);
                                    }
                                }

                                db.delete(task.id);
                                console.log(`[Scheduler] Deleted task ${task.id} from database`);
                            }
                        } else {
                            // Channel not found - mark as error
                            console.error(`[Scheduler] Channel ${task.channelId} not found for task ${task.id}`);
                            db.updateStatus(task.id, 'error');
                        }
                    } catch (error) {
                        console.error(`[Scheduler] Failed to execute task ${task.id}:`, error.message);
                        // Mark as 'error' so it doesn't retry infinitely
                        db.updateStatus(task.id, 'error');
                    }
                }
            }
        }
    } finally {
        // ALWAYS release the mutex
        isSchedulerRunning = false;
        console.log('[Scheduler] Check complete.');
    }
}

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

// Send message immediately (used by instant publish feature)
async function sendMessage(channelId, message, imagePath) {
    if (!client.isReady()) {
        throw new Error('Bot is not ready');
    }

    const channel = await client.channels.fetch(channelId);
    if (!channel) {
        throw new Error('Channel not found');
    }

    const messageOptions = {
        content: message || ''
    };

    if (imagePath) {
        messageOptions.files = [imagePath];
    }

    if (!messageOptions.content && !messageOptions.files) {
        throw new Error('No content to send');
    }

    await channel.send(messageOptions);
    console.log(`[Bot] Instant message sent to channel ${channelId}`);
    return true;
}

module.exports = { client, getChannels, sendMessage };

