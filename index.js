require('dotenv').config();
const app = require('./server');
const { client } = require('./bot');

const PORT = process.env.PORT || 3000;

// Start Server
app.listen(PORT, () => {
    console.log(`Dashboard running on http://localhost:${PORT} (v2.8 - Mutex Lock)`);
});

// Start Bot
if (process.env.DISCORD_TOKEN && process.env.DISCORD_TOKEN !== 'your_bot_token_here') {
    client.login(process.env.DISCORD_TOKEN).catch(err => {
        console.error("Failed to login bot:", err.message);
    });
} else {
    console.log("No valid DISCORD_TOKEN found in .env. Bot will not start until token is added.");
}
