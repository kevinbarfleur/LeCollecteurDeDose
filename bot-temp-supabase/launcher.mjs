// launcher.mjs
// Lance le bot et le serveur API

import "./bot.js";  // Démarre le bot Twitch
import "./eventSub.mjs";  // Démarre EventSub
import "./server.mjs";  // Démarre le serveur API

console.log("🚀 Bot Twitch démarré avec Supabase Database");
