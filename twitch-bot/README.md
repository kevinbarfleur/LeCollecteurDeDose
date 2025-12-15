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
- `CONSOLE_USERNAME` : Nom d'utilisateur par défaut pour le mode console local (défaut: `testuser`)

## ⚙️ Configuration des Triggers Automatiques

La configuration des triggers automatiques est maintenant gérée via la table `bot_config` dans Supabase, ce qui permet de modifier les paramètres sans redéployer le bot.

### Table `bot_config`

La table `bot_config` contient toutes les configurations des triggers avec les clés suivantes :

#### Activation
- `auto_triggers_enabled` : Activer/désactiver les triggers automatiques (valeurs: `true` ou `false`)

#### Intervalles (en secondes)
- `auto_triggers_min_interval` : Intervalle minimum entre deux triggers (défaut: `300` = 5 minutes)
- `auto_triggers_max_interval` : Intervalle maximum entre deux triggers (défaut: `900` = 15 minutes)

#### Probabilités de chaque trigger (0.0 à 1.0)
- `trigger_blessing_rngesus` : Probabilité de "Blessing of RNGesus" (défaut: `0.20` = 20%)
- `trigger_cartographers_gift` : Probabilité de "Cartographer's Gift" (défaut: `0.20` = 20%)
- `trigger_mirror_tier` : Probabilité de "Mirror-tier Moment" (défaut: `0.05` = 5%)
- `trigger_einhar_approved` : Probabilité de "Einhar Approved" (défaut: `0.15` = 15%)
- `trigger_heist_tax` : Probabilité de "Heist Tax" (défaut: `0.10` = 10%)
- `trigger_sirus_voice` : Probabilité de "Sirus Voice Line" (défaut: `0.03` = 3%)
- `trigger_alch_misclick` : Probabilité de "Alch & Go Misclick" (défaut: `0.10` = 10%)
- `trigger_trade_scam` : Probabilité de "Trade Scam" (défaut: `0.05` = 5%)
- `trigger_chris_vision` : Probabilité de "Chris Wilson's Vision" (défaut: `0.05` = 5%)
- `trigger_atlas_influence` : Probabilité de "Atlas Influence" (défaut: `0.07` = 7%)

#### Durée des buffs temporaires
- `atlas_influence_duration` : Durée du buff "Atlas Influence" en minutes (défaut: `30`)
- `atlas_influence_foil_boost` : Bonus de chance de foil (0.0 à 1.0) (défaut: `0.10` = +10%)

#### Anti-focus (en millisecondes)
- `auto_triggers_target_cooldown` : Cooldown avant de re-cibler le même utilisateur (défaut: `600000` = 10 minutes)
- `auto_triggers_min_users_for_cooldown` : Nombre minimum d'utilisateurs actifs pour appliquer le cooldown strict (défaut: `3`)
- `auto_triggers_user_activity_window` : Fenêtre de temps pour considérer un utilisateur "actif" (défaut: `3600000` = 1 heure)

### Modifier la Configuration

Vous pouvez modifier la configuration directement dans Supabase :

**Via SQL** :
```sql
-- Activer les triggers
SELECT set_bot_config('auto_triggers_enabled', 'true', 'Enable automatic triggers');

-- Modifier une probabilité
SELECT set_bot_config('trigger_blessing_rngesus', '0.25', 'Probability of Blessing of RNGesus');

-- Voir toute la configuration
SELECT * FROM bot_config;
```

**Via l'interface Supabase** :
1. Allez dans Table Editor → `bot_config`
2. Modifiez les valeurs directement dans la table
3. Les changements seront pris en compte au prochain rechargement de la configuration (au redémarrage du bot ou après reconnexion)

**Fonctions disponibles** :
- `get_bot_config(key TEXT)` : Récupère une valeur de configuration
- `set_bot_config(key TEXT, value TEXT, description TEXT)` : Définit une valeur de configuration
- `get_all_bot_config()` : Récupère toute la configuration en JSONB

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

### Commandes de Développement (Local uniquement)

Ces commandes sont **désactivées sur Railway** et ne fonctionnent qu'en développement local :

- **`!booster`** → Acheter un booster (5 cartes aléatoires)
  - Crée un booster avec la même logique que les Channel Points rewards
  - Ajoute les cartes à votre collection
  - Affiche les cartes obtenues avec indication des foils ✨
  
- **`!orb`** → Acheter 5 Vaal Orbs
  - Ajoute 5 Vaal Orbs à votre inventaire
  - Affiche le nouveau total de Vaal Orbs

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
