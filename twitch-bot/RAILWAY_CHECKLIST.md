# Checklist Railway - Configuration Requise

## ✅ Actions à faire dans Railway Dashboard

### 1. Vérifier que le code est à jour

1. **Commit et push** votre code sur GitHub :
   ```bash
   git add .
   git commit -m "Migrate to Deno with tmi.js"
   git push
   ```

2. **Dans Railway Dashboard** :
   - Allez dans votre service
   - Vérifiez que le dernier déploiement correspond à votre dernier commit
   - Si nécessaire, cliquez sur **"Redeploy"** ou **"Deploy Latest"**

### 2. Vérifier le Start Command

1. **Railway Dashboard** → Votre service → **Settings** → **Deploy**
2. **Custom Start Command** doit être :
   ```
   deno run --allow-net --allow-env --allow-read main.ts
   ```
3. ⚠️ **PAS** `node index.js` ou `npm start`

### 3. Désactiver Serverless

1. **Railway Dashboard** → Votre service → **Settings** → **Deploy**
2. Cherchez **"Serverless"** ou **"Scale to Zero"**
3. **Désactivez-le** si activé
   - Cette option arrête les conteneurs après inactivité
   - Pour un bot qui doit rester actif 24/7, elle doit être désactivée

### 4. Configurer Health Check

1. **Railway Dashboard** → Votre service → **Settings** → **Health Check**
2. Configurez :
   - **Path** : `/health`
   - **Timeout** : `300` secondes (ou plus)
   - **Interval** : `30` secondes

### 5. Configurer Restart Policy

1. **Railway Dashboard** → Votre service → **Settings** → **Deploy**
2. **Restart Policy** : `ALWAYS`
   - Cela garantit que Railway redémarre le service s'il s'arrête

### 6. Vérifier les Variables d'Environnement

Dans **Settings** → **Variables**, vérifiez que vous avez :
- `TWITCH_BOT_USERNAME`
- `TWITCH_BOT_OAUTH_TOKEN` (format: `oauth:xxxxx`)
- `TWITCH_CHANNEL_NAME`
- `SUPABASE_URL`
- `SUPABASE_KEY` ou `SUPABASE_ANON_KEY`

### 7. Vérifier le Builder

1. **Railway Dashboard** → Votre service → **Settings** → **Build**
2. Le builder devrait être **"NIXPACKS"** (automatique pour Deno)
3. Si Railway ne détecte pas Deno, vous pouvez forcer avec un `Dockerfile` ou vérifier que `deno.json` existe

## 🔍 Vérification après Configuration

### 1. Vérifier les Logs

Dans Railway Dashboard → **Logs**, vous devriez voir :
```
✅ Supabase client initialized
🤖 Twitch Bot Service starting...
📡 Webhook server listening on port XXXX
✅ Bot connected to Twitch chat: Les_Doseurs
```

**Vous ne devriez PAS voir** :
- `error: Module not found "https://deno.land/x/twitch_irc@v0.9.0/mod.ts"`
- `npm error`
- `SIGTERM` immédiatement après le démarrage

### 2. Tester le Health Check

```bash
curl https://votre-service.railway.app/health
```

Vous devriez voir :
```json
{"status":"ok","bot":"connected","channel":"Les_Doseurs","timestamp":"..."}
```

### 3. Tester dans Twitch Chat

1. Allez sur votre chaîne Twitch
2. Tapez `!ping` dans le chat
3. Le bot devrait répondre `Pong!`

## 🐛 Si le problème persiste

### Le bot s'arrête toujours avec SIGTERM

1. **Vérifiez le plan Railway** :
   - Le plan gratuit peut avoir des limitations
   - Les conteneurs peuvent être arrêtés après inactivité
   - Considérez passer au plan payant pour un service 24/7

2. **Vérifiez les logs** pour voir si Railway envoie SIGTERM pour une raison spécifique

3. **Redéployez manuellement** :
   - Railway Dashboard → Votre service → **Deployments**
   - Cliquez sur **"Redeploy"** sur le dernier déploiement

### Le code n'est pas à jour sur Railway

1. **Vérifiez la connexion GitHub** :
   - Railway Dashboard → Votre projet → **Settings** → **GitHub**
   - Vérifiez que le repo est bien connecté

2. **Forcez un nouveau déploiement** :
   - Railway Dashboard → Votre service → **Settings** → **Deploy**
   - Cliquez sur **"Redeploy"**

3. **Vérifiez le commit** :
   - Les logs Railway devraient montrer le hash du commit déployé
   - Comparez avec votre dernier commit GitHub

## 📝 Résumé des Paramètres Critiques

| Paramètre | Valeur Requise |
|-----------|----------------|
| **Start Command** | `deno run --allow-net --allow-env --allow-read main.ts` |
| **Serverless** | ❌ Désactivé |
| **Restart Policy** | `ALWAYS` |
| **Health Check Path** | `/health` |
| **Health Check Timeout** | `300` secondes |
| **Builder** | `NIXPACKS` (automatique) |
