# Architecture Complète - Bot Twitch + Supabase

Ce document explique comment configurer l'architecture complète pour que le bot Railway interagisse avec les Edge Functions Supabase (`handle-reward`).

## 🔄 Flux de Données

```
Twitch EventSub Webhook
    ↓
Supabase Edge Function: twitch-eventsub
    ↓
Supabase Edge Function: handle-reward
    ↓ (traite la récompense, crée booster/Vaal Orbs)
    ↓ (envoie message via webhook)
Bot Railway (webhook /webhook/message)
    ↓
Chat Twitch (message affiché)
```

## ✅ Configuration Requise

### 1. Bot Railway

**Variables d'environnement requises :**
- `TWITCH_BOT_USERNAME` : Nom d'utilisateur du bot
- `TWITCH_BOT_OAUTH_TOKEN` : Token OAuth (format: `oauth:xxxxx`)
- `TWITCH_CHANNEL_NAME` : Nom de la chaîne (sans #)
- `SUPABASE_URL` : URL de votre projet Supabase
- `SUPABASE_KEY` ou `SUPABASE_ANON_KEY` : Clé anonyme Supabase

**Le webhook est automatiquement activé** - le bot écoute sur le port défini par Railway (`PORT`).

### 2. Supabase Edge Functions

**Variables d'environnement requises pour `handle-reward` :**
- `SUPABASE_URL` : URL de votre projet Supabase
- `SUPABASE_SERVICE_ROLE_KEY` : Clé service role Supabase
- `TWITCH_REWARD_VAAL_ID` : ID de la récompense Vaal Orbs
- `TWITCH_CHANNEL_NAME` : Nom de la chaîne (sans #)
- **`BOT_WEBHOOK_URL`** : URL publique du bot Railway (format: `https://votre-service.railway.app/webhook/message`)

**Variables d'environnement requises pour `twitch-eventsub` :**
- `SUPABASE_URL` : URL de votre projet Supabase
- `SUPABASE_SERVICE_ROLE_KEY` : Clé service role Supabase
- `TWITCH_WEBHOOK_SECRET` : Secret pour vérifier les signatures Twitch

## 🔧 Configuration Étape par Étape

### Étape 1 : Déployer le Bot sur Railway

1. Suivez le guide [DEPLOYMENT_RAILWAY.md](./DEPLOYMENT_RAILWAY.md)
2. Configurez toutes les variables d'environnement requises
3. Créez un **Public Domain** dans Railway (Settings > Networking)
4. Notez l'URL publique (ex: `https://twitch-bot-production.up.railway.app`)

### Étape 2 : Configurer BOT_WEBHOOK_URL dans Supabase

1. Allez dans **Supabase Dashboard** > **Project Settings** > **Edge Functions**
2. Cliquez sur **Secrets** ou **Environment Variables**
3. Ajoutez la variable suivante :
   - **Nom** : `BOT_WEBHOOK_URL`
   - **Valeur** : `https://votre-service.railway.app/webhook/message`
   - Remplacez `votre-service.railway.app` par votre URL Railway réelle

### Étape 3 : Vérifier que tout fonctionne

1. **Vérifiez les logs Railway** :
   ```
   📡 Webhook server listening on port XXXX
      Endpoint: http://0.0.0.0:XXXX/webhook/message
   ✅ Bot connected to Twitch chat: votre_chaine
   ```

2. **Testez une récompense Twitch** :
   - Utilisez Channel Points pour ouvrir un booster ou acheter des Vaal Orbs
   - Le bot devrait afficher un message dans le chat Twitch

3. **Vérifiez les logs Supabase** :
   - Allez dans **Edge Functions** > **handle-reward** > **Logs**
   - Vous devriez voir : `📢 Twitch message: ...`
   - Si le webhook fonctionne, vous ne verrez pas d'erreur

## 🐛 Dépannage

### Le bot ne reçoit pas les messages de handle-reward

1. **Vérifiez BOT_WEBHOOK_URL** :
   - L'URL doit être accessible publiquement (pas localhost)
   - L'URL doit se terminer par `/webhook/message`
   - Testez l'URL dans votre navigateur (devrait retourner 404, pas d'erreur de connexion)

2. **Vérifiez les logs Railway** :
   - Le webhook doit être actif : `📡 Webhook server listening on port XXXX`
   - Vérifiez s'il y a des erreurs lors de la réception des webhooks

3. **Testez le webhook manuellement** :
   ```bash
   curl -X POST https://votre-service.railway.app/webhook/message \
     -H "Content-Type: application/json" \
     -d '{"message":"Test","channel":"votre_chaine"}'
   ```
   Le bot devrait répondre dans le chat Twitch.

4. **Vérifiez les logs Supabase** :
   - Allez dans **Edge Functions** > **handle-reward** > **Logs**
   - Cherchez les erreurs liées à `Failed to send message to bot`

### Le webhook retourne 404

- Vérifiez que l'URL se termine bien par `/webhook/message`
- Vérifiez que le bot est bien déployé et actif sur Railway
- Vérifiez que le Public Domain Railway est bien configuré

### Les messages s'affichent mais avec un délai

- C'est normal, il y a plusieurs étapes :
  1. Twitch envoie le webhook à `twitch-eventsub`
  2. `twitch-eventsub` appelle `handle-reward`
  3. `handle-reward` traite la récompense
  4. `handle-reward` envoie le message au bot Railway
  5. Le bot affiche le message dans le chat

## 📝 Notes Importantes

- **Le webhook est toujours activé** dans le bot - pas besoin de `ENABLE_WEBHOOK`
- **Railway définit automatiquement `PORT`** - le bot utilise cette variable
- **BOT_WEBHOOK_URL doit être publique** - utilisez l'URL Railway, pas localhost
- **Les commandes chat** (`!collection`, `!stats`, `!vaal`) nécessitent les variables Supabase dans le bot

## 🔗 Liens Utiles

- [Guide de déploiement Railway](./DEPLOYMENT_RAILWAY.md)
- [Guide de démarrage local](./QUICK_START.md)
- [Documentation Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Documentation Railway](https://docs.railway.app)
