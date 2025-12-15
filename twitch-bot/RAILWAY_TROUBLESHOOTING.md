# Dépannage Railway - Bot qui s'arrête

Si Railway arrête votre bot avec `SIGTERM` même si le health check fonctionne, voici les solutions :

## ✅ Vérifications dans Railway Dashboard

### 1. Vérifier le Start Command

1. Allez dans Railway Dashboard → Votre service → **Settings** → **Deploy**
2. Vérifiez que **"Custom Start Command"** est défini à : `node index.js`
   - ⚠️ **PAS** `npm start`
   - ⚠️ **PAS** laissé vide (Railway pourrait utiliser `npm start` par défaut)

### 2. Désactiver l'option "Serverless"

1. Allez dans Railway Dashboard → Votre service → **Settings** → **Deploy**
2. Cherchez l'option **"Serverless"** ou **"Scale to Zero"**
3. **Désactivez-la** si elle est activée
   - Cette option arrête les conteneurs après inactivité
   - Pour un bot qui doit rester actif, elle doit être désactivée

### 3. Configurer le Health Check

1. Allez dans Railway Dashboard → Votre service → **Settings** → **Health Check**
2. Configurez :
   - **Path** : `/health`
   - **Timeout** : `300` secondes (ou plus)
   - **Interval** : `30` secondes

### 4. Vérifier la Restart Policy

1. Allez dans Railway Dashboard → Votre service → **Settings** → **Deploy**
2. Vérifiez que **"Restart Policy"** est défini à : `ALWAYS` ou `ON_FAILURE`
   - `ALWAYS` : Redémarre toujours le service s'il s'arrête
   - `ON_FAILURE` : Redémarre seulement en cas d'erreur

## 🔍 Diagnostic

### Vérifier que le Start Command est correct

Dans les logs Railway, vous ne devriez **PAS** voir :
```
npm error path /app
npm error command failed
npm error signal SIGTERM
npm error command sh -c node index.js
```

Si vous voyez cela, Railway utilise encore `npm start` au lieu de `node index.js` directement.

### Vérifier que le serveur HTTP démarre

Dans les logs, vous devriez voir :
```
📡 Webhook server listening on port 8080
✅ Service ready and listening for requests
```

### Tester le Health Check

Testez manuellement :
```bash
curl https://lecollecteurdedose-production.up.railway.app/health
```

Vous devriez voir :
```json
{"status":"ok","bot":"connected","channel":"Les_Doseurs","timestamp":"..."}
```

## 🛠️ Solutions

### Solution 1 : Configurer manuellement dans Railway

Si le fichier `railway.json` ne fonctionne pas :

1. **Railway Dashboard** → Votre service → **Settings** → **Deploy**
2. **Custom Start Command** : `node index.js`
3. **Restart Policy** : `ALWAYS`
4. **Serverless** : **Désactivé**

### Solution 2 : Vérifier le fichier railway.json

Assurez-vous que `railway.json` contient :
```json
{
  "deploy": {
    "startCommand": "node index.js",
    "restartPolicyType": "ALWAYS"
  }
}
```

### Solution 3 : Plan Railway

Si vous êtes sur le plan gratuit, Railway peut avoir des limitations :
- Les conteneurs peuvent être arrêtés après inactivité
- Considérez passer au plan payant pour un service qui doit rester actif 24/7

## 📝 Checklist de Vérification

- [ ] Start Command dans Railway = `node index.js` (pas `npm start`)
- [ ] Option "Serverless" désactivée dans Railway
- [ ] Health Check configuré : `/health` avec timeout 300s
- [ ] Restart Policy = `ALWAYS`
- [ ] Health check répond correctement (test avec curl)
- [ ] Logs montrent que le serveur HTTP démarre avant la connexion Twitch
- [ ] Pas d'erreurs npm dans les logs

## 🔗 Liens Utiles

- [Railway Health Checks Documentation](https://docs.railway.com/guides/healthchecks)
- [Railway Node.js SIGTERM Guide](https://docs.railway.com/guides/nodejs-sigterm)
- [Railway Service Configuration](https://docs.railway.com/reference/service-config)
