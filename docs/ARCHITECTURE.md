# Architecture - Le Collecteur de Dose

## Vue d'ensemble

L'application utilise **Supabase** comme source de données principale, avec un système de **mock local** pour le développement.

## Architecture des données

### Sources de données

1. **Supabase (Production)**
   - Base de données PostgreSQL hébergée sur Supabase
   - Utilisée en production et pour les tests avec données réelles
   - Accès via le client Supabase avec clé anonyme (lecture) ou service role (écriture)

2. **Mock Local (Développement)**
   - Données mock en mémoire pour le développement local
   - Utilise `data/mockCards.ts` pour les cartes uniques
   - Simule la structure de la base de données Supabase
   - Accessible uniquement en mode développement

### Modes de données

Le système supporte deux modes via le `dataSourceStore` :

- **`supabase`** : Mode production, utilise la base de données Supabase réelle
- **`mock`** : Mode développement, utilise les données mock locales

Le mode est automatiquement forcé à `supabase` en production.

## Structure des services

### Services principaux

1. **`services/supabase-collection.service.ts`**
   - Service principal pour accéder aux collections
   - Route automatiquement vers le mock ou Supabase selon le mode
   - Fonctions : `getAllUserCollections()`, `getUserCollection()`, `getUserCards()`, `getAllUniqueCards()`, `updateUserCollection()`

2. **`services/supabase-mock.service.ts`**
   - Implémentation mock du service Supabase
   - Simule les fonctions RPC et les requêtes de base de données
   - Utilisé uniquement en mode développement

3. **`services/api.service.ts`**
   - Wrapper autour de `supabase-collection.service.ts`
   - Fournit une interface API cohérente pour l'application
   - Tous les appels passent maintenant par Supabase

### Stores Pinia

1. **`stores/dataSource.store.ts`**
   - Gère le mode de source de données (`supabase` ou `mock`)
   - Force `supabase` en production
   - Persiste le choix dans localStorage

2. **`stores/api.store.ts`**
   - Gère l'état des appels API (loading, erreurs)
   - Fournit la configuration API via `getApiConfig()`

## Bot Twitch

### Architecture

Le bot Twitch est divisé en deux parties :

1. **Bot minimal (`twitch-bot-minimal/`)**
   - Service léger déployé sur Railway
   - Gère uniquement le chat Twitch via TMI.js
   - Peut recevoir des messages via webhook depuis les Edge Functions

2. **Edge Functions Supabase**
   - `supabase/functions/twitch-eventsub/` : Reçoit les webhooks EventSub de Twitch
   - `supabase/functions/handle-reward/` : Traite les récompenses Channel Points
   - Crée les boosters et met à jour les collections directement dans Supabase

### Flux de données

```
Twitch EventSub → Edge Function (twitch-eventsub) 
                → Edge Function (handle-reward)
                → Supabase Database
                → Bot Railway (webhook optionnel pour messages chat)
```

## Développement local

### Mode Mock

Pour développer en local sans connexion à Supabase :

1. Le mode `mock` est automatiquement disponible en développement
2. Les données mock sont initialisées depuis `data/mockCards.ts`
3. Toutes les opérations sont simulées en mémoire

### Mode Supabase

Pour utiliser Supabase en local :

1. Configurer les variables d'environnement :
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (pour les écritures)

2. Le mode `supabase` utilisera la base de données réelle

## Migration depuis l'ancienne architecture

### Changements principaux

1. **Suppression de l'ancienne API**
   - Plus de proxy `/api/data`
   - Plus de références à `DATA_API_URL` ou `DATA_API_KEY`
   - Suppression du dossier `bot-temp-supabase/`

2. **Simplification des modes**
   - Ancien : `api`, `test`, `supabase`
   - Nouveau : `supabase`, `mock`

3. **Accès direct à Supabase**
   - L'application utilise directement le client Supabase
   - Plus besoin de proxy intermédiaire

### Variables d'environnement

**Supprimées :**
- `DATA_API_URL`
- `DATA_API_KEY`

**Conservées :**
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Structure de la base de données

Les principales tables Supabase :

- `users` : Utilisateurs Twitch
- `unique_cards` : Catalogue de toutes les cartes
- `user_collections` : Collections des utilisateurs
- `user_boosters` : Historique des boosters ouverts
- `booster_cards` : Cartes dans chaque booster
- `app_settings` : Paramètres de l'application
- `admin_users` : Utilisateurs administrateurs

## Notes importantes

1. **Production** : Le mode est toujours `supabase` en production
2. **Mock** : Le mode mock n'est disponible qu'en développement
3. **Edge Functions** : Toutes les récompenses sont gérées par les Edge Functions Supabase
4. **Bot Railway** : Le bot minimal ne gère que le chat, pas les récompenses
