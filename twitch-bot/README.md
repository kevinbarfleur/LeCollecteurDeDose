# Twitch Bot - Version Deno

Version Deno du bot Twitch pour Railway. Cette version utilise Deno au lieu de Node.js pour une meilleure gestion des processus et des signaux.

## 🚀 Avantages de Deno

- ✅ **Meilleure gestion des signaux** : SIGTERM géré nativement
- ✅ **Pas de npm** : Évite les problèmes de wrapper npm
- ✅ **TypeScript natif** : Pas besoin de compilation
- ✅ **Railway support** : Railway gère mieux Deno pour les services long-running

## 📋 Prérequis

- Deno installé (pour développement local)
- Compte Railway
- Token OAuth Twitch

## 🚀 Démarrage Local

Pour tester le bot en local, consultez [QUICK_START.md](./QUICK_START.md)

## 🚀 Déploiement sur Railway

### 1. Prérequis
- Compte GitHub
- Compte Railway (gratuit)
- Token OAuth Twitch (voir ci-dessous)

### 2. Obtenir le Token OAuth Twitch

1. Allez sur https://twitchapps.com/tmi/
2. Cliquez sur "Connect with Twitch"
3. Autorisez l'application
4. Copiez le token généré (format: `oauth:xxxxx`)

### 3. Déploiement

1. **Créer un projet Railway** :
   - Allez sur https://railway.app
   - Créez un nouveau projet depuis GitHub
   - Sélectionnez ce repo et le dossier `twitch-bot`

2. **Configurer les variables d'environnement** dans Railway Dashboard :
   ```
   TWITCH_BOT_USERNAME=votre_bot_username
   TWITCH_BOT_OAUTH_TOKEN=oauth:votre_token
   TWITCH_CHANNEL_NAME=votre_chaine
   SUPABASE_URL=https://votre-projet.supabase.co
   SUPABASE_KEY=votre_anon_key
   ```

3. **Configurer Railway Dashboard** :
   - **Settings** → **Deploy** → **Custom Start Command** : `deno run --allow-net --allow-env --allow-read main.ts`
   - **Serverless** : Désactivé
   - **Restart Policy** : `ALWAYS`
   - **Health Check** : Path `/health`, Timeout `300s`

4. **Créer un Public Domain** :
   - **Settings** → **Networking** → Créer un domaine public
   - Notez l'URL (ex: `https://votre-service.railway.app`)

5. **Configurer Supabase Edge Function** :
   - Dans `handle-reward`, configurez `BOT_WEBHOOK_URL` avec votre URL Railway
   - Format : `https://votre-service.railway.app/webhook/message`

6. **Vérifier le déploiement** :
   - Testez le health check : `curl https://votre-service.railway.app/health`
   - Vérifiez les logs Railway pour voir `✅ Bot connected to Twitch chat`

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

### Commandes Chat Disponibles

- **`!ping`** → Répond `Pong!` (test de connexion)
- **`!collection [username]`** → Affiche la collection d'un utilisateur
  - Affiche : nombre total de cartes, nombre de foils ✨, et Vaal Orbs
  - Exemple : `!collection` ou `!collection MonAmi`
- **`!stats [username]`** → Affiche les statistiques complètes
  - Affiche : cartes totales, boosters ouverts, Vaal Orbs
  - Exemple : `!stats` ou `!stats MonAmi`
- **`!vaal [username]`** → Affiche le nombre de Vaal Orbs
  - Exemple : `!vaal` ou `!vaal MonAmi`
- **`!vaalorb`** → Utilise un Vaal Orb sur une carte aléatoire (inspiré de Path of Exile)
  - Consomme 1 Vaal Orb
  - Effets possibles :
    - ✨ **50% chance** : Transforme la carte en foil (réussite)
    - 💫 **25% chance** : Rien ne se passe (échec mineur)
    - 💥 **15% chance** : Détruit la carte (échec majeur)
    - 🌟 **10% chance** : Duplique la carte (succès rare)
  - Nécessite au moins 1 Vaal Orb et une carte normale dans la collection

### Autres Fonctionnalités

- ✅ Connexion au chat Twitch via `tmi.js` (via npm)
- ✅ Webhook automatique pour recevoir messages des Edge Functions Supabase (handle-reward)
- ✅ Reconnexion automatique en cas de déconnexion
- ✅ Interaction directe avec Supabase Database
- ✅ TypeScript natif avec Deno

## 📝 Notes

- Les récompenses Channel Points sont gérées par `supabase/functions/handle-reward`
- Les données sont stockées dans Supabase Database
- Les commandes chat nécessitent les variables d'environnement Supabase pour fonctionner
- Le webhook est **toujours activé** pour recevoir les messages de `handle-reward`
- **Important** : Configurez `BOT_WEBHOOK_URL` dans Supabase Edge Functions avec l'URL publique de votre bot Railway
  - Format : `https://votre-service.railway.app/webhook/message`

## 📚 Bibliothèques Utilisées

- **tmi.js** : Client Twitch IRC (via npm, support natif Deno)
  - Documentation : https://github.com/tmijs/tmi.js
- **@supabase/supabase-js** : Client Supabase (via npm)
- **Deno.serve** : Serveur HTTP natif Deno

## 🔄 Différences avec Node.js

- Utilise `npm:tmi.js` (support natif npm de Deno)
- `http.createServer` → `Deno.serve()`
- `process.on('SIGTERM')` → `Deno.addSignalListener('SIGTERM')`
- Pas de `package.json` ou `npm install` nécessaire (Deno gère npm automatiquement)

## 🐛 Dépannage

### Le bot s'arrête avec SIGTERM

1. **Vérifiez Railway Dashboard** :
   - **Settings** → **Deploy** → **Custom Start Command** = `deno run --allow-net --allow-env --allow-read main.ts`
   - **Serverless** : Désactivé
   - **Restart Policy** : `ALWAYS`
   - **Health Check** : Path `/health`, Timeout `300s`

2. **Vérifiez les logs** Railway pour voir les erreurs

3. **Testez le health check** :
   ```bash
   curl https://votre-service.railway.app/health
   ```

### Le bot ne se connecte pas à Twitch

1. Vérifiez le token OAuth (doit commencer par `oauth:`)
2. Vérifiez que le nom d'utilisateur et la chaîne sont corrects
3. Vérifiez les logs Railway pour les erreurs de connexion

## 🔗 Liens Utiles

- [Deno Documentation](https://deno.land/manual)
- [Railway Deno Guide](https://docs.railway.com/guides/deno)
- [twitch_irc Documentation](https://deno.land/x/twitch_irc)
- [Twitch OAuth Token Generator](https://twitchapps.com/tmi/)
