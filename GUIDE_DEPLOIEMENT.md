# Guide Complet de Déploiement - Architecture Supabase + Railway

Ce guide explique comment déployer l'ensemble de l'architecture migrée vers Supabase.

## ✅ État Actuel

### Déjà Fait
- ✅ Migrations Supabase appliquées (tables, fonctions, RLS)
- ✅ Edge Functions déployées (`twitch-eventsub`, `handle-reward`)
- ✅ Données migrées (505 cartes, 3 utilisateurs, collections, boosters)
- ✅ Service Supabase créé dans Nuxt
- ✅ API adaptée pour utiliser Supabase directement

### À Faire
- ⏳ Configurer EventSub Twitch
- ⏳ Déployer le bot Railway
- ⏳ Configurer les variables d'environnement

## 🎯 Architecture Finale

```
┌─────────────────────────────────────────┐
│         SUPABASE                        │
│  ┌───────────────────────────────────┐  │
│  │  Database (PostgreSQL)            │  │
│  │  ✅ Tables créées                  │  │
│  │  ✅ Données migrées                │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │  Edge Functions                    │  │
│  │  ✅ twitch-eventsub (déployée)    │  │
│  │  ✅ handle-reward (déployée)      │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
              ▲                    ▲
              │                    │
    ┌─────────┴─────────┐  ┌──────┴──────┐
    │                   │  │             │
┌───▼────┐      ┌───────▼──▼──┐  ┌───────▼──────┐
│RAILWAY │      │ TWITCH API   │  │   NUXT APP   │
│(Bot)   │      │ (EventSub)   │  │  (Frontend)  │
└────────┘      └──────────────┘  └──────────────┘
```

## 📋 Checklist de Déploiement

### 1. Edge Functions Supabase ✅

**Status** : Déployées et actives

**URLs** :
- `twitch-eventsub` : `https://pkhwgiwafehlsgrnhxyv.supabase.co/functions/v1/twitch-eventsub`
- `handle-reward` : `https://pkhwgiwafehlsgrnhxyv.supabase.co/functions/v1/handle-reward`

**Variables d'environnement à configurer dans Supabase** :
1. Allez dans Supabase Dashboard > Edge Functions > Settings
2. Ajoutez ces variables :

```
SUPABASE_URL=https://pkhwgiwafehlsgrnhxyv.supabase.co
SUPABASE_SERVICE_ROLE_KEY=votre_service_role_key
TWITCH_REWARD_VAAL_ID=id_de_votre_recompense_vaal
TWITCH_CHANNEL_NAME=nom_de_votre_chaine
TWITCH_WEBHOOK_SECRET=votre_secret_webhook (optionnel mais recommandé)
BOT_WEBHOOK_URL=https://votre-bot.railway.app/webhook/message (après déploiement Railway)
```

### 2. Configurer EventSub Twitch ⏳

**Méthode** : Utiliser le script de configuration

```bash
# Installer les dépendances si nécessaire
npm install tsx node-fetch dotenv

# Configurer les variables dans .env
TWITCH_CLIENT_ID=votre_client_id
TWITCH_USER_TOKEN=votre_user_token
TWITCH_CHANNEL_ID=votre_channel_id
SUPABASE_URL=https://pkhwgiwafehlsgrnhxyv.supabase.co
TWITCH_WEBHOOK_SECRET=votre_secret (optionnel)

# Exécuter le script
npx tsx tools/setup-eventsub-webhook.ts
```

**Méthode Manuelle** :

1. Allez sur https://dev.twitch.tv/console
2. Créez une subscription EventSub :
   - Type : `channel.channel_points_custom_reward_redemption.add`
   - Version : `1`
   - Condition : `broadcaster_user_id` = votre channel ID
   - Transport : `webhook`
   - Callback URL : `https://pkhwgiwafehlsgrnhxyv.supabase.co/functions/v1/twitch-eventsub`
   - Secret : votre secret webhook (optionnel)

### 3. Déployer le Bot Railway ⏳

**Guide détaillé** : Voir [`twitch-bot-minimal/DEPLOYMENT_RAILWAY.md`](./twitch-bot-minimal/DEPLOYMENT_RAILWAY.md)

**Résumé rapide** :

1. **Créer un compte Railway** :
   - https://railway.app
   - Connexion via GitHub

