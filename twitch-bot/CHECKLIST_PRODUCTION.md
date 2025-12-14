# Checklist de Mise en Production

Cette checklist vous aide à vérifier que tout est correctement configuré pour la production.

## ✅ Configuration Railway

### Variables d'Environnement Requises

- [ ] `TWITCH_BOT_USERNAME` : Nom d'utilisateur du bot Twitch
- [ ] `TWITCH_BOT_OAUTH_TOKEN` : Token OAuth (format: `oauth:xxxxx`)
- [ ] `TWITCH_CHANNEL_NAME` : Nom de la chaîne (sans #)
- [ ] `SUPABASE_URL` : `https://pkhwgiwafehlsgrnhxyv.supabase.co`
- [ ] `SUPABASE_KEY` ou `SUPABASE_ANON_KEY` : Clé anonyme Supabase
- [ ] `PORT` : Automatiquement défini par Railway (pas besoin de le configurer)

### Déploiement

- [ ] Service Railway créé et lié au repo GitHub
- [ ] Public Domain créé : `lecollecteurdedose-production.up.railway.app`
- [ ] Bot déployé et actif (vérifier les logs)
- [ ] Logs montrent : `✅ Bot connected to Twitch chat: [votre_chaine]`
- [ ] Logs montrent : `📡 Webhook server listening on port XXXX`
- [ ] Health check accessible : `https://lecollecteurdedose-production.up.railway.app/health`

## ✅ Configuration Supabase

### Edge Functions

- [ ] `twitch-eventsub` déployée et active
- [ ] `handle-reward` déployée et active

### Variables d'Environnement Edge Functions

Pour `handle-reward` :
- [ ] `SUPABASE_URL` : `https://pkhwgiwafehlsgrnhxyv.supabase.co`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` : Clé service role
- [ ] `TWITCH_REWARD_VAAL_ID` : ID de la récompense Vaal Orbs
- [ ] `TWITCH_CHANNEL_NAME` : Nom de la chaîne
- [ ] **`BOT_WEBHOOK_URL`** : `https://lecollecteurdedose-production.up.railway.app/webhook/message`

Pour `twitch-eventsub` :
- [ ] `SUPABASE_URL` : `https://pkhwgiwafehlsgrnhxyv.supabase.co`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` : Clé service role
- [ ] `TWITCH_WEBHOOK_SECRET` : Secret pour vérifier les signatures Twitch

### Configuration EventSub Twitch

- [ ] EventSub webhook configuré pour pointer vers :
  - `https://pkhwgiwafehlsgrnhxyv.supabase.co/functions/v1/twitch-eventsub`
- [ ] Subscription active pour `channel.channel_points_custom_reward_redemption.add`

## ✅ Tests Fonctionnels

### Bot Chat

- [ ] Bot répond à `!ping` dans le chat Twitch
- [ ] Commande `!collection` fonctionne
- [ ] Commande `!stats` fonctionne
- [ ] Commande `!vaal` fonctionne

### Récompenses Twitch

- [ ] Ouvrir un booster via Channel Points affiche un message dans le chat
- [ ] Acheter 5 Vaal Orbs via Channel Points affiche un message dans le chat
- [ ] Les cartes sont bien ajoutées à la collection dans Supabase
- [ ] Les Vaal Orbs sont bien ajoutés dans Supabase

### Webhook

- [ ] Test manuel du webhook fonctionne :
  ```bash
  curl -X POST https://lecollecteurdedose-production.up.railway.app/webhook/message \
    -H "Content-Type: application/json" \
    -d '{"message":"Test","channel":"votre_chaine"}'
  ```
- [ ] Le bot affiche le message dans le chat Twitch

## 🔍 Vérification des Logs

### Railway

Vérifiez que les logs montrent :
```
✅ Supabase client initialized
📡 Webhook server listening on port XXXX
✅ Bot connected to Twitch chat: votre_chaine
```

Si vous voyez `📨 Received webhook message: ...`, le webhook fonctionne !

### Supabase Edge Functions

Vérifiez les logs de `handle-reward` :
- [ ] Pas d'erreurs `Failed to send message to bot`
- [ ] Messages `📢 Twitch message: ...` apparaissent
- [ ] Pas d'erreurs de connexion à la base de données

## 🐛 Dépannage Rapide

### Le bot ne se connecte pas

1. Vérifiez `TWITCH_BOT_OAUTH_TOKEN` (doit commencer par `oauth:`)
2. Vérifiez `TWITCH_BOT_USERNAME` (exact, sensible à la casse)
3. Vérifiez `TWITCH_CHANNEL_NAME` (sans #)

### Les messages de handle-reward ne s'affichent pas

1. Vérifiez `BOT_WEBHOOK_URL` dans Supabase (URL complète avec `/webhook/message`)
2. Vérifiez que le Public Domain Railway est actif
3. Testez le webhook manuellement avec curl
4. Vérifiez les logs Supabase pour les erreurs

### Les commandes chat ne fonctionnent pas

1. Vérifiez `SUPABASE_URL` et `SUPABASE_KEY` dans Railway
2. Vérifiez que RLS est configuré pour permettre les lectures publiques
3. Vérifiez les logs Railway pour les erreurs Supabase

## 📚 Documentation

- [DEPLOYMENT_RAILWAY.md](./DEPLOYMENT_RAILWAY.md) - Guide complet Railway + Local
- [QUICK_START.md](./QUICK_START.md) - Guide rapide pour le développement local
- [ARCHITECTURE_COMPLETE.md](./ARCHITECTURE_COMPLETE.md) - Architecture complète

## 🔗 Liens Utiles

- **Supabase Dashboard** : https://supabase.com/dashboard/project/pkhwgiwafehlsgrnhxyv
- **Railway Dashboard** : https://railway.app
- **Edge Functions Secrets** : https://supabase.com/dashboard/project/pkhwgiwafehlsgrnhxyv/settings/functions
