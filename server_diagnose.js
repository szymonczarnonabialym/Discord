const fs = require('fs');
const path = require('path');

console.log("=== SERVER DIAGNOSIS ===");
console.log(`Node Version: ${process.version}`);
console.log(`Current Directory: ${process.cwd()}`);
console.log(`Files in directory: ${fs.readdirSync('.').join(', ')}`);

const modulesToCheck = ['@google/generative-ai', 'multer', 'discord.js', 'dotenv', 'express'];

console.log("\n--- Checking Modules ---");
modulesToCheck.forEach(mod => {
    try {
        require.resolve(mod);
        console.log(`✅ Module FOUND: ${mod}`);
    } catch (e) {
        console.log(`❌ Module MISSING: ${mod}`);
        // console.error(e.message);
    }
});

console.log("\n--- Checking package.json ---");
try {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    console.log("Dependencies listed in package.json:");
    console.log(JSON.stringify(pkg.dependencies, null, 2));
} catch (e) {
    console.log("❌ Could not read package.json");
}

console.log("\n========================");
