# Bot Twitch - Version Supabase (Temporaire)

Cette version du bot utilise Supabase Database au lieu des fichiers JSON. Elle est identique au bot original en termes de fonctionnement, mais utilise la base de données Supabase pour toutes les opérations.

## 🚀 Démarrage Rapide

1. **Installer les dépendances** :
   ```bash
   npm install
   ```

2. **Configurer les variables d'environnement** :
   - Copiez `.env.example` vers `.env`
   - Remplissez toutes les variables nécessaires

3. **Démarrer le bot** :
   ```bash
   npm start
   ```

## 📋 Variables d'Environnement Requises

### Twitch
- `TWITCH_BOT_USERNAME` : Nom d'utilisateur du bot
- `TWITCH_BOT_OAUTH_TOKEN` : Token OAuth (format: `oauth:xxxxx`)
- `TWITCH_CHANNEL_NAME` : Nom de la chaîne
- `TWITCH_CLIENT_ID` : Client ID Twitch
- `TWITCH_CLIENT_SECRET` : Client Secret Twitch
- `TWITCH_USER_TOKEN` : User Token Twitch
- `TWITCH_CHANNEL_ID` : Channel ID Twitch
- `TWITCH_REWARD_ID` : ID de la récompense booster
- `TWITCH_REWARD_VAAL_ID` : ID de la récompense Vaal Orbs

### Supabase
- `SUPABASE_URL` : URL de votre projet Supabase
- `SUPABASE_SERVICE_ROLE_KEY` : Service Role Key (⚠️ secret)

### Optionnel
- `API_KEY` : Clé API pour les endpoints de mise à jour (défaut fourni)

## 🔄 Différences avec le Bot Original

### ✅ Améliorations
- **Base de données Supabase** : Toutes les données sont dans PostgreSQL
- **Pas de fichiers JSON** : Plus besoin de gérer `uniques.json`, `userCollection.json`, `userCards.json`
- **Pas de writeQueue** : Les transactions sont gérées par Supabase
- **Meilleure performance** : Gestion optimisée des utilisateurs simultanés
- **Intégrité des données** : Transactions atomiques garanties par PostgreSQL

### 🔄 Fonctionnement Identique
- Même logique de génération de boosters
- Même système de récompenses
- Même API REST (endpoints compatibles)
- Même comportement EventSub

## 📁 Structure des Fichiers

```
bot-temp-supabase/
├── bot.js                 # Bot Twitch (chat)
├── eventSub.mjs          # Gestion EventSub et récompenses
├── server.mjs            # Serveur API REST
├── supabase-service.mjs  # Service Supabase (remplace les opérations JSON)
├── launcher.mjs          # Point d'entrée
├── package.json          # Dépendances
└── README.md             # Ce fichier
```

## 🔧 Fonctionnement

1. **Au démarrage** :
   - Le bot se connecte au chat Twitch
   - Les cartes uniques sont chargées depuis Supabase (cache)
   - EventSub se connecte et écoute les récompenses

2. **Lors d'une récompense** :
   - EventSub reçoit l'événement
   - Un booster est créé (logique identique)
   - Les cartes sont ajoutées à la collection via Supabase
   - Le booster est enregistré dans Supabase
   - Un message est envoyé dans le chat

3. **API REST** :
   - Les endpoints lisent directement depuis Supabase
   - Format de réponse identique à l'ancien bot
   - Compatible avec l'application Nuxt existante

## ⚠️ Notes Importantes

- **Cache des cartes** : Les cartes uniques sont chargées une fois au démarrage et mises en cache
- **Transactions** : Toutes les opérations sont atomiques grâce à Supabase
- **Performance** : Optimisé pour gérer de nombreux utilisateurs simultanés
- **Migration** : Les données doivent déjà être dans Supabase (utiliser le script de migration)

## 🐛 Dépannage

### Le bot ne charge pas les cartes
- Vérifiez `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY`
- Vérifiez que la table `unique_cards` contient des données

### Les récompenses ne fonctionnent pas
- Vérifiez les IDs de récompenses dans `.env`
- Vérifiez les logs EventSub dans la console

### L'API ne retourne pas de données
- Vérifiez la connexion Supabase
- Vérifiez que les données existent dans la base

## 📚 Migration depuis l'Ancien Bot

1. Les fichiers JSON ne sont plus nécessaires
2. Les variables d'environnement sont identiques (ajouter Supabase)
3. Le fonctionnement est identique, juste la source de données change

## 🔗 Liens Utils

- [Documentation Supabase](https://supabase.com/docs)
- [Documentation TMI.js](https://github.com/tmijs/tmi.js)
- [Documentation Twitch EventSub](https://dev.twitch.tv/docs/eventsub)
