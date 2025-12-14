# Twitch Bot - Railway Deployment

Service pour gérer le chat Twitch et interagir avec Supabase. Les récompenses Channel Points sont gérées par les Edge Functions Supabase.

## 🚀 Démarrage Local

Pour tester le bot en local, consultez [QUICK_START.md](./QUICK_START.md)

## 🚀 Déploiement Rapide sur Railway

### 1. Prérequis
- Compte GitHub
- Compte Railway (gratuit)
- Token OAuth Twitch (voir [DEPLOYMENT_RAILWAY.md](./DEPLOYMENT_RAILWAY.md))

### 2. Déploiement

1. **Créer un projet Railway** :
   - Allez sur https://railway.app
   - Créez un nouveau projet depuis GitHub
   - Sélectionnez ce repo et le dossier `twitch-bot`

2. **Configurer les variables d'environnement** :
   ```
   TWITCH_BOT_USERNAME=votre_bot_username
   TWITCH_BOT_OAUTH_TOKEN=oauth:votre_token
   TWITCH_CHANNEL_NAME=votre_chaine
   SUPABASE_URL=https://votre-projet.supabase.co
   SUPABASE_KEY=votre_anon_key
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
- `SUPABASE_URL` : URL de votre projet Supabase
- `SUPABASE_KEY` ou `SUPABASE_ANON_KEY` : Clé anonyme Supabase (pour les lectures)

### Optionnelles
- `PORT` : Port pour le serveur webhook (Railway définit automatiquement cette variable)
- `WEBHOOK_PORT` : Port alternatif si `PORT` n'est pas défini (défaut: `3001`)

## 🎯 Fonctionnalités

- ✅ Connexion au chat Twitch via TMI.js
- ✅ Commandes chat interactives avec Supabase :
  - `!ping` → Répond `Pong!`
  - `!collection [username]` → Affiche la collection d'un utilisateur (cartes, foils, Vaal Orbs)
  - `!stats [username]` → Affiche les statistiques complètes d'un utilisateur
  - `!vaal [username]` → Affiche le nombre de Vaal Orbs d'un utilisateur
- ✅ Webhook automatique pour recevoir messages des Edge Functions Supabase (handle-reward)
- ✅ Reconnexion automatique en cas de déconnexion
- ✅ Interaction directe avec Supabase Database

## 📝 Notes

- Les récompenses Channel Points sont gérées par `supabase/functions/handle-reward`
- Les données sont stockées dans Supabase Database
- Les commandes chat nécessitent les variables d'environnement Supabase pour fonctionner
- Le webhook est **toujours activé** pour recevoir les messages de `handle-reward`
- **Important** : Configurez `BOT_WEBHOOK_URL` dans Supabase Edge Functions avec l'URL publique de votre bot Railway
  - Format : `https://votre-service.railway.app/webhook/message`

## 🔗 Liens Utiles

- [Railway Documentation](https://docs.railway.app)
- [TMI.js Documentation](https://github.com/tmijs/tmi.js)
- [Twitch OAuth Token Generator](https://twitchapps.com/tmi/)
