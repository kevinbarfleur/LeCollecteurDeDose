import dotenv from "dotenv";
dotenv.config();

import tmi from "tmi.js";

// Configuration du bot
const client = new tmi.Client({
    identity: {
        username: process.env.TWITCH_BOT_USERNAME,
        password: process.env.TWITCH_BOT_OAUTH_TOKEN
    },
    channels: [ process.env.TWITCH_CHANNEL_NAME ]  // Le bot rejoint le chat de cette chaîne
});

client.connect();

client.on('message', (channel, tags, message, self) => {
    if (self) return;

    if (message.toLowerCase() === '!ping') {
        client.say(channel, `Pong !`);
    }
});

console.log("🤖 Bot connecté en tant que :", process.env.TWITCH_BOT_USERNAME);
export default client;
