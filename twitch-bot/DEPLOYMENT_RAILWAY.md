# Guide de Déploiement du Bot Twitch sur Railway

Ce guide vous explique comment déployer le bot Twitch sur Railway ET le lancer en local pour tester.

> **💡 Pour le développement local uniquement**, consultez [QUICK_START.md](./QUICK_START.md) pour un guide rapide.

## 📋 Prérequis

### Pour Railway (Production)
1. Un compte GitHub (gratuit)
2. Un compte Railway (gratuit, connexion via GitHub)
3. Un token OAuth Twitch pour le bot (voir section "Obtenir le Token OAuth")
4. Un projet Supabase configuré avec les Edge Functions déployées

### Pour Local (Développement)
1. **Node.js** installé (version 18 ou supérieure)
2. **Token OAuth Twitch** pour le bot
3. **Nom d'utilisateur Twitch** du bot
4. **Nom de votre chaîne Twitch**
5. **Variables d'environnement Supabase** (optionnel pour tester les commandes chat)

## 🚀 Étape 1 : Obtenir le Token OAuth Twitch

Le bot a besoin d'un token OAuth pour se connecter à Twitch. Voici comment l'obtenir :

### Option A : Via Twitch Chat OAuth Password Generator

1. Allez sur https://twitchapps.com/tmi/
2. Cliquez sur "Connect with Twitch"
3. Autorisez l'application
4. Copiez le token généré (format: `oauth:xxxxx`)

### Option B : Via Twitch Developer Console

1. Allez sur https://dev.twitch.tv/console/apps
2. Créez une nouvelle application si nécessaire
3. Utilisez un générateur OAuth pour obtenir un token avec les scopes `chat:read` et `chat:edit`

## 🚂 Étape 2 : Créer le Projet sur Railway

### 2.1 Créer un compte Railway

1. Allez sur https://railway.app
2. Cliquez sur "Login" et connectez-vous avec GitHub
3. Acceptez les autorisations

### 2.2 Créer un nouveau projet

1. Dans le dashboard Railway, cliquez sur "New Project"
2. Sélectionnez "Deploy from GitHub repo"
3. Si c'est la première fois :
   - Autorisez Railway à accéder à vos repos GitHub
   - Sélectionnez le repo `LeCollecteurDeDose`
4. Railway détectera automatiquement le dossier `twitch-bot`

### 2.3 Configurer le déploiement

1. Railway devrait détecter automatiquement que c'est un projet Node.js
2. Si ce n'est pas le cas :
   - Root Directory : `twitch-bot`
   - Build Command : `npm install`
   - **Start Command** : `node index.js` (⚠️ **Important** : Utilisez `node index.js` directement, pas `npm start`)
3. **Important** : Le bot expose un endpoint `/health` pour que Railway détecte qu'il est actif
   - Railway vérifiera automatiquement `https://votre-service.railway.app/health`
   - Le fichier `railway.json` configure automatiquement le health check

## 🔧 Étape 3 : Configurer les Variables d'Environnement

Dans le dashboard Railway, allez dans votre service et cliquez sur "Variables" :

### Variables Requises

