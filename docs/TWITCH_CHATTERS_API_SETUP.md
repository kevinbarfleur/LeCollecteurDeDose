# Configuration de l'API Twitch

Ce document explique comment configurer l'API Twitch pour :
1. **Recuperer les avatars** des utilisateurs automatiquement
2. **Obtenir la liste des chatters** (lurkers inclus) pour un ciblage plus equitable

## Fonctionnalites disponibles avec l'API Twitch

### 1. Avatars automatiques (App Access Token)
Avec juste le Client ID et Client Secret, le bot peut :
- Recuperer automatiquement l'avatar de chaque utilisateur cible
- Backfill les avatars manquants via `/webhook/backfill-avatars`

### 2. Liste des Chatters (User Access Token + Mod)
Avec un token OAuth complet + droits moderateur :
- Cibler tous les spectateurs, meme les lurkers
- Distribution plus equitable des triggers

| Avant (actuel) | Apres (avec API) |
|----------------|------------------|
| Seuls les chatteurs sont ciblables | Tous les viewers sont ciblables |
| Biais vers les utilisateurs actifs | Distribution equitable |
| Fenetre d'activite de 15 min | Liste en temps reel |

---

## Etape 1 : Creer une Application Twitch Developer

1. Aller sur [Twitch Developer Console](https://dev.twitch.tv/console/apps)
2. Se connecter avec le compte Twitch du **broadcaster** (kevinbarfleur)
3. Cliquer sur **"Register Your Application"**
4. Remplir le formulaire :
   - **Name** : `LeCollecteurDeDose Bot`
   - **OAuth Redirect URLs** : `http://localhost:3000/callback` (ou une URL de callback valide)
   - **Category** : `Chat Bot`
5. Cliquer sur **"Create"**
6. Noter le **Client ID** genere

---

## Etape 2 : Generer un Token OAuth avec les bons scopes

### Option A : Via Twitch CLI (recommande)

```bash
# Installer Twitch CLI
# https://dev.twitch.tv/docs/cli

# Se connecter
twitch configure

# Generer un token avec le scope necessaire
twitch token -u -s "moderator:read:chatters"
```

### Option B : Via OAuth Authorization Code Flow

1. Construire l'URL d'autorisation :

```
https://id.twitch.tv/oauth2/authorize
  ?client_id=VOTRE_CLIENT_ID
  &redirect_uri=http://localhost:3000/callback
  &response_type=code
  &scope=moderator:read:chatters
```

2. Visiter cette URL dans le navigateur
3. Autoriser l'application
4. Recuperer le `code` dans l'URL de redirection
5. Echanger le code contre un token :

```bash
curl -X POST "https://id.twitch.tv/oauth2/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=VOTRE_CLIENT_ID" \
  -d "client_secret=VOTRE_CLIENT_SECRET" \
  -d "code=LE_CODE_RECU" \
  -d "grant_type=authorization_code" \
  -d "redirect_uri=http://localhost:3000/callback"
```

---

## Etape 3 : S'assurer que le bot est moderateur

L'API `Get Chatters` requiert que le compte qui fait la requete soit :
- Le **broadcaster** lui-meme, OU
- Un **moderateur** du channel

Pour ajouter le bot comme moderateur :
```
/mod LeCollecteurDeDose
```

---

## Etape 4 : Obtenir les IDs necessaires

### Broadcaster ID

```bash
curl -X GET "https://api.twitch.tv/helix/users?login=kevinbarfleur" \
  -H "Authorization: Bearer VOTRE_TOKEN" \
  -H "Client-Id: VOTRE_CLIENT_ID"
```

### Moderator ID (si different du broadcaster)

```bash
curl -X GET "https://api.twitch.tv/helix/users?login=lecollecteurdedose" \
  -H "Authorization: Bearer VOTRE_TOKEN" \
  -H "Client-Id: VOTRE_CLIENT_ID"
```

---

## Etape 5 : Configurer les variables d'environnement

Ajouter ces variables dans Railway et dans `.env` local :

```env
# Nouvelles variables pour l'API Chatters
TWITCH_CLIENT_ID=votre_client_id_ici
TWITCH_API_TOKEN=votre_token_oauth_avec_scope_chatters
TWITCH_BROADCASTER_ID=id_numerique_du_broadcaster
TWITCH_MODERATOR_ID=id_numerique_du_moderateur_ou_broadcaster
```

---

## Etape 6 : Code a ajouter dans le bot

Une fois les credentials configures, voici le code a ajouter dans `main.ts` :

```typescript
// Nouvelles variables d'environnement
const TWITCH_CLIENT_ID = Deno.env.get("TWITCH_CLIENT_ID") || ""
const TWITCH_API_TOKEN = Deno.env.get("TWITCH_API_TOKEN") || ""
const TWITCH_BROADCASTER_ID = Deno.env.get("TWITCH_BROADCASTER_ID") || ""
const TWITCH_MODERATOR_ID = Deno.env.get("TWITCH_MODERATOR_ID") || TWITCH_BROADCASTER_ID

// Cache pour les chatters (evite de spam l'API)
let cachedChatters: string[] = []
let chattersLastFetch: number = 0
const CHATTERS_CACHE_TTL = 60000 // 1 minute

// Fonction pour recuperer les chatters via l'API Helix
async function fetchChatters(): Promise<string[]> {
  const now = Date.now()

  // Utiliser le cache si encore valide
  if (cachedChatters.length > 0 && (now - chattersLastFetch) < CHATTERS_CACHE_TTL) {
    return cachedChatters
  }

  if (!TWITCH_CLIENT_ID || !TWITCH_API_TOKEN || !TWITCH_BROADCASTER_ID) {
    console.warn('Twitch API credentials not configured - using chat-based tracking')
    return []
  }

  try {
    const url = new URL('https://api.twitch.tv/helix/chat/chatters')
    url.searchParams.set('broadcaster_id', TWITCH_BROADCASTER_ID)
    url.searchParams.set('moderator_id', TWITCH_MODERATOR_ID)
    url.searchParams.set('first', '1000') // Max 1000 par requete

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${TWITCH_API_TOKEN}`,
        'Client-Id': TWITCH_CLIENT_ID
      }
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Error fetching chatters:', response.status, error)
      return cachedChatters // Retourner le cache meme expire
    }

    const data = await response.json()
    cachedChatters = data.data.map((chatter: any) => chatter.user_login)
    chattersLastFetch = now

    console.log(`Fetched ${cachedChatters.length} chatters from Twitch API`)
    return cachedChatters
  } catch (error) {
    console.error('Error fetching chatters:', error)
    return cachedChatters
  }
}

