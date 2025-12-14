// server.mjs
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import {
    getAllUserCollections,
    getUserCollection,
    getUserCards,
    getAllUniqueCards
} from "./supabase-service.mjs";

dotenv.config();

// -------------------------------------------------------------
//  CONFIG API KEY
// -------------------------------------------------------------
const API_KEY = process.env.API_KEY || "kfdad5a5-1f4b-4e2b-8c3d-2e2f6f4e5a6b7";

const app = express();
app.use(express.json());
app.use(cors());

// -------------------------------------------------------------
//  MIDDLEWARE AUTH AVEC API KEY
// -------------------------------------------------------------
function requireApiKey(req, res, next) {
    const key = req.headers["x-api-key"];
    if (key && key === API_KEY) return next();
    return res.status(403).json({ error: "API Key invalide" });
}

// -------------------------------------------------------------
//  ROUTES API HEADLESS (READ - depuis Supabase)
// -------------------------------------------------------------

app.get("/api/userCollection", async (req, res) => {
    try {
        const collections = await getAllUserCollections();
        res.json(collections);
    } catch (err) {
        console.error("❌ API ERROR:", err);
        res.status(500).json({ error: "Erreur lecture collections" });
    }
});

app.get("/api/userCollection/:user", async (req, res) => {
    try {
        const user = req.params.user.toLowerCase();
        const collection = await getUserCollection(user);
        res.json(collection);
    } catch (err) {
        console.error("❌ API ERROR:", err);
        res.status(500).json({ error: "Erreur lecture collection" });
    }
});

app.get("/api/usercards/:user", async (req, res) => {
    try {
        const user = req.params.user.toLowerCase();
        const cards = await getUserCards(user);
        res.json(cards);
    } catch (err) {
        console.error("❌ API ERROR:", err);
        res.status(500).json({ error: "Erreur lecture cartes" });
    }
});

app.get("/api/uniques", async (req, res) => {
    try {
        const uniques = await getAllUniqueCards();
        res.json(uniques);
    } catch (err) {
        console.error("❌ API ERROR:", err);
        res.status(500).json({ error: "Erreur lecture uniques" });
    }
});

// -------------------------------------------------------------
//  WRITE — Les écritures sont maintenant gérées directement par eventSub.mjs
//  Ces endpoints sont conservés pour compatibilité mais ne font plus grand chose
// -------------------------------------------------------------

app.post("/api/userCollection/update", requireApiKey, async (req, res) => {
    try {
        // Les collections sont maintenant gérées automatiquement par Supabase
        // via les fonctions add_card_to_collection et update_vaal_orbs
        console.log("⚠️  /api/userCollection/update appelé mais les collections sont gérées automatiquement");
        res.json({ ok: true, message: "Collections gérées automatiquement par Supabase" });
    } catch (err) {
        console.error("❌ API ERROR:", err);
        res.status(500).json({ error: "Erreur" });
    }
});

app.post("/api/usercards/update", requireApiKey, async (req, res) => {
    try {
        // Les boosters sont maintenant créés automatiquement par eventSub.mjs
        console.log("⚠️  /api/usercards/update appelé mais les boosters sont créés automatiquement");
        res.json({ ok: true, message: "Boosters créés automatiquement par Supabase" });
    } catch (err) {
        console.error("❌ API ERROR:", err);
        res.status(500).json({ error: "Erreur" });
    }
});

app.post("/api/uniques/update", requireApiKey, async (req, res) => {
    try {
        // Les cartes uniques sont dans la table unique_cards
        // Utiliser le script de migration ou l'API Supabase directement
        console.log("⚠️  /api/uniques/update appelé - utiliser le script de migration pour mettre à jour les cartes");
        res.json({ ok: true, message: "Utiliser le script de migration pour mettre à jour les cartes uniques" });
    } catch (err) {
        console.error("❌ API ERROR:", err);
        res.status(500).json({ error: "Erreur" });
    }
});

// -------------------------------------------------------------
//  START
// -------------------------------------------------------------
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 API headless en ligne : http://localhost:${PORT}`);
    console.log(`🔑 API Key : ${API_KEY}`);
    console.log(`📊 Données depuis Supabase Database`);
});
