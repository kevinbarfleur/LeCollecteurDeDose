# Guide de Migration Node.js → Go

Ce guide explique comment migrer le bot Twitch de Node.js vers Go.

## 🎯 Pourquoi Migrer ?

Le bot Node.js rencontrait des problèmes persistants avec `SIGTERM` sur Railway, malgré toutes les tentatives de configuration. Go est mieux adapté pour :

- Services long-running sur Railway
- Gestion native des processus et signaux
- Performance et consommation mémoire
- Fiabilité pour les bots

## 📋 Étapes de Migration

### 1. Préparer le Nouveau Service Railway

1. **Créer un nouveau service Railway** :
   - Railway Dashboard → New Project → New Service
   - Connecter depuis GitHub
   - Sélectionner le dossier `twitch-bot-go`

2. **Configurer les variables d'environnement** (identiques à Node.js) :
   ```
   TWITCH_BOT_USERNAME=LeCollecteurDeDose
   TWITCH_BOT_OAUTH_TOKEN=oauth:...
   TWITCH_CHANNEL_NAME=Les_Doseurs
   SUPABASE_URL=https://...
   SUPABASE_KEY=...
   ```

### 2. Déployer le Bot Go

Railway détectera automatiquement Go et utilisera `railway.json` pour la configuration.

### 3. Mettre à Jour Supabase

Dans Supabase Dashboard → Edge Functions → `handle-reward` → Variables :

Mettre à jour `BOT_WEBHOOK_URL` :

```
BOT_WEBHOOK_URL=https://votre-nouveau-service-go.railway.app/webhook/message
```

### 4. Tester

1. **Vérifier les logs Railway** : Le bot devrait se connecter et rester actif
2. **Tester le health check** :
   ```bash
   curl https://votre-service-go.railway.app/health
   ```
3. **Tester les commandes chat** : `!ping`, `!collection`, `!stats`, `!vaal`
4. **Tester les webhooks** : Utiliser les boutons dans l'admin page

### 5. Arrêter l'Ancien Service Node.js

Une fois que tout fonctionne avec Go :

1. Railway Dashboard → Ancien service Node.js → Settings → Delete Service
2. Ou simplement le mettre en pause pour garder une sauvegarde

## 🔄 Différences Clés

### Structure

**Node.js** :
```
twitch-bot/
  ├── index.js
  ├── package.json
  └── railway.json
```

**Go** :
```
twitch-bot-go/
  ├── main.go
  ├── go.mod
  ├── go.sum (généré)
  └── railway.json
```

### Commandes

**Node.js** :
```bash
npm install
npm start
# ou
node index.js
```

**Go** :
```bash
go mod download
go run main.go
# ou compiler
go build -o bot
./bot
```

### Gestion des Signaux

**Node.js** :
```javascript
process.on('SIGTERM', () => {
  // ...
})
```

**Go** :
```go
sigChan := make(chan os.Signal, 1)
signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
```

## ✅ Avantages de Go

1. **Pas de problèmes SIGTERM** : Go gère mieux les signaux système
2. **Railway gère mieux Go** : Meilleure détection des services actifs
3. **Performance** : Compilation native, démarrage rapide
4. **Ressources** : Consommation mémoire réduite
5. **Fiabilité** : Gestion native de la concurrence

## 🐛 Dépannage

### Le bot ne démarre pas

Vérifiez les logs Railway pour les erreurs. Les messages d'erreur Go sont généralement plus clairs.

### Les commandes Supabase ne fonctionnent pas

Vérifiez que les credentials Supabase sont corrects et que RLS est configuré.

### Health check ne répond pas

Vérifiez que Railway expose correctement le port (Settings → Networking).

## 📚 Ressources

- [Go Documentation](https://go.dev/doc/)
- [Twitch IRC Go Library](https://github.com/gempir/go-twitch-irc)
- [Supabase Go Client](https://github.com/supabase-community/supabase-go)
- [Railway Go Guide](https://docs.railway.com/guides/go)
