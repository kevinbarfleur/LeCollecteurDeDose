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
```

## 🎮 Mode Console pour Tests Locaux

En développement local, le bot active automatiquement un **mode console** qui vous permet de tester les commandes directement dans le terminal sans passer par le chat Twitch.

### Utilisation

Une fois le bot lancé, vous verrez :

```
🎮 Mode Console Activé - Tapez vos commandes ci-dessous (ou dans le chat Twitch)
   Commandes disponibles: !ping, !collection, !stats, !vaal, !vaalorb
   Commandes DEV (local uniquement): !booster, !orb
   Format: [username] <commande> (ex: "testuser !collection" ou juste "!ping")
   Tapez "exit" ou Ctrl+C pour quitter

> 
```

### Exemples de commandes console

```bash
# Commande simple (utilise le username par défaut: "testuser")
> !ping
📝 [Console] @testuser: !ping
💬 Bot: Pong!

# Commande avec username spécifique
> monutilisateur !collection
📝 [Console] @monutilisateur: !collection
💬 Bot: 📦 @monutilisateur : 42 cartes (5 ✨) | 10 Vaal Orbs

# Commande avec username dans la commande
> !vaal monutilisateur
📝 [Console] @testuser: !vaal monutilisateur
💬 Bot: 💎 @monutilisateur a 10 Vaal Orbs

# Utiliser un Vaal Orb
> !vaalorb
📝 [Console] @testuser: !vaalorb
💬 Bot: ✨ @testuser utilise un Vaal Orb sur CarteExemple... Transformation réussie ! La carte devient foil ! (9 Vaal Orbs restants)

# Commandes DEV (uniquement en local)
> !booster
📝 [Console] @testuser: !booster
💬 Bot: 🎁 @testuser, tu as looté : Carte1, Carte2 ✨, Carte3, Carte4, Carte5 !

> !orb
📝 [Console] @testuser: !orb
💬 Bot: ✨ @testuser reçoit 5 Vaal Orbs ! (Total: 15)
```

## 🎲 Triggers Automatiques

Le bot peut déclencher automatiquement des événements aléatoires dans le chat. La configuration est gérée via la table `bot_config` dans Supabase, ce qui permet de modifier les paramètres sans redéployer le bot.

### Configuration via Supabase

La configuration est stockée dans la table `bot_config` avec les clés suivantes :

#### Activation
- `auto_triggers_enabled` : `true` ou `false` (défaut: `false`)

#### Intervalles (en secondes)
- `auto_triggers_min_interval` : Intervalle minimum (défaut: `300` = 5 minutes)
- `auto_triggers_max_interval` : Intervalle maximum (défaut: `900` = 15 minutes)

#### Probabilités de chaque trigger (0.0 à 1.0)
- `trigger_blessing_rngesus` : 20% (défaut: `0.20`)
- `trigger_cartographers_gift` : 20% (défaut: `0.20`)
- `trigger_mirror_tier` : 5% (défaut: `0.05`)
- `trigger_einhar_approved` : 15% (défaut: `0.15`)
- `trigger_heist_tax` : 10% (défaut: `0.10`)
- `trigger_sirus_voice` : 3% (défaut: `0.03`)
- `trigger_alch_misclick` : 10% (défaut: `0.10`)
- `trigger_trade_scam` : 5% (défaut: `0.05`)
- `trigger_chris_vision` : 5% (défaut: `0.05`)
- `trigger_atlas_influence` : 7% (défaut: `0.07`)

#### Durée des buffs temporaires
- `atlas_influence_duration` : Durée en minutes (défaut: `30`)
- `atlas_influence_foil_boost` : Bonus de chance de foil (défaut: `0.10` = +10%)

#### Anti-focus (en millisecondes)
- `auto_triggers_target_cooldown` : Cooldown avant re-ciblage (défaut: `600000` = 10 minutes)
- `auto_triggers_min_users_for_cooldown` : Minimum d'utilisateurs actifs (défaut: `3`)
- `auto_triggers_user_activity_window` : Fenêtre d'activité (défaut: `3600000` = 1 heure)

### Modifier la Configuration

**Via SQL dans Supabase** :
```sql
-- Activer les triggers
SELECT set_bot_config('auto_triggers_enabled', 'true');

-- Modifier une probabilité
SELECT set_bot_config('trigger_blessing_rngesus', '0.25');

