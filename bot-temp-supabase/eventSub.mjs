import dotenv from "dotenv";
dotenv.config();

import WebSocket from "ws";
import fetch from "node-fetch";
import client from "./bot.js";
import { 
    loadUniqueCards, 
    addCardToCollection, 
    updateVaalOrbs, 
    createBoosterRecord 
} from "./supabase-service.mjs";

// -------------------------------------------------------------
// VARIABLES D'ENVIRONNEMENT
// -------------------------------------------------------------
const CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;
const USER_TOKEN = process.env.TWITCH_USER_TOKEN;
const CHANNEL_ID = process.env.TWITCH_CHANNEL_ID;
const CHANNEL_NAME = process.env.TWITCH_CHANNEL_NAME.toLowerCase();
const TARGET_REWARD = process.env.TWITCH_REWARD_ID;
const VAAL_REWARD = process.env.TWITCH_REWARD_VAAL_ID;

let appAccessToken = null;
let itemsData = [];

// -------------------------------------------------------------
// CHARGEMENT DES CARTES AU DÉMARRAGE
// -------------------------------------------------------------
async function initializeCards() {
    itemsData = await loadUniqueCards();
    if (itemsData.length === 0) {
        console.error("❌ Aucune carte chargée ! Vérifiez la connexion Supabase.");
    } else {
        console.log(`✅ ${itemsData.length} cartes chargées depuis Supabase`);
    }
}

// Initialiser les cartes au démarrage
initializeCards();

// -------------------------------------------------------------
// UTILITAIRES
// -------------------------------------------------------------
function wait(ms) {
    return new Promise(res => setTimeout(res, ms));
}

// -------------------------------------------------------------
// RANDOM CARD LOGIC
// -------------------------------------------------------------
function weightedRandom(items) {
    const total = items.reduce((s, i) => s + (i.gameData?.weight ?? 1), 0);
    let r = Math.random() * total;

    for (const it of items) {
        r -= (it.gameData?.weight ?? 1);
        if (r <= 0) return it;
    }
    return items.at(-1);
}

function weightedRandomTier(items, tiers = ["T0", "T1", "T2"]) {
    const list = items.filter(i => tiers.includes(i.tier));
    if (!list.length) return null;

    const boosted = list.map(i => ({
        ...i,
        weight: i.gameData?.weight * (i.tier === "T2" ? 4 : 1)
    }));

    return weightedRandom(boosted);
}

function createBooster() {
    if (itemsData.length === 0) {
        console.error("❌ Aucune carte disponible pour créer un booster !");
        return [];
    }

    const booster = [];
    const guaranteed = weightedRandomTier(itemsData);
    if (guaranteed) booster.push(guaranteed);

    while (booster.length < 5) booster.push(weightedRandom(itemsData));

    return booster;
}

function isFoil(card) {
    const t = card.tier ?? "T0";
    const chances = { T3: 0.10, T2: 0.08, T1: 0.05, T0: 0.01 };
    return Math.random() < (chances[t] ?? 0.01);
}

// -------------------------------------------------------------
// AJOUT À LA COLLECTION (via Supabase)
// -------------------------------------------------------------
async function addToCollection(username, card) {
    const foil = card.foil === true;
    await addCardToCollection(username, card, foil);
}

// -------------------------------------------------------------
// TOKEN TWITCH
// -------------------------------------------------------------
async function getAppToken() {
    const res = await fetch(`https://id.twitch.tv/oauth2/token`, {
        method: "POST",
        body: new URLSearchParams({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            grant_type: "client_credentials"
        })
    });

    const data = await res.json();
    appAccessToken = data.access_token;
    console.log("🔐 App token obtenu !");
}

// -------------------------------------------------------------
// QUEUE DES RÉCOMPENSES
// -------------------------------------------------------------
const rewardQueue = [];
let processingQueue = false;

async function processQueue() {
    if (processingQueue) return;
    processingQueue = true;

    while (rewardQueue.length) {
        const reward = rewardQueue.shift();

        try {
            await handleReward(reward);
        } catch (e) {
            console.error("❌ Erreur handleReward :", e);
        }

        await wait(300);
    }

    processingQueue = false;
}

// -------------------------------------------------------------
// TRAITEMENT DES REWARD
// -------------------------------------------------------------
async function handleReward({ user, input, rewardId }) {

    if (rewardId === VAAL_REWARD) {
        await updateVaalOrbs(user, 5);
        client.say(`#${CHANNEL_NAME}`, `✨ @${user} reçoit 5 Vaal Orbs !`);
        return;
    }

    // PACK NORMAL
    const booster = createBooster();
    if (booster.length === 0) {
        console.error("❌ Impossible de créer un booster, aucune carte disponible");
        return;
    }

    const timestamp = new Date().toISOString();
    const entry = {
        booster: true,
        timestamp,
        content: []
    };

    const lootNames = [];

    // Traiter chaque carte du booster
    for (const baseCard of booster) {
        const card = structuredClone(baseCard);
        if (isFoil(card)) card.foil = true;

        entry.content.push(card);
        await addToCollection(user, card);
        lootNames.push(card.name + (card.foil ? " ✨" : ""));
    }

    // Enregistrer le booster dans Supabase
    await createBoosterRecord(user, entry.content);

    client.say(
        `#${CHANNEL_NAME}`,
        `🎁 @${user}, tu as looté : ${lootNames.join(", ")} !`
    );
}

// -------------------------------------------------------------
// EVENTSUB
// -------------------------------------------------------------
async function connectEventSub() {
    if (!appAccessToken) await getAppToken();

    const ws = new WebSocket("wss://eventsub.wss.twitch.tv/ws");
    ws.on("open", () => console.log("🔌 Connecté EventSub"));

    ws.on("message", async raw => {
        try {
            const msg = JSON.parse(raw);

            if (msg.metadata?.message_type === "session_welcome") {
                const sessionId = msg.payload.session.id;
                await subscribeToRedemptions(sessionId);
            }

            if (msg.metadata?.message_type === "notification") {
                const ev = msg.payload.event;

                if (![TARGET_REWARD, VAAL_REWARD].includes(ev.reward.id)) return;

                rewardQueue.push({
                    user: ev.user_name,
                    input: ev.user_input,
                    rewardId: ev.reward.id
                });

                processQueue();
            }

        } catch (e) {
            console.error("❌ EventSub error :", e);
        }
    });

    ws.on("close", () => {
        console.log("🔌 EventSub fermé, reconnexion dans 5s…");
        setTimeout(connectEventSub, 5000);
    });
}

async function subscribeToRedemptions(sessionId) {
    const res = await fetch("https://api.twitch.tv/helix/eventsub/subscriptions", {
        method: "POST",
        headers: {
            "Client-ID": CLIENT_ID,
            "Authorization": `Bearer ${USER_TOKEN}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            type: "channel.channel_points_custom_reward_redemption.add",
            version: "1",
            condition: { broadcaster_user_id: CHANNEL_ID },
            transport: { method: "websocket", session_id: sessionId }
        })
    });

    const data = await res.json();
    console.log("📨 Subscription :", data);
}

// -------------------------------------------------------------
// START
// -------------------------------------------------------------
// Attendre que les cartes soient chargées avant de démarrer EventSub
setTimeout(() => {
    if (itemsData.length > 0) {
        connectEventSub();
    } else {
        console.error("❌ Impossible de démarrer EventSub : aucune carte chargée");
    }
}, 1000);
