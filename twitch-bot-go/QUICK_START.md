# Guide de Démarrage Rapide - Bot Twitch Go

Ce guide vous explique comment lancer le bot Twitch Go en local pour tester.

## 📋 Prérequis

1. **Go** installé (version 1.21 ou supérieure)
   - Vérifiez avec : `go version`
2. **Token OAuth Twitch** pour le bot
3. **Nom d'utilisateur Twitch** du bot
4. **Nom de votre chaîne Twitch**
5. **Credentials Supabase** (URL et clé)

## 🚀 Démarrage Rapide

### 1. Installer les dépendances

```bash
cd twitch-bot-go
go mod download
```

### 2. Créer le fichier `.env`

Créez un fichier `.env` à la racine du dossier `twitch-bot-go` avec le contenu suivant :

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

**Option 1 : Exécution directe**
```bash
go run main.go
```

**Option 2 : Compiler puis exécuter**
```bash
go build -o bot
./bot
```

Sur Windows :
```bash
go build -o bot.exe
.\bot.exe
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
🔌 Connecting to Twitch...
✅ Service ready and listening for requests
✅ Bot connected to Twitch chat: MaChaine
```

### Tester dans le chat Twitch

1. Allez sur votre chaîne Twitch
2. Tapez `!ping` dans le chat
3. Le bot devrait répondre `Pong!`

### Tester les commandes Supabase

- `!collection` - Affiche votre collection
- `!collection @username` - Affiche la collection d'un autre utilisateur
- `!stats` - Affiche vos statistiques
- `!vaal` - Affiche vos Vaal Orbs

### Tester le Health Check

Dans un autre terminal :
```bash
curl http://localhost:3001/health
```

Vous devriez voir :
```json
{
  "status": "ok",
  "bot": "connected",
  "channel": "MaChaine",
  "timestamp": "2024-12-14T..."
}
```

### Tester le Webhook

Pour tester que le webhook fonctionne (simule un appel depuis Supabase Edge Function) :

```bash
curl -X POST http://localhost:3001/webhook/message \
  -H "Content-Type: application/json" \
  -d '{"message": "Test message", "channel": "#MaChaine"}'
```

Le message devrait apparaître dans le chat Twitch.

## 🔧 Options Avancées

### Compiler pour différentes plateformes

**Linux :**
```bash
GOOS=linux GOARCH=amd64 go build -o bot-linux
```

**Windows :**
```bash
GOOS=windows GOARCH=amd64 go build -o bot.exe
```

**macOS :**
```bash
GOOS=darwin GOARCH=amd64 go build -o bot-macos
```

### Variables d'environnement alternatives

Vous pouvez aussi définir les variables directement dans le shell :

**Linux/macOS :**
```bash
export TWITCH_BOT_USERNAME=MonBotTwitch
export TWITCH_BOT_OAUTH_TOKEN=oauth:...
export TWITCH_CHANNEL_NAME=MaChaine
export SUPABASE_URL=https://...
export SUPABASE_KEY=...
go run main.go
```

**Windows PowerShell :**
```powershell
$env:TWITCH_BOT_USERNAME="MonBotTwitch"
$env:TWITCH_BOT_OAUTH_TOKEN="oauth:..."
$env:TWITCH_CHANNEL_NAME="MaChaine"
$env:SUPABASE_URL="https://..."
$env:SUPABASE_KEY="..."
go run main.go
```

## 🐛 Dépannage

### Erreur : "missing required Twitch credentials"

Vérifiez que toutes les variables d'environnement sont définies dans `.env` ou dans le shell.

### Erreur : "Failed to initialize Supabase client"

Vérifiez que `SUPABASE_URL` et `SUPABASE_KEY` sont corrects. Le bot fonctionnera sans Supabase, mais les commandes `!collection`, `!stats`, et `!vaal` ne fonctionneront pas.

### Le bot ne se connecte pas à Twitch

1. Vérifiez que le token OAuth est valide (commence par `oauth:`)
2. Vérifiez que le nom d'utilisateur du bot est correct
3. Vérifiez que le nom de la chaîne est correct (sans `#`)

### Les commandes Supabase ne fonctionnent pas

1. Vérifiez que Supabase est correctement configuré
2. Vérifiez que RLS (Row Level Security) est configuré pour permettre les lectures publiques
3. Vérifiez les logs pour voir les erreurs détaillées

## 📚 Prochaines Étapes

Une fois que le bot fonctionne en local :

1. Consultez [README.md](./README.md) pour le déploiement sur Railway
2. Consultez [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) pour migrer depuis Node.js
3. Testez toutes les fonctionnalités avant de déployer en production
