# Guide de test des rewards Twitch en local

Ce guide vous permet de tester complètement le flux d'achat de rewards avant la mise en production.

## 📋 Prérequis

1. **Variables d'environnement configurées** dans `.env` :
   ```bash
   SUPABASE_URL=https://votre-projet.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=votre_service_role_key
   TWITCH_CHANNEL_NAME=votre_chaine
   BOT_WEBHOOK_URL=https://votre-bot.railway.app
   TWITCH_REWARD_VAAL_ID=id_du_reward_vaal
   TWITCH_REWARD_BOOSTER_ID=id_du_reward_booster
   TEST_USERNAME=nom_utilisateur_test
   ```

2. **Edge Functions déployées** sur Supabase :
   - `twitch-eventsub`
   - `handle-reward`

3. **Bot Twitch démarré** et accessible publiquement (Railway, etc.)

## 🧪 Méthode 1 : Script de test automatique

Le script `test-reward-flow.ts` teste automatiquement tous les composants :

```bash
# Test avec un booster
npx tsx tools/test-reward-flow.ts --reward-type=booster

# Test avec des Vaal Orbs
npx tsx tools/test-reward-flow.ts --reward-type=vaal
```

### Ce que le script teste :

1. ✅ **Variables d'environnement** : Vérifie que toutes les variables requises sont définies
2. ✅ **Accessibilité des URLs** : Teste que les webhooks sont accessibles publiquement
3. ✅ **Authentification Supabase** : Vérifie que la clé service role fonctionne
4. ✅ **Webhook EventSub** : Simule le challenge Twitch
5. ✅ **Flux complet** : Simule un achat de reward et vérifie le traitement
6. ✅ **Webhook du bot** : Teste l'envoi de messages au bot

## 🔍 Méthode 2 : Tests manuels

### 1. Vérifier les URLs publiques

Les URLs doivent être accessibles depuis Internet (pas seulement localhost) :

```bash
# Test du webhook EventSub (doit répondre au challenge)
curl "https://votre-projet.supabase.co/functions/v1/twitch-eventsub?hub.challenge=test123&hub.mode=subscribe"

# Test du health check du bot
curl https://votre-bot.railway.app/health
```

### 2. Vérifier l'authentification Supabase

```bash
curl -X GET "https://votre-projet.supabase.co/rest/v1/users?select=id&limit=1" \
  -H "apikey: votre_service_role_key" \
  -H "Authorization: Bearer votre_service_role_key"
```

### 3. Simuler un achat de reward

#### Option A : Via l'Edge Function directement

```bash
curl -X POST "https://votre-projet.supabase.co/functions/v1/handle-reward" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer votre_service_role_key" \
  -d '{
    "username": "test_user",
    "input": "",
    "rewardId": "votre_reward_id"
  }'
```

#### Option B : Via l'interface Supabase

1. Allez dans **Edge Functions** → **handle-reward** → **Invoke**
2. Utilisez ce payload :
   ```json
   {
     "username": "test_user",
     "input": "",
     "rewardId": "votre_reward_id"
   }
   ```

### 4. Vérifier les logs de diagnostic

Dans Supabase Dashboard :
- Allez dans **Table Editor** → `diagnostic_logs`
- Filtrez par `username = test_user`
- Vérifiez que :
  - ✅ `validation_status` = `ok`
  - ✅ `action_details` contient les bonnes informations
  - ✅ `state_before` et `state_after` montrent les changements

### 5. Vérifier les données dans la base

```sql
-- Vérifier les Vaal Orbs de l'utilisateur
SELECT vaal_orbs FROM users WHERE twitch_username = 'test_user';

-- Vérifier les boosters créés
SELECT * FROM user_boosters WHERE user_id = (
  SELECT id FROM users WHERE twitch_username = 'test_user'
);

-- Vérifier les cartes ajoutées
SELECT * FROM user_collections WHERE user_id = (
  SELECT id FROM users WHERE twitch_username = 'test_user'
);
```

## 🚨 Points critiques à vérifier

### URLs publiques

- ⚠️ **Localhost ne fonctionnera PAS** : Twitch doit pouvoir accéder à votre webhook
- ✅ Utilisez **ngrok** ou **localtunnel** pour tester en local :
  ```bash
  # Avec ngrok
  ngrok http 3000
  
  # Avec localtunnel
  npx localtunnel --port 3000
  ```
- ✅ En production, utilisez les URLs Supabase/Railway directement

### Authentification

- ✅ **Service Role Key** : Utilisée dans les Edge Functions (bypass RLS)
- ✅ **Anon Key** : Utilisée côté client (respecte RLS)
- ⚠️ Ne jamais exposer la Service Role Key côté client

### Webhooks Twitch

1. **EventSub Challenge** : Twitch envoie un GET avec `hub.challenge` lors de la création
2. **Notifications** : Twitch envoie un POST avec les données de l'événement
3. **Signature HMAC** : Actuellement désactivée (TODO), mais devrait être activée en production

### Variables d'environnement dans Supabase

Vérifiez que les Edge Functions ont accès à :
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TWITCH_CHANNEL_NAME`
- `BOT_WEBHOOK_URL`
- `TWITCH_REWARD_VAAL_ID`
- `TWITCH_REWARD_BOOSTER_ID`

Dans Supabase Dashboard :
- **Edge Functions** → Sélectionnez la fonction → **Settings** → **Secrets**

## 🔧 Dépannage

### Le webhook EventSub ne répond pas

1. Vérifiez que l'Edge Function est déployée
2. Vérifiez les logs dans Supabase Dashboard
3. Testez l'URL directement avec curl

### Le bot ne reçoit pas les messages

1. Vérifiez que `BOT_WEBHOOK_URL` est correcte
2. Vérifiez que le bot est démarré et accessible
3. Testez le webhook directement :
   ```bash
   curl -X POST "https://votre-bot.railway.app/webhook/message" \
     -H "Content-Type: application/json" \
     -d '{"message": "test", "channel": "votre_chaine"}'
   ```

### Les rewards ne sont pas traités

1. Vérifiez les logs de diagnostic dans `diagnostic_logs`
2. Vérifiez que les IDs de rewards correspondent
3. Vérifiez les logs de l'Edge Function dans Supabase Dashboard

## ✅ Checklist avant production

- [ ] Toutes les variables d'environnement sont définies
- [ ] Les Edge Functions sont déployées
- [ ] Les URLs sont accessibles publiquement
- [ ] Le bot est démarré et accessible
- [ ] Les tests automatiques passent (`test-reward-flow.ts`)
- [ ] Un achat de reward test a été effectué avec succès
- [ ] Les logs de diagnostic montrent `validation_status: ok`
- [ ] Les données sont correctement enregistrées dans la base
- [ ] Le bot envoie bien les messages dans le chat Twitch

## 📝 Notes importantes

- **En local** : Utilisez ngrok/localtunnel pour exposer vos URLs
- **En production** : Utilisez directement les URLs Supabase/Railway
- **Tests** : Utilisez toujours un utilisateur de test, pas votre compte principal
- **Logs** : Consultez toujours les `diagnostic_logs` après un test