| Variable | Description | Exemple |
|----------|-------------|---------|
| `TWITCH_BOT_USERNAME` | Nom d'utilisateur du bot Twitch | `MonBotTwitch` |
| `TWITCH_BOT_OAUTH_TOKEN` | Token OAuth (avec préfixe `oauth:`) | `oauth:xxxxxxxxxxxxx` |
| `TWITCH_CHANNEL_NAME` | Nom de la chaîne (sans #) | `MaChaine` |

### Variables Optionnelles

| Variable | Description | Défaut |
|----------|-------------|--------|
| `SUPABASE_URL` | URL de votre projet Supabase | Requis pour commandes chat |
| `SUPABASE_KEY` ou `SUPABASE_ANON_KEY` | Clé anonyme Supabase | Requis pour commandes chat |
| `PORT` | Port pour le serveur webhook (Railway définit automatiquement) | Auto |
| `WEBHOOK_PORT` | Port alternatif si `PORT` n'est pas défini | `3001` |

### Comment ajouter les variables :

1. Dans Railway, cliquez sur votre service
2. Allez dans l'onglet "Variables"
3. Cliquez sur "New Variable"
4. Ajoutez chaque variable une par une

## 📡 Étape 4 : Configurer le Webhook pour handle-reward (Requis)

**Le webhook est automatiquement activé** pour recevoir les messages de `handle-reward`. Vous devez configurer l'URL dans Supabase :

### 1. Obtenir l'URL publique Railway :

1. Dans Railway, allez dans votre service
2. Allez dans l'onglet "Settings" > "Networking"
3. Créez un "Public Domain" si ce n'est pas déjà fait
4. Copiez l'URL générée (ex: `https://twitch-bot-production.up.railway.app`)

### 2. Configurer BOT_WEBHOOK_URL dans Supabase :

1. Allez dans votre projet Supabase Dashboard
   - URL : https://supabase.com/dashboard/project/pkhwgiwafehlsgrnhxyv
2. Allez dans **Project Settings** > **Edge Functions** > **Secrets**
   - Ou directement : https://supabase.com/dashboard/project/pkhwgiwafehlsgrnhxyv/settings/functions
3. Cliquez sur **"Add a new secret"** ou **"New Secret"**
4. Ajoutez la variable d'environnement suivante :
   - **Nom** : `BOT_WEBHOOK_URL`
   - **Valeur** : `https://lecollecteurdedose-production.up.railway.app/webhook/message`
   - ⚠️ **Important** : Remplacez par votre URL Railway réelle si différente
5. Cliquez sur **"Save"** ou **"Add"**

> **💡 Note** : Cette variable est utilisée par l'Edge Function `handle-reward` pour envoyer des messages au bot Railway.

### 3. Vérifier la configuration :

Dans les logs Railway, vous devriez voir :
```
📡 Webhook server listening on port XXXX
   Endpoint: http://0.0.0.0:XXXX/webhook/message
```

**Important** : Cette configuration est **requise** pour que `handle-reward` puisse envoyer des messages dans le chat Twitch après avoir traité les récompenses.

## 🚀 Étape 5 : Déployer

1. Railway déploiera automatiquement à chaque push sur GitHub
2. Pour un déploiement manuel :
   - Cliquez sur "Deploy" dans le dashboard
   - Ou faites un commit/push sur GitHub

3. Vérifiez les logs :
   - Dans Railway, cliquez sur votre service
   - Allez dans l'onglet "Deployments"
   - Cliquez sur le dernier déploiement pour voir les logs

## 🏠 Développement Local (Alternative à Railway)

Si vous voulez tester le bot en local avant de déployer sur Railway :

### 1. Installer les dépendances

```bash
cd twitch-bot
npm install
```

### 2. Créer le fichier `.env`

Créez un fichier `.env` à la racine du dossier `twitch-bot` :

```env
TWITCH_BOT_USERNAME=votre_bot_username
TWITCH_BOT_OAUTH_TOKEN=oauth:votre_token_oauth
TWITCH_CHANNEL_NAME=votre_chaine
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_KEY=votre_anon_key
PORT=3001
```

### 3. Lancer le bot

```bash
npm start
```

### 4. Tester le webhook localement

Pour tester avec les Edge Functions Supabase en local, utilisez `ngrok` :

```bash
ngrok http 3001
```

Puis configurez `BOT_WEBHOOK_URL` dans Supabase avec l'URL ngrok (temporairement) :
- Exemple : `https://abc123.ngrok.io/webhook/message`

> **📚 Pour plus de détails sur le développement local**, consultez [QUICK_START.md](./QUICK_START.md)

## ✅ Étape 6 : Vérifier que le Bot Fonctionne

### Checklist de Vérification

#### ✅ Railway
- [ ] Bot déployé et actif sur Railway
- [ ] Variables d'environnement configurées (TWITCH_BOT_USERNAME, TWITCH_BOT_OAUTH_TOKEN, TWITCH_CHANNEL_NAME, SUPABASE_URL, SUPABASE_KEY)
- [ ] Public Domain créé (ex: `lecollecteurdedose-production.up.railway.app`)
- [ ] Logs Railway montrent la connexion réussie

#### ✅ Supabase
- [ ] Edge Functions déployées (`twitch-eventsub`, `handle-reward`)
- [ ] Variable `BOT_WEBHOOK_URL` configurée dans Supabase Edge Functions Secrets
- [ ] URL complète : `https://lecollecteurdedose-production.up.railway.app/webhook/message`

#### ✅ Tests
- [ ] Bot répond à `!ping` dans le chat Twitch
- [ ] Commandes chat fonctionnent (`!collection`, `!stats`, `!vaal`)
- [ ] Webhook reçoit les messages de `handle-reward` (testez une récompense Twitch)

### Logs Attendus

Dans les logs Railway, vous devriez voir :

```
🤖 Twitch Bot Service starting...
   Channel: MaChaine
   Username: MonBotTwitch
✅ Supabase client initialized
📡 Webhook server listening on port XXXX
   Endpoint: http://0.0.0.0:XXXX/webhook/message
✅ Bot connected to Twitch chat: MaChaine
```

Si vous voyez `📨 Received webhook message: ...` dans les logs Railway, le webhook fonctionne correctement !

## 🔍 Dépannage

### Le bot ne se connecte pas

1. **Vérifiez le token OAuth** :
   - Le token doit commencer par `oauth:`
   - Le token doit être valide (pas expiré)
   - Le token doit avoir les scopes `chat:read` et `chat:edit`

2. **Vérifiez le nom d'utilisateur** :
   - Le nom doit être exact (sensible à la casse)
   - Pas d'espaces ou caractères spéciaux

3. **Vérifiez le nom de la chaîne** :
   - Pas de `#` au début
   - Nom exact de la chaîne

### Le bot se déconnecte souvent ou Railway arrête le conteneur

**Problème** : Railway arrête le conteneur avec `SIGTERM` même si le bot fonctionne.

**Solutions** :
1. **Vérifiez le Start Command** :
   - Doit être `node index.js` (pas `npm start`)
   - `npm start` fait que npm devient le processus principal et ne gère pas correctement les signaux
   
2. **Vérifiez le Health Check** :
   - Le endpoint `/health` doit répondre rapidement
   - Testez : `curl https://votre-service.railway.app/health`
   - Doit retourner `{"status":"ok","bot":"connected",...}`
   
3. **Vérifiez les logs** :
   - Le serveur HTTP doit démarrer AVANT la connexion Twitch
   - Vous devriez voir : `📡 Webhook server listening on port XXXX` avant `✅ Bot connected`
   
4. **Configuration Railway** :
   - Settings → Health Check → Path : `/health`
   - Settings → Health Check → Timeout : 300 secondes
   - Settings → Deploy → Restart Policy : `ON_FAILURE`

### Les messages de handle-reward ne s'affichent pas dans le chat

1. **Vérifiez que le webhook est actif** :
   - Les logs Railway doivent afficher `📡 Webhook server listening on port XXXX`
   
2. **Vérifiez BOT_WEBHOOK_URL dans Supabase** :
   - Allez dans Supabase Dashboard > Edge Functions > Settings
   - Vérifiez que `BOT_WEBHOOK_URL` est défini avec l'URL complète : `https://votre-service.railway.app/webhook/message`
   - L'URL doit être accessible publiquement (pas localhost)
   
3. **Testez le webhook** :
   - Vous pouvez tester avec curl : `curl -X POST https://votre-service.railway.app/webhook/message -H "Content-Type: application/json" -d '{"message":"test","channel":"votre_chaine"}'`
   - Le bot devrait répondre dans le chat Twitch
   
4. **Vérifiez les logs Supabase** :
   - Dans Supabase Dashboard > Edge Functions > handle-reward > Logs
   - Vérifiez s'il y a des erreurs lors de l'envoi du webhook

## 📝 Structure du Projet

```
twitch-bot/
├── index.js              # Code principal du bot
├── package.json          # Dépendances Node.js
├── package-lock.json     # Lock file des dépendances (généré par npm)
├── railway.json          # Configuration Railway (optionnel)
├── README.md             # Documentation principale
├── DEPLOYMENT_RAILWAY.md # Ce guide (Railway + Local)
├── QUICK_START.md        # Guide rapide pour le développement local
└── ARCHITECTURE_COMPLETE.md # Architecture complète Bot + Supabase
```

## 🔗 Liens Rapides

- **Supabase Dashboard** : https://supabase.com/dashboard/project/pkhwgiwafehlsgrnhxyv
- **Railway Dashboard** : https://railway.app
- **Guide Local** : [QUICK_START.md](./QUICK_START.md)
- **Architecture** : [ARCHITECTURE_COMPLETE.md](./ARCHITECTURE_COMPLETE.md)

## 🔄 Mises à Jour

Pour mettre à jour le bot :

1. Modifiez le code localement
2. Commitez et poussez sur GitHub
3. Railway déploiera automatiquement la nouvelle version

## 💡 Astuces

- **Logs en temps réel** : Railway affiche les logs en temps réel dans le dashboard
- **Redémarrage manuel** : Vous pouvez redémarrer le service depuis Railway
- **Variables sensibles** : Ne commitez jamais les tokens dans le code, utilisez toujours les variables d'environnement Railway
- **Monitoring** : Railway fournit des métriques de base (CPU, RAM, réseau)

## 🆘 Support

Si vous rencontrez des problèmes :

1. **Vérifiez les logs Railway** :
   - Dashboard Railway > Votre service > Deployments > Logs
   
2. **Vérifiez les logs Supabase** :
   - Dashboard Supabase > Edge Functions > handle-reward > Logs
   - Cherchez les erreurs liées à `BOT_WEBHOOK_URL` ou `Failed to send message to bot`
   
3. **Vérifiez les variables d'environnement** :
   - Railway : Toutes les variables requises sont définies
   - Supabase : `BOT_WEBHOOK_URL` est configuré avec l'URL complète
   
4. **Testez le webhook manuellement** :
   ```bash
   curl -X POST https://lecollecteurdedose-production.up.railway.app/webhook/message \
     -H "Content-Type: application/json" \
     -d '{"message":"Test","channel":"votre_chaine"}'
   ```
   
5. **Consultez la documentation** :
   - Railway : https://docs.railway.app
   - Supabase Edge Functions : https://supabase.com/docs/guides/functions
   - [ARCHITECTURE_COMPLETE.md](./ARCHITECTURE_COMPLETE.md) pour le dépannage détaillé
