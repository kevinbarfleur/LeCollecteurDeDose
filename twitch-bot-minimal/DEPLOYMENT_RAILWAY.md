# Guide de Déploiement du Bot Twitch sur Railway

Ce guide vous explique comment déployer le bot Twitch minimal sur Railway.

## 📋 Prérequis

1. Un compte GitHub (gratuit)
2. Un compte Railway (gratuit, connexion via GitHub)
3. Un token OAuth Twitch pour le bot (voir section "Obtenir le Token OAuth")

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
4. Railway détectera automatiquement le dossier `twitch-bot-minimal`

### 2.3 Configurer le déploiement

1. Railway devrait détecter automatiquement que c'est un projet Node.js
2. Si ce n'est pas le cas :
   - Root Directory : `twitch-bot-minimal`
   - Build Command : `npm install`
   - Start Command : `npm start`

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
| `ENABLE_WEBHOOK` | Activer le serveur webhook pour recevoir messages | `false` |
| `WEBHOOK_PORT` | Port pour le webhook | `3001` |

### Comment ajouter les variables :

1. Dans Railway, cliquez sur votre service
2. Allez dans l'onglet "Variables"
3. Cliquez sur "New Variable"
4. Ajoutez chaque variable une par une

## 📡 Étape 4 : Configurer le Webhook (Optionnel)

Si vous voulez que les Edge Functions Supabase envoient des messages au bot :

1. Activez `ENABLE_WEBHOOK=true` dans Railway
2. Notez l'URL publique de votre service Railway (visible dans l'onglet "Settings" > "Networking")
3. Ajoutez la variable `BOT_WEBHOOK_URL` dans Supabase Edge Functions :
   - URL format : `https://votre-service.railway.app/webhook/message`

### Obtenir l'URL publique Railway :

1. Dans Railway, allez dans "Settings" > "Networking"
2. Créez un "Public Domain" si ce n'est pas déjà fait
3. Copiez l'URL générée (ex: `https://twitch-bot-production.up.railway.app`)

## 🚀 Étape 5 : Déployer

1. Railway déploiera automatiquement à chaque push sur GitHub
2. Pour un déploiement manuel :
   - Cliquez sur "Deploy" dans le dashboard
   - Ou faites un commit/push sur GitHub

3. Vérifiez les logs :
   - Dans Railway, cliquez sur votre service
   - Allez dans l'onglet "Deployments"
   - Cliquez sur le dernier déploiement pour voir les logs

## ✅ Étape 6 : Vérifier que le Bot Fonctionne

Dans les logs Railway, vous devriez voir :

```
🤖 Twitch Bot Service starting...
   Channel: MaChaine
   Username: MonBotTwitch
✅ Bot connected to Twitch chat: MaChaine
```

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

### Le bot se déconnecte souvent

- Railway peut mettre le service en veille après inactivité
- Le bot se reconnectera automatiquement
- Pour éviter cela, utilisez le plan payant ou configurez un keep-alive

### Les messages ne s'affichent pas

- Vérifiez que le bot est bien connecté (logs Railway)
- Vérifiez que le bot a les permissions dans votre chat Twitch
- Vérifiez que le webhook est bien configuré si vous utilisez cette fonctionnalité

## 📝 Structure du Projet

```
twitch-bot-minimal/
├── index.js              # Code principal du bot
├── package.json          # Dépendances Node.js
├── railway.json          # Configuration Railway (optionnel)
├── README.md             # Documentation
└── DEPLOYMENT_RAILWAY.md # Ce guide
```

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

1. Vérifiez les logs Railway
2. Vérifiez que toutes les variables d'environnement sont définies
3. Vérifiez que le token OAuth est valide
4. Consultez la documentation Railway : https://docs.railway.app
