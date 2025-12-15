# Twitch Bot Go - Migration depuis Node.js

Version Go du bot Twitch pour Railway. Cette version résout les problèmes de `SIGTERM` rencontrés avec Node.js.

## 🚀 Avantages de Go

- ✅ **Meilleure gestion des processus** : Railway gère très bien les services Go long-running
- ✅ **Performance** : Compilation native, démarrage rapide
- ✅ **Fiabilité** : Gestion native de la concurrence (goroutines)
- ✅ **Pas de problèmes SIGTERM** : Go gère mieux les signaux système
- ✅ **Ressources** : Consommation mémoire réduite

## 📋 Prérequis

- Go 1.21 ou supérieur
- Token OAuth Twitch
- Credentials Supabase

## 🔧 Installation Locale

```bash
cd twitch-bot-go
go mod download
```

## ⚙️ Configuration

Créez un fichier `.env` :

```env
TWITCH_BOT_USERNAME=votre_bot_username
TWITCH_BOT_OAUTH_TOKEN=oauth:votre_token
TWITCH_CHANNEL_NAME=votre_chaine
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_KEY=votre_anon_key
PORT=3001
```

## 🏃 Lancer le Bot

```bash
go run main.go
```

Ou compiler puis exécuter :

```bash
go build -o bot
./bot
```

## 🚂 Déploiement sur Railway

### 1. Créer un nouveau service Railway

1. Allez sur Railway Dashboard
2. Créez un nouveau service depuis GitHub
3. Sélectionnez le dossier `twitch-bot-go`

### 2. Configurer les variables d'environnement

Dans Railway Dashboard → Variables :

```
TWITCH_BOT_USERNAME=votre_bot_username
TWITCH_BOT_OAUTH_TOKEN=oauth:votre_token
TWITCH_CHANNEL_NAME=votre_chaine
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_KEY=votre_anon_key
```

### 3. Déployer

Railway détectera automatiquement Go et utilisera `railway.json` pour la configuration.

## ✅ Vérification

Une fois déployé, vérifiez les logs Railway. Vous devriez voir :

```
🤖 Twitch Bot Service starting...
   Channel: Les_Doseurs
   Username: LeCollecteurDeDose
✅ Supabase client initialized
📡 Webhook server listening on port 8080
   Endpoint: http://0.0.0.0:8080/webhook/message
   Health check: http://0.0.0.0:8080/health
🔌 Connecting to Twitch...
✅ Service ready and listening for requests
✅ Bot connected to Twitch chat: Les_Doseurs
```

Testez le health check :

```bash
curl https://votre-service.railway.app/health
```

## 🎯 Fonctionnalités

Identiques à la version Node.js :

- ✅ Connexion au chat Twitch
- ✅ Commandes chat : `!ping`, `!collection`, `!stats`, `!vaal`
- ✅ Webhook pour recevoir les messages des Edge Functions
- ✅ Health check pour Railway
- ✅ Intégration Supabase

## 📝 Migration depuis Node.js

### Variables d'environnement

Les mêmes variables sont utilisées, aucune modification nécessaire.

### Webhook Supabase

Mettez à jour `BOT_WEBHOOK_URL` dans Supabase Edge Function `handle-reward` :

```
BOT_WEBHOOK_URL=https://votre-nouveau-service-go.railway.app/webhook/message
```

### Tests

Testez toutes les commandes chat et les webhooks pour vérifier que tout fonctionne.

## 🔍 Dépannage

### Le bot ne démarre pas

Vérifiez les logs Railway pour les erreurs de connexion Twitch ou Supabase.

### Les commandes ne fonctionnent pas

Vérifiez que Supabase est correctement configuré et que les credentials sont valides.

### Health check ne répond pas

Vérifiez que le port est correctement exposé dans Railway (Settings → Networking).

## 📚 Documentation

- [Go Twitch IRC Library](https://github.com/gempir/go-twitch-irc)
- [Supabase Go Client](https://github.com/supabase-community/supabase-go)
- [Railway Go Deployment](https://docs.railway.com/guides/go)
