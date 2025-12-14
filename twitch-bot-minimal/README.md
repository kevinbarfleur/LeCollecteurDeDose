# Twitch Bot Minimal - Railway Deployment

Service minimal pour gérer le chat Twitch. Les récompenses Channel Points sont gérées par les Edge Functions Supabase.

## 🚀 Déploiement Rapide sur Railway

### 1. Prérequis
- Compte GitHub
- Compte Railway (gratuit)
- Token OAuth Twitch (voir [DEPLOYMENT_RAILWAY.md](./DEPLOYMENT_RAILWAY.md))

### 2. Déploiement

1. **Créer un projet Railway** :
   - Allez sur https://railway.app
   - Créez un nouveau projet depuis GitHub
   - Sélectionnez ce repo et le dossier `twitch-bot-minimal`

2. **Configurer les variables d'environnement** :
   ```
   TWITCH_BOT_USERNAME=votre_bot_username
   TWITCH_BOT_OAUTH_TOKEN=oauth:votre_token
   TWITCH_CHANNEL_NAME=votre_chaine
   ```

3. **Déployer** :
   - Railway déploiera automatiquement
   - Vérifiez les logs pour confirmer la connexion

## 📖 Documentation Complète

Pour un guide détaillé, consultez [DEPLOYMENT_RAILWAY.md](./DEPLOYMENT_RAILWAY.md)

## 🔧 Variables d'Environnement

### Requises
- `TWITCH_BOT_USERNAME` : Nom d'utilisateur du bot
- `TWITCH_BOT_OAUTH_TOKEN` : Token OAuth (format: `oauth:xxxxx`)
- `TWITCH_CHANNEL_NAME` : Nom de la chaîne (sans #)

### Optionnelles
- `ENABLE_WEBHOOK` : Activer webhook pour messages Edge Functions (`true`/`false`)
- `WEBHOOK_PORT` : Port du webhook (défaut: `3001`)

## 🎯 Fonctionnalités

- ✅ Connexion au chat Twitch via TMI.js
- ✅ Commandes chat de base (!ping, etc.)
- ✅ Webhook optionnel pour recevoir messages des Edge Functions Supabase
- ✅ Reconnexion automatique en cas de déconnexion

## 📝 Notes

- Ce service ne gère QUE le chat Twitch
- Les récompenses Channel Points sont gérées par `supabase/functions/handle-reward`
- Les données sont stockées dans Supabase Database

## 🔗 Liens Utiles

- [Railway Documentation](https://docs.railway.app)
- [TMI.js Documentation](https://github.com/tmijs/tmi.js)
- [Twitch OAuth Token Generator](https://twitchapps.com/tmi/)
