require('dotenv').config();
const app = require('./server');
const client = require('./bot');

const PORT = process.env.PORT || 3000;

// Start Server
app.listen(PORT, () => {
    console.log(`Dashboard running on http://localhost:${PORT}`);
});

// Start Bot
if (process.env.DISCORD_TOKEN) {
    client.login(process.env.DISCORD_TOKEN);
} else {
    console.log("No DISCORD_TOKEN found in .env. Bot will not start until token is added.");
}