// Modifier getRandomActiveUser pour utiliser les chatters si disponibles
async function getRandomActiveUserWithAPI(): Promise<string | null> {
  // Essayer d'abord l'API
  const chatters = await fetchChatters()

  if (chatters.length > 0) {
    // Filtrer les chatters targetables (pas en cooldown)
    const targetableChatters = chatters.filter(
      username => canTargetUser(username) &&
                  username.toLowerCase() !== TWITCH_BOT_USERNAME.toLowerCase()
    )

    if (targetableChatters.length > 0) {
      // Selection ponderee parmi les chatters
      const weights = targetableChatters.map(username => ({
        username,
        weight: getUserWeight(username)
      }))

      const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0)
      let random = Math.random() * totalWeight

      for (const w of weights) {
        random -= w.weight
        if (random <= 0) {
          return w.username
        }
      }

      return targetableChatters[0]
    }
  }

  // Fallback sur le systeme actuel (chat-based)
  return getRandomActiveUser()
}
```

---

## Etape 7 : Modifier executeRandomTrigger

Remplacer l'appel a `getRandomActiveUser()` par `await getRandomActiveUserWithAPI()` :

```typescript
async function executeRandomTrigger() {
  // ... code existant ...

  // AVANT:
  // const targetUser = getRandomActiveUser()

  // APRES:
  const targetUser = await getRandomActiveUserWithAPI()

  // ... reste du code ...
}
```

---

## Test de l'API

Pour verifier que tout fonctionne :

```bash
curl -X GET "https://api.twitch.tv/helix/chat/chatters?broadcaster_id=BROADCASTER_ID&moderator_id=MODERATOR_ID" \
  -H "Authorization: Bearer VOTRE_TOKEN" \
  -H "Client-Id: VOTRE_CLIENT_ID"
```

Reponse attendue :
```json
{
  "data": [
    {"user_id": "123", "user_login": "viewer1", "user_name": "Viewer1"},
    {"user_id": "456", "user_login": "viewer2", "user_name": "Viewer2"}
  ],
  "pagination": {},
  "total": 2
}
```

---

## Refresh du Token

Les tokens OAuth Twitch expirent. Pour gerer le refresh automatique :

1. Stocker aussi le `refresh_token` lors de la generation initiale
2. Ajouter une logique de refresh quand l'API retourne 401

```typescript
async function refreshTwitchToken(): Promise<string | null> {
  const refreshToken = Deno.env.get("TWITCH_REFRESH_TOKEN")
  if (!refreshToken) return null

  const response = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: TWITCH_CLIENT_ID,
      client_secret: Deno.env.get("TWITCH_CLIENT_SECRET") || "",
      grant_type: "refresh_token",
      refresh_token: refreshToken
    })
  })

  if (response.ok) {
    const data = await response.json()
    // Mettre a jour le token en memoire
    // Note: En production, il faudrait aussi mettre a jour la variable d'environnement
    return data.access_token
  }

  return null
}
```

---

## Resume des actions a faire

- [ ] Creer une application sur [Twitch Developer Console](https://dev.twitch.tv/console/apps)
- [ ] Noter le Client ID et Client Secret
- [ ] Generer un token OAuth avec le scope `moderator:read:chatters`
- [ ] Ajouter le bot comme moderateur du channel (`/mod LeCollecteurDeDose`)
- [ ] Obtenir les IDs numeriques du broadcaster et moderateur
- [ ] Configurer les variables d'environnement dans Railway
- [ ] Implementer le code dans `main.ts`
- [ ] Tester l'API manuellement avec curl
- [ ] Deployer et verifier les logs

---

## Documentation officielle

- [Get Chatters - Twitch API Reference](https://dev.twitch.tv/docs/api/reference/#get-chatters)
- [OAuth Authorization Code Grant Flow](https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/#authorization-code-grant-flow)
- [Twitch CLI](https://dev.twitch.tv/docs/cli)
