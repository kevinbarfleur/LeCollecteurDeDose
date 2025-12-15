# Migrations Collections

Ce dossier contient les migrations pour le système de collections basé sur Supabase.

## Migrations Appliquées

### 1. `create_collections_tables.sql`
Crée les tables principales :
- `unique_cards` : Catalogue de toutes les cartes disponibles
- `users` : Utilisateurs Twitch
- `user_collections` : Collections des utilisateurs (relation many-to-many)
- `user_boosters` : Historique des boosters ouverts
- `booster_cards` : Cartes dans chaque booster

### 2. `create_collections_functions.sql`
Crée les fonctions PostgreSQL :
- `get_or_create_user()` : Obtient ou crée un utilisateur
- `add_card_to_collection()` : Ajoute une carte à une collection
- `update_vaal_orbs()` : Met à jour les Vaal Orbs
- `update_updated_at_column()` : Trigger pour mettre à jour `updated_at`

### 3. `setup_collections_rls.sql`
Configure Row Level Security (RLS) :
- Lecture publique pour toutes les tables
- Écriture réservée au service role

### 4. `create_performance_views.sql`
Crée les vues matérialisées pour les performances :
- `user_collection_summary` : Résumé des collections
- `recent_boosters_summary` : Derniers 100 boosters ouverts

## Migration des Données

Pour migrer les données JSON existantes vers Supabase :

```bash
# Installer les dépendances si nécessaire
npm install tsx @supabase/supabase-js dotenv

# Exécuter le script de migration
npx tsx tools/migrate-json-to-db.ts
```

Le script migre automatiquement :
- `uniques.json` → `unique_cards`
- `userCollection.json` → `users` + `user_collections`
- `userCards.json` → `user_boosters` + `booster_cards`

## Configuration EventSub

Pour configurer EventSub Twitch avec le webhook Supabase :

```bash
npx tsx tools/setup-eventsub-webhook.ts
```

Assurez-vous d'avoir configuré :
- `TWITCH_CLIENT_ID`
- `TWITCH_USER_TOKEN`
- `TWITCH_CHANNEL_ID`
- `SUPABASE_URL`
- `TWITCH_WEBHOOK_SECRET` (optionnel mais recommandé)

## Edge Functions

Les Edge Functions suivantes ont été créées :

1. **`twitch-eventsub`** : Reçoit les webhooks EventSub Twitch
2. **`handle-reward`** : Traite les récompenses Channel Points et crée les boosters

Pour déployer les Edge Functions :

```bash
# Via Supabase CLI (recommandé)
supabase functions deploy twitch-eventsub
supabase functions deploy handle-reward

# Ou via le dashboard Supabase
# Allez dans Edge Functions > Deploy
```

## Variables d'Environnement Requises

### Supabase Edge Functions
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TWITCH_REWARD_VAAL_ID` (ID de la récompense Vaal Orbs)
- `TWITCH_CHANNEL_NAME`
- `TWITCH_WEBHOOK_SECRET` (pour vérification signature)
- `BOT_WEBHOOK_URL` (optionnel, URL du bot Railway pour envoyer messages)

### Bot Railway
- `TWITCH_BOT_USERNAME`
- `TWITCH_BOT_OAUTH_TOKEN`
- `TWITCH_CHANNEL_NAME`
- `ENABLE_WEBHOOK` (optionnel)
- `WEBHOOK_PORT` (optionnel)

## Architecture

```
┌─────────────────────────────────────────┐
│         SUPABASE                        │
│  ┌───────────────────────────────────┐  │
│  │  Database (PostgreSQL)            │  │
│  │  - unique_cards                   │  │
│  │  - users                          │  │
│  │  - user_collections               │  │
│  │  - user_boosters                  │  │
│  │  - booster_cards                  │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │  Edge Functions                   │  │
│  │  - twitch-eventsub (webhook)      │  │
│  │  - handle-reward (traitement)     │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
              ▲
              │
    ┌─────────┴─────────┐
    │                   │
┌───▼────┐      ┌───────▼──────┐
│RAILWAY │      │ TWITCH API   │
│(Bot)   │      │ (EventSub)   │
└────────┘      └──────────────┘
```

## Prochaines Étapes

1. ✅ Migrations créées et appliquées
2. ✅ Edge Functions créées
3. ✅ Service Supabase créé
4. ✅ API adaptée
5. ⏳ Migrer les données JSON (exécuter `migrate-json-to-db.ts`)
6. ⏳ Déployer les Edge Functions
7. ⏳ Configurer EventSub webhook
8. ⏳ Déployer le bot Railway
9. ⏳ Tester l'ensemble du système