2. **Créer un nouveau projet** :
   - "New Project" > "Deploy from GitHub repo"
   - Sélectionner le repo et le dossier `twitch-bot-minimal`

3. **Configurer les variables** :
   ```
   TWITCH_BOT_USERNAME=votre_bot_username
   TWITCH_BOT_OAUTH_TOKEN=oauth:votre_token
   TWITCH_CHANNEL_NAME=votre_chaine
   ENABLE_WEBHOOK=true (si vous voulez recevoir messages des Edge Functions)
   WEBHOOK_PORT=3001
   ```

4. **Obtenir l'URL publique** :
   - Settings > Networking > Public Domain
   - Copier l'URL (ex: `https://twitch-bot-production.up.railway.app`)

5. **Configurer le webhook dans Supabase** :
   - Ajouter `BOT_WEBHOOK_URL=https://votre-bot.railway.app/webhook/message` dans les variables Edge Functions

### 4. Vérifier le Fonctionnement ✅

**Test EventSub** :
1. Rédémez une récompense Channel Points sur Twitch
2. Vérifiez les logs Supabase Edge Functions
3. Vérifiez que le booster est créé dans la base de données

**Test Bot** :
1. Vérifiez les logs Railway
2. Envoyez `!ping` dans le chat Twitch
3. Le bot devrait répondre `Pong!`

**Test Webhook** :
1. Les Edge Functions devraient envoyer des messages au bot
2. Vérifiez les logs Railway pour voir les messages reçus

## 🔧 Configuration des Variables d'Environnement

### Supabase Edge Functions

| Variable | Description | Où trouver |
|----------|-------------|------------|
| `SUPABASE_URL` | URL de votre projet | Dashboard Supabase > Settings > API |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key | Dashboard Supabase > Settings > API (⚠️ secret) |
| `TWITCH_REWARD_VAAL_ID` | ID de la récompense Vaal Orbs | Twitch Dashboard > Channel Points > Rewards |
| `TWITCH_CHANNEL_NAME` | Nom de votre chaîne | Votre nom Twitch |
| `TWITCH_WEBHOOK_SECRET` | Secret pour vérifier webhooks | Générer un secret aléatoire |
| `BOT_WEBHOOK_URL` | URL du webhook Railway | Après déploiement Railway |

### Railway Bot

| Variable | Description | Où trouver |
|----------|-------------|------------|
| `TWITCH_BOT_USERNAME` | Nom du bot | Nom d'utilisateur Twitch du bot |
| `TWITCH_BOT_OAUTH_TOKEN` | Token OAuth | https://twitchapps.com/tmi/ |
| `TWITCH_CHANNEL_NAME` | Nom de la chaîne | Votre nom Twitch |
| `ENABLE_WEBHOOK` | Activer webhook | `true` ou `false` |
| `WEBHOOK_PORT` | Port webhook | `3001` (défaut) |

## 🐛 Dépannage

### Edge Functions ne reçoivent pas les webhooks

1. Vérifiez que EventSub est bien configuré
2. Vérifiez l'URL du webhook dans EventSub
3. Vérifiez les logs Supabase Edge Functions
4. Vérifiez que le secret webhook correspond (si utilisé)

### Bot ne se connecte pas

1. Vérifiez le token OAuth (doit commencer par `oauth:`)
2. Vérifiez le nom d'utilisateur et la chaîne
3. Vérifiez les logs Railway

### Messages ne sont pas envoyés dans le chat

1. Vérifiez que `BOT_WEBHOOK_URL` est configuré dans Supabase
2. Vérifiez que `ENABLE_WEBHOOK=true` dans Railway
3. Vérifiez les logs Railway pour voir si les webhooks sont reçus

## 📚 Ressources

- [Documentation Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Documentation Railway](https://docs.railway.app)
- [Documentation Twitch EventSub](https://dev.twitch.tv/docs/eventsub)
- [Documentation TMI.js](https://github.com/tmijs/tmi.js)

## ✅ Prochaines Étapes

1. ⏳ Configurer EventSub Twitch
2. ⏳ Déployer le bot Railway
3. ⏳ Tester l'ensemble du système
4. ⏳ Monitorer les performances

Une fois tout configuré, votre architecture sera 100% opérationnelle sur Supabase + Railway ! 🎉
