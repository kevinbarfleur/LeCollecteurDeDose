# 🛠️ Outils Admin - Console Tools

Ce dossier contient les outils disponibles dans la console du navigateur pour faciliter la gestion des administrateurs.

## 📋 Comment utiliser

Une fois sur l'application (et connecté avec Twitch), ouvrez la console du navigateur (F12) et utilisez les commandes suivantes :

### `getAdminInfo()`
Affiche toutes les informations nécessaires pour ajouter un utilisateur comme admin, avec plusieurs formats :
- Objet JavaScript
- Requête SQL prête à exécuter
- JSON pour l'interface Supabase

**Exemple :**
```javascript
getAdminInfo()
```

### `getAdminSQL()`
Génère et copie automatiquement dans le presse-papier une requête SQL INSERT prête à être exécutée dans Supabase.

**Exemple :**
```javascript
getAdminSQL()
```

### `getAdminJSON()`
Génère et copie automatiquement dans le presse-papier un objet JSON prêt à être inséré via l'interface Supabase.

**Exemple :**
```javascript
getAdminJSON()
```

## 📝 Processus d'ajout d'un admin

1. Demandez à votre collègue de se connecter sur l'application avec son compte Twitch
2. Demandez-lui d'ouvrir la console (F12) et de taper : `getAdminInfo()`
3. Il vous enverra les informations affichées (ou utilisez `getAdminSQL()` pour avoir directement la requête SQL)
4. Exécutez la requête SQL dans Supabase (SQL Editor) ou ajoutez l'utilisateur via l'interface Supabase

## 🔒 Sécurité

Ces outils ne modifient **jamais** la base de données directement. Ils génèrent uniquement les informations nécessaires pour que vous puissiez les ajouter manuellement dans Supabase.

