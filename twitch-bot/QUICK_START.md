# Guide de Démarrage Rapide - Bot Twitch Local (Deno)

Ce guide vous explique comment lancer le bot Twitch en local pour tester avec Deno.

## 📋 Prérequis

1. **Deno** installé (version 1.30 ou supérieure)
   - Installation : https://deno.land/manual/getting_started/installation
2. **Token OAuth Twitch** pour le bot
3. **Nom d'utilisateur Twitch** du bot
4. **Nom de votre chaîne Twitch**

## 🚀 Démarrage Rapide

### 1. Vérifier Deno

```bash
deno --version
```

### 2. Configurer les variables d'environnement

Créez un fichier `.env` à la racine du dossier `twitch-bot` avec le contenu suivant :

```env
TWITCH_BOT_USERNAME=votre_bot_username
TWITCH_BOT_OAUTH_TOKEN=oauth:votre_token_oauth
TWITCH_CHANNEL_NAME=votre_chaine
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_KEY=votre_anon_key
PORT=3001
```

**Exemple :**
```env
TWITCH_BOT_USERNAME=MonBotTwitch
TWITCH_BOT_OAUTH_TOKEN=oauth:abcdefghijklmnopqrstuvwxyz123456
TWITCH_CHANNEL_NAME=MaChaine
SUPABASE_URL=https://abcdefghijklmnop.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
PORT=3001
```

**Note :** Le webhook est automatiquement activé pour recevoir les messages de `handle-reward`. Le port par défaut est `3001` en local.

### 3. Obtenir un Token OAuth Twitch

1. Allez sur https://twitchapps.com/tmi/
2. Cliquez sur "Connect with Twitch"
3. Autorisez l'application
4. Copiez le token généré (il commence par `oauth:`)
5. Collez-le dans votre fichier `.env`

### 4. Lancer le bot

```bash
deno run --allow-net --allow-env --allow-read main.ts
```

Ou avec la tâche définie :

```bash
deno task start
```

## ✅ Vérifier que ça fonctionne

Une fois lancé, vous devriez voir dans la console :

```
🤖 Twitch Bot Service starting...
   Channel: MaChaine
   Username: MonBotTwitch
✅ Supabase client initialized
📡 Webhook server listening on port 3001
   Endpoint: http://0.0.0.0:3001/webhook/message
   Health check: http://0.0.0.0:3001/health
✅ HTTP server ready - Railway can now perform health checks
🔌 Connecting to Twitch...
✅ Bot connected to Twitch chat: MaChaine
```

### Tester dans le chat Twitch

1. Allez sur votre chaîne Twitch
2. Tapez `!ping` dans le chat
3. Le bot devrait répondre `Pong!`

## 🔧 Options Avancées

### Tester le Webhook avec handle-reward

Le webhook est **automatiquement activé** pour recevoir les messages de `handle-reward`. Pour tester en local :

1. Le bot écoute automatiquement sur `http://localhost:3001/webhook/message`

2. Pour tester depuis Supabase Edge Functions, utilisez `ngrok` pour exposer le port :
   ```bash
   ngrok http 3001
   ```
   
3. Configurez `BOT_WEBHOOK_URL` dans Supabase Edge Functions avec l'URL ngrok :
   - Exemple : `https://abc123.ngrok.io/webhook/message`
   
4. Testez avec curl :
   ```bash
   curl -X POST http://localhost:3001/webhook/message \
     -H "Content-Type: application/json" \
     -d '{"message":"Test message","channel":"votre_chaine"}'
   ```
   Le bot devrait répondre dans le chat Twitch.

## 🐛 Dépannage

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
   - Nom exact de la chaîne (sans espaces)

### Erreur "Cannot find module" ou problèmes d'imports

Avec Deno, les modules sont téléchargés automatiquement. Si vous avez des problèmes :

1. Vérifiez que Deno est bien installé :
   ```bash
   deno --version
   ```

2. Vérifiez votre connexion internet (Deno télécharge les modules depuis les URLs)

3. Essayez de nettoyer le cache Deno :
   ```bash
   deno cache --reload main.ts
   ```

### Le bot se déconnecte souvent

- Vérifiez votre connexion internet
- Vérifiez que le token OAuth n'est pas expiré
- Le bot se reconnectera automatiquement en cas de déconnexion

## 📝 Commandes Disponibles

Le bot répond aux commandes suivantes :

- `!ping` → Répond `Pong!`
- `!collection [username]` → Affiche la collection d'un utilisateur (cartes, foils, Vaal Orbs)
  - Exemple : `!collection` (votre collection) ou `!collection MonAmi`
- `!stats [username]` → Affiche les statistiques complètes (cartes, boosters ouverts, Vaal Orbs)
  - Exemple : `!stats` (vos stats) ou `!stats MonAmi`
- `!vaal [username]` → Affiche le nombre de Vaal Orbs
  - Exemple : `!vaal` (vos Vaal Orbs) ou `!vaal MonAmi`

**Note :** Les commandes `!collection`, `!stats` et `!vaal` nécessitent les variables d'environnement Supabase pour fonctionner.

## 🛑 Arrêter le bot

Appuyez sur `Ctrl+C` dans le terminal pour arrêter le bot proprement.

## 📚 Documentation Complète

Pour plus de détails sur le déploiement sur Railway, consultez [DEPLOYMENT_RAILWAY.md](./DEPLOYMENT_RAILWAY.md)