-- Voir toute la configuration
SELECT * FROM bot_config;
```

**Via l'interface Supabase** :
1. Allez dans Table Editor → `bot_config`
2. Modifiez les valeurs directement
3. Les changements seront pris en compte au prochain redémarrage du bot

### Effets Disponibles

1. **Blessing of RNGesus** ✨ : Donne +1 Vaal Orb (toujours possible)
2. **Cartographer's Gift** 🗺️ : Donne 1 carte aléatoire (toujours possible)
3. **Mirror-tier Moment** 💎 : Duplique une carte (nécessite des cartes)
4. **Einhar Approved** 🦎 : Convertit une carte normale en foil (nécessite des cartes normales)
5. **Heist Tax** 💰 : Retire 1 Vaal Orb (nécessite des Vaal Orbs)
6. **Sirus Voice Line** 💀 : Détruit une carte (nécessite des cartes)
7. **Alch & Go Misclick** ⚗️ : Reroll une carte (nécessite des cartes)
8. **Trade Scam** 🤝 : Transfère une carte à un autre joueur (nécessite des cartes)
9. **Chris Wilson's Vision** 👓 : Retire le foil d'une carte foil (nécessite des cartes foil)
10. **Atlas Influence** 🗺️ : Ajoute un buff temporaire (+10% chance de foil)

### Système Anti-Focus

Le bot utilise un système anti-focus pour éviter de cibler le même utilisateur plusieurs fois d'affilée :
- Un utilisateur ne peut pas être ciblé deux fois dans la fenêtre de cooldown (10 minutes par défaut)
- Si moins de 3 utilisateurs sont actifs, le cooldown est appliqué strictement
- Les utilisateurs sont considérés "actifs" s'ils ont envoyé un message dans la dernière heure

### Mode Console et Tests Locaux

En mode console local, le bot simule automatiquement des utilisateurs actifs pour tester les triggers :
- Des utilisateurs fictifs sont ajoutés à la liste des utilisateurs actifs
- L'activité est simulée toutes les 2 minutes
- Les triggers fonctionnent normalement et affichent leurs messages dans la console

### Personnaliser le username par défaut

Vous pouvez définir un username par défaut différent via une variable d'environnement :

```bash
CONSOLE_USERNAME=monusername deno run --allow-net --allow-env --allow-read main.ts
```

Ou dans votre `.env` :

```env
CONSOLE_USERNAME=monusername
```

**Note** : La configuration des triggers est maintenant gérée via la table `bot_config` dans Supabase, pas via les variables d'environnement. Voir la section "Configuration via Supabase" ci-dessus.

### Notes

- Le mode console est **automatiquement désactivé** sur Railway (détection via `RAILWAY_ENVIRONMENT`)
- Les commandes fonctionnent exactement comme dans le chat Twitch
- Vous pouvez toujours utiliser le chat Twitch en parallèle si le bot est connecté
- Tapez `exit` ou `quit` pour quitter le mode console (le bot continue de tourner)
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

### Commandes d'Information

- **`!ping`** → Répond `Pong!` (test de connexion)
- **`!collection [username]`** → Affiche la collection d'un utilisateur
  - Affiche : nombre total de cartes, nombre de foils ✨, et Vaal Orbs
  - Exemple : `!collection` (votre collection) ou `!collection MonAmi`
- **`!stats [username]`** → Affiche les statistiques complètes
  - Affiche : cartes totales, boosters ouverts, Vaal Orbs
  - Exemple : `!stats` (vos stats) ou `!stats MonAmi`
- **`!vaal [username]`** → Affiche le nombre de Vaal Orbs
  - Exemple : `!vaal` (vos Vaal Orbs) ou `!vaal MonAmi`

### Commandes d'Action

- **`!vaalorb`** → Utilise un Vaal Orb sur une carte aléatoire (inspiré de Path of Exile)
  - Consomme 1 Vaal Orb de votre inventaire
  - Sélectionne une carte normale aléatoire de votre collection
  - Effets possibles :
    - ✨ **50% chance** : Transforme la carte en foil (réussite)
    - 💫 **25% chance** : Rien ne se passe (échec mineur)
    - 💥 **15% chance** : Détruit la carte (échec majeur)
    - 🌟 **10% chance** : Duplique la carte (succès rare)
  - **Prérequis** : Au moins 1 Vaal Orb et au moins une carte normale dans votre collection

**Note :** Les commandes nécessitent les variables d'environnement Supabase pour fonctionner.

## 🛑 Arrêter le bot

Appuyez sur `Ctrl+C` dans le terminal pour arrêter le bot proprement.

## 📚 Documentation Complète

Pour plus de détails sur le déploiement sur Railway, consultez [README.md](./README.md)
