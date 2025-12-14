# 🚀 Guide de Démarrage Rapide

## Étape 1 : Installer les dépendances

Ouvrez un terminal dans le dossier `bot-temp-supabase` et exécutez :

```bash
npm install
```

## Étape 2 : Créer le fichier `.env`

Créez un fichier `.env` dans le dossier `bot-temp-supabase` avec le contenu suivant :

```env
# Twitch Configuration (copiez depuis votre ancien bot)
TWITCH_BOT_USERNAME=votre_bot_username
TWITCH_BOT_OAUTH_TOKEN=oauth:votre_token
TWITCH_CHANNEL_NAME=votre_chaine
TWITCH_CLIENT_ID=votre_client_id
TWITCH_CLIENT_SECRET=votre_client_secret
TWITCH_USER_TOKEN=votre_user_token
TWITCH_CHANNEL_ID=votre_channel_id
TWITCH_REWARD_ID=id_recompense_booster
TWITCH_REWARD_VAAL_ID=id_recompense_vaal

# Supabase Configuration (NOUVEAU - à ajouter)
SUPABASE_URL=https://pkhwgiwafehlsgrnhxyv.supabase.co
SUPABASE_SERVICE_ROLE_KEY=votre_service_role_key

# API Key (optionnel, même valeur que l'ancien bot)
API_KEY=kfdad5a5-1f4b-4e2b-8c3d-2e2f6f4e5a6b7
```

**Important** : 
- Copiez toutes les variables Twitch depuis votre ancien bot (même valeurs)
- Ajoutez `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` depuis votre projet Supabase
- La `SUPABASE_SERVICE_ROLE_KEY` se trouve dans : Supabase Dashboard > Settings > API > Service Role Key

## Étape 3 : Lancer le bot

Dans le terminal, exécutez :

```bash
npm start
```

Ou directement :

```bash
node launcher.mjs
```

## ✅ Vérification

Vous devriez voir dans la console :

```
✅ Supabase service chargé
📦 Chargement des cartes uniques depuis Supabase...
✅ 505 cartes chargées
🤖 Bot connecté en tant que : votre_bot_username
🔐 App token obtenu !
🔌 Connecté EventSub
📨 Subscription : {...}
🚀 API headless en ligne : http://localhost:3000
🚀 Bot Twitch démarré avec Supabase Database
```

## 🐛 Problèmes Courants

### "❌ SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis"
- Vérifiez que le fichier `.env` existe bien dans `bot-temp-supabase/`
- Vérifiez que les variables sont bien définies (pas de guillemets, pas d'espaces)

### "❌ Aucune carte chargée"
- Vérifiez que `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont corrects
- Vérifiez que les données ont été migrées (table `unique_cards` doit contenir des données)

### "❌ Bot ne se connecte pas"
- Vérifiez `TWITCH_BOT_USERNAME` et `TWITCH_BOT_OAUTH_TOKEN`
- Le token doit commencer par `oauth:`

### "❌ EventSub ne se connecte pas"
- Vérifiez `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`, `TWITCH_USER_TOKEN`
- Vérifiez que les cartes sont bien chargées avant que EventSub démarre

## 📝 Notes

- Le bot démarre automatiquement le serveur API sur le port 3000
- Les cartes sont chargées une fois au démarrage et mises en cache
- EventSub attend 1 seconde après le chargement des cartes avant de démarrer
- Tous les logs s'affichent dans la même console
