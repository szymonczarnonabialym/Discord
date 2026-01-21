const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

async function listModels() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    try {
        const models = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" }).apiKey;
        // Wait, the SDK doesn't expose listModels directly on the instance easily without import.
        // Let's use the correct flow.
    } catch (e) { }
}

// Better script:
const apiKey = process.env.GEMINI_API_KEY;
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

fetch(url)
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            console.error("API Error:", data.error);
        } else {
            console.log("Available Models:");
            data.models.forEach(m => {
                if (m.supportedGenerationMethods.includes("generateContent")) {
                    console.log(`- ${m.name.replace('models/', '')}`);
                }
            });
        }
    })
    .catch(err => console.error("Fetch Error:", err));
